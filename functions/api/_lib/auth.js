// Shared helpers for the magic-link auth endpoints (functions/api/auth/*.js).
// No framework, no npm dependency -- Web Crypto is native to the Pages Functions runtime.

export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// A raw secret (login token or session id) exists in exactly two places: the emailed
// link, or the browser's HttpOnly cookie. Only its SHA-256 hash is ever written to D1.
export function randomSecret() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function normalizeEmail(raw) {
  return (raw || "").toString().trim().toLowerCase();
}

export function isValidEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export function getCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  const match = header.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[1]) : null;
}

export function sessionCookieHeader(value, maxAgeSeconds) {
  return `rtfc_session=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}

export function requestIpHash(request) {
  const ip = request.headers.get("cf-connecting-ip") || "";
  return ip ? sha256Hex(ip) : Promise.resolve(null);
}

// Resolves the rtfc_session cookie to a real, unexpired, unrevoked user row.
// Shared by every endpoint that needs "who is this," not just /api/auth/me.
export async function getSessionUser(request, env) {
  const raw = getCookie(request, "rtfc_session");
  if (!raw) return null;
  const sessionHash = await sha256Hex(raw);
  const row = await env.DB
    .prepare(
      `SELECT u.id AS id, u.email AS email, u.plan AS plan, u.created_at AS since
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.id=? AND s.revoked_at IS NULL AND s.expires_at > datetime('now')`
    )
    .bind(sessionHash).first();
  return row || null;
}

export function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}

// Every auth endpoint fails closed the same way when D1 isn't bound yet -- mirrors
// tts.js's ELEVENLABS_KEY check so pushing this code is always safe, configured or not.
export function notConfigured() {
  return json({ error: "not-configured" }, 503);
}
