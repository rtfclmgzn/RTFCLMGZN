#!/usr/bin/env python3
"""RTFCLMGZN — the real-reader audit (MAGAZINE-STANDARD §6).

    uv run --python 3.12 python agents/magazine/audit_reader.py issue-002
    uv run --python 3.12 python agents/magazine/audit_reader.py issue-002 --control issue-001

Serves web/ and drives the SHIPPED web/assets/app.js at #/read/<id>, stubbing
GET /api/issue/<id> so a Plus issue actually opens. Measures every rendered .mpage
for fill (<90% = void) and cutoff (element bottom past page bottom) at 1320x780,
860x1080 and 1440x900.

Always pass --control with the previous issue. If a defect appears in BOTH, it is in
the renderer or the stylesheet and must be fixed there — not by cutting good copy.
That comparison is how the .tp-src flex bug was found (MAGAZINE-STANDARD §14).

Exit 0 = clean. Exit 1 = defects found. Requires playwright with chromium.

Expect the two `mfoldhalf` second halves of any issue to report 0% fill: they are
pure full-bleed art with no text to measure. That is an artifact, not a defect —
the control issue shows the same, which is how you can tell.
"""
import argparse, json, http.server, socketserver, threading, functools, pathlib, sys, re
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
WEB = ROOT / "web"
DATA = ROOT / "functions" / "api" / "issue" / "_data"

AUDIT = """() => [...document.querySelectorAll('.mpage')].map((p,i) => {
  const pr = p.getBoundingClientRect();
  let mb = pr.top, worst = 0;
  p.querySelectorAll('*').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.height > 0 || r.width > 0) {
      if (r.bottom > mb && r.bottom < pr.top + pr.height * 2) mb = r.bottom;
      if (r.bottom > worst) worst = r.bottom;
    }
  });
  return { page: i+1, fill: Math.round((mb-pr.top)/pr.height*100),
           cut: Math.round(worst-pr.bottom), cls: p.className };
})"""

WINDOWS = (("landscape", 1320, 780), ("portrait", 860, 1080), ("founder", 1440, 900))


def payload(issue_id):
    f = DATA / f"{issue_id}.json"
    if f.is_file():
        return json.loads(f.read_text(encoding="utf-8"))
    return None   # free issues live whole in web/data and need no stub


def audit(issue_id, port):
    iss = payload(issue_id)
    results = {}
    with sync_playwright() as pw:
        br = pw.chromium.launch()
        for label, w, h in WINDOWS:
            pg = br.new_page(viewport={"width": w, "height": h})
            errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.route("**/api/auth/me", lambda r, *a: r.fulfill(
                status=200, content_type="application/json",
                body=json.dumps({"ok": True, "plan": "plus",
                                 "account": {"email": "audit@localhost", "plan": "plus"}})))
            if iss is not None:
                pg.route(f"**/api/issue/{issue_id}", lambda r, *a: r.fulfill(
                    status=200, content_type="application/json",
                    body=json.dumps({"ok": True, "issue": iss})))
            pg.goto(f"http://127.0.0.1:{port}/index.html#/read/{issue_id}")
            pg.wait_for_timeout(1800)
            try:
                pg.wait_for_selector(".mpage", timeout=15000)
            except Exception:
                pass
            pg.wait_for_timeout(1400)
            rows = pg.evaluate(AUDIT)
            results[label] = {
                "pages": len(rows),
                "js_errors": errs,
                "cutoffs": [r for r in rows if r["cut"] > 4],
                "voids": [r for r in rows if r["fill"] < 90 and "mfoldhalf" not in r["cls"]],
            }
            pg.close()
        br.close()
    return results


def report(issue_id, res):
    bad = 0
    for label, r in res.items():
        print(f"  [{label:9s}] pages={r['pages']:>3}  cutoffs={len(r['cutoffs']):>2}  voids={len(r['voids']):>2}"
              + (f"  JS ERRORS={len(r['js_errors'])}" if r["js_errors"] else ""))
        for x in r["cutoffs"][:8]:
            print(f"       cut  p{x['page']:>3} {x['cut']:>5}px  {x['cls'][:46]}")
        for x in r["voids"][:8]:
            print(f"       void p{x['page']:>3} {x['fill']:>3}%   {x['cls'][:46]}")
        bad += len(r["cutoffs"]) + len(r["voids"]) + len(r["js_errors"])
    return bad


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("issue")
    ap.add_argument("--control", help="previous issue id, audited alongside")
    ap.add_argument("--port", type=int, default=8899)
    a = ap.parse_args()

    if not WEB.is_dir():
        sys.exit(f"no web/ at {WEB} — run from inside the repo")

    Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(WEB))
    class S(socketserver.ThreadingTCPServer):
        allow_reuse_address = True
        daemon_threads = True
        def handle_error(self, *a): pass
    srv = S(("127.0.0.1", a.port), Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    print(f"\n{a.issue}")
    bad = report(a.issue, audit(a.issue, a.port))
    ctl_bad = 0
    if a.control:
        print(f"\n{a.control}  (control)")
        ctl_bad = report(a.control, audit(a.control, a.port))
        print("\n  Read it this way: a defect in BOTH is a renderer/stylesheet bug — fix it there.")
        print("  A defect in only the new issue is a copy-length problem — cut copy to §5b budgets.")
    srv.shutdown()

    print("\n" + ("CLEAN" if bad == 0 else f"{bad} DEFECT(S) in {a.issue}"))
    sys.exit(0 if bad == 0 else 1)


if __name__ == "__main__":
    main()
