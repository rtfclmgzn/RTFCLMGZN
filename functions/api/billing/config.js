// Cloudflare Pages Function — what Plus costs and whether checkout is live.
// Route: GET /api/billing/config
//
// Public and unauthenticated: it is a price list. It carries no reader-specific data,
// so it is safe to cache briefly at the edge — but only briefly, because the founding
// lifetime counter in it is the thing that hides a sold-out tier.

import { PRICES, LIFETIME_CAP, lifetimeSold, stripeConfigured } from "../_lib/billing.js";

export async function onRequestGet(context) {
  const { env } = context;
  const enabled = stripeConfigured(env) &&
    !!(env.STRIPE_PRICE_MONTHLY && env.STRIPE_PRICE_ANNUAL);

  let sold = 0;
  if (env.DB) { try { sold = await lifetimeSold(env); } catch { sold = 0; } }

  const body = {
    ok: true,
    enabled,
    currency: "usd",
    prices: {
      monthly:  { amount: PRICES.monthly.amount },
      annual:   { amount: PRICES.annual.amount },
      lifetime: { amount: PRICES.lifetime.amount },
    },
    lifetime_cap: LIFETIME_CAP,
    lifetime_sold: sold,
    lifetime_remaining: Math.max(0, LIFETIME_CAP - sold),
    // Lifetime is only offered while the price is configured AND places remain.
    lifetime_available: enabled && !!env.STRIPE_PRICE_LIFETIME && sold < LIFETIME_CAP,
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
      // 60s: long enough to absorb a burst, short enough that a sold-out founding tier
      // disappears from the storefront within a minute of the hundredth sale.
      "cache-control": "public, max-age=60",
    },
  });
}
