#!/usr/bin/env python3
"""RTFCLMGZN — site upgrade batch (SHIP_SITE_UPGRADE.bat runs this, then pushes).

Four changes, applied idempotently to the freshest tree after a pull:
1. LANGUAGE FIX — _headers CSP: Google Translate's script loaded but its
   translation XHR calls were blocked by connect-src 'self' (the _headers file's
   own comments predicted this). Adds the two translate endpoints.
2. SPLASH — animated boot splash: the aperture logo spins in with a purple
   glow, wordmark rises, fades out ~1.5s. Reduced-motion users skip it.
3. SCROLL GUARD — kills the horizontal-overflow jitter (page "moving" with
   both scrollbars flashing): overflow-x clip on the root + stable gutter.
4. COGNIVOR LABS — parent-company line in the footer + JSON-LD.
"""
import os
import re
import subprocess
import sys

REPO = os.environ.get("RTFC_REPO") or os.path.dirname(
    os.path.dirname(os.path.abspath(__file__)))
LOG_PATH = os.path.join(REPO, "site_upgrade_log.txt")
_lines = []


def log(msg=""):
    print(msg, flush=True)
    _lines.append(msg)
    try:
        with open(LOG_PATH, "w", encoding="utf-8") as fh:
            fh.write("\n".join(_lines) + "\n")
    except OSError:
        pass


def run(cmd, ok_codes=(0,), timeout=600):
    log(f"$ {' '.join(cmd)}")
    try:
        proc = subprocess.run(cmd, cwd=REPO, capture_output=True, text=True,
                              timeout=timeout, encoding="utf-8", errors="replace")
    except Exception as exc:  # noqa: BLE001
        log(f"  -> {exc}")
        return 1, ""
    for line in (proc.stdout or "").strip().splitlines():
        log(f"  | {line}")
    for line in (proc.stderr or "").strip().splitlines():
        log(f"  ! {line}")
    if proc.returncode not in ok_codes:
        log(f"  -> exit code {proc.returncode}")
    return proc.returncode, (proc.stdout or "").strip()


def fail(why):
    log("")
    log(f"STOPPED: {why}")
    log("Nothing dangerous happened — tell Claude; the log is site_upgrade_log.txt.")
    sys.exit(1)


def read(rel):
    with open(os.path.join(REPO, rel), encoding="utf-8") as fh:
        return fh.read()


def write(rel, content):
    with open(os.path.join(REPO, rel), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(content)


SPLASH_HTML = """<div id="boot-splash" aria-hidden="true"><div class="bs-core"><img src="assets/img/icon-512.png" alt="" width="132" height="132"><div class="bs-word">RTFCL<em>MGZN</em></div><div class="bs-sub">ARTIFICIAL&nbsp;MAGAZINE</div></div></div><script>(function(){var s=document.getElementById('boot-splash');if(s){setTimeout(function(){try{s.parentNode.removeChild(s);}catch(e){}},2200);}})();</script>"""

SPLASH_CSS = """
/* ===== boot splash (2026-08-13) ===== */
#boot-splash{position:fixed;inset:0;z-index:2147483000;background:#05050c;display:flex;align-items:center;justify-content:center;animation:bsOut .5s cubic-bezier(.6,0,.8,1) 1.45s forwards;pointer-events:none}
#boot-splash .bs-core{position:relative;display:flex;flex-direction:column;align-items:center;gap:14px}
#boot-splash .bs-core::before{content:"";position:absolute;top:50%;left:50%;width:340px;height:340px;transform:translate(-50%,-58%);border-radius:50%;background:radial-gradient(circle,rgba(124,84,255,.42),rgba(124,84,255,.10) 55%,transparent 72%);animation:bsGlow 1.5s ease-out both;filter:blur(2px)}
#boot-splash img{position:relative;border-radius:26px;animation:bsSpin .9s cubic-bezier(.18,.85,.22,1) both;box-shadow:0 0 60px rgba(124,84,255,.35)}
#boot-splash .bs-word{position:relative;font-weight:800;font-size:30px;letter-spacing:.06em;color:#fff;animation:bsRise .7s cubic-bezier(.2,.8,.2,1) .28s both}
#boot-splash .bs-word em{font-style:normal;color:#8b7cf7}
#boot-splash .bs-sub{position:relative;font-size:11px;letter-spacing:.42em;color:#9a93c9;animation:bsRise .7s cubic-bezier(.2,.8,.2,1) .42s both}
@keyframes bsSpin{from{transform:scale(.5) rotate(-50deg);opacity:0}60%{opacity:1}to{transform:scale(1) rotate(0);opacity:1}}
@keyframes bsRise{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes bsGlow{from{opacity:0;transform:translate(-50%,-58%) scale(.6)}45%{opacity:1}to{opacity:.75;transform:translate(-50%,-58%) scale(1)}}
@keyframes bsOut{from{opacity:1}to{opacity:0;visibility:hidden}}
@media (prefers-reduced-motion:reduce){#boot-splash{display:none}}

/* ===== overflow / scrollbar-jitter guard (2026-08-13) ===== */
html,body{overflow-x:hidden}
@supports (overflow-x:clip){html,body{overflow-x:clip}}
html{scrollbar-gutter:stable}

/* ===== parent company footer line ===== */
.fparent{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#8a8a9c;margin-top:7px}
.fparent b{color:#a89bf5;font-weight:700}
"""

COGNIVOR_FOOTER = '<div class="fparent">A <b>COGNIVOR LABS</b> PUBLICATION</div>'


def main():
    log("RTFCLMGZN site upgrade — log: site_upgrade_log.txt")

    # 0. freshest tree first (our own log + untracked tools never block a rebase)
    code, out = run(["git", "status", "--porcelain"])
    tracked_dirty = [ln for ln in out.splitlines()
                     if not ln.startswith("??") and "site_upgrade_log" not in ln]
    if tracked_dirty:
        run(["git", "stash", "push", "-m", "pre-site-upgrade"], ok_codes=(0, 1))
    code, _ = run(["git", "pull", "--rebase", "origin", "main"])
    if code != 0:
        run(["git", "rebase", "--abort"], ok_codes=(0, 1, 128))
        fail("git pull --rebase failed — see above")

    changed = []

    # 1. LANGUAGE FIX — CSP connect-src + translate-pa endpoint
    headers = read("web/_headers")
    h2 = headers
    if "connect-src 'self' https://translate.googleapis.com" not in h2:
        h2 = h2.replace(
            "connect-src 'self';",
            "connect-src 'self' https://translate.googleapis.com "
            "https://translate-pa.googleapis.com;")
    if "translate-pa.googleapis.com https://www.gstatic.com; style-src" not in h2:
        h2 = h2.replace(
            "script-src 'self' 'unsafe-inline' https://translate.google.com "
            "https://translate.googleapis.com https://www.gstatic.com;",
            "script-src 'self' 'unsafe-inline' https://translate.google.com "
            "https://translate.googleapis.com https://translate-pa.googleapis.com "
            "https://www.gstatic.com;")
    if h2 != headers:
        write("web/_headers", h2)
        changed.append("web/_headers")
        log("_headers: unblocked Google Translate's fetch endpoints (language fix)")
    else:
        log("_headers: already fixed — skipping")

    # 2+3+4 CSS — append once
    css = read("web/assets/styles.css")
    if "boot splash (2026-08-13)" not in css:
        write("web/assets/styles.css", css.rstrip() + "\n" + SPLASH_CSS)
        changed.append("web/assets/styles.css")
        log("styles.css: splash + overflow guard + footer styles appended")
    else:
        log("styles.css: upgrade block already present — skipping")

    # index.html: splash node + footer line + cache-bust (UTF-8 + mojibake guard)
    idx = read("web/index.html")
    dashes = idx.count("—")
    idx2 = idx
    if 'id="boot-splash"' not in idx2:
        m = re.search(r"<body[^>]*>", idx2)
        if not m:
            fail("could not find <body> in index.html")
        idx2 = idx2[:m.end()] + "\n" + SPLASH_HTML + idx2[m.end():]
        log("index.html: boot splash injected")
    if "COGNIVOR LABS" not in idx2:
        flogo = re.search(r'(<div class="flogo">.*?</div>)', idx2, re.S)
        if flogo:
            idx2 = idx2.replace(flogo.group(1), flogo.group(1) + COGNIVOR_FOOTER, 1)
            log("index.html: Cognivor Labs footer line added")
        else:
            log("index.html: footer logo block not found — skipping footer line")
    if '"parentOrganization"' not in idx2 and '"logo": "https://rtfclmgzn.com/assets/img/og.jpg"' in idx2:
        idx2 = idx2.replace(
            '"logo": "https://rtfclmgzn.com/assets/img/og.jpg"',
            '"logo": "https://rtfclmgzn.com/assets/img/og.jpg",\n      '
            '"parentOrganization": { "@type": "Organization", "name": "Cognivor Labs" }',
            1)
        log("index.html: Cognivor Labs added to structured data")
    numbers = {int(m) for m in re.findall(r"\?b=(\d+)", idx2)}
    if len(numbers) != 1:
        fail(f"cache-buster inconsistent: {sorted(numbers)} — rerun in a minute")
    n = numbers.pop()
    idx2 = re.sub(r"\?b=\d+", f"?b={n + 1}", idx2)
    log(f"index.html: cache-buster {n} -> {n + 1}")
    if "â€" in idx2 or idx2.count("—") != dashes:
        fail("UTF-8 sanity check failed on index.html")
    if idx2 != idx:
        write("web/index.html", idx2)
        changed.append("web/index.html")

    if not changed:
        log("everything already applied — nothing to commit; will still push any "
            "waiting commits.")
    for path in changed + ["tools/site_upgrade.py", "SHIP_SITE_UPGRADE.bat"]:
        run(["git", "add", path], ok_codes=(0, 128))
    code, _ = run(["git", "diff", "--cached", "--quiet"], ok_codes=(0, 1))
    if code == 1:
        code, _ = run(["git", "commit", "-m",
                       "site upgrade: boot splash, language CSP fix, overflow "
                       "guard, Cognivor Labs parent branding"])
        if code != 0:
            fail("git commit failed")
    code, _ = run(["git", "pull", "--rebase", "origin", "main"])
    if code != 0:
        run(["git", "rebase", "--abort"], ok_codes=(0, 1, 128))
        fail("a cycle pushed mid-run and the rebase conflicted — run this again")
    log("")
    log("READY — the window pushes next (sign in as rtfclmgzn if asked).")


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as exc:  # noqa: BLE001
        log(f"UNEXPECTED ERROR: {exc!r}")
        sys.exit(1)
