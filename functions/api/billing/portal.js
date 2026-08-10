// Cloudflare Pages Function — open the Stripe billing portal.
// Route: POST /api/billing/portal  ->  {ok:true, url}
//
// Card changes, invoices, and cancellation all happen in Stripe's own hosted portal.
// Building those screens ourselves would mean handling card data and dunning logic,
// which is exactly the work Stripe exists to absorb.
//
// Only meaningful for readers who actually paid: a voucher grant has no Stripe
// customer behind it, so the portal would have nothing to show.

import { stripeConfigured, stripeCall, json } from "../_lib/billing.js";
import { getSessionUser } from "../_lib/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!stripeConfigured(env)) {
    return json({ ok: false, error: "not-configured", message: "Billing isn't live yet." }, 503);
  }

  const user = await getSessionUser(request, env);
  if (!user) return json({ ok: false, error: "signed-out", message: "Sign in first." }, 401);

  const row = await env.DB.prepare("SELECT stripe_customer_id FROM users WHERE id=?").bind(user.id).first();
  if (!row || !row.stripe_customer_id) {
    return json({ ok: false, error: "no-customer",
      message: "There's nothing to manage — your Plus access didn't come from a payment." }, 400);
  }

  try {
    const origin = new URL(request.url).origin;
    const session = await stripeCall(env, "billing_portal/sessions", {
      customer: row.stripe_customer_id,
      return_url: `${origin}/#/account`,
    });
    if (!session || !session.url) throw new Error("no url");
    return json({ ok: true, url: session.url });
  } catch (err) {
    console.log("portal failed", user.id, err && err.message);
    return json({ ok: false, error: "stripe-error", message: "Couldn't open billing. Try again shortly." }, 502);
  }
}
