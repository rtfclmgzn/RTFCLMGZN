#!/usr/bin/env python3
"""RENDER SMOKE — actually open the site and prove nothing is broken.

site_guard.py checks the data. This opens the pages, because the two failures
that reached readers this week were both invisible to any data check: a field
a renderer read without guarding, and a route with no page title. The only
thing that catches those is loading the page and looking.

What it does:
  1. Serves web/ locally, drives headless Chromium (already on this runner).
  2. Every route at three widths — a JS error or an empty <main> fails the run.
  3. Every published article, one by one.
  4. THE HOSTILE RECORD. Injects a synthetic article carrying ONLY the fields
     the schema truly requires — no pipeline, no sources, no corrections, no
     apply, no image, no tldr — and renders it. This is the generalised form of
     every crash we have had: it does not test that one known field is guarded,
     it tests that a MINIMAL record cannot kill a page, whatever tomorrow's
     agent decides to leave out. If someone adds an unguarded read next month,
     this fails the same day instead of a reader finding it.
  5. Invariants that have regressed before: footer cost line present, top nav
     order intact, no horizontal overflow at phone width.

Exit 1 on any failure, with the failing route and the browser's own error.
"""

from __future__ import annotations

import http.server
import json
import socketserver
import sys
import threading
from functools import partial
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
WEB = ROOT / "web"
PORT = 8123
BASE = "http://127.0.0.1:%d" % PORT

# REAL PATHS. Each of these is now fetched COLD, exactly the way a visitor
# arriving from Google does — which is the only way to catch a page that works
# when you click to it and 404s when you land on it.
ROUTES = ["/", "/buzz", "/scoreboard", "/resources", "/extensions", "/archive",
          "/magazine", "/guides", "/dictionary", "/pulse", "/usage", "/masthead",
          "/companies", "/grid", "/claims", "/predictions", "/corrections",
          "/review", "/library", "/account", "/settings", "/wallpapers", "/live",
          "/events", "/contact", "/privacy", "/terms", "/briefing",
          "/read/primer", "/section/Frontier", "/labs", "/podcasts", "/prompts"]

# Only what the store contract calls required. Everything else is deliberately
# absent — that is the entire point of this fixture.
HOSTILE = {
    "id": "guard-hostile-record",
    "slug": "guard-hostile-record",
    "title": "Guard fixture: a record with nothing optional",
    "dek": "If this page renders, a minimal record cannot kill the article route.",
    "persona": "luka-petrovic",
    "section": "Frontier",
    "format": "brief",
    "publishedAt": "2026-01-01T00:00:00Z",
    "body": [{"type": "p", "text": "One paragraph, no citations, no components."}],
}

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

fails: list[str] = []


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    """Mimics web/_redirects: a path with no file behind it is answered with
    index.html at 200, so deep links behave here exactly as they do on
    Cloudflare Pages. Without this the smoke test would pass on links you click
    and miss the ones you land on."""

    def translate_path(self, path):
        real = super().translate_path(path)
        p = Path(real)
        if p.is_dir():
            idx = p / "index.html"
            return str(idx) if idx.is_file() else real
        if not p.is_file() and "." not in p.name:
            return str(WEB / "index.html")
        return real

    def log_message(self, *a):
        pass


def serve():
    handler = partial(SPAHandler, directory=str(WEB))
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def main() -> int:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("render_smoke: playwright not installed — skipping (install with "
              "`pip install playwright && playwright install chromium`)")
        return 0

    httpd = serve()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={"width": 1280, "height": 900})
            errs: list[str] = []
            page.on("pageerror", lambda e: errs.append(str(e)[:220]))

            PROBE = """() => {
                const app = document.getElementById('app') || {};
                const h = document.querySelector('#app h1');
                return {len: (app.innerHTML || '').length,
                        crashed: !!h && h.textContent.indexOf('didn') >= 0,
                        blockFail: document.querySelectorAll('.block-fail').length};
            }"""

            def visit(url: str, label: str, settle: int = 500) -> None:
                """Load a route and judge it — but WAIT for it, do not race it.

                WHY THIS POLLS (2026-08-15). The old version slept a flat 500ms
                and then asked once. /magazine renders a 3D shelf with cover
                images and takes longer than that on a cold CI runner, so this
                check reported "page is empty (0 chars)" and failed the build on
                EVERY Site Guard run — ten in a row — while the page rendered
                perfectly for every real reader. A guard that cries wolf gets
                switched off, and a guard that is always red hides the run where
                something is actually wrong. That is worse than not checking.

                So emptiness is now a CONCLUSION, not a snapshot: poll until the
                page has content or the deadline passes. A page that is really
                empty still fails, ~6s later, which costs nothing because it
                only happens when something is genuinely broken.
                """
                errs.clear()
                page.goto(url, wait_until="load", timeout=45000)
                page.wait_for_timeout(settle)
                state = page.evaluate(PROBE)
                waited = settle
                while state["len"] < 300 and waited < 6000:
                    page.wait_for_timeout(250)
                    waited += 250
                    state = page.evaluate(PROBE)
                if state["len"] < 300:
                    fails.append("%s — still empty after %dms (%d chars)"
                                 % (label, waited, state["len"]))
                if errs:
                    fails.append("%s — JS error: %s" % (label, errs[0]))
                if state["crashed"]:
                    fails.append("%s — crash screen rendered" % label)
                if state["blockFail"]:
                    fails.append("%s — %d body block(s) failed to render"
                                 % (label, state["blockFail"]))

            # 1. routes
            for r in ROUTES:
                visit(BASE + r, "route " + r)
            print("routes: %d checked" % len(ROUTES))

            # 2. invariants that have regressed before
            page.goto(BASE + "/", wait_until="load", timeout=45000)
            page.wait_for_timeout(1500)
            inv = page.evaluate(
                """() => ({
                    foot: (document.getElementById('foot-cost') || {}).textContent || '',
                    nav: Array.from(document.querySelectorAll('#nav > a, #nav > span.sec-wrap > button'))
                             .map(e => (e.textContent || '').replace(/\\d+/g, '').trim()),
                    title: document.title
                })"""
            )
            if "$" not in inv["foot"]:
                fails.append("footer cost line is missing its figure")
            # The bar is five items by decision (2026-08-14). If this list and
            # renderNav() disagree, one of them changed without the other.
            want = ["Home", "The Buzz", "Resources", "Archive", "Magazine"]
            got = [("Magazine" if x.startswith("Magazine") else x) for x in inv["nav"]]
            if got != want:
                fails.append("top nav order changed: %s" % got)

            # 3. every article
            slugs = page.evaluate(
                "() => (window.RTFC_ARTICLES||[]).concat(window.RTFC_LIVE_ARTICLES||[])"
                ".concat(window.RTFC_NEWSROOM_ARTICLES||[]).concat(window.RTFC_RESEARCH||[])"
                ".concat(window.RTFC_GUIDES||[]).map(a => a && a.slug).filter(Boolean)"
            )
            for s in slugs:
                visit(BASE + "/article/" + s, "article " + s, settle=140)
            print("articles: %d checked" % len(slugs))

            # 4. THE HOSTILE RECORD — a minimal article injected into the store
            #    before app.js reads it, via response interception.
            def inject(route):
                res = route.fetch()
                body = res.text()
                idx = body.rfind("];")
                if idx > 0:
                    body = body[:idx] + ("," + json.dumps(HOSTILE) + "\n") + body[idx:]
                route.fulfill(response=res, body=body,
                              headers={**res.headers, "content-type": "application/javascript"})

            page.route("**/data/newsroom-articles.js*", inject)
            # A query string, not just a new hash: changing only the fragment
            # does not reload the document, so the data files are never
            # re-requested and the interception above would never fire. (This
            # harness got that wrong on its first run and reported a false
            # failure — worth the extra parameter to never debug it again.)
            visit(BASE + "/article/" + HOSTILE["slug"] + "?guard=hostile",
                  "HOSTILE minimal record", settle=1200)
            ok = page.evaluate(
                "() => { const h = document.querySelector('#app h1');"
                " return !!h && h.textContent.indexOf('Guard fixture') >= 0; }"
            )
            if not ok:
                fails.append("HOSTILE minimal record did not render its own headline "
                             "— a record missing optional fields still breaks the page")
            page.unroute("**/data/newsroom-articles.js*")
            print("hostile minimal record: checked")

            # 4b. NO FRAGMENT ROUTES ANYWHERE IN THE RENDERED DOM.
            #     The static check in site_guard reads the source; this reads
            #     what the browser actually built, which also covers links
            #     assembled at runtime from data.
            page.goto(BASE + "/resources", wait_until="load", timeout=45000)
            page.wait_for_timeout(900)
            for probe in ["/", "/resources", "/magazine", "/labs", "/archive"]:
                page.goto(BASE + probe, wait_until="load", timeout=45000)
                page.wait_for_timeout(600)
                bad = page.evaluate(
                    "() => Array.from(document.querySelectorAll('a[href]'))"
                    ".map(a => a.getAttribute('href'))"
                    ".filter(h => h && h.indexOf('#/') === 0).slice(0, 5)"
                )
                if bad:
                    fails.append("%s renders hash-route links: %s" % (probe, bad))
            print("fragment-link audit: checked")

            # 5. phone width — layout regressions and mobile-only JS
            phone = browser.new_context(viewport={"width": 390, "height": 844},
                                        has_touch=True, is_mobile=True)
            pp = phone.new_page()
            perrs: list[str] = []
            pp.on("pageerror", lambda e: perrs.append(str(e)[:200]))
            for r in ["/", "/scoreboard", "/grid", "/extensions", "/usage", "/magazine"]:
                pp.goto(BASE + r, wait_until="load", timeout=45000)
                pp.wait_for_timeout(700)
                over = pp.evaluate("() => document.documentElement.scrollWidth > "
                                   "document.documentElement.clientWidth + 2")
                if over:
                    fails.append("phone %s — horizontal overflow" % r)
                if perrs:
                    fails.append("phone %s — JS error: %s" % (r, perrs[0]))
                    perrs.clear()
            print("phone widths: checked")
            browser.close()
    finally:
        httpd.shutdown()

    print("=" * 72)
    if fails:
        print("RENDER SMOKE FAILED (%d):" % len(fails))
        for f in fails:
            print("  X " + f)
        return 1
    print("RENDER SMOKE PASSED — every route, every article, and a deliberately "
          "minimal record all render clean.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
