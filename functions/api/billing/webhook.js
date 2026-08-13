// Cloudflare Pages Function — Stripe webhook.
// Route: POST /api/billing/webhook
//
// This endpoint is the ONLY thing that turns money into access. Everything it does
// hangs off a verified signature; an unverified request is dropped before a single
// row is read. Point Stripe at https://rtfclmgzn.com/api/billing/webhook and enable:
//
//   checkout.session.completed          — a purchase finished (subscription or lifetime)
//   customer.subscription.updated       — renewal, cancel-at-period-end, plan change
//   customer.subscription.deleted       — the subscription actually ended
//   invoice.payment_failed              — card died; Stripe will retry, we just record it
//
// It always answers 200 once the signature checks out, even on an event we ignore or
// one that errors internally. A non-2xx makes Stripe retry for days, and a retry storm
// against a bug is worse than a missed event we can replay by hand from the dashboard.

import {
  stripeConfigured, verifyStripeSignature, grantPlus, revokePlus,
  lifetimeSold, LIFETIME_CAP, json,
} from "../_lib/billing.js";

const OK = () => new Response(JSON.stringify({ received: true }), {
  status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" },
});

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!stripeConfigured(env) || !env.STRIPE_WEBHOOK_SECRET) return json({ error: "not-configured" }, 503);

  // Must read the RAW body — re-serialising parsed JSON changes bytes and breaks the HMAC.
  const raw = await request.text();
  const verdict = await verifyStripeSignature(raw, request.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET);
  if (!verdict.ok) {
    // 400, not 200: a bad signature is not something to retry, and it should be loud.
    return json({ error: "bad-signature", reason: verdict.reason }, 400);
  }

  let event;
  try { event = JSON.parse(raw); } catch { return json({ error: "bad-json" }, 400); }
  if (!event || !event.id) return json({ error: "bad-event" }, 400);

  // Idempotency. Stripe redelivers; without this a retried checkout.session.completed
  // would burn a second founding-lifetime slot for a single purchase. The PK collision
  // IS the lock — checking-then-inserting would race two concurrent deliveries.
  try {
    await env.DB.prepare("INSERT INTO stripe_events (id, type) VALUES (?, ?)")
      .bind(event.id, event.type || "").run();
  } catch {
    return OK();               // already handled
  }

  try {
    await handle(env, event);
  } catch (err) {
    // Swallow deliberately (see header). The event id is already recorded, so a manual
    // replay from the dashboard is a no-op — resolve these by hand, not by retry.
    console.log("webhook handler failed", event.id, event.type, err && err.message);
  }
  return OK();
}

async function userIdFor(env, { userId, customerId, email }) {
  if (userId) {
    const byId = await env.DB.prepare("SELECT id FROM users WHERE id=?").bind(userId).first();
    if (byId) return byId.id;
  }
  if (customerId) {
    const byCust = await env.DB.prepare("SELECT id FROM users WHERE stripe_customer_id=?").bind(customerId).first();
    if (byCust) return byCust.id;
  }
  if (email) {
    const byEmail = await env.DB.prepare("SELECT id FROM users WHERE email=?")
      .bind(String(email).trim().toLowerCase()).first();
    if (byEmail) return byEmail.id;
  }
  return null;
}

async function handle(env, event) {
  const obj = (event.data && event.data.object) || {};

  // ── purchase completed ────────────────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    if (obj.payment_status !== "paid" && obj.status !== "complete") return;

    const meta = obj.metadata || {};
    const uid = await userIdFor(env, {
      userId: meta.user_id, customerId: obj.customer,
      email: (obj.customer_details && obj.customer_details.email) || obj.customer_email,
    });
    if (!uid) { console.log("checkout completed for unknown user", obj.id); return; }

    if (obj.customer) {
      await env.DB.prepare("UPDATE users SET stripe_customer_id=? WHERE id=?").bind(obj.customer, uid).run();
    }

    if (meta.plan === "lifetime" || obj.mode === "payment") {
      // Re-check the cap HERE as well as at checkout creation. Two people can both pass
      // the check-out-time check while slot 100 is open; this is the side that decides,
      // because it is the side that runs once per completed payment.
      const sold = await lifetimeSold(env);
      if (sold >= LIFETIME_CAP) {
        // Honour it anyway — they paid, and the money is already taken. Going one over a
        // self-imposed cap is a far smaller problem than charging someone and locking
        // them out. Log it so it can be reconciled.
        console.log("lifetime cap exceeded, honouring purchase", obj.id, "sold:", sold);
      }
      await env.DB.prepare(
        `INSERT INTO subscriptions (id, user_id, status, interval, price_id, current_period_end, updated_at)
         VALUES (?, ?, 'lifetime', 'lifetime', ?, NULL, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET status='lifetime', updated_at=datetime('now')`
      ).bind(`lifetime:${obj.id}`, uid, meta.price_id || null).run();
      await grantPlus(env, uid, "stripe", null);   // no expiry
      return;
    }

    // Subscription mode: the authoritative state arrives in customer.subscription.*,
    // but grant immediately so the reader is not locked out between the two events.
    await grantPlus(env, uid, "stripe", null);
    return;
  }

  // ── subscription lifecycle ────────────────────────────────────────────────────
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
    const uid = await userIdFor(env, { userId: (obj.metadata || {}).user_id, customerId: obj.customer });
    if (!uid) return;

    const item = (obj.items && obj.items.data && obj.items.data[0]) || {};
    const price = item.price || {};
    // current_period_end/start live on the SUBSCRIPTION ITEM as of API version
    // 2025-03-31.basil onward, not on the subscription object itself (confirmed empirically
    // 2026-08-13 against 2026-07-29.dahlia: obj.current_period_end is undefined,
    // item.current_period_end is the real value). Fall back to obj.* in case a future
    // API version moves it back or an event ever arrives shaped the old way.
    const rawPeriodEnd = item.current_period_end || obj.current_period_end;
    const periodEnd = rawPeriodEnd ? new Date(rawPeriodEnd * 1000).toISOString() : null;

    await env.DB.prepare(
      `INSERT INTO subscriptions (id, user_id, status, interval, price_id, current_period_end, cancel_at_period_end, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         status=excluded.status, interval=excluded.interval, price_id=excluded.price_id,
         current_period_end=excluded.current_period_end,
         cancel_at_period_end=excluded.cancel_at_period_end, updated_at=datetime('now')`
    ).bind(
      obj.id, uid, obj.status || "active",
      (price.recurring && price.recurring.interval) || null, price.id || null,
      periodEnd, obj.cancel_at_period_end ? 1 : 0
    ).run();

    // 'active' and 'trialing' keep access. past_due keeps it too, deliberately: Stripe
    // retries a failed card for a couple of weeks, and cutting a paying subscriber off
    // on the first failed charge loses more goodwill than the fortnight is worth.
    if (["active", "trialing", "past_due"].includes(obj.status)) {
      await grantPlus(env, uid, "stripe", null);
    } else {
      await revokePlus(env, uid);
    }
    return;
  }

  if (event.type === "customer.subscription.deleted") {
    const uid = await userIdFor(env, { userId: (obj.metadata || {}).user_id, customerId: obj.customer });
    if (!uid) return;
    await env.DB.prepare(
      "UPDATE subscriptions SET status='canceled', updated_at=datetime('now') WHERE id=?"
    ).bind(obj.id).run();

    // Never revoke a lifetime grant because a separate subscription ended.
    const life = await env.DB.prepare(
      "SELECT 1 AS x FROM subscriptions WHERE user_id=? AND interval='lifetime' AND status='lifetime'"
    ).bind(uid).first();
    if (!life) await revokePlus(env, uid);
    return;
  }

  if (event.type === "invoice.payment_failed") {
    const uid = await userIdFor(env, { customerId: obj.customer });
    if (!uid) return;
    if (obj.subscription) {
      await env.DB.prepare(
        "UPDATE subscriptions SET status='past_due', updated_at=datetime('now') WHERE id=?"
      ).bind(obj.subscription).run();
    }
    return;   // access intentionally untouched — see the note above
  }
}
