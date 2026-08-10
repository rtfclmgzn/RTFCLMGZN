#!/usr/bin/env python3
"""RTFCLMGZN one-click shipper (Python core; FIX_COVERS_AND_SHIP.bat launches this).

Steps: stash leftovers -> pull --rebase -> push -> GEMINI secret -> trigger heal cycle.
Everything is printed AND written to ship_fix_log.txt in the repo root, so a failed
run can be diagnosed remotely without copying console text.
"""
import json
import os
import subprocess
import sys
import webbrowser

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG_PATH = os.path.join(REPO, "ship_fix_log.txt")
_log_lines = []


def log(msg=""):
    print(msg, flush=True)
    _log_lines.append(msg)
    try:
        with open(LOG_PATH, "w", encoding="utf-8") as fh:
            fh.write("\n".join(_log_lines) + "\n")
    except OSError:
        pass


def run(cmd, ok_codes=(0,), secret_stdin=None, timeout=300):
    """Run a command, capture+log output, return (code, stdout)."""
    log(f"$ {' '.join(cmd)}")
    try:
        proc = subprocess.run(
            cmd, cwd=REPO, capture_output=True, text=True, timeout=timeout,
            input=secret_stdin, encoding="utf-8", errors="replace",
        )
    except FileNotFoundError:
        log(f"  -> command not found: {cmd[0]}")
        return 127, ""
    except subprocess.TimeoutExpired:
        log(f"  -> TIMED OUT after {timeout}s")
        return 124, ""
    out = (proc.stdout or "").strip()
    err = (proc.stderr or "").strip()
    for line in out.splitlines():
        log(f"  | {line}")
    for line in err.splitlines():
        log(f"  ! {line}")
    if proc.returncode not in ok_codes:
        log(f"  -> exit code {proc.returncode}")
    return proc.returncode, out


def fail(why):
    log("")
    log("*" * 64)
    log(f"STOPPED: {why}")
    log("Nothing dangerous happened. Send me ship_fix_log.txt (repo root)")
    log("or just tell me it failed — I can read that log remotely.")
    log("*" * 64)
    sys.exit(1)


def main():
    log("RTFCLMGZN shipper (python) — log: ship_fix_log.txt")
    log(f"repo: {REPO}")
    log("")

    # 0. sanity
    code, _ = run(["git", "rev-parse", "--is-inside-work-tree"])
    if code != 0:
        fail("this folder is not a git repo?")

    # 1. workflow files in place? (bat normally copies them; double-check here)
    updates = os.path.join(REPO, "_workflow_updates")
    if os.path.isdir(updates):
        import shutil
        for name in ("newsroom-cycle.yml", "breaking-scan.yml", "pulse-scan.yml"):
            src = os.path.join(updates, name)
            if os.path.exists(src):
                shutil.copyfile(src, os.path.join(REPO, ".github", "workflows", name))
                log(f"installed .github/workflows/{name}")
        shutil.rmtree(updates, ignore_errors=True)

    # 2. stage + commit anything of ours that isn't committed yet
    # (one add per path: a single missing file must not block the rest)
    for path in (".github/workflows", "newsroom/runner/verify_covers.py",
                 "newsroom/runner/cycle-runbook.md",
                 "newsroom/runner/breaking-scan-runbook.md",
                 "agents/social/post_social.py",
                 "agents/social/secrets.template.json",
                 "agents/social/social-posting.agent.md",
                 "agents/social/GO-LIVE.md",
                 "RTFCLMGZN_SOCIAL_DISPATCH.bat", "tools/ship_fix.py",
                 "FIX_COVERS_AND_SHIP.bat"):
        run(["git", "add", path], ok_codes=(0, 128))
    code, _ = run(["git", "diff", "--cached", "--quiet"], ok_codes=(0, 1))
    if code == 1:
        code, _ = run(["git", "commit", "-m",
                       "cover gate + social pipeline + workflow env (ship_fix)"])
        if code != 0:
            fail("git commit failed — see output above")
    else:
        log("nothing new to commit (already committed earlier) — good.")

    # 3. park any other uncommitted leftovers so rebase gets a clean tree
    # (our own log file doesn't count as a leftover)
    code, out = run(["git", "status", "--porcelain"])
    dirty = [ln for ln in out.splitlines() if "ship_fix_log.txt" not in ln]
    if dirty:
        log("parking older uncommitted leftovers in a safety stash (recoverable):")
        code, _ = run(["git", "stash", "push", "-u", "-m", "pre-ship-leftovers"])
        if code != 0:
            fail("git stash failed — see output above")

    # 4. pull --rebase, then push (retry once)
    code, _ = run(["git", "pull", "--rebase", "origin", "main"], timeout=600)
    if code != 0:
        run(["git", "rebase", "--abort"], ok_codes=(0, 1, 128))
        fail("git pull --rebase failed. If the output above mentions "
             "authentication / credentials / 403 / could not read Username, "
             "your GitHub sign-in on this PC needs a refresh: open a terminal, "
             "run  git pull --rebase origin main  once by hand and complete the "
             "sign-in window, then double-click the .bat again.")
    code, _ = run(["git", "push", "origin", "main"], timeout=600)
    if code != 0:
        log("push rejected — a cycle probably landed mid-push; retrying once ...")
        code, _ = run(["git", "pull", "--rebase", "origin", "main"], timeout=600)
        if code == 0:
            code, _ = run(["git", "push", "origin", "main"], timeout=600)
        if code != 0:
            fail("push still failing — see output above")
    log("")
    log("PUSHED. GitHub now has the cover gate, fixed workflows, and runbooks.")
    log("")

    # 5. GEMINI_API_KEY secret + trigger heal cycle (needs gh CLI)
    code, _ = run(["gh", "auth", "status"])
    if code != 0:
        # No gh (127) or not logged in — fall back to the browser, two clicks.
        code, origin_url = run(["git", "remote", "get-url", "origin"])
        slug = ""
        if origin_url:
            import re
            m = re.search(r"github\.com[:/]+([^/]+/[^/\s.]+)", origin_url)
            slug = m.group(1) if m else ""
        log("")
        log("The GitHub CLI (gh) is missing or signed out, so two clicks remain")
        log("that only the GitHub website can do. Opening both pages:")
        log("  1) add a secret named GEMINI_API_KEY")
        log("     (value = gemini.api_key from agents\\social\\.secrets.json)")
        log("  2) press 'Run workflow' on Newsroom Cycle to heal the covers now")
        if slug:
            for url in (f"https://github.com/{slug}/settings/secrets/actions",
                        f"https://github.com/{slug}/actions/workflows/newsroom-cycle.yml"):
                log(f"  {url}")
                try:
                    webbrowser.open(url)
                except Exception:
                    pass
        else:
            log("  (could not parse the repo address — open GitHub yourself)")
        log("")
        log("Even without those clicks, everything pushed — but generation stays")
        log("dead until the secret exists, and healing waits for the next")
        log("scheduled cycle instead of starting now.")
        return

    code, out = run(["gh", "secret", "list"])
    if "GEMINI_API_KEY" in out:
        log("GEMINI_API_KEY secret already exists — good.")
    else:
        secrets_path = os.path.join(REPO, "agents", "social", ".secrets.json")
        key = None
        try:
            with open(secrets_path, encoding="utf-8") as fh:
                key = (json.load(fh).get("gemini") or {}).get("api_key")
        except (OSError, json.JSONDecodeError):
            pass
        if not key:
            fail("no gemini.api_key found in agents/social/.secrets.json — "
                 "add the secret by hand on GitHub (Settings > Secrets > Actions)")
        # value goes via stdin only; it is never printed or written to the log
        code, _ = run(["gh", "secret", "set", "GEMINI_API_KEY"], secret_stdin=key)
        if code != 0:
            fail("gh secret set failed — see output above")
        log("GEMINI_API_KEY secret set.")

    code, _ = run(["gh", "workflow", "run", "newsroom-cycle.yml", "--ref", "main"])
    if code != 0:
        fail("could not trigger the Newsroom Cycle workflow — trigger it from "
             "the Actions tab on GitHub instead")
    log("")
    log("=" * 64)
    log("ALL DONE. A heal cycle is starting on GitHub right now. It typically")
    log("takes 10-30 minutes (research, repair, deploy), then the imageless")
    log("lead and duplicate covers fix themselves. Check the site after that.")
    log("Progress: GitHub > Actions tab > Newsroom Cycle (top run).")
    log("=" * 64)


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as exc:  # noqa: BLE001 — last-resort: log, don't vanish
        log(f"UNEXPECTED ERROR: {exc!r}")
        sys.exit(1)
