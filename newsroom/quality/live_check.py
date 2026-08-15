#!/usr/bin/env python3
"""LIVE CHECK — verify the PUBLISHED site, not the repo.

Every other check in this repo runs against files. This one runs against
rtfclmgzn.com, because there is a whole class of failure that only exists
after a deploy:

  · the deploy silently didn't happen (a push raced, a build failed quietly)
  · a page 404s on a cold visit even though it renders when you click to it
  · the cache-buster on the live index doesn't match the repo, so readers are
    being served an old bundle — this shipped once and was invisible for days
  · a fragment URL is still being served somewhere in the live HTML
  · the sitemap or the feed is stale relative to what is published

It is deliberately blunt: HTTP status codes and string checks, no browser, no
dependencies, runs in a few seconds. Anything red here means readers are
seeing something the repo says they should not be.

Exit 1 on any failure. Run after every deploy (site-guard.yml) and by hand.
"""

from __future__ import annotations

import io
import re
import time
import sys
import urllib.error
import urllib.request
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

ROOT = Path(__file__).resolve().parent.parent.parent
WEB = ROOT / "web"
SITE = "https://rtfclmgzn.com"
UA = {"User-Agent": "RTFCLMGZN-live-check/1.0 (+https://rtfclmgzn.com)"}

# One from every family, INCLUDING the prefix routes. Not exhaustive on
# purpose: this is a smoke alarm, and a smoke alarm that takes four minutes to
# ring is not a smoke alarm. The /read, /section, /company and /issue entries
# are here because those four families were returning a hard 404 to every
# outside visitor for a full day while every check in the repo passed.
PAGES = ["/", "/buzz", "/resources", "/labs", "/extensions", "/prompts",
         "/scoreboard", "/magazine", "/archive", "/grid", "/podcasts",
         "/dictionary", "/guides", "/usage", "/pulse", "/masthead", "/contact",
         "/read/primer", "/section/frontier", "/company/openai",
         "/issue/issue-002"]

fails: list[str] = []
notes: list[str] = []


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """Refuse to follow 3xx, so a redirect surfaces as a result instead of
    disappearing into a 200.

    THIS IS THE WHOLE POINT (2026-08-15). urlopen follows redirects silently.
    Every page on the site was 308-ing to the homepage — /usage, /magazine,
    /scoreboard, all of them — and this check reported 200 OK for every one,
    because it dutifully followed each redirect to the homepage and found a
    perfectly good HTML document there. A live check that follows redirects
    cannot tell "this page works" from "this page has been replaced by the
    front page", which is the exact failure it exists to catch.
    """

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


_NOFOLLOW = urllib.request.build_opener(_NoRedirect)


def get(path: str, timeout: int = 20, follow: bool = True):
    """Returns (status, body). With follow=False a 3xx comes back AS its own
    status code rather than as whatever the destination happens to serve."""
    url = path if path.startswith("http") else SITE + path
    req = urllib.request.Request(url, headers=UA)
    opener = urllib.request.urlopen if follow else _NOFOLLOW.open
    try:
        with opener(req, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, ""
    except Exception as e:                       # DNS, TLS, timeout
        return 0, str(e)[:120]


def wait_for_deploy(seconds: int) -> None:
    """Poll until the live cache-buster matches this checkout's, or give up.

    Run straight after a push, this check would otherwise grade the PREVIOUS
    deploy and pass, which is the same lie as not running at all. The buster is
    derived from asset content, so matching it is proof the edge is serving
    this exact commit. Giving up is not fatal: the checks below still run and
    report against whatever is actually live, which is the honest answer to
    "what are readers getting right now".
    """
    local = WEB / "index.html"
    if not local.is_file():
        return
    want = set(re.findall(r"\?b=([0-9a-z]+)", io.open(local, encoding="utf-8").read()))
    if not want:
        return
    deadline = time.time() + seconds
    while time.time() < deadline:
        _, home = get("/?deploycheck=1")
        if want & set(re.findall(r"\?b=([0-9a-z]+)", home or "")):
            print("live check: edge is serving this commit (%s)" % sorted(want)[0])
            return
        time.sleep(15)
    notes.append("waited %ds and the edge never served this commit's build stamp "
                 "(%s) — the checks below describe the PREVIOUS deploy"
                 % (seconds, sorted(want)[0]))


def main() -> int:
    if "--wait" in sys.argv:
        i = sys.argv.index("--wait")
        wait_for_deploy(int(sys.argv[i + 1]) if len(sys.argv) > i + 1 else 300)

    status, home = get("/")
    if status != 200 or not home:
        print("LIVE CHECK: cannot reach %s (status %s). Nothing else can be "
              "checked from here." % (SITE, status))
        return 1

    # 1. every page answers a COLD request with real HTML, AT ITS OWN URL.
    #    follow=False is load-bearing: a 3xx here means the page the visitor
    #    asked for is not the page they get, which is indistinguishable from
    #    success once redirects are followed.
    for p in PAGES:
        st, body = get(p, follow=False)
        if 300 <= st < 400:
            fails.append("%s answers a cold request with a %d REDIRECT. A "
                         "visitor from Google, a shared link and a refresh all "
                         "land somewhere else — this page effectively does not "
                         "exist" % (p, st))
        elif st != 200:
            fails.append("%s returned %s on a cold request — a visitor from "
                         "Google lands on nothing" % (p, st))
        elif "<title>" not in body:
            fails.append("%s returned 200 but no HTML document" % p)

    # 2. the deployed bundle is the one the repo expects
    local = WEB / "index.html"
    if local.is_file():
        want = re.findall(r"\?b=([0-9a-z]+)", io.open(local, encoding="utf-8").read())
        got = re.findall(r"\?b=([0-9a-z]+)", home)
        if want and got and set(want) != set(got):
            fails.append("live cache-buster %s does not match the repo's %s — "
                         "readers are being served a different build than this "
                         "checkout describes" % (sorted(set(got))[:2], sorted(set(want))[:2]))
        elif want and got:
            notes.append("build stamp matches the repo (%s)" % sorted(set(got))[0])

    # 3. no fragment routes in what is actually served
    frag = re.findall(r'href="#/[^"]*', home)
    if frag:
        fails.append("the live homepage still serves hash-route links: %s"
                     % sorted(set(frag))[:3])

    # 4. an article is reachable at its real URL, server-rendered
    sm_st, sitemap = get("/sitemap.xml")
    if sm_st != 200:
        fails.append("/sitemap.xml returned %s" % sm_st)
    else:
        arts = re.findall(r"<loc>[^<]*/article/([^<]+)</loc>", sitemap)
        notes.append("sitemap lists %d article URLs" % len(arts))
        if arts:
            st, body = get("/article/" + arts[0])
            if st != 200:
                fails.append("/article/%s returned %s" % (arts[0], st))
            elif "<h1" not in body:
                fails.append("/article/%s served no headline — the SSR renderer "
                             "may be failing open" % arts[0])
        pages_in_map = re.findall(r"<loc>https?://[^/]+(/[a-z\-]*)</loc>", sitemap)
        missing = [p for p in ("/resources", "/magazine", "/scoreboard")
                   if p not in pages_in_map]
        if missing:
            fails.append("sitemap is missing real pages: %s — they exist but "
                         "nothing tells a crawler where" % missing)

    # 5. the feed is alive and points at real URLs
    st, rss = get("/rss.xml")
    if st != 200:
        fails.append("/rss.xml returned %s" % st)
    elif "/#/article/" in rss:
        fails.append("the live feed still contains #/ fragment links")

    # 6. a URL that should NOT exist must 404, or the fallback is too greedy
    st, _ = get("/definitely-not-a-real-page-guard-probe")
    if st == 200:
        notes.append("unknown paths render the app shell (SPA fallback is wide) "
                     "— acceptable, but a real 404 page would be better for search")

    print("=" * 68)
    print("LIVE CHECK — %s" % SITE)
    for n in notes:
        print("  . " + n)
    if fails:
        print("\nFAILURES (%d):" % len(fails))
        for f in fails:
            print("  X " + f)
        print("\nThe published site does not match what this repo promises.")
        return 1
    print("\nLIVE CHECK PASSED — every page answers a cold request, the "
          "deployed build matches the repo, and no fragment URLs are served.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
