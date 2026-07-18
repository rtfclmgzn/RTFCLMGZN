// Cloudflare Pages Function — consume a magic-link token and sign the user in.
// Route: GET /api/auth/verify?token=...  (this is what the emailed link points at
// directly — a real HTTP GET, not a SPA hash route, so it works from any mail client.)
// On success: sets the session cookie and 302-redirects into the SPA at /#/account.
// On failure: 400 JSON, since a stale/reused link is a dead end either way.

import { sha256Hex, randomSecret, sessionCookieHeader, json, notConfigured } from "../_lib/auth.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return notConfigured();

  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  if (!token) return json({ error: "invalid_or_expired" }, 400);
  const tokenHash = await sha256Hex(token);

  const row = await env.DB
    .prepare("SELECT email FROM login_tokens WHERE token_hash=? AND used_at IS NULL AND expires_at > datetime('now')")
    .bind(tokenHash).first();
  if (!row) return json({ error: "invalid_or_expired" }, 400);

  // Guarded UPDATE re-checks the same conditions atomically, so a concurrent second
  // request for the same token loses this race even though it also passed the SELECT
  // above -- single-use is enforced by the WHERE clause, not by application logic.
  const claim = await env.DB
    .prepare("UPDATE login_tokens SET used_at=datetime('now') WHERE token_hash=? AND used_at IS NULL AND expires_at > datetime('now')")
    .bind(tokenHash).run();
  if (!claim.meta || claim.meta.changes !== 1) return json({ error: "invalid_or_expired" }, 400);

  // This INSERT is the actual account-creation moment on a person's first sign-in.
  await env.DB
    .prepare("INSERT INTO users (id, email) VALUES (?, ?) ON CONFLICT(email) DO NOTHING")
    .bind(crypto.randomUUID(), row.email).run();
  const user = await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(row.email).first();

  const sessionSecret = randomSecret();
  const sessionHash = await sha256Hex(sessionSecret);
  await env.DB
    .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, datetime('now','+30 days'))")
    .bind(sessionHash, user.id).run();

  return new Response(null, {
    status: 302,
    headers: {
      "Location": "/#/account",
      "Set-Cookie": sessionCookieHeader(sessionSecret, 2592000)
    }
  });
}
