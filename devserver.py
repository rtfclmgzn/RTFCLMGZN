#!/usr/bin/env python3
"""RTFCLMGZN local dev server.

Replaces `python -m http.server`, which is single-threaded (a stalled request
freezes the whole server) and lets browsers cache assets. This one is:
  - THREADED  -> a stuck connection never blocks the others; no more freezes.
  - NO-CACHE  -> sends no-store headers so the browser always fetches fresh
                 files (no "I'm still seeing the old version" after edits).

Serves the sibling ./web directory. Run via the portable uv:
  uv run --python 3.12 python devserver.py
"""
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

WEB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")
os.chdir(WEB)

PORT = 4321


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        SimpleHTTPRequestHandler.end_headers(self)

    def log_message(self, fmt, *args):
        pass  # quiet


if __name__ == "__main__":
    httpd = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    httpd.daemon_threads = True
    print(f"RTFCLMGZN dev server -> http://localhost:{PORT}  (threaded, no-cache)  serving {WEB}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
