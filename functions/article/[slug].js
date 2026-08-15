/* Real article URLs — /article/<slug> — server-rendered for search engines.
 *
 * WHY (2026-08-14). The whole site is a hash-routed SPA: every article lives at
 * /#/article/<slug>, and everything after # never reaches a server or a
 * crawler. 100+ published articles were earning zero organic search traffic —
 * the site's own sitemap.xml admitted it in a comment. This function is the
 * fix: a Cloudflare Pages Function that renders every article as a complete,
 * crawlable HTML document at a real path, straight from the same data stores
 * the SPA reads, so it can never drift from what the app shows.
 *
 * Design constraints that shaped this file:
 *  - NO build step, NO framework. The stores are the source of truth; this
 *    renders them on request and caches. A new article is live at its real URL
 *    the moment its store commit deploys — nothing else to regenerate.
 *  - The data stores are JS files, not JSON: comments, unquoted keys, trailing
 *    commas appear in the hand-era files. Workers forbid eval, so parseStore()
 *    below is a small tolerant cleaner (string-aware) + JSON.parse. A store
 *    that still fails is SKIPPED, never fatal — SEO for 87 articles beats a
 *    500 for all of them.
 *  - Interactive components (charts, entity chips, TTS) stay in the SPA. Here
 *    each component renders its TEXT: the facts, the rows, the timeline — which
 *    is exactly what a crawler (and a reader on a slow connection) needs. Every
 *    page links to the interactive version in the app.
 */

const SITE = "https://rtfclmgzn.com";
const STORES = [
  "/data/newsroom-articles.js",
  "/data/live-articles.js",
  "/data/articles.js",
  "/data/research.js",
];

/* ---------- tolerant store parsing (no eval on Workers) ----------
 *
 * The legacy stores are hand-era JavaScript: // and block comments, unquoted
 * keys (slug:"..."), single-quoted strings CONTAINING double quotes, trailing
 * commas. Naive regex cleanup corrupts them — a comma inside a prose string
 * followed by a word and a colon looks exactly like an unquoted key. So this
 * is a single-pass tokenizer that only transforms OUTSIDE strings, and
 * re-emits every string as canonical JSON. */

function jsonish(raw) {
  let out = "", i = 0, lastSig = "";
  const isIdStart = (c) => /[A-Za-z_$]/.test(c), isId = (c) => /[A-Za-z0-9_$]/.test(c);
  while (i < raw.length) {
    const c = raw[i];
    if (c === '"' || c === "'") {
      const q = c; let s = ""; i++;
      while (i < raw.length && raw[i] !== q) {
        if (raw[i] === "\\") { s += raw[i] + (raw[i + 1] ?? ""); i += 2; continue; }
        s += raw[i++];
      }
      i++;
      if (q === "'") s = s.replace(/\\'/g, "'").replace(/"/g, '\\"');
      out += '"' + s + '"'; lastSig = '"'; continue;
    }
    if (c === "/" && raw[i + 1] === "/") { while (i < raw.length && raw[i] !== "\n") i++; continue; }
    if (c === "/" && raw[i + 1] === "*") { i += 2; while (i < raw.length && !(raw[i] === "*" && raw[i + 1] === "/")) i++; i += 2; continue; }
    if (isIdStart(c) && (lastSig === "{" || lastSig === "," || lastSig === "")) {
      let j = i; while (j < raw.length && isId(raw[j])) j++;
      let k = j; while (k < raw.length && /\s/.test(raw[k])) k++;
      if (raw[k] === ":") { out += '"' + raw.slice(i, j) + '"'; lastSig = '"'; i = j; continue; }
      out += raw.slice(i, j); lastSig = raw[j - 1]; i = j; continue;
    }
    if (c === ",") { // drop trailing commas
      let k = i + 1; while (k < raw.length && /\s/.test(raw[k])) k++;
      if (raw[k] === "}" || raw[k] === "]") { i++; continue; }
      out += c; lastSig = c; i++; continue;
    }
    out += c; if (!/\s/.test(c)) lastSig = c;
    i++;
  }
  return JSON.parse(out);
}

// Slice out one `window.<name> = [ ... ]` array by matching its brackets
// string-aware — personas.js carries several arrays in one file, so "take the
// last assignment to the last ]" grabs the wrong one there.
function sliceArray(text, startIdx) {
  let depth = 0, i = startIdx, inStr = null;
  for (; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (c === "\\") { i++; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === "[") depth++;
    else if (c === "]") { depth--; if (depth === 0) return text.slice(startIdx, i + 1); }
  }
  return null;
}

function parseStore(text, varName) {
  const re = varName
    ? new RegExp("window\\." + varName + "\\s*=\\s*(?=\\[)")
    : /window\.[A-Za-z_0-9]+\s*=\s*(?=\[)/g;
  const m = varName ? re.exec(text) : [...text.matchAll(re)].pop();
  if (!m) return null;
  const raw = sliceArray(text, m.index + m[0].length);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_) { /* fall through */ }
  try { return jsonish(raw); } catch (_) { return null; }
}

/* ---------- data loading, cached across requests in this isolate ---------- */

let CACHE = { at: 0, articles: null, personas: null };

async function loadAll(env, url) {
  if (CACHE.articles && Date.now() - CACHE.at < 60_000) return CACHE;
  const fetchText = async (path) => {
    try {
      const r = await env.ASSETS.fetch(new URL(path, url));
      return r.ok ? await r.text() : null;
    } catch (_) { return null; }
  };
  const articles = [];
  for (const p of STORES) {
    const t = await fetchText(p);
    const arr = t ? parseStore(t) : null;
    if (arr) articles.push(...arr);
  }
  let personas = {};
  const pt = await fetchText("/data/personas.js");
  const parr = pt ? parseStore(pt, "RTFC_PERSONAS") : null;
  if (parr) for (const p of parr) personas[p.key] = p;
  CACHE = { at: Date.now(), articles, personas };
  return CACHE;
}

/* ---------- rendering ---------- */

const esc = (s) => String(s ?? "").replace(/[&<>"']/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// mirrors the SPA's fmt(): **bold**, ==mark==, ++accent==, [label](url)
function fmt(s) {
  // Mirror of the client fmt() in web/assets/app.js — the marker vocabulary
  // must stay identical in both renderers (see the comment there).
  return esc(s)
    .replace(/\{\{note:\s*(.+?)\}\}/g, "<em>($1)</em>")
    .replace(/%%\s*(.+?)\s*\|\s*(.+?)\s*%%/g, "<strong>$1</strong> ($2)")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/==(.+?)==/g, "<mark>$1</mark>")
    .replace(/\+\+(.+?)\+\+/g, "<em>$1</em>")
    .replace(/__([^_]+?)__/g, "<u>$1</u>")
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
}

function kickerTitle(o) {
  let h = "";
  if (o.kicker) h += `<div class="kick">${esc(o.kicker)}</div>`;
  if (o.title) h += `<h3>${esc(o.title)}</h3>`;
  return h;
}

// Text-first rendering for every component the store can carry. Unknown or
// oddly-shaped payloads fall back to whatever labeled text they contain —
// never throw: one bad block must not take down the page (learned from the
// a.corrections crash of 2026-08-13).
function blockHTML(b) {
  try {
    const t = b.type;
    if (t === "p") return `<p>${fmt(b.text)}</p>`;
    if (t === "h2") return `<h2>${fmt(b.text)}</h2>`;
    if (t === "quote") return `<blockquote>${fmt(b.text)}</blockquote>`;
    if (t === "stat") return `<div class="comp"><div class="kick">${esc(b.label || "")}</div><p class="big">${esc(b.value || "")}</p></div>`;
    if (t === "keyfacts") {
      const k = b.keyfacts || {};
      return `<div class="comp">${kickerTitle(k)}<dl>` +
        (k.items || []).map((i) => `<dt>${esc(i.label)}</dt><dd>${fmt(i.value)}</dd>`).join("") + "</dl></div>";
    }
    if (t === "timeline") {
      const k = b.timeline || {};
      return `<div class="comp">${kickerTitle(k)}<ol class="tl">` +
        (k.items || []).map((i) => `<li><b>${esc(i.when)}</b> — ${fmt(i.what)}</li>`).join("") + "</ol></div>";
    }
    if (t === "ledger") {
      const k = b.ledger || {};
      return `<div class="comp">${kickerTitle(k)}<dl>` + (k.items || []).map((i) =>
        `<dt>${esc(i.value)}${i.unit ? " · " + esc(i.unit) : ""}</dt><dd>${fmt(i.label)}` +
        (i.includes ? `<br><small>Includes: ${fmt(i.includes)}</small>` : "") +
        (i.excludes ? `<br><small>Excludes: ${fmt(i.excludes)}</small>` : "") + "</dd>").join("") + "</dl></div>";
    }
    if (t === "compare") {
      const k = b.compare || {};
      const cols = k.columns || [];
      return `<div class="comp">${kickerTitle(k)}<table><thead><tr><th></th>` +
        cols.map((c) => `<th>${esc(c.label)}${c.sub ? `<br><small>${esc(c.sub)}</small>` : ""}</th>`).join("") +
        "</tr></thead><tbody>" + (k.rows || []).map((r) =>
          `<tr><th>${esc(r.label)}</th>` + (r.values || []).map((v) => `<td>${fmt(v)}</td>`).join("") + "</tr>").join("") +
        "</tbody></table>" + (k.source ? `<small>Source: ${fmt(k.source)}</small>` : "") + "</div>";
    }
    if (t === "rank") {
      const k = b.rank || {};
      return `<div class="comp">${kickerTitle(k)}<ol>` +
        (k.items || []).map((i) => `<li><b>${esc(i.label || i.name || "")}</b>${i.value ? " — " + fmt(String(i.value)) : ""}${i.note ? ` <small>${fmt(i.note)}</small>` : ""}</li>`).join("") + "</ol></div>";
    }
    // generic fallback: surface any labeled text the payload carries
    const k = b[t] || {};
    const items = (k.items || k.steps || k.rows || []).map((i) => {
      if (typeof i === "string") return `<li>${fmt(i)}</li>`;
      const bits = ["when", "label", "name", "claim", "what", "text", "value", "verdict", "note", "detail"]
        .map((f) => i[f]).filter(Boolean).map(String);
      return bits.length ? `<li>${bits.map(fmt).join(" — ")}</li>` : "";
    }).join("");
    if (k.kicker || k.title || items) {
      return `<div class="comp">${kickerTitle(k)}${k.text ? `<p>${fmt(k.text)}</p>` : ""}${items ? `<ul>${items}</ul>` : ""}</div>`;
    }
    return "";
  } catch (_) { return ""; }
}

function pageHTML(a, persona, related) {
  const url = `${SITE}/article/${a.slug}`;
  const img = a.image ? `${SITE}/${String(a.image).replace(/^\//, "")}` : `${SITE}/assets/brand/rtfc-glyph-512.png`;
  const author = persona ? persona.name : "RTFCLMGZN Newsroom";
  const desc = esc(a.dek || a.title).slice(0, 300);
  const body = (a.body || []).map(blockHTML).join("\n");
  const tldr = (a.tldr && a.tldr.length)
    ? `<div class="comp"><div class="kick">The story at a glance</div><ul>${a.tldr.map((t) => `<li>${fmt(t)}</li>`).join("")}</ul></div>` : "";
  const sources = (a.sources && a.sources.length)
    ? `<section><h2>Sources</h2><ol>${a.sources.map((s) =>
        `<li><a href="${esc(s.url)}" rel="noopener">${esc(s.label)}</a></li>`).join("")}</ol></section>` : "";
  const rel = related.length
    ? `<section><h2>More from ${esc(a.section || "the newsroom")}</h2><ul>${related.map((r) =>
        `<li><a href="/article/${esc(r.slug)}">${esc(r.title)}</a></li>`).join("")}</ul></section>` : "";
  const ld = {
    "@context": "https://schema.org", "@type": "NewsArticle",
    headline: a.title, description: a.dek || "", image: [img],
    datePublished: a.publishedAt, dateModified: a.publishedAt,
    author: [{ "@type": "Person", name: author }],
    publisher: { "@type": "Organization", name: "RTFCLMGZN", logo: { "@type": "ImageObject", url: `${SITE}/assets/brand/rtfc-glyph-512.png` } },
    mainEntityOfPage: url, isAccessibleForFree: true,
  };
  const disclaimer = a.disclaimer === "not-financial-advice"
    ? `<p class="disc">This is not financial or investment advice. For information only.</p>`
    : a.disclaimer === "not-medical-advice"
      ? `<p class="disc">This is not medical advice. For information only.</p>` : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(a.title)} — RTFCLMGZN</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${url}">
<link rel="icon" href="/assets/img/icon-192.png">
<link rel="alternate" type="application/rss+xml" title="RTFCLMGZN" href="/rss.xml">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(a.title)}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:site_name" content="RTFCLMGZN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(a.title)}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${esc(img)}">
<meta property="article:published_time" content="${esc(a.publishedAt || "")}">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>
:root{color-scheme:dark}
body{margin:0;background:#0b0714;color:#e8e4f4;font:17px/1.65 Georgia,'Times New Roman',serif}
a{color:#b9a5ff}
.wrap{max-width:720px;margin:0 auto;padding:24px 20px 60px}
header.site{display:flex;align-items:center;gap:10px;padding:18px 0;border-bottom:1px solid #2c2440;
  font:700 15px/1 system-ui,sans-serif;letter-spacing:.06em}
header.site img{width:28px;height:28px}
header.site a{color:#e8e4f4;text-decoration:none}
.sect{font:700 11px/1 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#8b7cf7;margin:26px 0 10px}
h1{font-size:34px;line-height:1.18;margin:6px 0 12px}
.dek{font-size:19px;color:#b6aecf;margin:0 0 14px}
.byline{font:13px/1.5 system-ui,sans-serif;color:#8f87a8;border-bottom:1px solid #2c2440;padding-bottom:16px}
img.cover{width:100%;border-radius:12px;margin:20px 0}
h2{font-size:23px;margin-top:34px}
blockquote{border-left:3px solid #6018f0;margin:20px 0;padding:4px 0 4px 18px;color:#cfc6ea;font-style:italic}
.comp{border:1px solid #2c2440;border-radius:12px;padding:16px 18px;margin:22px 0;font:14.5px/1.6 system-ui,sans-serif}
.comp .kick{font-size:10.5px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:#8b7cf7;margin-bottom:6px}
.comp h3{margin:0 0 10px;font-size:16px}
.comp dl{margin:0}.comp dt{font-weight:700;color:#fff;margin-top:8px}.comp dd{margin:0 0 4px;color:#b6aecf}
.comp table{border-collapse:collapse;width:100%}.comp th,.comp td{border-top:1px solid #2c2440;padding:6px 8px;text-align:left;vertical-align:top}
.comp .big{font-size:26px;font-weight:700;margin:2px 0}
.tl li{margin:8px 0}
.appnote{border:1px solid #2c2440;border-radius:12px;padding:14px 18px;margin:28px 0;font:14px/1.6 system-ui,sans-serif;color:#b6aecf}
.disc{font:13px/1.5 system-ui,sans-serif;color:#8f87a8;border:1px solid #2c2440;border-radius:10px;padding:10px 14px}
footer{margin-top:40px;border-top:1px solid #2c2440;padding-top:18px;font:13px/1.7 system-ui,sans-serif;color:#8f87a8}
small{color:#8f87a8}
</style>
</head>
<body>
<div class="wrap">
<header class="site"><img src="/assets/brand/rtfc-glyph-128.png" alt=""><a href="/">RTFCLMGZN — ARTIFICIAL MAGAZINE</a></header>
<div class="sect">${esc(a.section || "News")}${a.format ? " — " + esc(a.format) : ""}</div>
<h1>${esc(a.title)}</h1>
<p class="dek">${esc(a.dek || "")}</p>
<p class="byline">By ${esc(author)}${persona && persona.beat ? " · " + esc(persona.beat) : ""} · ${esc((a.publishedAt || "").slice(0, 10))} · Written by AI, disclosed proudly — <a href="/pulse">watch the newsroom run</a></p>
${a.image ? `<img class="cover" src="/${esc(String(a.image).replace(/^\//, ""))}" alt="">` : ""}
${disclaimer}
<article>
${body}
${tldr}
</article>
<div class="appnote">Read this piece with live charts, the entity layer and text-to-speech in the
<a href="/article/${esc(a.slug)}">interactive reader</a>. Every article on RTFCLMGZN is produced by an
autonomous AI newsroom — <a href="/usage">its full cost ledger is public</a>.</div>
${sources}
${rel}
<footer>© RTFCLMGZN · <a href="/">Home</a> · <a href="/rss.xml">RSS</a> · <a href="/archive">Archive</a></footer>
</div>
</body>
</html>`;
}

/* ---------- handler ---------- */

export async function onRequest({ request, env, params }) {
  const slug = String(params.slug || "").toLowerCase();
  const { articles, personas } = await loadAll(env, request.url);
  const a = articles.find((x) => x && String(x.slug).toLowerCase() === slug);
  if (!a) {
    return new Response(
      `<!doctype html><meta charset="utf-8"><title>Not found — RTFCLMGZN</title>` +
      `<body style="background:#0b0714;color:#e8e4f4;font:17px system-ui;padding:60px 20px;text-align:center">` +
      `<h1>That story isn't here.</h1><p><a style="color:#b9a5ff" href="/">Back to the newsroom →</a></p>`,
      { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
  }
  const related = articles
    .filter((x) => x && x.slug !== a.slug && x.section === a.section && x.title)
    .sort((x, y) => new Date(y.publishedAt || 0) - new Date(x.publishedAt || 0))
    .slice(0, 4);
  return new Response(pageHTML(a, personas[a.persona], related), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // edge-cache 10 min: a new deploy purges Pages caches anyway, and the
      // in-isolate store cache is 60s, so staleness is bounded and cheap.
      "cache-control": "public, max-age=300, s-maxage=600",
    },
  });
}
