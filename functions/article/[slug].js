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

// The publication's identity comes from the same file the app and the checks
// read. Bundled at build time (esbuild inlines JSON imports), so it costs no
// request and can never disagree with the site it renders for.
import ENGINE from "../../engine.config.json";
const SITE = ENGINE.web.site_url;
const SITE_NAME = ENGINE.identity.name;
const SITE_TAGLINE = ENGINE.identity.tagline;
// EVERY STORE THE APP RENDERS AT /article/, WITHOUT EXCEPTION.
//
// guides.js was missing here until 2026-08-15 and the consequence was invisible
// from inside the site: app.js looks up a slug across ARTICLES *and* GUIDES, so
// clicking a guide card on /guides worked perfectly. It was only ever broken for
// people who arrived from outside — a shared link, a refresh, Googlebot — and
// they got a 404 on all six guides. The two readers must agree on which stores
// exist or a URL is real in one place and fictional in the other.
// site_guard.py::check_ssr_store_parity() now fails the build on any drift.
const STORES = [
  "/data/newsroom-articles.js",
  "/data/live-articles.js",
  "/data/articles.js",
  "/data/research.js",
  "/data/guides.js",
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
    // Internal links (/company/openai, /dictionary) AND external ones. The
    // pattern used to match only https?:, so every internal link in an article
    // body printed as literal "[OpenAI](#/company/openai)" markdown on the page
    // that every visitor from X, Google or a shared link actually sees. 129 of
    // them were live. `#/` is tolerated so older records still render as links.
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" rel="noopener" target="_blank">$1</a>')
    .replace(/\[([^\]]+)\]\(#?(\/[^)\s]*)\)/g, '<a href="$2">$1</a>');
}


function kickerTitle(o) {
  let h = "";
  if (o.kicker) h += `<div class="rs-kick">${esc(o.kicker)}</div>`;
  if (o.title) h += `<h3>${esc(o.title)}</h3>`;
  return h;
}

// Text-first rendering for every component the store can carry. Unknown or
// oddly-shaped payloads fall back to whatever labeled text they contain —
// never throw: one bad block must not take down the page (learned from the
// a.corrections crash of 2026-08-13).
//
// EVERY CLASS HERE IS PREFIXED rs-. That is not decoration. This markup is now
// injected into the real site shell, which loads styles.css, and styles.css
// already defines .comp (11 rules), .dek (8), .byline (6) and .big for its own
// components. Unprefixed names would silently inherit whichever of those the
// cascade preferred, so the server-rendered article would be styled by rules
// written for something else entirely — the kind of breakage that looks like a
// design mistake and is actually a namespace collision.
function blockHTML(b) {
  try {
    const t = b.type;
    if (t === "p") return `<p>${fmt(b.text)}</p>`;
    if (t === "h2") return `<h2>${fmt(b.text)}</h2>`;
    if (t === "quote") return `<blockquote>${fmt(b.text)}</blockquote>`;
    if (t === "stat") return `<div class="rs-comp"><div class="rs-kick">${esc(b.label || "")}</div><p class="rs-big">${esc(b.value || "")}</p></div>`;
    if (t === "keyfacts") {
      const k = b.keyfacts || {};
      return `<div class="rs-comp">${kickerTitle(k)}<dl>` +
        (k.items || []).map((i) => `<dt>${esc(i.label)}</dt><dd>${fmt(i.value)}</dd>`).join("") + "</dl></div>";
    }
    if (t === "timeline") {
      const k = b.timeline || {};
      return `<div class="rs-comp">${kickerTitle(k)}<ol class="rs-tl">` +
        (k.items || []).map((i) => `<li><b>${esc(i.when)}</b> — ${fmt(i.what)}</li>`).join("") + "</ol></div>";
    }
    if (t === "ledger") {
      const k = b.ledger || {};
      return `<div class="rs-comp">${kickerTitle(k)}<dl>` + (k.items || []).map((i) =>
        `<dt>${esc(i.value)}${i.unit ? " · " + esc(i.unit) : ""}</dt><dd>${fmt(i.label)}` +
        (i.includes ? `<br><small>Includes: ${fmt(i.includes)}</small>` : "") +
        (i.excludes ? `<br><small>Excludes: ${fmt(i.excludes)}</small>` : "") + "</dd>").join("") + "</dl></div>";
    }
    if (t === "compare") {
      const k = b.compare || {};
      const cols = k.columns || [];
      return `<div class="rs-comp">${kickerTitle(k)}<table><thead><tr><th></th>` +
        cols.map((c) => `<th>${esc(c.label)}${c.sub ? `<br><small>${esc(c.sub)}</small>` : ""}</th>`).join("") +
        "</tr></thead><tbody>" + (k.rows || []).map((r) =>
          `<tr><th>${esc(r.label)}</th>` + (r.values || []).map((v) => `<td>${fmt(v)}</td>`).join("") + "</tr>").join("") +
        "</tbody></table>" + (k.source ? `<small>Source: ${fmt(k.source)}</small>` : "") + "</div>";
    }
    if (t === "rank") {
      const k = b.rank || {};
      return `<div class="rs-comp">${kickerTitle(k)}<ol>` +
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
      return `<div class="rs-comp">${kickerTitle(k)}${k.text ? `<p>${fmt(k.text)}</p>` : ""}${items ? `<ul>${items}</ul>` : ""}</div>`;
    }
    return "";
  } catch (_) { return ""; }
}

/* ================================================================
   THE PAGE
   ================================================================

   WHY THIS FILE STOPPED BUILDING ITS OWN WEBSITE (2026-08-15)

   Until today this function returned a complete, hand-written HTML document
   with about thirty lines of inline CSS and its own header and footer. It never
   loaded styles.css and never loaded app.js. The consequence was not subtle,
   and it went unnoticed for a day because it is invisible from inside the site:

     · click an article from the homepage  -> the SPA renders it: the site nav,
       the evidence bar (sources, distinct outlets, share of paragraphs cited),
       TL;DR, listen, share, the cover strip, the entity layer.
     · open the SAME URL from X, Google, or a shared link -> this function
       answers, and the reader gets a bare serif document. No nav. No evidence
       bar. No TL;DR. No audio. Different type, different everything.

   One URL, two products, and the worse one is the one every new reader sees.
   It also ended with an invitation to "read this piece in the interactive
   reader" that linked to /article/<slug> — the page you are already on. There
   was no route from a shared link to the real reader at all.

   THE FIX: serve the real shell, with the article already in it.

   The response is now index.html itself — the same document /buzz and /archive
   get — with three surgical substitutions:

     1. <!-- engine:head -->   ... swapped for this article's title, canonical,
                                   description, OG and Twitter cards.
     2. <!-- engine:jsonld --> ... swapped for NewsArticle structured data.
     3. <main id="app">        ... filled with the server-rendered article.

   A crawler gets the full text and correct metadata, exactly as before. A
   reader gets the actual website: styles.css and app.js load, the router sees
   /article/<slug>, viewArticle() runs and replaces #app with the interactive
   version. The server render is what they look at until that happens, and what
   they keep if it never does — which is a strictly better failure mode than
   today's, where a JS error left them with nothing.

   WHY THE STANDALONE PAGE IS STILL HERE. If the shell cannot be fetched, or the
   markers are ever renamed, assemble() returns null and standaloneHTML() takes
   over. The alternative — falling through to the unmodified shell — would serve
   every article under the HOMEPAGE's title and canonical URL, which is the
   worst SEO outcome available and would look fine to every check we have.
   site_guard.py::check_ssr_shell_markers fails the build if index.html and the
   regexes below stop agreeing, so the fallback should never be reached in
   practice. It exists because "should never" is not a guarantee.
*/

const HEAD_RE = /<!-- engine:head -->[\s\S]*?<!-- \/engine:head -->/;
const JSONLD_RE = /<!-- engine:jsonld -->[\s\S]*?<!-- \/engine:jsonld -->/;
const MAIN_RE = /(<main id="app"[^>]*>)[\s\S]*?(<\/main>)/;

// Scoped to .rtfc-ssr and written against the site's own custom properties, so
// the server render picks up whichever of the eighteen themes the reader has
// chosen instead of hardcoding the dark one. Every var() carries a fallback:
// this markup must also be legible in the standalone page, where styles.css is
// not loaded and none of those properties exist.
const SSR_STYLE = `<style>
.rtfc-ssr{max-width:var(--measure,720px);margin:0 auto;padding:26px 20px 60px;
  color:var(--ink,#e8e4f4);font:17px/1.65 Georgia,'Times New Roman',serif}
.rtfc-ssr a{color:var(--accent,#b9a5ff)}
.rtfc-ssr .rs-sect{font:700 11px/1 system-ui,sans-serif;letter-spacing:.14em;
  text-transform:uppercase;color:var(--accent,#8b7cf7);margin:0 0 10px}
.rtfc-ssr h1{font-size:34px;line-height:1.18;margin:6px 0 12px;
  font-family:var(--display,inherit)}
.rtfc-ssr .rs-dek{font-size:19px;color:var(--ink-soft,#b6aecf);margin:0 0 14px}
.rtfc-ssr .rs-byline{font:13px/1.5 system-ui,sans-serif;color:var(--muted,#8f87a8);
  border-bottom:1px solid var(--line,#2c2440);padding-bottom:16px}
.rtfc-ssr .rs-cover{width:100%;border-radius:12px;margin:20px 0}
.rtfc-ssr h2{font-size:23px;margin-top:34px}
.rtfc-ssr blockquote{border-left:3px solid var(--accent,#6018f0);margin:20px 0;
  padding:4px 0 4px 18px;color:var(--ink-soft,#cfc6ea);font-style:italic}
.rtfc-ssr .rs-comp{border:1px solid var(--line,#2c2440);border-radius:12px;
  padding:16px 18px;margin:22px 0;font:14.5px/1.6 system-ui,sans-serif}
.rtfc-ssr .rs-kick{font-size:10.5px;font-weight:800;letter-spacing:.13em;
  text-transform:uppercase;color:var(--accent,#8b7cf7);margin-bottom:6px}
.rtfc-ssr .rs-comp h3{margin:0 0 10px;font-size:16px}
.rtfc-ssr .rs-comp dl{margin:0}
.rtfc-ssr .rs-comp dt{font-weight:700;color:var(--ink,#fff);margin-top:8px}
.rtfc-ssr .rs-comp dd{margin:0 0 4px;color:var(--ink-soft,#b6aecf)}
.rtfc-ssr .rs-comp table{border-collapse:collapse;width:100%}
.rtfc-ssr .rs-comp th,.rtfc-ssr .rs-comp td{border-top:1px solid var(--line,#2c2440);
  padding:6px 8px;text-align:left;vertical-align:top}
.rtfc-ssr .rs-big{font-size:26px;font-weight:700;margin:2px 0}
.rtfc-ssr .rs-tl li{margin:8px 0}
.rtfc-ssr .rs-disc{font:13px/1.5 system-ui,sans-serif;color:var(--muted,#8f87a8);
  border:1px solid var(--line,#2c2440);border-radius:10px;padding:10px 14px}
.rtfc-ssr .rs-foot{margin-top:40px;border-top:1px solid var(--line,#2c2440);
  padding-top:18px;font:13px/1.7 system-ui,sans-serif;color:var(--muted,#8f87a8)}
.rtfc-ssr small{color:var(--muted,#8f87a8)}
</style>`;

function meta(a, persona) {
  return {
    url: `${SITE}/article/${a.slug}`,
    img: a.image
      ? `${SITE}/${String(a.image).replace(/^\//, "")}`
      : `${SITE}/assets/brand/rtfc-glyph-512.png`,
    desc: esc(a.dek || a.title).slice(0, 300),
    author: persona ? persona.name : `${SITE_NAME} Newsroom`,
  };
}

function headHTML(a, m) {
  return [
    `<title>${esc(a.title)} — ${esc(SITE_NAME)}</title>`,
    `<meta name="description" content="${m.desc}">`,
    `<link rel="canonical" href="${m.url}">`,
    `<meta name="theme-color" content="${esc(ENGINE.web.theme_color || "#0b0b12")}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}">`,
    `<meta property="og:title" content="${esc(a.title)}">`,
    `<meta property="og:description" content="${m.desc}">`,
    `<meta property="og:url" content="${m.url}">`,
    `<meta property="og:image" content="${esc(m.img)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(a.title)}">`,
    `<meta name="twitter:description" content="${m.desc}">`,
    `<meta name="twitter:image" content="${esc(m.img)}">`,
    `<meta property="article:published_time" content="${esc(a.publishedAt || "")}">`,
    `<link rel="alternate" type="application/rss+xml" title="${esc(SITE_NAME)}" href="/rss.xml">`,
    SSR_STYLE,
  ].join("\n");
}

function ldJSON(a, m) {
  return JSON.stringify({
    "@context": "https://schema.org", "@type": "NewsArticle",
    headline: a.title, description: a.dek || "", image: [m.img],
    datePublished: a.publishedAt, dateModified: a.publishedAt,
    author: [{ "@type": "Person", name: m.author }],
    publisher: {
      "@type": "Organization", name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE}/assets/brand/rtfc-glyph-512.png` },
    },
    mainEntityOfPage: m.url, isAccessibleForFree: true,
  });
}

function bodyHTML(a, persona, related, m) {
  const body = (a.body || []).map(blockHTML).join("\n");
  const tldr = (a.tldr && a.tldr.length)
    ? `<div class="rs-comp"><div class="rs-kick">The story at a glance</div><ul>${
        a.tldr.map((t) => `<li>${fmt(t)}</li>`).join("")}</ul></div>` : "";
  const sources = (a.sources && a.sources.length)
    ? `<section><h2>Sources</h2><ol>${a.sources.map((s) =>
        `<li><a href="${esc(s.url)}" rel="noopener">${esc(s.label)}</a></li>`).join("")}</ol></section>` : "";
  const rel = related.length
    ? `<section><h2>More from ${esc(a.section || "the newsroom")}</h2><ul>${related.map((r) =>
        `<li><a href="/article/${esc(r.slug)}">${esc(r.title)}</a></li>`).join("")}</ul></section>` : "";
  const disclaimer = a.disclaimer === "not-financial-advice"
    ? `<p class="rs-disc">This is not financial or investment advice. For information only.</p>`
    : a.disclaimer === "not-medical-advice"
      ? `<p class="rs-disc">This is not medical advice. For information only.</p>` : "";

  return `<div class="rtfc-ssr">
<div class="rs-sect">${esc(a.section || "News")}${a.format ? " — " + esc(a.format) : ""}</div>
<h1>${esc(a.title)}</h1>
<p class="rs-dek">${esc(a.dek || "")}</p>
<p class="rs-byline">By ${esc(m.author)}${persona && persona.beat ? " · " + esc(persona.beat) : ""} · ${
    esc((a.publishedAt || "").slice(0, 10))} · Written by AI, disclosed proudly — <a href="/pulse">watch the newsroom run</a></p>
${a.image ? `<img class="rs-cover" src="/${esc(String(a.image).replace(/^\//, ""))}" alt="">` : ""}
${disclaimer}
<article>
${body}
${tldr}
</article>
${sources}
${rel}
<p class="rs-foot">Every article on ${esc(SITE_NAME)} is produced by an autonomous AI newsroom.
<a href="/usage">Its full cost ledger is public</a> · <a href="/">Home</a> · <a href="/rss.xml">RSS</a> · <a href="/archive">Archive</a></p>
</div>`;
}

/* Put this article INTO the site shell. Returns null if the shell is not the
 * document we expect, and null means "use the standalone page" — never "ship
 * the shell unchanged", which would give every article the homepage's title.
 *
 * Every replacement uses a FUNCTION replacer. With a string replacement, `$&`,
 * `$'` and `` $` `` inside an article title or dek are expansion patterns to
 * String.replace, and a headline containing a dollar sign would silently
 * inject a copy of the surrounding document into the page. */
function assemble(shell, a, persona, related) {
  if (!HEAD_RE.test(shell) || !MAIN_RE.test(shell)) return null;
  const m = meta(a, persona);
  let html = shell.replace(HEAD_RE, () => headHTML(a, m));
  html = html.replace(JSONLD_RE, () =>
    `<script type="application/ld+json">${ldJSON(a, m)}</script>`);
  const inner = bodyHTML(a, persona, related, m);
  html = html.replace(MAIN_RE, (_full, open, close) => open + inner + close);
  return html;
}

/* The fallback. A complete document that depends on nothing but itself. */
function standaloneHTML(a, persona, related) {
  const m = meta(a, persona);
  return `<!doctype html>
<html lang="${esc(ENGINE.web.language || "en")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${headHTML(a, m)}
<link rel="icon" href="/assets/img/icon-192.png">
<script type="application/ld+json">${ldJSON(a, m)}</script>
<style>:root{color-scheme:dark}body{margin:0;background:#0b0714;color:#e8e4f4}
header.site{display:flex;align-items:center;gap:10px;max-width:720px;margin:0 auto;
padding:18px 20px;border-bottom:1px solid #2c2440;font:700 15px/1 system-ui,sans-serif;letter-spacing:.06em}
header.site img{width:28px;height:28px}header.site a{color:#e8e4f4;text-decoration:none}</style>
</head>
<body>
<header class="site"><img src="/assets/brand/rtfc-glyph-128.png" alt=""><a href="/">${
    esc(SITE_NAME)} — ${esc(SITE_TAGLINE)}</a></header>
${bodyHTML(a, persona, related, m)}
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
      `<!doctype html><meta charset="utf-8"><title>Not found — ${esc(SITE_NAME)}</title>` +
      `<body style="background:#0b0714;color:#e8e4f4;font:17px system-ui;padding:60px 20px;text-align:center">` +
      `<h1>That story isn't here.</h1><p><a style="color:#b9a5ff" href="/">Back to the newsroom →</a></p>`,
      { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
  }
  const persona = personas[a.persona];
  const related = articles
    .filter((x) => x && x.slug !== a.slug && x.section === a.section && x.title)
    .sort((x, y) => new Date(y.publishedAt || 0) - new Date(x.publishedAt || 0))
    .slice(0, 4);

  let html = null;
  try {
    // From "/" and never "/index.html" — asking for the file by name is what
    // Cloudflare canonicalises with a 308, the bug that redirected every page
    // on this site to the homepage for a day.
    const shell = await env.ASSETS.fetch(new URL("/", request.url).toString());
    if (shell.ok) html = assemble(await shell.text(), a, persona, related);
  } catch (_) { /* fall through to the standalone page */ }
  if (!html) html = standaloneHTML(a, persona, related);

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // edge-cache 10 min: a new deploy purges Pages caches anyway, and the
      // in-isolate store cache is 60s, so staleness is bounded and cheap.
      "cache-control": "public, max-age=300, s-maxage=600",
    },
  });
}
