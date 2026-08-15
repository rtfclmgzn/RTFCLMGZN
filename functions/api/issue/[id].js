// Cloudflare Pages Function — the magazine paywall, enforced on the SERVER.
// Route: GET /api/issue/<id>
//
// WHY THIS EXISTS
// Until this file, the paid issue was gated in the browser and nowhere else.
// `web/index.html` loaded `data/issue-001.js` on EVERY page view, so the whole
// 59-spread paid issue was one `curl https://rtfclmgzn.com/data/issue-001.js`
// away for anybody, signed in or not, subscriber or not. The lock icon in the
// reader was decoration. Paywalls that live in the client are not paywalls;
// they are a request. This endpoint is the actual gate: the only way to the
// paid payload is a response this file decided to write.
//
// THE SECOND HOLE, AND WHY THE PAYLOAD MOVED TO KV (2026-08-14)
// The first fix moved the payload out of `web/` and into `_data/`, bundled into
// the Functions build so it could never be served as a static asset. That was
// correct about the SITE and wrong about the WORLD: this repository is public.
// `raw.githubusercontent.com/.../functions/api/issue/_data/issue-002.json`
// returned all 119KB of a Plus issue to anyone who thought to look. The gate
// below worked perfectly the whole time; the file behind it was simply also
// published somewhere else.
//
// So paid payloads no longer live in the repository at all. They live in a KV
// namespace bound as `ISSUES`, which exists only inside the Cloudflare account
// and is readable only by this code. The repo stays public (that is what keeps
// GitHub Actions minutes free), and there is nothing paid inside it to leak.
//
// The Primer stays bundled and imported. It is free forever, byte-identical for
// every reader, and worth serving from the edge with no lookup at all — there
// is nothing to protect and a KV read would only make it slower.
//
// THE CONTRACT (a client agent is coded against exactly this)
//   200 {"ok":true,"issue":{...}}            free issue, or session plan === "plus"
//   402 {"ok":false,"error":"plus-required"} a paid issue and the reader is not Plus
//   404 {"ok":false,"error":"unknown-issue"} no issue with that id
//   503 {"ok":false,"error":"issue-unavailable"} entitled, but the payload could
//       not be loaded (missing binding, missing key, malformed JSON). A
//       subscriber who paid gets an honest "try again", never a 402 implying
//       they need to buy what they already own, and never a 200 with nothing.
//
// FAILS CLOSED, EVERY PATH. A missing D1 binding, a thrown session lookup, a
// mangled cookie, a KV outage — all of them refuse. The failure mode of a
// paywall must be "a subscriber has to try again," never "everyone reads free."

import { getSessionUser } from "../_lib/auth.js";
import primer from "./_data/primer.json";

// WHAT EXISTS AND WHAT IT COSTS. This catalogue carries no content — only which
// ids are real and which are paid — so it is safe in a public repo and cheap to
// consult before any auth or KV work happens. `kv:true` means "the payload is
// in the ISSUES namespace under this id".
//
// ADDING AN ISSUE: add its id here with kv:true, and put the payload in KV
// under the same key. Never commit a paid payload to this repository again.
const CATALOG = {
  "issue-001": { access: "plus", kv: true },   // "The First Half" — July 2026
  "issue-002": { access: "plus", kv: true },   // "The Reckoning" — August 2026
  primer: { access: "free", bundled: primer },
};

// A free issue is byte-identical for every reader, so it is worth caching hard:
// the browser holds it for FREE_BROWSER_MAX_AGE and Cloudflare's edge holds it
// for FREE_EDGE_MAX_AGE. The payload only changes on deploy, and a deploy
// changes the whole bundle, so a long edge life is safe.
const FREE_BROWSER_MAX_AGE = 600;    // 10 minutes in the reader's own browser
const FREE_EDGE_MAX_AGE = 86400;     // 24 hours at the edge (s-maxage)

// Every response about a PAID issue — the granted one and the denied one alike.
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

// Read a paid payload out of KV. Returns null on ANY problem — no binding, no
// key, unparseable JSON, a thrown read. The caller turns null into a 503; this
// function never invents a fallback, because the only fallback available would
// be shipping something we cannot verify is the right issue.
async function loadFromKV(env, id) {
  try {
    if (!env || !env.ISSUES || typeof env.ISSUES.get !== "function") return null;
    const doc = await env.ISSUES.get(id, { type: "json" });
    if (!doc || typeof doc !== "object") return null;
    return doc;
  } catch (_) {
    return null;
  }
}

export async function onRequestGet(context) {
  const { request, env, params } = context;

  // `[id].js` yields a string; be defensive anyway — a `[[catch-all]]` sibling
  // added later would hand an array through the same shape.
  const raw = params && params.id;
  const id = String(Array.isArray(raw) ? raw[0] : raw || "").trim().toLowerCase();

  const entry = Object.prototype.hasOwnProperty.call(CATALOG, id) ? CATALOG[id] : null;
  if (!entry) {
    // Unknown ids are decided before any auth or KV work: the answer does not
    // depend on who is asking, and 404 is cheap and cacheable.
    return respond({ ok: false, error: "unknown-issue" }, 404, "public, max-age=300");
  }

  // FREE PATH — and note what it deliberately does NOT do: it never looks at
  // the session. Reading the cookie here would make the response reader-specific
  // and quietly poison the shared edge cache. The Primer is free forever; it
  // should be as fast for a signed-out reader as for a subscriber.
  if (entry.access !== "plus") {
    return respond(
      { ok: true, issue: entry.bundled },
      200,
      `public, max-age=${FREE_BROWSER_MAX_AGE}, s-maxage=${FREE_EDGE_MAX_AGE}`
    );
  }

  // PAID PATH. Entitlement is checked BEFORE the payload is fetched — a reader
  // who is not a subscriber must never cause a read of the thing they cannot
  // have, and it keeps the denial path free of any dependency that could fail
  // open.
  let user = null;
  try {
    if (env && env.DB) user = await getSessionUser(request, env);
  } catch (e) {
    // A D1 blip, an expired-session race, a mangled cookie. Deny and let the
    // reader retry — never fall through into serving the issue.
    user = null;
  }

  if (!user || user.plan !== "plus") {
    return respond({ ok: false, error: "plus-required" }, 402, NO_STORE);
  }

  const issue = await loadFromKV(env, id);
  if (!issue) {
    // Entitled, and we still could not produce it. Say so plainly: this is our
    // failure, not the reader's, and the status code should not imply they owe
    // us money for something they have already bought.
    return respond({ ok: false, error: "issue-unavailable" }, 503, NO_STORE);
  }

  return respond({ ok: true, issue }, 200, NO_STORE);
}
