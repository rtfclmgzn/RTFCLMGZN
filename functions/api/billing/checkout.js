// Cloudflare Pages Function — start a Stripe Checkout session.
// Route: POST /api/billing/checkout   body {plan:"monthly"|"annual"|"lifetime", code?:"..."}
// -> 200 {ok:true, url}   |   4xx {ok:false, error, message}
//
// The browser picks a plan NAME, never a price or an amount. The price id comes from
// env here, so a tampered request can only ever buy one of three things we sell.

import {
  stripeConfigured, stripeCall, PRICES, LIFETIME_CAP, lifetimeSold,
  loadVoucher, json,
} from "../_lib/billing.js";
import { getSessionUser } from "../_lib/auth.js";

const PRICE_ENV = { monthly: "STRIPE_PRICE_MONTHLY", annual: "STRIPE_PRICE_ANNUAL", lifetime: "STRIPE_PRICE_LIFETIME" };

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!stripeConfigured(env)) {
    return json({ ok: false, error: "not-configured", message: "Checkout isn't live yet." }, 503);
  }

  const user = await getSessionUser(request, env);
  if (!user) {
    return json({ ok: false, error: "signed-out", message: "Sign in first — Plus is tied to your account." }, 401);
  }

  let body = {};
  try { body = await request.json(); } catch { /* empty body handled below */ }
  const plan = (body.plan || "").toString();
  if (!Object.prototype.hasOwnProperty.call(PRICES, plan)) {
    return json({ ok: false, error: "bad-plan", message: "Pick monthly, annual, or lifetime." }, 400);
  }

  const priceId = env[PRICE_ENV[plan]];
  if (!priceId) {
    return json({ ok: false, error: "price-missing", message: "That plan isn't set up yet." }, 503);
  }

  if (user.plan === "plus") {
    return json({ ok: false, error: "already-plus", message: "You already have Plus." }, 400);
  }

  // Founding lifetime is capped. Checked again in the webhook — see the note there for
  // why both sides check and why the webhook is the one that decides.
  if (plan === "lifetime") {
    const sold = await lifetimeSold(env);
    if (sold >= LIFETIME_CAP) {
      return json({ ok: false, error: "sold-out", message: "The founding places are all taken." }, 409);
    }
  }

  // ── discount code, if one was applied ─────────────────────────────────────────
  // Access codes (lifetime / free_days) are NOT valid here: they need no payment at all
  // and are redeemed at /api/billing/redeem. Saying so plainly beats a silent no-op.
  let discounts;
  if (body.code) {
    const { row, error } = await loadVoucher(env, body.code);
    if (error) {
      return json({ ok: false, error, message: "That code isn't valid, so checkout was stopped before charging you." }, 400);
    }
    if (row.kind === "lifetime" || row.kind === "free_days") {
      return json({ ok: false, error: "access-code",
        message: "That code grants access directly — redeem it on your account page instead of paying." }, 400);
    }
    if (!row.stripe_coupon_id) {
      return json({ ok: false, error: "coupon-missing", message: "That discount isn't configured yet." }, 503);
    }
    discounts = [{ coupon: row.stripe_coupon_id }];
  }

  // Reuse the Stripe customer if we know it, so a returning reader keeps one billing
  // history instead of accumulating duplicate customers.
  let customerId = null;
  const row = await env.DB.prepare("SELECT stripe_customer_id FROM users WHERE id=?").bind(user.id).first();
  if (row && row.stripe_customer_id) customerId = row.stripe_customer_id;

  const origin = new URL(request.url).origin;
  const payload = {
    mode: plan === "lifetime" ? "payment" : "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/#/account?checkout=success`,
    cancel_url: `${origin}/#/account?checkout=cancel`,
    client_reference_id: String(user.id),
    // metadata rides through to the webhook, which is where access is actually granted
    metadata: { user_id: String(user.id), plan, price_id: priceId },
    allow_promotion_codes: discounts ? undefined : true,
  };
  if (customerId) payload.customer = customerId;
  else payload.customer_email = user.email;
  if (discounts) payload.discounts = discounts;
  if (plan !== "lifetime") payload.subscription_data = { metadata: { user_id: String(user.id) } };
  else payload.payment_intent_data = { metadata: { user_id: String(user.id), plan: "lifetime" } };

  try {
    const session = await stripeCall(env, "checkout/sessions", payload);
    if (!session || !session.url) throw new Error("no url in session");
    return json({ ok: true, url: session.url });
  } catch (err) {
    console.log("checkout failed", user.id, plan, err && err.message);
    return json({ ok: false, error: "stripe-error", message: "Couldn't reach checkout. Try again in a moment." }, 502);
  }
}
