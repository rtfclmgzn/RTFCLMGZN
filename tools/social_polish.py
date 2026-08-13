#!/usr/bin/env python3
"""RTFCLMGZN social polish (SHIP_SOCIAL_SETUP.bat runs this).

Does three things in one shot, then commits and pushes:
1. Hides the staged social-distribution drafts from public article pages
   (they are internal Agent A/B -> dispatcher handover records, not reader
   content): removes the distributionHTML() call in web/assets/app.js and the
   data/social-posts.js script tag in web/index.html, bumps the cache-buster.
2. Installs the newsroom-cycle.yml update that passes RTFC_SOCIAL_SECRETS to
   the runner (so the dispatcher can go live from GitHub Actions).
3. Ships post_social.py's env-fallback so the same secret works on CI.

Everything logs to ship_fix_log.txt style: social_polish_log.txt in repo root.
"""
import os
import re
import subprocess
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG_PATH = os.path.join(REPO, "social_polish_log.txt")
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
    except FileNotFoundError:
        log(f"  -> command not found: {cmd[0]}")
        return 127, ""
    except subprocess.TimeoutExpired:
        log(f"  -> TIMED OUT after {timeout}s")
        return 124, ""
    for line in (proc.stdout or "").strip().splitlines():
        log(f"  | {line}")
    for line in (proc.stderr or "").strip().splitlines():
        log(f"  ! {line}")
    if proc.returncode not in ok_codes:
        log(f"  -> exit code {proc.returncode}")
    return proc.returncode, (proc.stdout or "").strip()


def fail(why):
    log("")
    log("*" * 64)
    log(f"STOPPED: {why}")
    log("Nothing dangerous happened. Tell me it failed — I can read")
    log("social_polish_log.txt remotely and fix it.")
    log("*" * 64)
    sys.exit(1)


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def write(path, content):
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(content)


def main():
    log("RTFCLMGZN social polish — log: social_polish_log.txt")

    # 0. install protected workflow update if staged
    updates = os.path.join(REPO, "_workflow_updates")
    if os.path.isdir(updates):
        import shutil
        src = os.path.join(updates, "newsroom-cycle.yml")
        if os.path.exists(src):
            shutil.copyfile(src, os.path.join(REPO, ".github", "workflows",
                                              "newsroom-cycle.yml"))
            log("installed .github/workflows/newsroom-cycle.yml (social secrets env)")
        shutil.rmtree(updates, ignore_errors=True)

    # 1. commit OUR delivered files first, so no stash can ever swallow them
    for path in (".github/workflows/newsroom-cycle.yml",
                 "agents/social/post_social.py", "agents/social/GO-LIVE.md",
                 "tools/social_polish.py", "SHIP_SOCIAL_SETUP.bat",
                 "functions/share",                 # per-article OG share pages
                 "tools/link_socials.py", "LINK_SOCIALS.bat",
                 "tools/undo_fb_burst.py", "UNDO_FB_BURST.bat",
                 "tools/ship_fix.py", "FIX_COVERS_AND_SHIP.bat"):
        run(["git", "add", path], ok_codes=(0, 128))
    code, _ = run(["git", "diff", "--cached", "--quiet"], ok_codes=(0, 1))
    if code == 1:
        code, _ = run(["git", "commit", "-m",
                       "social: RTFC_SOCIAL_SECRETS env plumbing for the "
                       "Actions runner + dispatcher env fallback"])
        if code != 0:
            fail("git commit (plumbing) failed")

    # 2. park true leftovers (never our logs), then get current — the site
    #    edits below must apply to the freshest tree (cycles push often)
    code, out = run(["git", "status", "--porcelain"])
    dirty = [ln for ln in out.splitlines()
             if "ship_fix_log.txt" not in ln and "social_polish_log.txt" not in ln]
    if dirty:
        run(["git", "stash", "push", "-u", "-m", "pre-polish-leftovers"])
    code, _ = run(["git", "pull", "--rebase", "origin", "main"])
    if code != 0:
        run(["git", "rebase", "--abort"], ok_codes=(0, 1, 128))
        fail("git pull --rebase failed — see output above")

    changed = []

    # 3a. app.js: remove the reader-facing distribution block (call site only)
    app_path = os.path.join(REPO, "web", "assets", "app.js")
    app = read(app_path)
    call = "distributionHTML(a)+"
    n = app.count(call)
    if n == 1:
        app = app.replace(
            call,
            "/* distribution drafts are internal pipeline handover data — "
            "not rendered for readers (2026-08-10) */")
        write(app_path, app)
        changed.append("web/assets/app.js")
        log("app.js: removed the Distribution block from article pages")
    elif n == 0:
        log("app.js: distribution call already removed — skipping")
    else:
        fail(f"expected exactly one distributionHTML(a)+ call, found {n}")

    # 3b. index.html: drop the social-posts.js script tag + bump every ?b=N
    idx_path = os.path.join(REPO, "web", "index.html")
    idx = read(idx_path)
    before_dashes = idx.count("—")
    tag_re = re.compile(r'[ \t]*<script defer src="data/social-posts\.js\?b=\d+"></script>\r?\n')
    idx2, removed = tag_re.subn("", idx)
    if removed:
        log("index.html: removed the data/social-posts.js script tag")
    else:
        log("index.html: social-posts.js tag already absent — skipping")
    numbers = {int(m) for m in re.findall(r"\?b=(\d+)", idx2)}
    if len(numbers) != 1:
        fail(f"cache-buster numbers are inconsistent: {sorted(numbers)} — "
             "a cycle may be mid-push; run this again in a minute")
    current = numbers.pop()
    idx2 = re.sub(r"\?b=\d+", f"?b={current + 1}", idx2)
    log(f"index.html: cache-buster {current} -> {current + 1}")
    if "â€" in idx2 or idx2.count("—") != before_dashes:
        fail("UTF-8 sanity check failed on index.html — refusing to write mojibake")
    if idx2 != idx:
        write(idx_path, idx2)
        changed.append("web/index.html")

    # 4. commit the site edits, then push both commits
    if changed:
        for path in changed:
            run(["git", "add", path], ok_codes=(0, 128))
        code, _ = run(["git", "commit", "-m",
                       "hide internal social drafts from article pages "
                       "(pipeline handover data, not reader content); bump cache-buster"])
        if code != 0:
            fail("git commit (site edits) failed")
    code, _ = run(["git", "pull", "--rebase", "origin", "main"])
    if code != 0:
        run(["git", "rebase", "--abort"], ok_codes=(0, 1, 128))
        fail("a cycle pushed at the same moment and the rebase conflicted — "
             "run this .bat once more; it picks up cleanly")
    code, _ = run(["git", "push", "origin", "main"])
    if code != 0:
        fail("git push failed — see output above")
    log("")
    log("PUSHED. Deploy lands in ~1 minute; hard-refresh (Ctrl+F5) after.")

    log("")
    log("=" * 64)
    log("DONE. Article pages no longer show the staged social posts.")
    log("Next: link the platforms (see the guide in chat / GO-LIVE.md),")
    log("fill agents\\social\\.secrets.json, test each with")
    log("  py -3 agents\\social\\post_social.py --live --platforms <name>")
    log("then paste the WHOLE .secrets.json file content into ONE GitHub")
    log("secret named RTFC_SOCIAL_SECRETS so the Actions cycles can post.")
    log("=" * 64)


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as exc:  # noqa: BLE001
        log(f"UNEXPECTED ERROR: {exc!r}")
        sys.exit(1)
