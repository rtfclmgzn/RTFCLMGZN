// Cloudflare Pages Function — the magazine paywall, enforced on the SERVER.
// Route: GET /api/issue/<id>
//
// WHY THIS EXISTS
// Until this file, the paid issue was gated in the browser and nowhere else.
// `web/index.html` loaded `data/issue-001.js` on EVERY page view, so the whole
// 59-spread paid issue was one `curl https://rtfclmgzn.com/data/issue-001.js`
// away for anybody, signed in or not, subscriber or not. The lock icon in the
// reader was decoration. Paywalls that live in the client are not paywalls;
// they are a request. This endpoint is the actual gate: the paid payload now
// exists only inside the Functions bundle, and the only way out of it is a
// response this file decided to write.
//
// THE CONTRACT (a client agent is coded against exactly this)
//   200 {"ok":true,"issue":{...}}            free issue, or session plan === "plus"
//   402 {"ok":false,"error":"plus-required"} a paid issue and the reader is not Plus
//   404 {"ok":false,"error":"unknown-issue"} no issue with that id
//
// WHERE THE PAYLOAD LIVES
// `_data/issue-001.json` and `_data/primer.json`, imported below. Pages bundles
// Functions with esbuild, so these are inlined at BUILD time -- no filesystem
// read, no KV lookup, no cold-start fetch, and no separate deploy step to keep
// in sync. The leading underscore keeps `_data/` out of the Pages router (same
// convention as `_lib/`), so the JSON is never served as a static asset either.
// That matters: shipping it under `web/` would recreate the exact hole this
// file closes.
//
// FAILS CLOSED. Every path that cannot positively establish Plus returns 402.
// A missing D1 binding, a thrown session lookup, a malformed cookie -- all of
// them deny. The failure mode of a paywall must be "a subscriber has to sign in
// again," never "everyone reads it for free."

import { getSessionUser } from "../_lib/auth.js";
import issue001 from "./_data/issue-001.json";
import issue002 from "./_data/issue-002.json";
import primer from "./_data/primer.json";

// The whole catalogue. `access` is read off the payload itself rather than kept
// in a second list here, so an issue cannot be free in one place and paid in
// another -- the issue object is the single source of truth for its own price.
const ISSUES = {
  "issue-001": issue001,   // "The First Half" — July 2026
  "issue-002": issue002,   // "The Reckoning" — August 2026
  primer: primer,
};

// A free issue is byte-identical for every reader, so it is worth caching hard:
// the browser holds it for FREE_BROWSER_MAX_AGE and Cloudflare's edge holds it
// for FREE_EDGE_MAX_AGE. The payload only changes on deploy, and a deploy
// changes the whole bundle, so a long edge life is safe.
const FREE_BROWSER_MAX_AGE = 600;    // 10 minutes in the reader's own browser
const FREE_EDGE_MAX_AGE = 86400;     // 24 hours at the edge (s-maxage)

// Every response about a PAID issue -- the granted one and the denied one alike.
// The denial must be as uncacheable as the grant: a 402 cached at the edge for a
// paid id would be served to the next reader who *is* a subscriber, locking a
// paying customer out of what they bought.
const NO_STORE = "private, no-store";

function respond(body, status, cacheControl) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl,
      // Names the axis the answer varies on. Belt-and-braces next to no-store,
      // and it keeps any intermediary from treating one reader's copy as
      // everyone's.
      vary: "Cookie",
    },
  });
}

export async function onRequestGet(context) {
  const { request, env, params } = context;

  // `[id].js` yields a string; be defensive anyway -- a `[[catch-all]]` sibling
  // added later would hand an array through the same shape.
  const raw = params && params.id;
  const id = String(Array.isArray(raw) ? raw[0] : raw || "").trim().toLowerCase();

  const issue = Object.prototype.hasOwnProperty.call(ISSUES, id) ? ISSUES[id] : null;
  if (!issue) {
    // Unknown ids are decided before any auth work: the answer does not depend
    // on who is asking, and 404 is cheap and cacheable.
    return respond({ ok: false, error: "unknown-issue" }, 404, "public, max-age=300");
  }

  // FREE PATH -- and note what it deliberately does NOT do: it never looks at
  // the session. Reading the cookie here would make the response reader-specific
  // and quietly poison the shared edge cache. The Primer is free forever; it
  // should be as fast for a signed-out reader as for a subscriber.
  if (issue.access !== "plus") {
    return respond({ ok: true, issue }, 200, `public, max-age=${FREE_BROWSER_MAX_AGE}, s-maxage=${FREE_EDGE_MAX_AGE}`);
  }

  // PAID PATH. Anything short of a live session carrying plan "plus" is 402.
  let user = null;
  try {
    if (env && env.DB) user = await getSessionUser(request, env);
  } catch (e) {
    // A D1 blip, an expired-session race, a mangled cookie. Deny and let the
    // reader retry -- never fall through into serving the issue.
    user = null;
  }

  if (!user || user.plan !== "plus") {
    return respond({ ok: false, error: "plus-required" }, 402, NO_STORE);
  }

  return respond({ ok: true, issue }, 200, NO_STORE);
}
