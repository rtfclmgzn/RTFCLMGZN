#!/usr/bin/env python3
"""ONE clear alert when a login dies, instead of a flood of "Run failed" emails.

Incident (2026-10-14 to 2026-11-01): the Claude login for CI was revoked and
the Threads token expired. Every scheduled run failed for 2.5 weeks. The only
signal was 100+ identical "Run failed" emails that looked like broken code, so
nothing got fixed. The real cause was two expired credentials that only the
owner can renew.

What this does:
  * A run fails because a login is dead  -> opens ONE GitHub issue titled
    "ACTION NEEDED: ..." with plain click-by-click fix steps. If the issue is
    already open it adds at most one reminder comment per 24h.
  * The next run that works                -> closes that issue automatically.

It never fails the step it runs in; it only reports. Needs `issues: write`
and GH_TOKEN in the environment (the workflow's own github.token).

Usage:
  login_alert.py claude <execution_file> <agent_outcome>
  login_alert.py social <dispatch_log_file>
"""
import calendar
import json
import os
import re
import subprocess
import sys
import time

REPO = os.environ.get("GITHUB_REPOSITORY", "rtfclmgzn/RTFCLMGZN")
RUN_URL = "%s/%s/actions/runs/%s" % (
    os.environ.get("GITHUB_SERVER_URL", "https://github.com"), REPO,
    os.environ.get("GITHUB_RUN_ID", ""))
WORKFLOW = os.environ.get("GITHUB_WORKFLOW", "a workflow")
SECRETS_PAGE = "https://github.com/%s/settings/secrets/actions" % REPO

CLAUDE_AUTH = re.compile(
    r"(oauth token (revoked|expired)|failed to authenticate|invalid[ _-]?(api[ _-]?key|token|x-api-key)"
    r"|authentication_error|api_error_status=401|\b401\b.*(unauthori|auth)|please log in again)",
    re.I)
SOCIAL_AUTH = re.compile(
    r"(session has expired|error validating access token|access token.*(expired|invalid)"
    r"|oauthexception|invalid_grant|expiredtoken|token (has )?expired|\b401\b)", re.I)
PLATFORMS = ("threads", "instagram", "facebook", "bluesky", "x", "reddit")

CLAUDE_TITLE = "ACTION NEEDED: Claude login for the newsroom expired"
CLAUDE_BODY = """The newsroom robots cannot sign in to Claude, so **nothing is publishing**.
Nothing is wrong with the code. The login just needs renewing (about 3 minutes):

1. Press the Windows key, type **PowerShell**, press Enter.
2. Paste `claude setup-token` and press Enter.
3. Sign in when the browser opens. Copy the long code it prints (starts with `sk-ant-oat01-`).
4. Open %s
5. Click the pencil next to **CLAUDE_CODE_OAUTH_TOKEN**, paste, click **Update secret**.

This issue closes itself the next time a run signs in successfully.

First failing run: %s
"""

SOCIAL_TITLE = "ACTION NEEDED: %s login expired (social posting)"
SOCIAL_BODY = """Social posting to **%s** is failing because its login token expired.
Other platforms keep posting. To fix (about 5 minutes):

1. Go to `D:\\BUSINESS\\RTFCLMGZN` and double-click **LINK_SOCIALS.bat**.
2. Pick **%s** and paste a fresh token when it asks.
3. Open %s, click the pencil on **RTFC_SOCIAL_SECRETS**, and paste the ENTIRE
   contents of `agents\\social\\.secrets.json`. Click **Update secret**.

This issue closes itself the next time %s posts successfully.

Platform said: `%s`
First failing run: %s
"""


def gh(*args):
    r = subprocess.run(["gh", *args, "-R", REPO], capture_output=True, text=True)
    if r.returncode != 0:
        print("gh %s failed: %s" % (args[:2], r.stderr.strip()[:300]))
        return None
    return r.stdout


def find_open(title):
    out = gh("issue", "list", "--state", "open", "--search", "in:title \"%s\"" % title,
             "--json", "number,title,updatedAt", "--limit", "20")
    if not out:
        return None
    for it in json.loads(out):
        if it["title"] == title:
            return it
    return None


def raise_alert(title, body):
    it = find_open(title)
    if not it:
        gh("issue", "create", "--title", title, "--body", body)
        print("::error title=%s::opened an alert issue with fix steps" % title)
        return
    updated = calendar.timegm(time.strptime(it["updatedAt"], "%Y-%m-%dT%H:%M:%SZ"))
    if time.time() - updated > 24 * 3600:
        gh("issue", "comment", str(it["number"]), "--body",
           "Still failing (latest run: %s). Steps above are unchanged." % RUN_URL)
    print("::error title=%s::see open issue #%s for fix steps" % (title, it["number"]))


def clear_alert(title, note):
    it = find_open(title)
    if it:
        gh("issue", "close", str(it["number"]), "--comment", note)
        print("::notice::closed alert #%s - %s" % (it["number"], note))


def all_text(obj):
    if isinstance(obj, dict):
        for v in obj.values():
            yield from all_text(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from all_text(v)
    elif isinstance(obj, str):
        yield obj
    elif obj is not None:
        yield str(obj)


def claude(exec_file, outcome):
    outcome = (outcome or "").strip().lower()
    if outcome == "success":
        clear_alert(CLAUDE_TITLE, "%s signed in and ran successfully: %s" % (WORKFLOW, RUN_URL))
        return
    if outcome != "failure":
        return
    text = ""
    try:
        data = json.load(open(exec_file, encoding="utf-8", errors="replace"))
        events = data if isinstance(data, list) else [data]
        text = " ".join(all_text(events[-8:]))
    except Exception:  # noqa: BLE001 - no file usually means the agent never started
        text = "no execution file"
    if CLAUDE_AUTH.search(text) or text == "no execution file":
        raise_alert(CLAUDE_TITLE, CLAUDE_BODY % (SECRETS_PAGE, RUN_URL))


def social(log_file):
    try:
        lines = open(log_file, encoding="utf-8", errors="replace").read().splitlines()
    except OSError:
        return
    dead, ok = {}, set()
    for ln in lines:
        m = re.search(r"\]\s+(\w+):\s+(FAILED|LIVE OK)\b(.*)", ln)
        if not m:
            continue
        plat, status, rest = m.group(1).lower(), m.group(2), m.group(3)
        if plat not in PLATFORMS:
            continue
        if status == "FAILED" and SOCIAL_AUTH.search(rest):
            dead.setdefault(plat, rest.strip()[:240])
        elif status != "FAILED":
            ok.add(plat)
    for plat, msg in dead.items():
        name = plat.capitalize() if plat != "x" else "X"
        raise_alert(SOCIAL_TITLE % name,
                    SOCIAL_BODY % (name, name, SECRETS_PAGE, name, msg.replace("`", "'"), RUN_URL))
    for plat in ok - set(dead):
        name = plat.capitalize() if plat != "x" else "X"
        clear_alert(SOCIAL_TITLE % name, "%s posted successfully again: %s" % (name, RUN_URL))
    # Exit code tells the workflow whether EVERY failure was a dead login
    # (already alerted via the issue) so it need not paint the run red too.
    other_fail = any(re.search(r"\]\s+\w+:\s+FAILED", ln) and not SOCIAL_AUTH.search(ln)
                     for ln in lines)
    print("SOCIAL_LOGIN_ALERT dead=%s other_failures=%s" % (sorted(dead), other_fail))
    sys.exit(3 if other_fail else 0)


def main():
    if len(sys.argv) >= 2 and sys.argv[1] == "claude":
        claude(sys.argv[2] if len(sys.argv) > 2 else "", sys.argv[3] if len(sys.argv) > 3 else "")
    elif len(sys.argv) >= 3 and sys.argv[1] == "social":
        social(sys.argv[2])
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
