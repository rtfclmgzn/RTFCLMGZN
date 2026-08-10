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

  // Billing columns (migration 002) may not exist yet on a database that hasn't been
  // migrated. Try the full query, fall back to the original shape — so deploying this
  // code before running the migration degrades to "nobody has billing metadata"
  // instead of "every request throws and every reader is signed out".
  let row = null;
  try {
    row = await env.DB
      .prepare(
        `SELECT u.id AS id, u.email AS email, u.plan AS plan, u.created_at AS since,
                u.plan_source AS plan_source, u.plan_expires_at AS plan_expires_at
           FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.id=? AND s.revoked_at IS NULL AND s.expires_at > datetime('now')`
      )
      .bind(sessionHash).first();
  } catch {
    row = await env.DB
      .prepare(
        `SELECT u.id AS id, u.email AS email, u.plan AS plan, u.created_at AS since
           FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.id=? AND s.revoked_at IS NULL AND s.expires_at > datetime('now')`
      )
      .bind(sessionHash).first();
  }
  if (!row) return null;

  // THE EXPIRY IS APPLIED HERE, on every request that asks who this is. That is what
  // makes a voucher trial end: no cron, no sweep job, no nightly task to forget to run.
  // A 3-month code writes plan_expires_at and then simply stops being true.
  //
  // A paid subscription carries NULL here — Stripe's webhook is what revokes it — so
  // this only ever ends grants that were always meant to end.
  if (row.plan === "plus" && row.plan_expires_at && new Date(row.plan_expires_at) <= new Date()) {
    row.plan = "free";
    row.plan_lapsed = true;
    // Best-effort write-back so the row stops needing this check. Never block the
    // request on it: the in-memory downgrade above is already authoritative.
    try {
      await env.DB
        .prepare("UPDATE users SET plan='free', plan_source=NULL, plan_expires_at=NULL WHERE id=?")
        .bind(row.id).run();
    } catch { /* a read-only replica or a pre-migration DB — the downgrade still holds */ }
  }
  return row;
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
