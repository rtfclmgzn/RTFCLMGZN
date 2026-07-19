// Cloudflare Pages Function — report the current session, if any.
// Route: GET /api/auth/me
// Always 200: {"email":...,"plan":...,"since":...} when signed in, else {"account":null}.
// This is a routine boot-time check, not an authorization gate, so it never 401s.

import { getSessionUser, json, notConfigured } from "../_lib/auth.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return notConfigured();

  const user = await getSessionUser(request, env);
  if (!user) return json({ account: null });
  return json({ email: user.email, plan: user.plan, since: user.since });
}
