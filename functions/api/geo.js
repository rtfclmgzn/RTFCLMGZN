// Cloudflare Pages Function — global reader geography, country level only.
// Routes: GET /api/geo  (read the worldwide aggregate)
//         POST /api/geo (record that a visit landed, then return the aggregate)
//
// WHY THIS EXISTS
// The Control Room's reader map used to tally visits in the VISITOR'S OWN
// localStorage, which meant every reader saw exactly one lit country: their own.
// The map was captioned "where the world reads from" and was structurally
// incapable of showing that. This endpoint is the fix: the count is kept once,
// server-side, so the map shows the same real picture to everybody.
//
// WHAT IS STORED
// Two tables, both in the D1 database that already backs accounts (env.DB):
//   geo_hits (country, day, n)  — a counter. That is the whole payload: an ISO
//                                 3166-1 alpha-2 code, a date, and an integer.
//   geo_seen (fp, day)          — a deduplication fingerprint, held for 2 days
//                                 and then deleted.
//
// The fingerprint is sha256(day + salt + client IP + user agent) truncated to
// 20 hex characters. It is one-way, it changes at every UTC midnight because the
// day is inside the hash, and it is purged after two days, so it cannot be used
// to follow anyone across days or to recover an address. No IP is ever written.
// This is the same shape as Plausible's daily-rotating salt approach, and it is
// what makes the number defensible: without it the counter would be a count of
// browser sessions that anyone could inflate by pressing reload.
//
// WHAT IS NOT STORED: no IP, no cookie, no session id, no path, no referrer, no
// account link. A signed-in reader and an anonymous one are indistinguishable
// here. The country comes from request.cf.country, which Cloudflare resolves at
// the edge, so no third-party geolocation service is contacted.
//
// FAILS CLOSED: with no D1 binding this returns 503 not-configured and the
// client falls back to a clearly labelled local-only map. Shipping this file
// before the table exists is safe; the table is created on first use.

import { json, notConfigured } from "./_lib/auth.js";

const WINDOW_DAYS = 30;   // the recency window the map colours by
const KEEP_SEEN_DAYS = 2; // how long a dedup fingerprint survives before purge

function today() { return new Date().toISOString().slice(0, 10); }
function dayOffset(n) { return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10); }

// Cloudflare uses T1 for Tor exits and XX when it cannot place the request.
// Neither is a country, so neither gets counted.
function countryOf(request) {
  const cc = (request.cf && request.cf.country) || "";
  return /^[A-Z]{2}$/.test(cc) && cc !== "T1" && cc !== "XX" ? cc : null;
}

const DDL = [
  "CREATE TABLE IF NOT EXISTS geo_hits (country TEXT NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (country, day))",
  "CREATE TABLE IF NOT EXISTS geo_seen (fp TEXT PRIMARY KEY, day TEXT NOT NULL)",
  "CREATE INDEX IF NOT EXISTS geo_seen_day ON geo_seen (day)"
];

// Self-provisioning, so this file can be deployed with no migration step and no
// dashboard visit. Belt and braces on purpose: D1 wraps batch() in a transaction
// and DDL inside a transaction is exactly the kind of thing a platform changes
// its mind about, so a batch failure falls back to running the statements one at
// a time, and a failure of BOTH still lets the request through -- if the tables
// already exist (the overwhelmingly common case after the first request) the
// queries below work regardless, and if they genuinely do not, the caller gets
// an error and the client shows its honest local-only map. The one outcome
// worth ruling out is a schema hiccup silently disabling the counter forever.
let schemaReady = false;
async function ensureSchema(env) {
  if (schemaReady) return;
  try {
    await env.DB.batch(DDL.map((sql) => env.DB.prepare(sql)));
  } catch (e) {
    try {
      for (const sql of DDL) await env.DB.prepare(sql).run();
    } catch (e2) { /* fall through: the tables are probably already there */ }
  }
  schemaReady = true;
}

async function fingerprint(request, env) {
  const ip = request.headers.get("cf-connecting-ip") || "";
  const ua = request.headers.get("user-agent") || "";
  if (!ip) return null;
  const salt = env.GEO_SALT || "rtfclmgzn-geo";
  const bytes = new TextEncoder().encode(today() + "|" + salt + "|" + ip + "|" + ua);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).slice(0, 10)
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function aggregate(env) {
  const since = dayOffset(WINDOW_DAYS);
  const rows = await env.DB.prepare(
    `SELECT country,
            SUM(n) AS total,
            SUM(CASE WHEN day >= ? THEN n ELSE 0 END) AS recent,
            MAX(day) AS last
       FROM geo_hits
      GROUP BY country`
  ).bind(since).all();

  const countries = {};
  let total = 0, recentTotal = 0, firstDay = "";
  for (const r of rows.results || []) {
    const n = r.total || 0, rec = r.recent || 0;
    if (!n) continue;
    countries[r.country] = { n: n, r: rec, last: r.last || "" };
    total += n; recentTotal += rec;
  }
  const first = await env.DB.prepare("SELECT MIN(day) AS d FROM geo_hits").first();
  firstDay = (first && first.d) || "";

  return {
    ok: true,
    total: total,
    recentTotal: recentTotal,
    countries: countries,
    windowDays: WINDOW_DAYS,
    since: since,
    firstDay: firstDay,
    asOf: today()
  };
}

// GET is a pure read. It is safe to cache briefly at the edge — a reader map
// that is two minutes stale is still a true reader map, and this keeps a busy
// day from turning into one D1 query per pageview.
export async function onRequestGet(context) {
  const { env } = context;
  if (!env || !env.DB) return notConfigured();
  await ensureSchema(env);
  const data = await aggregate(env);
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "public, max-age=120" }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env || !env.DB) return notConfigured();
  const cc = countryOf(request);
  if (!cc) return json({ ok: false, error: "no-country" }, 200);

  await ensureSchema(env);
  const fp = await fingerprint(request, env);

  let counted = false;
  if (fp) {
    // INSERT OR IGNORE is the whole dedup: the first visit from this fingerprint
    // today inserts a row and reports one change; every later one reports zero.
    const ins = await env.DB
      .prepare("INSERT OR IGNORE INTO geo_seen (fp, day) VALUES (?, ?)")
      .bind(fp, today()).run();
    counted = !!(ins.meta && ins.meta.changes);
  }

  if (counted) {
    await env.DB.prepare(
      "INSERT INTO geo_hits (country, day, n) VALUES (?, ?, 1) ON CONFLICT(country, day) DO UPDATE SET n = n + 1"
    ).bind(cc, today()).run();

    // Opportunistic purge rather than a cron: roughly one write in fifty clears
    // out fingerprints past their two-day life. Nothing depends on it running
    // on schedule, only on it running eventually.
    if (Math.random() < 0.02) {
      await env.DB.prepare("DELETE FROM geo_seen WHERE day < ?")
        .bind(dayOffset(KEEP_SEEN_DAYS)).run();
    }
  }

  const data = await aggregate(env);
  data.counted = counted;
  data.you = cc;
  return json(data);
}
