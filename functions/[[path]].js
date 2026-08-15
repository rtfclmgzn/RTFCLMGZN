// THE APP-ROUTE SERVER — every page that is not an article or an API call.
//
// WHY THIS REPLACED `_redirects` (2026-08-15)
//
// The site moved off `#/` fragments so that every page would have a real,
// crawlable URL. `web/_redirects` was supposed to make those URLs survive a
// cold visit by proxying each one to `/index.html` at status 200. Measured on
// the live site, it did neither of the two things it was there for:
//
//   /usage, /extensions, /magazine, /scoreboard, ... (37 exact paths)
//       matched, proxied to /index.html — and Cloudflare Pages canonicalises a
//       request for /index.html by REDIRECTING it to /. So every one of those
//       URLs 301'd to the homepage. Shared links, Google results and refreshes
//       all landed on the front page instead of the page they named.
//
//   /read/*, /section/*, /persona/*, /editor/*, /company/*, /issue/*
//       returned a hard 404. Splat rules are not honoured for status-200
//       proxies, so the magazine reader, every section page, every editor page
//       and every company dossier did not exist to anyone arriving from
//       outside the app.
//
// A Function has neither problem: it answers the original URL itself, so there
// is no redirect to inherit and no pattern language to depend on.
//
// THE THREE RULES THIS FILE FOLLOWS
//
//  1. A real file always wins. Every request asks the asset server first, and
//     whatever it says — including a 404 — is returned unless rule 3 applies.
//     A Function that shadows /assets/app.js is a worse outage than the one it
//     fixes.
//  2. Only a KNOWN route gets the shell. Serving the app for any unmatched path
//     turns every typo into a 200 that renders "page not found" — a soft 404,
//     which search engines index and then distrust the whole site for. Unknown
//     paths keep their honest 404.
//  3. The URL never changes. The shell is served AT the requested path, so the
//     address bar, the canonical link and the router all agree.
//
// ADDING A ROUTE means adding it here as well as to route() in app.js,
// ROUTE_HEADS, and gen_sitemap.py. site_guard.py::check_route_plumbing fails
// the build if this list and the router ever disagree.

// Single-segment pages: /buzz, /usage, /magazine ...
const EXACT = new Set([
  "buzz", "archive", "magazine", "guides", "briefing",
  "resources", "labs", "podcasts", "extensions", "prompts", "scoreboard",
  "dictionary", "grid", "wallpapers", "companies",
  "pulse", "control-room", "usage", "transparency", "masthead", "review",
  "claims", "ledger-claims", "predictions", "ledger", "corrections", "design",
  "live", "livetv", "events",
  "library", "account", "settings",
  "contact", "connect", "privacy", "terms",
]);

// Prefixes that own everything beneath them: /read/primer, /company/openai ...
const PREFIX = new Set([
  "section", "persona", "editor", "company", "issue", "read",
]);

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // RULE 1 — a real file always wins.
  const asset = await env.ASSETS.fetch(request);
  if (asset.status !== 404) return asset;

  // RULE 2 — only a known route gets the shell.
  const parts = url.pathname.split("/").filter(Boolean);
  const head = parts[0] || "";
  const known = parts.length === 1
    ? EXACT.has(head)
    : parts.length > 1 && PREFIX.has(head);
  if (!known) return asset;                      // honest 404, unchanged

  // RULE 3 — serve the shell at the requested URL.
  // Fetched from "/" and never "/index.html": asking for the file by name is
  // what triggered the canonical redirect that broke every page above.
  const shell = await env.ASSETS.fetch(new URL("/", url).toString());
  if (!shell.ok) return asset;

  const headers = new Headers(shell.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  // The shell is identical for every route; the router decides what renders.
  // Short browser life, longer edge life, and it changes only on deploy.
  headers.set("cache-control", "public, max-age=300, s-maxage=3600");
  return new Response(shell.body, { status: 200, headers });
}
