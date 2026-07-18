// Cloudflare Pages Function — sign out.
// Route: POST /api/auth/logout
// Soft-revokes the session (kept for audit, not hard-deleted) and clears the cookie.

import { sha256Hex, getCookie, sessionCookieHeader, json, notConfigured } from "../_lib/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return notConfigured();

  const raw = getCookie(request, "rtfc_session");
  if (raw) {
    const sessionHash = await sha256Hex(raw);
    await env.DB
      .prepare("UPDATE sessions SET revoked_at=datetime('now') WHERE id=? AND revoked_at IS NULL")
      .bind(sessionHash).run();
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store", "Set-Cookie": sessionCookieHeader("", 0) }
  });
}
