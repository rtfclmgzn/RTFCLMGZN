// THE OWNER'S NUMBERS — /api/admin/* (2026-08-17)
//
// Two routes. POST /api/admin/login trades the admin password for a signed,
// HttpOnly, 12-hour cookie. GET /api/admin/stats reads Cloudflare's own edge
// analytics (the same rumPageloadEventsAdaptiveGroups dataset the /pulse world
// map uses) and returns it shaped for the /admin page: totals, views by day,
// views by path, views by country.
//
// SECRETS LIVE IN THE DASHBOARD, NOT IN THIS FILE. This repo is public, so a
// password or token written here is published. Three environment variables,
// set in Cloudflare Pages -> Settings -> Environment variables (Production):
//
//   ADMIN_PASSWORD      the owner's sign-in password (pick a fresh one)
//   CF_ANALYTICS_TOKEN  an API token with Account Analytics : Read
//   CF_ZONE_TAG         this site’s zone tag (Cloudflare dashboard, zone Overview page)
//
// Until all three exist this endpoint answers 503 with instructions, which is
// the honest state, not a broken one.
//
// PRIVACY: nothing new is collected. Cloudflare already counts these at the
// edge; this endpoint only reads those counts. No reader-side script, no new
// cookie for readers, no IPs, no per-reader records.

const enc = (s) => new TextEncoder().encode(s);

async function hmacHex(key, msg) {
  const k = await crypto.subtle.importKey("raw", enc(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Constant-time-ish equality: compare digests, not the raw strings, so length
// and prefix information does not leak through timing.
async function pwEqual(a, b) {
  const da = await crypto.subtle.digest("SHA-256", enc("pw:" + a));
  const db = await crypto.subtle.digest("SHA-256", enc("pw:" + b));
  const xa = new Uint8Array(da), xb = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < xa.length; i++) diff |= xa[i] ^ xb[i];
  return diff === 0;
}

const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });

async function cookieValid(request, env) {
  const m = (request.headers.get("Cookie") || "").match(/rtfc_admin=(\d+)\.([a-f0-9]{64})/);
  if (!m) return false;
  if (+m[1] < Date.now()) return false;
  return (await hmacHex(env.ADMIN_PASSWORD, "admin:" + m[1])) === m[2];
}

const GQL = `query($zone:String!,$since:Date!,$until:Date!,$psince:Date!,$puntil:Date!){
  viewer{ zones(filter:{zoneTag:$zone}){
    byDay: rumPageloadEventsAdaptiveGroups(limit:100,filter:{date_geq:$since,date_leq:$until},orderBy:[date_ASC]){
      count sum{visits} dimensions{date} }
    prevDay: rumPageloadEventsAdaptiveGroups(limit:100,filter:{date_geq:$psince,date_leq:$puntil}){
      count sum{visits} }
    byPath: rumPageloadEventsAdaptiveGroups(limit:1000,filter:{date_geq:$since,date_leq:$until}){
      count sum{visits} dimensions{requestPath} }
    byCountry: rumPageloadEventsAdaptiveGroups(limit:250,filter:{date_geq:$since,date_leq:$until}){
      count sum{visits} dimensions{countryName} }
  }}}`;

// deviceType queried separately and tolerated on failure: if the field name
// ever drifts in Cloudflare's schema, the dashboard loses one table instead
// of everything.
const GQL_DEV = `query($zone:String!,$since:Date!,$until:Date!){
  viewer{ zones(filter:{zoneTag:$zone}){
    byDevice: rumPageloadEventsAdaptiveGroups(limit:10,filter:{date_geq:$since,date_leq:$until}){
      count sum{visits} dimensions{deviceType} }
  }}}`;

export async function onRequest({ request, env, params }) {
  const route = (params.route || []).join("/");

  if (!env.CF_ANALYTICS_TOKEN || !env.CF_ZONE_TAG) {
    return json({
      error: "Admin is not configured yet. In Cloudflare Pages -> Settings -> " +
        "Environment variables (Production), set CF_ANALYTICS_TOKEN (an API " +
        "token with Account Analytics: Read) and CF_ZONE_TAG (from the zone " +
        "Overview page), then redeploy. ADMIN_PASSWORD is optional: while it " +
        "is unset the dashboard is open; set it and the same page locks.",
    }, 503);
  }
  // OPEN MODE (owner's call, 2026-08-20): no ADMIN_PASSWORD set means no
  // sign-in. The dashboard is read-only edge analytics, and this site already
  // publishes its costs and a reader world map, so an open dashboard is in
  // character. Setting ADMIN_PASSWORD later locks it with zero code changes.
  const OPEN = !env.ADMIN_PASSWORD;

  if (route === "login" && request.method === "POST") {
    if (OPEN) return json({ ok: true, open: true });
    const body = await request.json().catch(() => ({}));
    if (!body.password || !(await pwEqual(String(body.password), env.ADMIN_PASSWORD))) {
      return json({ error: "Wrong password." }, 401);
    }
    const exp = Date.now() + 12 * 3600 * 1000;
    const sig = await hmacHex(env.ADMIN_PASSWORD, "admin:" + exp);
    return json({ ok: true }, 200, {
      "Set-Cookie": `rtfc_admin=${exp}.${sig}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`,
    });
  }

  if (!OPEN && !(await cookieValid(request, env))) return json({ error: "Sign in first." }, 401);

  if (route === "stats" && request.method === "GET") {
    const days = Math.min(90, Math.max(1, +(new URL(request.url).searchParams.get("days")) || 30));
    const until = new Date().toISOString().slice(0, 10);
    const since = new Date(Date.now() - (days - 1) * 864e5).toISOString().slice(0, 10);
    const puntil = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
    const psince = new Date(Date.now() - (2 * days - 1) * 864e5).toISOString().slice(0, 10);
    const gql = (query, variables) => fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}` },
      body: JSON.stringify({ query, variables }),
    });
    const r = await gql(GQL, { zone: env.CF_ZONE_TAG, since, until, psince, puntil });
    const out = await r.json().catch(() => null);
    const zone = out && out.data && out.data.viewer && out.data.viewer.zones && out.data.viewer.zones[0];
    if (!zone) {
      const why = out && out.errors && out.errors[0] && out.errors[0].message;
      return json({ error: "Cloudflare analytics query failed" + (why ? ": " + why : ".") }, 502);
    }
    const shape = (rows, dim, key) => (rows || [])
      .map((x) => ({ [key]: x.dimensions[dim], pageviews: x.count, visits: (x.sum && x.sum.visits) || 0 }))
      .sort((a, b) => b.pageviews - a.pageviews);
    const byDay = (zone.byDay || []).map((x) => ({
      date: x.dimensions.date, pageviews: x.count, visits: (x.sum && x.sum.visits) || 0,
    }));
    const total = byDay.reduce((m, r0) => ({ pageviews: m.pageviews + r0.pageviews, visits: m.visits + r0.visits }),
      { pageviews: 0, visits: 0 });
    const prevTotal = (zone.prevDay || []).reduce(
      (m, x) => ({ pageviews: m.pageviews + x.count, visits: m.visits + ((x.sum && x.sum.visits) || 0) }),
      { pageviews: 0, visits: 0 });
    let byDevice = [];
    try {
      const rd = await gql(GQL_DEV, { zone: env.CF_ZONE_TAG, since, until });
      const od = await rd.json();
      const zd = od && od.data && od.data.viewer && od.data.viewer.zones && od.data.viewer.zones[0];
      byDevice = shape(zd && zd.byDevice, "deviceType", "device");
    } catch (e) { /* one lost table, not a lost dashboard */ }
    return json({
      days, since, until, total, prevTotal, byDay, byDevice,
      byPath: shape(zone.byPath, "requestPath", "path"),
      byCountry: shape(zone.byCountry, "countryName", "country"),
    });
  }

  return json({ error: "Unknown admin route." }, 404);
}
