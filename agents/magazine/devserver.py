#!/usr/bin/env python3
"""RTFCLMGZN dev server — the one MAGAZINE-QA-GATE.md tells you to use.

    python agents/magazine/devserver.py            # then open the URL it prints
    python agents/magazine/devserver.py --port 8080
    python agents/magazine/devserver.py --no-plus  # see the real paywall instead

Serves `web/` threaded and with caching switched off, and — this is the part a
plain `python -m http.server` cannot do — it also answers the two API routes the
reader needs, so a PAID issue actually opens locally:

    GET /api/issue/<id>   reads functions/api/issue/_data/<id>.json and returns
                          {"ok":true,"issue":{...}} exactly like the Cloudflare
                          Function does for a Plus reader
    GET /api/auth/me      returns a fake signed-in Plus session

Without those, `#/read/issue-002` shows the Plus upsell rather than the issue,
because the pages of a paid issue deliberately do not exist anywhere under web/.

THIS IS A LOCAL PREVIEW TOOL AND IT HAS NO PAYWALL. It hands any issue to anyone
who asks. It binds to 127.0.0.1 only. Never run it on a public interface, and
never mistake it for the real endpoint — the real gate is
functions/api/issue/[id].js, which fails closed. Use --no-plus to check the
locked-out path.

Why no-cache matters: the reader is cache-busted with ?b=N, so a normal static
server will happily serve you yesterday's app.js next to today's data and
produce bugs that do not exist. Everything here is sent no-store.
"""
import argparse, json, os, sys, http.server, socketserver, urllib.parse, webbrowser, threading, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
WEB = os.path.join(ROOT, "web")
DATA = os.path.join(ROOT, "functions", "api", "issue", "_data")

if not os.path.isdir(WEB):
    sys.exit(f"no web/ directory at {WEB} — run this from inside the repo")


class Handler(http.server.SimpleHTTPRequestHandler):
    plus = True

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=WEB, **kw)

    # -- keep the console readable: one line per real request, no favicon spam --
    def log_message(self, fmt, *args):
        msg = fmt % args
        if "favicon" in msg or " 200 " in msg and msg.startswith('"GET /assets'):
            return
        sys.stderr.write(f"  {msg}\n")

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def _json(self, obj, status=200):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path

        if path == "/api/auth/me":
            if not self.plus:
                return self._json({"ok": False, "error": "no-session"}, 401)
            return self._json({"ok": True, "plan": "plus",
                               "account": {"email": "founder@localhost", "plan": "plus"}})

        if path.startswith("/api/issue/"):
            iid = path[len("/api/issue/"):].strip("/").lower()
            f = os.path.join(DATA, f"{iid}.json")
            if not os.path.isfile(f):
                return self._json({"ok": False, "error": "unknown-issue"}, 404)
            try:
                issue = json.load(open(f, encoding="utf-8"))
            except Exception as e:
                return self._json({"ok": False, "error": f"bad-payload: {e}"}, 500)
            if issue.get("access") == "plus" and not self.plus:
                return self._json({"ok": False, "error": "plus-required"}, 402)
            n = sum(2 if s.get("kind") in ("centerfold", "verticalfold") else 1
                    for s in issue.get("spreads", []))
            sys.stderr.write(f"  -> served {iid}: {len(issue.get('spreads', []))} spreads / {n} pages\n")
            return self._json({"ok": True, "issue": issue})

        # SPA: the app routes on the hash, so any unknown path is index.html
        if "." not in os.path.basename(path) and path != "/":
            self.path = "/index.html"
        return super().do_GET()


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

    def handle_error(self, request, client_address):
        et = sys.exc_info()[0]
        if et in (BrokenPipeError, ConnectionResetError):
            return                      # browser closed a connection; not interesting
        super().handle_error(request, client_address)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8788)
    ap.add_argument("--no-plus", action="store_true",
                    help="serve as a signed-out reader, to check the 402 paywall path")
    ap.add_argument("--open", metavar="ROUTE", default="#/magazine",
                    help="hash route to open, e.g. '#/read/issue-002'")
    ap.add_argument("--no-browser", action="store_true")
    a = ap.parse_args()

    Handler.plus = not a.no_plus
    issues = sorted(f[:-5] for f in os.listdir(DATA) if f.endswith(".json")) if os.path.isdir(DATA) else []
    url = f"http://127.0.0.1:{a.port}/index.html{a.open}"

    print()
    print(f"  RTFCLMGZN dev server   web/ = {WEB}")
    print(f"  session               {'PLUS (paid issues open)' if Handler.plus else 'signed out (402 on paid issues)'}")
    print(f"  issues available      {', '.join(issues) or '(none found)'}")
    print()
    print(f"  {url}")
    for i in issues:
        print(f"    read {i:22s} http://127.0.0.1:{a.port}/index.html#/read/{i}")
    print()
    print("  Ctrl-C to stop. Local preview only — no paywall here.")
    print()

    with Server(("127.0.0.1", a.port), Handler) as srv:
        if not a.no_browser:
            threading.Thread(target=lambda: (time.sleep(0.6), webbrowser.open(url)), daemon=True).start()
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            print("\n  stopped.")


if __name__ == "__main__":
    main()
