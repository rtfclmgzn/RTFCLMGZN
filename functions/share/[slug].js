// RTFCLMGZN — legacy share-link redirect.
//
// HISTORY. This function used to serve per-article OG tags and then JS-redirect
// humans into the hash-routed SPA, because crawlers could not see past "/#/"
// (the 2026-08-13 purple-tree-unfurl incident — see git history for the full
// write-up, including why the redirect had to be JS-only back then).
//
// As of 2026-08-14 every article has a REAL server-rendered page at
// /article/<slug> (functions/article/[slug].js) carrying full per-article OG
// tags, JSON-LD, and the complete readable text. That page is strictly better
// for both crawlers and humans than an OG shim, so this route is now a plain
// 301 onto it. The old caution about redirects no longer applies: the target
// has its OWN correct OG tags, so a crawler following the redirect lands on
// exactly what we want it to index.
//
// Kept (rather than deleted) because every social post dispatched before
// 2026-08-14 links to /share/<slug> — those links must keep working forever.
// The query string (utm_* attribution) is preserved through the redirect.

export async function onRequest({ request, params }) {
  const url = new URL(request.url);
  const slug = encodeURIComponent(String(params.slug || ""));
  return Response.redirect(
    `${url.origin}/article/${slug}${url.search}`,
    301,
  );
}
