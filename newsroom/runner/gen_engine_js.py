#!/usr/bin/env python3
"""Emit web/data/engine.js from engine.config.json.

WHY A GENERATED FILE AND NOT A FETCH (2026-08-15). The app reads its data as
JS globals — no build step, no fetch — so the site still opens by double-
clicking index.html, a design goal since the first commit. That means the
browser cannot read engine.config.json directly. So the config stays JSON
(one file the Python checks, the Cloudflare Functions and this script can all
read natively), and this turns it into the one JS global the app consumes:

    window.RTFC_ENGINE = { ... };

Deterministic and idempotent: same config in, same bytes out, so it can run
before every ship and in every CI pass without ever churning a commit.
site_guard.py::check_engine_config fails the build if web/data/engine.js is
not byte-identical to what this script would write, so the two can never
drift — which is the entire point of having one source.

Keys beginning with "$comment" are documentation for humans and are stripped;
readers do not need to download the reasoning.
"""

from __future__ import annotations

import io
import json
from html import escape as html_escape
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CONFIG = ROOT / "engine.config.json"
OUT = ROOT / "web" / "data" / "engine.js"

HEADER = (
    "// GENERATED from engine.config.json by newsroom/runner/gen_engine_js.py.\n"
    "// Do not edit. Edit engine.config.json and rerun; the guard fails the\n"
    "// build if this file and the config disagree.\n"
)


def strip_comments(node):
    if isinstance(node, dict):
        return {k: strip_comments(v) for k, v in node.items()
                if not str(k).startswith("$comment")}
    if isinstance(node, list):
        return [strip_comments(v) for v in node]
    return node


def render() -> str:
    cfg = json.loads(io.open(CONFIG, encoding="utf-8").read())
    body = json.dumps(strip_comments(cfg), indent=2, ensure_ascii=False)
    return HEADER + "window.RTFC_ENGINE = " + body + ";\n"


# ---------------------------------------------------------------------------
# index.html and manifest.json: the identity a scraper sees WITHOUT running JS.
#
# app.js rewrites <head> on every route, so a reader's browser always gets the
# right title. But Facebook, X, Slack and the like fetch index.html and read the
# static tags as-is — they run nothing. So the static head, the JSON-LD, the
# header wordmark and the footer brand block are generated here from the same
# config, into marked regions:
#
#     <!-- engine:head --> ... <!-- /engine:head -->
#
# Only the text between the markers is ever touched. The cache-buster lines
# live OUTSIDE the regions on purpose: ship_preflight.bump() restamps them,
# and this script must never fight it. Line endings are preserved as found —
# index.html is a UTF-8 trap (em dashes in the title) and has been mangled by
# careless writes before, so this reads and writes with encoding declared and
# never rewrites the whole file.
# ---------------------------------------------------------------------------
INDEX = ROOT / "web" / "index.html"
MANIFEST = ROOT / "web" / "manifest.json"
REGIONS = ("head", "fonts", "typography", "jsonld", "wordmark", "footbrand", "footmeta")


def _esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def _year():
    import datetime
    return datetime.date.today().year



# Google Fonts wants a variable-axis string per family, and getting it wrong
# returns a stylesheet that silently omits the weights the design needs. So the
# axes live here, keyed by family, rather than in a customer's config where a
# typo becomes an unstyled site. A family that is not listed falls back to a
# plain request, which always works and just loads regular and bold.
FONT_AXES = {
    "Fraunces":    "ital,opsz,wght@0,9..144,400..700;1,9..144,400..700",
    "Inter":       "ital,opsz,wght@0,14..32,300..800;1,14..32,300..800",
    "Instrument Serif": "ital@0;1",
    "Space Grotesk":    "wght@300..700",
    "Archivo":     "wght@300..800",
    "Outfit":      "wght@300..800",
    "DM Serif Display": "ital@0;1",
    "Sora":        "wght@300..700",
    "Playfair Display": "ital,wght@0,400..900;1,400..900",
}


def _font_family_param(fam: str) -> str:
    fam = (fam or "").strip()
    if not fam:
        return ""
    axis = FONT_AXES.get(fam)
    slug = fam.replace(" ", "+")
    return "family=%s%s" % (slug, ":" + axis if axis else "")


def font_region(cfg) -> str:
    theme = cfg.get("theme") or {}
    fams = [f for f in (theme.get("serif"), theme.get("sans")) if f]
    parts = [p for p in (_font_family_param(f) for f in fams) if p]
    if not parts:
        return "<!-- no webfonts configured; the stylesheet falls back to system faces -->"
    url = "https://fonts.googleapis.com/css2?" + "&".join(parts) + "&display=swap"
    return "\n".join([
        '<link rel="preload" as="style" href="%s">' % url,
        '<link href="%s" rel="stylesheet">' % url,
    ])


def typography_region(cfg) -> str:
    """The families, as CSS variables.

    Separate from the font <link> region and placed AFTER styles.css on purpose.
    The links must be early so the preload is worth having; this override must
    be late, because styles.css sets --serif in its own :root and source order
    decides the winner at equal specificity. Emitting both together put the
    override first and every generated site rendered in Fraunces while
    downloading the face it actually asked for.
    """
    theme = cfg.get("theme") or {}
    serif = theme.get("serif") or "Georgia"
    sans = theme.get("sans") or "system-ui"
    return ('<style>:root{--serif:"%s",Georgia,"Times New Roman",serif;'
            '--sans:"%s",system-ui,-apple-system,"Segoe UI",sans-serif}</style>'
            % (serif, sans))


def region_bodies(cfg) -> dict:
    idn, web = cfg["identity"], cfg["web"]
    site = web["site_url"].rstrip("/")
    name, alt = idn["name"], idn.get("alternate_name", "")
    full = name + (" — " + alt if alt else "")
    og = site + web.get("og_image", "/assets/img/og.jpg")
    social = idn.get("social_description") or idn.get("description", "")
    parent = idn.get("parent_organization") or {}
    wm = idn.get("wordmark") or {"lead": name, "emphasis": ""}
    tag = idn.get("tagline", "")
    lang = web.get("language", "en")

    head = "\n".join([
        "<title>%s</title>" % _esc(full),
        '<meta name="description" content="%s">' % _esc(idn.get("description", "")),
        '<link rel="canonical" href="%s/">' % site,
        '<meta name="theme-color" content="%s">' % web.get("theme_color", "#000000"),
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="%s">' % _esc(name),
        '<meta property="og:title" content="%s">' % _esc(full),
        '<meta property="og:description" content="%s">' % _esc(social),
        '<meta property="og:url" content="%s/">' % site,
        '<meta property="og:image" content="%s">' % og,
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<meta name="twitter:title" content="%s">' % _esc(full),
        '<meta name="twitter:description" content="%s">' % _esc(social),
        '<meta name="twitter:image" content="%s">' % og,
        '<link rel="alternate" type="application/rss+xml" title="%s" href="/rss.xml">' % _esc(name),
        '<meta name="apple-mobile-web-app-title" content="%s">' % _esc(name),
    ])

    org = {
        "@type": "NewsMediaOrganization",
        "@id": site + "/#org",
        "name": name,
    }
    if alt:
        org["alternateName"] = alt
    org["url"] = site + "/"
    org["logo"] = og
    if parent.get("name"):
        org["parentOrganization"] = {"@type": "Organization",
                                     "name": parent["name"], "url": parent.get("url", "")}
    org["description"] = idn.get("structured_description") or idn.get("description", "")
    if idn.get("founding_date"):
        org["foundingDate"] = idn["founding_date"]
    org["publishingPrinciples"] = site + "/masthead"
    org["correctionsPolicy"] = site + "/terms"
    org["sameAs"] = list(idn.get("same_as") or [])
    site_node = {
        "@type": "WebSite", "@id": site + "/#site", "url": site + "/",
        "name": full, "publisher": {"@id": site + "/#org"}, "inLanguage": lang,
    }
    jsonld = ('<script type="application/ld+json">\n'
              + json.dumps({"@context": "https://schema.org", "@graph": [org, site_node]},
                           indent=2, ensure_ascii=False)
              + "\n</script>")

    wordmark = ('<a href="/" class="logo" aria-label="%s, home"><i class="logo-glyph" aria-hidden="true"></i>'
                '<span class="logo-type">%s<em>%s</em><small>%s</small></span></a>'
                % (_esc(full), _esc(wm.get("lead", "")), _esc(wm.get("emphasis", "")),
                   _esc(tag).replace(" ", "&nbsp;")))

    fparent = ""
    if parent.get("name"):
        fparent = ('<div class="fparent">A <a href="%s" target="_blank" rel="noopener" '
                   'style="color:inherit;text-decoration:none"><b>%s</b></a> PUBLICATION</div>'
                   % (_esc(parent.get("url", "#")), _esc(parent["name"].upper())))
    footbrand = "\n".join([
        '<div class="flogo">%s<em>%s</em></div>%s' % (_esc(wm.get("lead", "")), _esc(wm.get("emphasis", "")), fparent),
        '<div class="foot-sub">%s</div>' % _esc(tag.title()).replace(" ", "&nbsp;"),
        "<p>%s</p>" % _esc(idn.get("footer_blurb") or idn.get("description", "")),
    ])

    cad = cfg.get("cadence") or {}
    bits = ["© %d %s" % (_year(), _esc(name))]
    if cad.get("logical_agents"):
        bits.append("%d logical agents" % cad["logical_agents"])
    if cad.get("editorial_personas"):
        bits.append("%d editorial personas" % cad["editorial_personas"])
    bits.append("fully autonomous public releases")
    footmeta = "<span>%s</span>" % " · ".join(bits)

    return {"fonts": font_region(cfg),
        "typography": typography_region(cfg),
        "head": head, "jsonld": jsonld, "wordmark": wordmark,
            "footbrand": footbrand, "footmeta": footmeta}


def stamp_default_theme(html: str, cfg) -> str:
    """The skin a generated publication opens in.

    <html data-theme="..."> is the pre-paint default. The inline bootstrap
    overrides it with the reader's saved choice, and that ordering matters:
    without a static attribute a no-script render comes out unstyled, which is
    the bug that shipped a cream-coloured article page on 2026-08-15.
    """
    pack = ((cfg.get("theme") or {}).get("pack") or "dark").strip()
    return re.sub(r'(<html[^>]*\sdata-theme=")[^"]*(")', r"\g<1>%s\g<2>" % pack,
                  html, count=1)


SURFACE_KEYS = ("scoreboard", "labs", "grid", "extensions", "dictionary")


def surface_switches(cfg):
    """{key: (enabled, nav_label)} for the subject-bound surfaces. A missing
    `surfaces` block means every switch is on, which is what RTFCLMGZN ran as
    before the block existed."""
    sw = cfg.get("surfaces") or {}
    out = {}
    for key in SURFACE_KEYS:
        s = sw.get(key) or {}
        out[key] = (s.get("enabled", True) is not False,
                    s.get("nav_label") or s.get("label") or key.title())
    return out


def stamp_surfaces(html: str, cfg) -> str:
    """Rewrite each <!-- engine:surface:KEY --> footer slot: the link with its
    configured label when the surface is on, nothing when it is off. The
    markers stay either way so a niche can switch a surface back on later.
    Raises if a marker is missing — the same rule as the identity regions."""
    for key, (on, label) in surface_switches(cfg).items():
        a, b = "<!-- engine:surface:%s -->" % key, "<!-- /engine:surface:%s -->" % key
        i, j = html.find(a), html.find(b)
        if i < 0 or j < 0 or j < i:
            raise RuntimeError("index.html is missing the %s / %s markers" % (a, b))
        body = ('<li><a href="/%s">%s</a></li>' % (key, html_escape(label))) if on else ""
        html = html[:i + len(a)] + body + html[j:]
    return html


def render_index(html: str, cfg) -> str:
    """Return index.html with every marked region regenerated. Raises if a
    marker is missing — a silently-skipped region is exactly the drift this
    exists to prevent."""
    nl = "\r\n" if "\r\n" in html else "\n"
    bodies = region_bodies(cfg)
    html = stamp_default_theme(html, cfg)
    html = stamp_surfaces(html, cfg)
    for key in REGIONS:
        a, b = "<!-- engine:%s -->" % key, "<!-- /engine:%s -->" % key
        i, j = html.find(a), html.find(b)
        if i < 0 or j < 0 or j < i:
            raise RuntimeError("index.html is missing the %s / %s markers" % (a, b))
        inner = bodies[key].replace("\n", nl)
        # inline regions (wordmark, footmeta) stay on one line; block regions
        # get their own lines so diffs stay readable
        block = key in ("head", "jsonld", "footbrand")
        new = a + (nl + inner + nl if block else inner) + b
        html = html[:i] + new + html[j + len(b):]
    return html


def render_manifest(cfg) -> str:
    idn, web = cfg["identity"], cfg["web"]
    name = idn["name"]; alt = idn.get("alternate_name", "")
    cur = {}
    if MANIFEST.is_file():
        try:
            cur = json.loads(io.open(MANIFEST, encoding="utf-8").read())
        except Exception:                                  # noqa: BLE001
            cur = {}
    out = {
        "name": name + (" — " + alt if alt else ""),
        "short_name": name,
        "description": idn.get("social_description") or idn.get("description", ""),
        "start_url": cur.get("start_url", "/"),
        "display": cur.get("display", "standalone"),
        "background_color": web.get("theme_color", "#000000"),
        "theme_color": web.get("theme_color", "#000000"),
        "icons": cur.get("icons", []),
    }
    return json.dumps(out, indent=2, ensure_ascii=False) + "\n"


def write_if_changed(path: Path, text: str, label: str) -> bool:
    old = io.open(path, encoding="utf-8", newline="").read() if path.is_file() else None
    if old == text:
        print("gen_engine_js: %s already current" % label)
        return False
    io.open(path, "w", encoding="utf-8", newline="").write(text)
    print("gen_engine_js: wrote %s (%d bytes)" % (label, len(text.encode("utf-8"))))
    return True


def main() -> int:
    if not CONFIG.is_file():
        print("gen_engine_js: engine.config.json missing - nothing to emit")
        return 2
    cfg = json.loads(io.open(CONFIG, encoding="utf-8").read())
    write_if_changed(OUT, render(), "web/data/engine.js")
    if INDEX.is_file():
        html = io.open(INDEX, encoding="utf-8", newline="").read()
        try:
            write_if_changed(INDEX, render_index(html, cfg), "web/index.html identity regions")
        except RuntimeError as exc:
            print("gen_engine_js: %s" % exc)
            return 3
    write_if_changed(MANIFEST, render_manifest(cfg), "web/manifest.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
