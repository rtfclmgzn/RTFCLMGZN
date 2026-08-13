#!/usr/bin/env python3
"""RTFCLMGZN — official logo rollout (SHIP_LOGO.bat runs this, then pushes).

Stages: new favicon link + cache-bust in index.html, new icon-192/icon-512/og.jpg
(already placed in web/assets/img/), and the logo library reorg (old logos moved
to .old/, official/ added). Commits and rebases; the BAT does the actual push in
a visible console so a GitHub sign-in can appear if needed.
"""
import os
import re
import subprocess
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG_PATH = os.path.join(REPO, "ship_logo_log.txt")
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
    log("Nothing dangerous happened — tell Claude, the log is ship_logo_log.txt.")
    sys.exit(1)


def main():
    log("RTFCLMGZN logo rollout — log: ship_logo_log.txt")
    for rel in ("web/assets/img/icon-192.png", "web/assets/img/icon-512.png",
                "web/assets/img/og.jpg"):
        if not os.path.exists(os.path.join(REPO, rel)):
            fail(f"missing {rel} — Claude should redeliver it")

    # index.html: real favicon + cache-bust bump (UTF-8 both ends, mojibake check)
    idx_path = os.path.join(REPO, "web", "index.html")
    with open(idx_path, encoding="utf-8") as fh:
        idx = fh.read()
    dashes = idx.count("—")
    numbers = {int(m) for m in re.findall(r"\?b=(\d+)", idx)}
    if len(numbers) != 1:
        fail(f"cache-buster numbers inconsistent: {sorted(numbers)} — rerun in a minute")
    current = numbers.pop()
    new_icon_line = ('<link rel="icon" type="image/png" '
                     f'href="assets/img/icon-192.png?b={current}">')
    idx2, swapped = re.subn(r'<link rel="icon" href="data:image/svg\+xml[^>]*>',
                            new_icon_line, idx)
    if swapped:
        log("index.html: replaced the placeholder ◈ favicon with the official logo")
    elif 'rel="icon" type="image/png"' in idx2:
        log("index.html: favicon already points at the logo — skipping")
    idx2 = re.sub(r"\?b=\d+", f"?b={current + 1}", idx2)
    log(f"index.html: cache-buster {current} -> {current + 1}")
    if "â€" in idx2 or idx2.count("—") != dashes:
        fail("UTF-8 sanity check failed on index.html — refusing to write mojibake")
    with open(idx_path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(idx2)

    for path in ("web/assets/img/icon-192.png", "web/assets/img/icon-512.png",
                 "web/assets/img/og.jpg", "web/index.html",
                 "image-library/logos", "tools/ship_logo.py", "SHIP_LOGO.bat"):
        run(["git", "add", "-A", path], ok_codes=(0, 128))
    code, _ = run(["git", "diff", "--cached", "--quiet"], ok_codes=(0, 1))
    if code == 1:
        code, _ = run(["git", "commit", "-m",
                       "official logo rollout: favicon, app icons, social card; "
                       "logo library reorg"])
        if code != 0:
            fail("git commit failed")
    else:
        log("nothing new to commit — already committed earlier.")

    code, _ = run(["git", "pull", "--rebase", "origin", "main"])
    if code != 0:
        run(["git", "rebase", "--abort"], ok_codes=(0, 1, 128))
        code, out = run(["git", "status", "--porcelain"])
        dirty = [ln for ln in out.splitlines()
                 if "ship_logo_log.txt" not in ln and not ln.startswith("??")]
        if dirty:
            run(["git", "stash", "push", "-m", "pre-logo-leftovers"])
            code, _ = run(["git", "pull", "--rebase", "origin", "main"])
        if code != 0:
            fail("git pull --rebase failed — see above")
    log("")
    log("READY TO PUSH — the window will push next; if GitHub asks you to sign")
    log("in, pick rtfclmgzn (NOT cognivorlabs).")


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as exc:  # noqa: BLE001
        log(f"UNEXPECTED ERROR: {exc!r}")
        sys.exit(1)
