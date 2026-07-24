// Cloudflare Pages Function — consume a magic-link token and sign the user in.
// Route: GET /api/auth/verify?token=...  (this is what the emailed link points at
// directly -- a real HTTP GET, not a SPA hash route, so it works from any mail client.)
//
// Two-step by design: GET renders a confirmation page WITHOUT touching the token.
// POST (fired only by a real click on that page's button) does the actual consume.
// This defeats email security scanners that pre-fetch links to scan for malware --
// a bot fetches the GET page and stops; it does not execute JS or click a button.
// We learned this the hard way: a token was marked used 28 seconds after send, long
// before the owner had opened the email, which only a scanner GET explains.

import { sha256Hex, randomSecret, sessionCookieHeader, json, notConfigured } from "../_lib/auth.js";

function confirmPage(token) {
  const safeToken = String(token).replace(/[^A-Za-z0-9_-]/g, "");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Sign in to RTFCLMGZN</title>
<style>
  body{margin:0;min-height:100svh;display:grid;place-items:center;background:#0b0b12;color:#ece9f4;
    font-family:system-ui,sans-serif;text-align:center;padding:24px}
  .card{max-width:380px}
  h1{font-family:Georgia,'Times New Roman',serif;font-size:26px;margin:0 0 10px}
  p{color:#9b96ad;font-size:14.5px;line-height:1.6;margin:0 0 22px}
  button{background:#8b7cf7;color:#0b0b12;border:none;border-radius:999px;padding:13px 28px;
    font-size:15px;font-weight:700;cursor:pointer}
  button:disabled{opacity:.6;cursor:default}
  .err{color:#e0564d;font-size:13.5px;margin-top:16px;display:none}
</style></head><body><div class="card">
  <h1>◈ Sign in to RTFCLMGZN</h1>
  <p>For your security, confirm this sign-in with a click — this stops automated scanners from using your link before you do.</p>
  <button id="go">Finish signing in</button>
  <p class="err" id="err">That link has expired, was already used, or a newer sign-in email replaced it. If you have more than one of these emails, use the most recent one — otherwise request a new link from the account page.</p>
</div>
<script>
  document.getElementById("go").addEventListener("click", function () {
    var btn = this;
    btn.disabled = true; btn.textContent = "Signing in…";
    fetch("/api/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "${safeToken}" })
    }).then(function (r) {
      if (!r.ok) throw new Error("failed");
      location.href = "/#/account";
    }).catch(function () {
      btn.style.display = "none";
      document.getElementById("err").style.display = "block";
    });
  });
</script></body></html>`;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return notConfigured();
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  if (!token) return json({ error: "invalid_or_expired" }, 400);
  return new Response(confirmPage(token), {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return notConfigured();

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "invalid_or_expired" }, 400); }
  const token = String(body.token || "");
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

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "Set-Cookie": sessionCookieHeader(sessionSecret, 2592000)
    }
  });
}
