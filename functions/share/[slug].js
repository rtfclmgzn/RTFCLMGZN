// RTFCLMGZN — per-article share pages for social link previews.
//
// Why this exists: the site is a hash-routed SPA, so crawlers (Facebook,
// Bluesky, Threads, X, Slack...) can never see past "/#/" and every article
// link used to unfurl with the SAME site-level card (the purple-tree og.jpg —
// the 2026-08-13 incident). This function serves real per-article OG tags to
// crawlers, then instantly redirects humans into the SPA article.
//
// URL shape produced by the social dispatcher:
//   https://rtfclmgzn.com/share/<slug>?utm_source=...
// Redirect target keeps the query string:
//   /?utm_source=...#/article/<slug>

const DATA_FILES = [
  "/data/newsroom-articles.js", // strict JSON body — parsed properly
  "/data/live-articles.js",     // legacy JS literal — best-effort fallback
  "/data/articles.js",
];

const SITE_NAME = "RTFCLMGZN — artificial magazine";
const FALLBACK_IMAGE = "/assets/img/og.jpg";

function unescapeJson(raw) {
  try {
    return JSON.parse('"' + raw + '"');
  } catch {
    return raw;
  }
}

function findField(windowText, field) {
  const re = new RegExp('["\']?' + field + '["\']?\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"');
  const m = windowText.match(re);
  return m ? unescapeJson(m[1]) : "";
}

function arrayBody(text) {
  const eq = text.indexOf("=");
  const start = text.indexOf("[", eq);
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) return null;
  return text.slice(start, end + 1);
}

function lookupInText(text, slug) {
  const body = arrayBody(text);
  if (!body) return null;
  // Preferred: the current data file is strict JSON — exact extraction.
  try {
    const data = JSON.parse(body);
    for (const entry of data) {
      if (entry && entry.slug === slug) {
        return { title: entry.title || "", dek: entry.dek || "",
                 image: entry.image || "" };
      }
    }
    return null; // parsed fine, slug simply not in this file
  } catch {
    // Legacy JS-literal file: entry-bounded window heuristic. The window is
    // cut at the NEXT entry's slug so we can never steal a neighbour's image.
    for (const pattern of ['"slug": "' + slug + '"', '"slug":"' + slug + '"']) {
      const idx = body.indexOf(pattern);
      if (idx < 0) continue;
      const nextSlug = body.indexOf('"slug"', idx + pattern.length);
      const back = Math.max(0, idx - 8000);
      const fwd = nextSlug > 0 ? Math.min(nextSlug, idx + 8000) : idx + 8000;
      const win = body.slice(back, fwd);
      return {
        title: findField(win, "title"),
        dek: findField(win, "dek"),
        image: findField(win, "image"),
      };
    }
    return null;
  }
}

async function lookupArticle(slug, request, env) {
  for (const file of DATA_FILES) {
    try {
      const resp = await env.ASSETS.fetch(new URL(file, request.url));
      if (!resp.ok) continue;
      const found = lookupInText(await resp.text(), slug);
      if (found) return found;
    } catch {
      continue;
    }
  }
  return null;
}

function esc(value) {
  return String(value || "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const slug = String(params.slug || "").slice(0, 200);
  const origin = new URL(request.url).origin;
  const query = new URL(request.url).search; // keeps utm_* intact
  const target = origin + "/" + query + "#/article/" + slug;

  const article = (await lookupArticle(slug, request, env)) || {};
  const title = article.title || SITE_NAME;
  const description = article.dek ||
    "AI news, written by AI, about AI — fully autonomous newsroom.";
  const imagePath = article.image ? "/" + String(article.image).replace(/^\/+/, "")
                                  : FALLBACK_IMAGE;
  const image = origin + imagePath;

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta property="og:type" content="article">
<meta property="og:site_name" content="${esc(SITE_NAME)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(origin + "/share/" + slug)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
<link rel="canonical" href="${esc(target)}">
<script>location.replace(${JSON.stringify(target)});</script>
</head><body>
<p>Taking you to the article… <a href="${esc(target)}">${esc(title)}</a></p>
</body></html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=600",
    },
  });
}
