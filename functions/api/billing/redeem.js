// Cloudflare Pages Function — redeem a voucher code.
// Route: POST /api/billing/redeem   body {code:"..."}
//
// Access codes (lifetime, free_days) grant Plus here and now: no card, no Stripe, no
// checkout. That is deliberate — a "3 month free trial" that demands a card up front
// is a worse offer than one that doesn't, and these are handed out personally anyway.
//
// Discount codes (percent_off, amount_off) grant nothing on their own; they are only
// meaningful inside a Stripe checkout. This endpoint validates them and tells the
// browser to hold onto the code, which it then passes to /api/billing/checkout.

import { loadVoucher, grantPlus, VOUCHER_MESSAGES, json } from "../_lib/billing.js";
import { getSessionUser } from "../_lib/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return json({ ok: false, error: "not-configured", message: "Codes aren't live yet." }, 503);

  const user = await getSessionUser(request, env);
  if (!user) {
    return json({ ok: false, error: "signed-out", message: "Sign in first, then redeem your code." }, 401);
  }

  let body = {};
  try { body = await request.json(); } catch { /* handled by the validity check */ }

  const { code, row, error } = await loadVoucher(env, body.code);
  if (error) return json({ ok: false, error, message: VOUCHER_MESSAGES[error] || VOUCHER_MESSAGES.invalid }, 400);

  // ── discounts: validate, don't grant ──────────────────────────────────────────
  // No redemption is recorded — the code isn't spent until it survives a real payment,
  // and Stripe enforces its own redemption limits on the coupon itself.
  if (row.kind === "percent_off" || row.kind === "amount_off") {
    const off = row.kind === "percent_off"
      ? `${row.value}% off`
      : `$${(row.value / 100).toFixed(2)} off`;
    return json({
      ok: true, kind: "discount", checkout_hint: true, plan: user.plan, expires_at: null,
      message: `${off} applied. Pick a plan below and it comes off at checkout.`,
    });
  }

  // ── access grants ─────────────────────────────────────────────────────────────
  if (user.plan === "plus") {
    return json({ ok: false, error: "used", message: "You already have Plus — save the code for someone else." }, 400);
  }

  // Claim the redemption FIRST. The UNIQUE(code,user_id) constraint is what actually
  // stops one person redeeming twice; checking and then inserting would race two
  // concurrent requests into two grants off a one-use code.
  try {
    await env.DB.prepare("INSERT INTO voucher_redemptions (code, user_id) VALUES (?, ?)")
      .bind(code, user.id).run();
  } catch {
    return json({ ok: false, error: "used", message: VOUCHER_MESSAGES.used }, 400);
  }

  // Then take the slot. The guard in the UPDATE means a code with 10 uses cannot go to
  // 11 even if ten requests arrive at once — the eleventh matches no row.
  const claim = await env.DB.prepare(
    `UPDATE vouchers SET redeemed_count = redeemed_count + 1
      WHERE code = ? AND active = 1
        AND (max_redemptions IS NULL OR redeemed_count < max_redemptions)`
  ).bind(code).run();

  const took = claim && claim.meta && typeof claim.meta.changes === "number" ? claim.meta.changes : 1;
  if (!took) {
    // Lost the race for the last slot — give the redemption back so the reader isn't
    // left holding a used marker for a code they never actually got.
    await env.DB.prepare("DELETE FROM voucher_redemptions WHERE code=? AND user_id=?")
      .bind(code, user.id).run();
    return json({ ok: false, error: "exhausted", message: VOUCHER_MESSAGES.exhausted }, 409);
  }

  let expiresAt = null;
  let message;
  if (row.kind === "lifetime") {
    message = "Redeemed — you have Plus for life. Every issue, every back number.";
  } else {
    const days = Number(row.value) || 0;
    const until = new Date(Date.now() + days * 86400000);
    expiresAt = until.toISOString();
    const months = Math.round(days / 30);
    const span = days % 365 === 0 && days >= 365
      ? `${days / 365} year${days === 365 ? "" : "s"}`
      : `${months} month${months === 1 ? "" : "s"}`;
    message = `Redeemed — Plus is yours free for ${span}. No card, and it simply stops at the end.`;
  }

  await grantPlus(env, user.id, "voucher", expiresAt);

  return json({
    ok: true, kind: row.kind, checkout_hint: false,
    plan: "plus", expires_at: expiresAt, message,
  });
}
