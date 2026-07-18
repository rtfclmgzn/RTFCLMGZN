// Cloudflare Pages Function — report the current session, if any.
// Route: GET /api/auth/me
// Always 200: {"email":...,"plan":...,"since":...} when signed in, else {"account":null}.
// This is a routine boot-time check, not an authorization gate, so it never 401s.

import { sha256Hex, getCookie, json, notConfigured } from "../_lib/auth.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return notConfigured();

  const raw = getCookie(request, "rtfc_session");
  if (!raw) return json({ account: null });

  const sessionHash = await sha256Hex(raw);
  const row = await env.DB
    .prepare(
      `SELECT u.email AS email, u.plan AS plan, u.created_at AS since
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.id=? AND s.revoked_at IS NULL AND s.expires_at > datetime('now')`
    )
    .bind(sessionHash).first();

  return json(row || { account: null });
}
