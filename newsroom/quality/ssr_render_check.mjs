/* SSR RENDER CHECK — actually run the article function and read what it makes.
 *
 * WHY THIS EXISTS, AND WHY IT IS NOT A PYTHON CHECK.
 *
 * /article/<slug> is the page every visitor from X, Google or a shared link
 * lands on. It is produced by a Cloudflare Pages Function — JavaScript, running
 * at the edge, assembling web/index.html at request time. Nothing in Python can
 * see the result. site_guard's check_ssr_shell_markers verifies that the
 * function and the shell still NAME the same markers, which catches a rename
 * and nothing else. This runs the real code against the real shell and the real
 * stores, and reads the HTML that comes out.
 *
 * The distinction earned itself on 2026-08-15. The function had been serving a
 * hand-written mini-page with its own CSS for a day: no site nav, no evidence
 * bar, no TL;DR, no audio, different typography — and every file-reading check
 * in this repo passed the whole time, because every file was fine. The output
 * was the broken thing, and nothing looked at the output.
 *
 * Usage:  node newsroom/quality/ssr_render_check.mjs
 * Exit 1 on any failure. No dependencies, no network, no browser.
 */

import fs from "fs";
import path from "path";
import url from "url";

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const WEB = path.join(ROOT, "web");
const FN = path.join(ROOT, "functions", "article", "[slug].js");
const CFG = path.join(ROOT, "engine.config.json");

const fails = [];
const notes = [];
const check = (name, ok, detail) => { if (!ok) fails.push(name + (detail ? " — " + detail : "")); };

if (!fs.existsSync(FN) || !fs.existsSync(WEB) || !fs.existsSync(CFG)) {
  console.log("SSR RENDER CHECK: repo layout not found — nothing to check");
  process.exit(1);
}

/* The function is written for the Workers bundler, which inlines JSON imports.
 * Node will not, so the import is rewritten to a literal before loading. The
 * rewrite is exact-match: if the import line ever changes shape this throws
 * instead of quietly testing a different file than the one that ships. */
const IMPORT_LINE = 'import ENGINE from "../../engine.config.json";';
let src = fs.readFileSync(FN, "utf8");
if (!src.includes(IMPORT_LINE)) {
  console.log("SSR RENDER CHECK: the config import in [slug].js is not the line "
    + "this harness knows how to inline. Update both together.");
  process.exit(1);
}
src = src.replace(IMPORT_LINE, () => "const ENGINE = " + fs.readFileSync(CFG, "utf8") + ";");
const tmp = path.join(ROOT, ".ssr_render_check.tmp.mjs");
fs.writeFileSync(tmp, src);

/* Stand in for the Cloudflare ASSETS binding with the files on disk. */
const makeEnv = (mutateShell) => ({ ASSETS: { fetch: async (req) => {
  const u = new URL(typeof req === "string" ? req : (req.url || req));
  const p = u.pathname === "/" ? "/index.html" : u.pathname;
  const f = path.join(WEB, p);
  if (!fs.existsSync(f) || !fs.statSync(f).isFile())
    return { ok: false, status: 404, text: async () => "" };
  let t = fs.readFileSync(f, "utf8");
  if (p === "/index.html" && mutateShell) t = mutateShell(t);
  return { ok: true, status: 200, text: async () => t };
} } });

const SITE = JSON.parse(fs.readFileSync(CFG, "utf8")).web.site_url.replace(/\/$/, "");

async function render(slug, env) {
  const mod = await import(url.pathToFileURL(tmp).href);
  const res = await mod.onRequest({
    request: { url: SITE + "/article/" + slug },
    env: env || makeEnv(),
    params: { slug },
  });
  return { status: res.status ?? 200, html: await res.text() };
}

/* Pick a real slug from the published stores rather than hardcoding one, so
 * this keeps working after the article that was newest today is archived. */
function anySlug() {
  for (const f of ["newsroom-articles.js", "live-articles.js", "articles.js"]) {
    const p = path.join(WEB, "data", f);
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, "utf8").match(/"?slug"?\s*:\s*"([a-z0-9][a-z0-9-]{6,})"/);
    if (m) return m[1];
  }
  return null;
}

try {
  const slug = anySlug();
  if (!slug) {
    console.log("SSR RENDER CHECK: no article slug found in any store");
    process.exit(1);
  }
  notes.push("rendered /article/" + slug);
  const { status, html } = await render(slug);

  check("status is 200", status === 200, "got " + status);

  // 1. IT IS THE REAL SITE, not a second website.
  check("serves the site stylesheet", html.includes("/assets/styles.css"));
  check("serves the app bundle", html.includes("/assets/app.js"));
  check("has the site header", /<header class="site"/.test(html));
  check("has the site footer", /<footer class="site"/.test(html));

  // 2. THE ARTICLE IS IN IT, where app.js and a crawler both look.
  check("article injected into <main id=app>",
    /<main id="app"[^>]*>\s*<div class="rtfc-ssr">/.test(html));
  check("headline is present", /<div class="rtfc-ssr">[\s\S]{0,400}<h1>/.test(html));

  // 3. THE METADATA IS THE ARTICLE'S, not the homepage's. This is the one that
  //    would silently destroy every shared link and look perfectly fine.
  check("exactly one <title>", (html.match(/<title>/g) || []).length === 1,
    "found " + (html.match(/<title>/g) || []).length);
  check("exactly one canonical", (html.match(/rel="canonical"/g) || []).length === 1);
  check("canonical points at this article",
    html.includes('rel="canonical" href="' + SITE + "/article/" + slug + '"'));
  check("og:url points at this article",
    html.includes('property="og:url" content="' + SITE + "/article/" + slug + '"'));
  check("og:type is article", html.includes('property="og:type" content="article"'));
  check("homepage title is gone", !/<title>[^<]*artificial magazine<\/title>/.test(html));
  check("structured data is NewsArticle", html.includes('"@type":"NewsArticle"'));

  // 4. NOTHING THE READER SHOULD NOT SEE.
  check("no literal markdown links left", !/\]\(#?\/[a-z]/.test(html));
  check("no hash routes in the output", !/href="#\//.test(html.replace(/<!--[\s\S]*?-->/g, "")));
  check("no self-referential 'interactive reader' link", !html.includes("interactive reader"));
  check("no unstyled collision classes",
    !/class="(comp|dek|byline|big)"/.test(html));

  // 5. THE SPLASH CANNOT TRAP A NO-SCRIPT READER.
  check("noscript hides the boot splash",
    html.replace(/\s/g, "").includes("#boot-splash{display:none"));
  check("<html> carries a static theme", /<html[^>]*\sdata-theme=/.test(html));

  // 6. A MISSING ARTICLE IS AN HONEST 404, not a soft one.
  const missing = await render("this-slug-does-not-exist-guard-probe");
  check("unknown slug returns 404", missing.status === 404, "got " + missing.status);

  // 7. THE FALLBACK IS REAL. If the shell is unreachable the reader must still
  //    get the story with the right canonical — never the shell unmodified,
  //    which would give every article the homepage's identity.
  const noShell = await render(slug, { ASSETS: { fetch: async (req) => {
    const u = new URL(typeof req === "string" ? req : (req.url || req));
    if (u.pathname === "/") return { ok: false, status: 500, text: async () => "" };
    const f = path.join(WEB, u.pathname);
    if (!fs.existsSync(f) || !fs.statSync(f).isFile())
      return { ok: false, status: 404, text: async () => "" };
    return { ok: true, status: 200, text: async () => fs.readFileSync(f, "utf8") };
  } } });
  check("shell unreachable still renders the story", /<h1>/.test(noShell.html));
  check("fallback keeps the article's canonical",
    noShell.html.includes('rel="canonical" href="' + SITE + "/article/" + slug + '"'));

  // 8. MARKER DRIFT MUST FALL BACK, NOT SHIP THE HOMEPAGE.
  const drifted = await render(slug, makeEnv((t) =>
    t.replace("<!-- engine:head -->", () => "<!-- engine:HEAD -->")));
  check("marker drift does not serve homepage metadata",
    !/<title>[^<]*artificial magazine<\/title>/.test(drifted.html) && /<h1>/.test(drifted.html));

} catch (e) {
  fails.push("the function threw: " + String(e && e.stack || e).split("\n").slice(0, 3).join(" | "));
} finally {
  try { fs.unlinkSync(tmp); } catch (_) { /* nothing to clean */ }
}

console.log("=".repeat(68));
console.log("SSR RENDER CHECK — /article/<slug>");
for (const n of notes) console.log("  . " + n);
if (fails.length) {
  console.log("\nFAILURES (" + fails.length + "):");
  for (const f of fails) console.log("  X " + f);
  console.log("\nThe page every visitor from a shared link lands on is not what "
    + "this repo promises.");
  process.exit(1);
}
console.log("\nSSR RENDER CHECK PASSED — the shared-link page is the real site, "
  + "carries this article's own metadata, and degrades to the story itself.");
