// Cloudflare Pages Function — start a magic-link sign-in.
// Route: POST /api/auth/request-link   Body: { "email": "you@example.com" }
// Always responds 200 {"ok":true} regardless of whether the email has an account --
// that's what makes email enumeration impossible. See db/README.md for the one-time
// D1 + Resend setup this endpoint needs before it does anything.

import { sha256Hex, randomSecret, normalizeEmail, isValidEmail, requestIpHash, json, notConfigured } from "../_lib/auth.js";
import { sendEmail, magicLinkEmail } from "../_lib/resend.js";

const RATE_LIMIT_WINDOW_SQL = "datetime('now','-15 minutes')";
const MAX_PER_EMAIL = 3;
const MAX_PER_IP = 10;

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB || !env.RESEND_API_KEY) return notConfigured();

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "bad-request" }, 400); }
  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) return json({ error: "invalid-email" }, 400);

  const ipHash = await requestIpHash(request);

  const emailCount = await env.DB
    .prepare(`SELECT COUNT(*) AS n FROM login_tokens WHERE email=? AND created_at > ${RATE_LIMIT_WINDOW_SQL}`)
    .bind(email).first("n");
  const ipCount = ipHash
    ? await env.DB
        .prepare(`SELECT COUNT(*) AS n FROM login_tokens WHERE request_ip_hash=? AND created_at > ${RATE_LIMIT_WINDOW_SQL}`)
        .bind(ipHash).first("n")
    : 0;

  // Rate-limited requests still return the same 200 {"ok":true} -- the response
  // shape never varies, so it can't be used to probe account existence OR limits.
  if (emailCount < MAX_PER_EMAIL && ipCount < MAX_PER_IP) {
    const token = randomSecret();
    const tokenHash = await sha256Hex(token);
    await env.DB
      .prepare(
        "INSERT INTO login_tokens (token_hash, email, expires_at, request_ip_hash) VALUES (?, ?, datetime('now','+15 minutes'), ?)"
      )
      .bind(tokenHash, email, ipHash)
      .run();

    const verifyUrl = new URL(request.url);
    verifyUrl.pathname = "/api/auth/verify";
    verifyUrl.search = "?token=" + encodeURIComponent(token);
    const { subject, html, text } = magicLinkEmail(verifyUrl.toString());
    await sendEmail(env, { to: email, subject, html, text });
  }

  return json({ ok: true });
}
