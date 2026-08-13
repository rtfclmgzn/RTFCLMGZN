#!/usr/bin/env python3
"""RTFCLMGZN — interactive social account linker (LINK_SOCIALS.bat runs this).

No JSON editing, no guessing: pick a platform, paste the values it asks for,
and it VERIFIES them against the real platform before saving anything into
agents/social/.secrets.json. Wrong password? It tells you right there and
saves nothing.

Paste tip: in this black window, RIGHT-CLICK pastes.
"""
import json
import os
import subprocess
import sys
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
SOCIAL_DIR = os.path.join(REPO, "agents", "social")
SECRETS = os.path.join(SOCIAL_DIR, ".secrets.json")

sys.path.insert(0, SOCIAL_DIR)
try:
    from post_social import HttpError, http_request, oauth1_header  # noqa: E402
except ImportError:
    print("Could not load agents/social/post_social.py — is this file inside the repo?")
    sys.exit(1)


# ---------- tiny console helpers ----------

def say(msg=""):
    print(msg, flush=True)


def ask(label, allow_empty=False):
    while True:
        value = input(f"  {label}\n  > ").strip().strip('"').strip("'")
        if value or allow_empty:
            return value
        say("  (that was empty — try again, right-click pastes)")


def mask(value):
    value = str(value or "")
    return value[:4] + "…" if len(value) > 4 else "…"


def load_secrets():
    if os.path.exists(SECRETS):
        with open(SECRETS, encoding="utf-8") as fh:
            return json.load(fh)
    return {"site": {"base_url": "https://rtfclmgzn.com"}}


def save_section(name, section):
    data = load_secrets()
    data[name] = {**(data.get(name) or {}), **section}
    with open(SECRETS, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    say(f"  SAVED into agents\\social\\.secrets.json ({name} section).")


def offer_test(platform):
    if ask(f"Post a real test to {platform} right now? Type y or n", allow_empty=True).lower() != "y":
        return
    say("  Running the dispatcher live for this one platform ...")
    code = subprocess.call([sys.executable,
                            os.path.join(SOCIAL_DIR, "post_social.py"),
                            "--live", "--platforms", platform], cwd=REPO)
    say("  (If it said 0 posted with no failures, there was simply nothing fresh "
        "staged to post — it will post on the next publish cycle.)"
        if code == 0 else
        "  Something failed — read the lines above; credentials were saved anyway.")


# ---------- platform flows ----------

def link_bluesky():
    say("\n--- BLUESKY ---")
    say("You need: your handle, and an App Password from Settings > Privacy and")
    say("Security > App Passwords (NOT your normal login password).")
    handle = ask("Your Bluesky handle (like rtfclmgzn.bsky.social — the @ is optional)").lstrip("@")
    if "." not in handle:
        handle += ".bsky.social"
        say(f"  (assuming you meant {handle})")
    app_pw = ask("The App Password (looks like xxxx-xxxx-xxxx-xxxx)")
    say("  Checking with Bluesky ...")
    try:
        session = http_request(
            "POST", "https://bsky.social/xrpc/com.atproto.server.createSession",
            data=json.dumps({"identifier": handle, "password": app_pw}).encode(),
            headers={"Content-Type": "application/json"})
    except HttpError as exc:
        say(f"  DID NOT WORK — Bluesky said: {exc}\n  Nothing was saved. "
            "Double-check the handle and make sure it's an App Password.")
        return
    say(f"  WORKS. Logged in as @{session.get('handle')}.")
    save_section("bluesky", {"identifier": handle, "app_password": app_pw,
                             "pds": "https://bsky.social"})
    offer_test("bluesky")


def link_reddit():
    say("\n--- REDDIT ---")
    say("You need: your Reddit username + password, and the 'script app' id and")
    say("secret from reddit.com/prefs/apps (the PDF shows exactly where).")
    client_id = ask("The app's client id (short code UNDER the app name, by the icon)")
    client_secret = ask("The app's secret")
    username = ask("Your Reddit username (no u/ needed)").lstrip("u/").lstrip("/")
    password = ask("Your Reddit account password")
    sub = ask("Subreddit to post into (press Enter for RTFCLMGZN)", allow_empty=True) or "RTFCLMGZN"
    say("  Checking with Reddit ...")
    import base64
    auth = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    ua = f"windows:rtfclmgzn-social:v1.0 (by /u/{username})"
    try:
        tok = http_request(
            "POST", "https://www.reddit.com/api/v1/access_token",
            data=urllib.parse.urlencode({"grant_type": "password",
                                         "username": username,
                                         "password": password}).encode(),
            headers={"Authorization": f"Basic {auth}", "User-Agent": ua})
        if not tok.get("access_token"):
            raise HttpError(json.dumps(tok)[:200])
    except HttpError as exc:
        say(f"  DID NOT WORK — Reddit said: {exc}\n  Nothing was saved. "
            "Usual causes: app type isn't 'script', or 2-factor login is on "
            "(script apps need it off, or an app-specific workaround).")
        return
    say("  WORKS. Token issued.")
    try:
        http_request("GET", f"https://oauth.reddit.com/r/{sub}/about",
                     headers={"Authorization": f"Bearer {tok['access_token']}",
                              "User-Agent": ua})
        say(f"  r/{sub} exists and is reachable.")
    except HttpError:
        say(f"  NOTE: could not see r/{sub} — if you haven't created it yet, "
            "create it on reddit.com first or posts will fail.")
    save_section("reddit", {"client_id": client_id, "client_secret": client_secret,
                            "username": username, "password": password,
                            "subreddit": sub, "user_agent": ua})
    offer_test("reddit")


def link_meta():
    say("\n--- FACEBOOK + INSTAGRAM (Meta) ---")
    # Shortcut: if Facebook is already linked, the saved Page token can simply
    # be ASKED for its Instagram — no new user token, no popups. This exists
    # because Meta's token popup kept minting page-less tokens (2026-08-13).
    existing = (load_secrets().get("meta") or {})
    if (existing.get("page_access_token") and existing.get("page_id")
            and not existing.get("instagram_business_id")):
        say("  Facebook is already linked — asking your Page which Instagram it owns ...")
        try:
            info = http_request(
                "GET",
                "https://graph.facebook.com/v25.0/"
                + urllib.parse.quote(str(existing["page_id"]))
                + "?fields=instagram_business_account,name&access_token="
                + urllib.parse.quote(existing["page_access_token"]))
            ig = (info.get("instagram_business_account") or {}).get("id")
            if ig:
                save_section("meta", {"instagram_business_id": ig})
                say(f"  WORKS. Page '{info.get('name')}' owns Instagram id {mask(ig)} — saved.")
                offer_test("instagram")
                return
            say("  The Page says no Instagram is linked to it yet. Link them "
                "(Page settings > Linked accounts) and re-run this option. "
                "Falling back to the token flow in case you want it anyway.")
        except HttpError as exc:
            say(f"  (Page query failed: {str(exc)[:160]} — falling back to token flow.)")
    handoff_path = os.path.join(SOCIAL_DIR, ".meta_handoff.json")
    handoff = {}
    if os.path.exists(handoff_path):
        try:
            with open(handoff_path, encoding="utf-8") as fh:
                handoff = json.load(fh)
        except (OSError, json.JSONDecodeError):
            handoff = {}
    if handoff.get("any_token"):
        # Token of unknown flavor (captured from the Explorer's Page-token
        # picker). Exchange it long-lived, then ask it who it is: a PAGE
        # token identifies as the Page itself and can be saved directly —
        # completely bypassing the broken me/accounts listing.
        say("  Found the captured token — checking what Facebook says it is ...")
        base = "https://graph.facebook.com/v25.0"
        token = handoff["any_token"]
        try:
            up = http_request("GET", f"{base}/oauth/access_token?"
                              + urllib.parse.urlencode({
                                  "grant_type": "fb_exchange_token",
                                  "client_id": handoff["app_id"],
                                  "client_secret": handoff["app_secret"],
                                  "fb_exchange_token": token}))
            token = up.get("access_token") or token
        except HttpError as exc:
            say(f"  (long-lived exchange failed: {str(exc)[:120]} — trying as-is)")
        try:
            who = http_request("GET", f"{base}/me?"
                               + urllib.parse.urlencode({"fields": "id,name",
                                                         "access_token": token}))
            ident, name = str(who.get("id") or ""), who.get("name")
            probe = http_request("GET", f"{base}/{ident}?"
                                 + urllib.parse.urlencode({
                                     "fields": "instagram_business_account,name",
                                     "access_token": token}))
            ig = (probe.get("instagram_business_account") or {}).get("id")
            section = {"page_access_token": token, "page_id": ident,
                       "graph_version": "v25.0"}
            if ig:
                section["instagram_business_id"] = ig
                say(f"  It's the Page token for '{name}' — Instagram found too. Saving both.")
            else:
                say(f"  It's the Page token for '{name}' — no Instagram attached "
                    "to the Page yet; Facebook saved, add IG later.")
            save_section("meta", section)
            try:
                os.remove(handoff_path)
            except OSError:
                pass
            offer_test("instagram" if ig else "facebook")
            return
        except HttpError as exc:
            say(f"  Not usable as a Page token ({str(exc)[:120]}) — "
                "falling back to the user-token flow.")
            handoff["short_token"] = handoff.get("short_token") or handoff["any_token"]
    if handoff.get("app_id") and handoff.get("short_token"):
        say("  Found the values Claude captured for you — no pasting needed.")
        app_id = handoff["app_id"]
        app_secret = handoff["app_secret"]
        short_token = handoff["short_token"]
    else:
        say("You need 3 things from developers.facebook.com (PDF shows every click):")
        say("  1) your app's App ID   2) its App Secret")
        say("  3) a token from Graph API Explorer with permissions:")
        say("     pages_manage_posts, pages_read_engagement, instagram_content_publish")
        app_id = ask("App ID")
        app_secret = ask("App Secret")
        short_token = ask("The token you copied from Graph API Explorer")
    base = "https://graph.facebook.com/v25.0"
    say("  Step 1/3: turning that into a long-lived token ...")
    try:
        exchanged = http_request(
            "GET", f"{base}/oauth/access_token?"
            + urllib.parse.urlencode({"grant_type": "fb_exchange_token",
                                      "client_id": app_id,
                                      "client_secret": app_secret,
                                      "fb_exchange_token": short_token}))
        user_token = exchanged.get("access_token") or short_token
    except HttpError:
        # System-user tokens don't need (or support) the exchange — they're
        # already long-lived. Use the token exactly as captured.
        say("  (exchange not applicable — using the token as-is; normal for "
            "system-user tokens)")
        user_token = short_token
    say("  Step 2/3: finding your Pages ...")
    try:
        pages = http_request(
            "GET", f"{base}/me/accounts?"
            + urllib.parse.urlencode({
                "fields": "name,id,access_token,instagram_business_account",
                "access_token": user_token}))
        page_list = pages.get("data") or []
    except HttpError as exc:
        say(f"  DID NOT WORK listing Pages — Meta said: {exc}\n  Nothing saved.")
        return
    if not page_list:
        say("  Meta returned NO Pages for this token. The token was made without "
            "the Page being selected, or your user isn't an admin of the Page. "
            "Nothing saved.")
        return
    for i, page in enumerate(page_list, 1):
        ig = page.get("instagram_business_account", {})
        say(f"    {i}) {page.get('name')}  (Instagram linked: "
            f"{'YES' if ig.get('id') else 'no'})")
    pick = ask(f"Which Page number? (1-{len(page_list)})")
    try:
        page = page_list[int(pick) - 1]
    except (ValueError, IndexError):
        say("  That wasn't a valid number. Nothing saved.")
        return
    ig_id = (page.get("instagram_business_account") or {}).get("id")
    say("  Step 3/3: checking the Page token ...")
    try:
        who = http_request("GET", f"{base}/{page['id']}?"
                           + urllib.parse.urlencode({"fields": "name",
                                                     "access_token": page["access_token"]}))
        say(f"  WORKS. Posting as Page: {who.get('name')}.")
    except HttpError as exc:
        say(f"  Page token check failed — Meta said: {exc}\n  Nothing saved.")
        return
    section = {"page_access_token": page["access_token"], "page_id": page["id"],
               "graph_version": "v25.0"}
    if ig_id:
        section["instagram_business_id"] = ig_id
        say(f"  Instagram business account found and saved too (id {mask(ig_id)}).")
    else:
        say("  NO Instagram account is linked to that Page yet — Facebook will "
            "work now; link IG to the Page in Meta Business Suite later and "
            "re-run this option to add it.")
    save_section("meta", section)
    if handoff:
        try:
            os.remove(handoff_path)
            say("  (one-time handoff file cleaned up)")
        except OSError:
            pass
    offer_test("facebook")


def link_threads():
    say("\n--- THREADS ---")
    handoff_path = os.path.join(SOCIAL_DIR, ".threads_handoff.json")
    handoff = {}
    if os.path.exists(handoff_path):
        try:
            with open(handoff_path, encoding="utf-8") as fh:
                handoff = json.load(fh)
        except (OSError, json.JSONDecodeError):
            handoff = {}
    if handoff.get("access_token"):
        say("  Found the values Claude captured for you — no pasting needed.")
        token = handoff["access_token"]
        secret = handoff.get("app_secret", "")
    else:
        say("You need a Threads access token from your Meta app's 'Threads API' use")
        say("case (the PDF shows the clicks). Long-lived is best; short works too if")
        say("you also paste the Threads App Secret so I can upgrade it.")
        token = ask("Threads access token")
        secret = ask("Threads App Secret (press Enter to skip if your token is already long-lived)",
                     allow_empty=True)
    base = "https://graph.threads.net"
    if secret:
        say("  Upgrading to a long-lived token ...")
        try:
            up = http_request("GET", f"{base}/access_token?"
                              + urllib.parse.urlencode({"grant_type": "th_exchange_token",
                                                        "client_secret": secret,
                                                        "access_token": token}))
            token = up.get("access_token") or token
        except HttpError as exc:
            say(f"  (Upgrade failed — {exc} — will try the token as-is.)")
    say("  Checking with Threads ...")
    try:
        me = http_request("GET", f"{base}/v1.0/me?"
                          + urllib.parse.urlencode({"fields": "id,username",
                                                    "access_token": token}))
    except HttpError as exc:
        say(f"  DID NOT WORK — Threads said: {exc}\n  Nothing saved.")
        return
    say(f"  WORKS. Posting as @{me.get('username')}.")
    save_section("threads", {"access_token": token, "user_id": me.get("id") or "me"})
    if handoff:
        try:
            os.remove(handoff_path)
            say("  (one-time handoff file cleaned up)")
        except OSError:
            pass
    offer_test("threads")


def link_x():
    say("\n--- X (TWITTER) ---")
    handoff_path = os.path.join(SOCIAL_DIR, ".x_handoff.json")
    handoff = {}
    if os.path.exists(handoff_path):
        try:
            with open(handoff_path, encoding="utf-8") as fh:
                handoff = json.load(fh)
        except (OSError, json.JSONDecodeError):
            handoff = {}
    needed = ("api_key", "api_secret", "access_token", "access_token_secret")
    if all(handoff.get(k) for k in needed):
        say("  Found the values Claude captured for you — no pasting needed.")
        creds = {k: handoff[k] for k in needed}
    else:
        say("You need 4 values from console.x.com > Apps > your app >")
        say("'Keys & Tokens': API Key + Secret, and Access Token + Secret")
        say("(the access token must say Read and Write). Reminder: X posting is")
        say("pay-per-use now — you need credits on the account for real posts.")
        creds = {
            "api_key": ask("API Key"),
            "api_secret": ask("API Key Secret"),
            "access_token": ask("Access Token"),
            "access_token_secret": ask("Access Token Secret"),
        }
    say("  Checking with X (one tiny read call) ...")
    url = "https://api.x.com/2/users/me"
    try:
        me = http_request("GET", url,
                          headers={"Authorization": oauth1_header("GET", url, creds)})
        handle = (me.get("data") or {}).get("username")
    except HttpError as exc:
        say(f"  DID NOT WORK — X said: {exc}\n  Nothing saved.")
        return
    say(f"  WORKS. Posting as @{handle}.")
    save_section("x", creds)
    if handoff:
        try:
            os.remove(handoff_path)
            say("  (one-time handoff file cleaned up)")
        except OSError:
            pass
    offer_test("x")


def show_status():
    data = load_secrets()
    say("\n--- WHAT'S LINKED ---")
    checks = {
        "bluesky": ("identifier", "app_password"),
        "reddit": ("client_id", "client_secret", "username", "password"),
        "meta (facebook)": (),
        "threads": ("access_token",),
        "x": ("api_key", "api_secret", "access_token", "access_token_secret"),
    }
    meta = data.get("meta") or {}
    say(f"  facebook : {'LINKED' if meta.get('page_access_token') and meta.get('page_id') else 'not yet'}")
    say(f"  instagram: {'LINKED' if meta.get('instagram_business_id') and meta.get('page_access_token') else 'not yet'}")
    for name, keys in checks.items():
        if not keys:
            continue
        section = data.get(name.split(" ")[0]) or {}
        say(f"  {name.split(' ')[0]:<9}: {'LINKED' if all(section.get(k) for k in keys) else 'not yet'}")
    say(f"  gemini   : {'LINKED' if (data.get('gemini') or {}).get('api_key') else 'not yet'}")
    say("\n  When you're done linking, the LAST step is on GitHub: repo Settings >")
    say("  Secrets and variables > Actions > New repository secret, name it")
    say("  RTFC_SOCIAL_SECRETS, and paste the ENTIRE contents of")
    say("  agents\\social\\.secrets.json as the value. That's what lets the")
    say("  automatic cycles post while your PC is off.")


def main():
    say("=" * 60)
    say(" RTFCLMGZN social linker — paste values, I verify and save.")
    say(" Right-click pastes in this window.")
    say("=" * 60)
    actions = {"1": link_bluesky, "2": link_reddit, "3": link_meta,
               "4": link_threads, "5": link_x, "6": show_status}
    while True:
        say("\nWhat do you want to link?")
        say("  1) Bluesky   2) Reddit   3) Facebook+Instagram   4) Threads   5) X")
        say("  6) show what's linked so far      q) quit")
        choice = input("  > ").strip().lower()
        if choice in ("q", "quit", "exit", ""):
            say("Bye. Re-run LINK_SOCIALS.bat any time.")
            return
        action = actions.get(choice)
        if action:
            try:
                action()
            except KeyboardInterrupt:
                say("\n  (cancelled — nothing saved)")
        else:
            say("  Type a number 1-6, or q.")


if __name__ == "__main__":
    main()
