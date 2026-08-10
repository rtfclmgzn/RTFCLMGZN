// Cloudflare Pages Function — report the current session, if any.
// Route: GET /api/auth/me
// Always 200: {"email":...,"plan":...,"since":...,"entitlement":{...}} when signed in,
// else {"account":null}. This is a routine boot-time check, not an authorization gate,
// so it never 401s.
//
// `plan` here is already expiry-corrected: getSessionUser() downgrades a lapsed voucher
// grant before it returns, so the browser never sees a Plus that has quietly run out.

import { getSessionUser, json, notConfigured } from "../_lib/auth.js";
import { entitlementFor } from "../_lib/billing.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return notConfigured();

  const user = await getSessionUser(request, env);
  if (!user) return json({ account: null });

  // Detail for the account page: which of the three ways they got Plus, when it renews
  // or lapses, and whether there is a Stripe customer behind it (which decides whether
  // the "Manage billing" button can do anything). Never load-bearing for access.
  let entitlement = null;
  try { entitlement = await entitlementFor(env, user.id); } catch { entitlement = null; }

  return json({ email: user.email, plan: user.plan, since: user.since, entitlement });
}
