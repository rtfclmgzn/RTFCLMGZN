#!/usr/bin/env python3
"""RTFCLMGZN social dispatcher — posts staged records from web/data/social-posts.js.

Deterministic poster for the Agent A -> Agent B social pipeline. Agent B stages
platform-native copy as status:"ready" records; this script does the actual
posting through each platform's official API, then writes back status/post_url.

Platforms: x, facebook, instagram, threads, bluesky, reddit  (tiktok: deferred)

Safety model
------------
- DRY-RUN by default. Nothing posts without --live.
- A platform with missing/null credentials in agents/social/.secrets.json is
  skipped (stays "ready"). Go live one platform at a time.
- Dedupe ledger lives OUTSIDE the repo (%LOCALAPPDATA%\\RTFCLMGZN\\social-ledger.json)
  so a git checkout/reset can never cause a double post.
- Max article age guard (default 3 days) so a first enable never floods
  accounts with the backlog. Per-run post cap (default 12).
- Never prints secrets.

Usage
-----
  py -3 agents/social/post_social.py                 # dry-run, show what would post
  py -3 agents/social/post_social.py --live          # actually post
  py -3 agents/social/post_social.py --live --platforms bluesky,threads
  py -3 agents/social/post_social.py --live --limit 6 --max-age-days 2

X pricing note (2026): X API is pay-per-use. A text post is cheap; a post whose
BODY contains a link costs ~13x more. So X records use link_in_reply: the hook
tweet carries no URL, the article link goes in an immediate reply. This script
estimates X spend in its summary. Verify current rates at developer.x.com.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import json
import os
import re
import secrets as pysecrets
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
SECRETS_PATH = os.path.join(HERE, ".secrets.json")
UA = "RTFCLMGZN-Social/1.0 (autonomous newsroom; rtfclmgzn.com)"

X_COST_PER_POST = 0.015          # estimate; verify at developer.x.com
X_COST_PER_LINK_POST = 0.20      # link in post BODY; avoided via link_in_reply

PLATFORMS = ("x", "facebook", "instagram", "threads", "bluesky", "reddit")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso(ts: datetime) -> str:
    return ts.strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_iso(value: str) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# social-posts.js parsing (tolerant: file mixes strict JSON and JS literals)
# ---------------------------------------------------------------------------

def _normalize_js(source: str) -> str:
    """Make a JS array literal json.loads-able: strip // comments, convert
    single-quoted strings, quote bare keys, drop trailing commas. The key
    quoting and comma fixes run ONLY on non-string segments, so prose like
    "margins, capex: down" inside copy can never be corrupted."""
    segments: list[tuple[bool, str]] = []  # (is_string, text)
    buf: list[str] = []
    i, n = 0, len(source)
    while i < n:
        ch = source[i]
        if ch in ("'", '"'):
            if buf:
                segments.append((False, "".join(buf)))
                buf = []
            quote = ch
            j = i + 1
            inner: list[str] = []
            while j < n:
                c = source[j]
                if c == "\\" and j + 1 < n:
                    inner.append(source[j:j + 2])
                    j += 2
                    continue
                if c == quote:
                    break
                inner.append(c)
                j += 1
            text = "".join(inner)
            if quote == "'":
                text = text.replace('\\"', '"').replace('"', '\\"').replace("\\'", "'")
            segments.append((True, '"' + text + '"'))
            i = j + 1
            continue
        if ch == "/" and i + 1 < n and source[i + 1] == "/":
            while i < n and source[i] != "\n":
                i += 1
            continue
        buf.append(ch)
        i += 1
    if buf:
        segments.append((False, "".join(buf)))
    fixed: list[str] = []
    for is_string, text in segments:
        if not is_string:
            text = re.sub(r'([{,\[]\s*)([A-Za-z_][A-Za-z0-9_$]*)(\s*:)', r'\1"\2"\3', text)
            text = re.sub(r",(\s*[}\]])", r"\1", text)
        fixed.append(text)
    return "".join(fixed)


def load_social_file(path: str) -> tuple[str, list]:
    with open(path, "r", encoding="utf-8") as fh:
        raw = fh.read()
    # Anchor on the assignment, not the first "[" — header comments mention
    # things like `posts[]`, and a naive find("[") lands inside a comment.
    anchor = raw.find("RTFC_SOCIAL_POSTS")
    eq = raw.find("=", anchor) if anchor >= 0 else -1
    marker = raw.find("[", eq) if eq >= 0 else raw.find("[")
    if marker < 0:
        raise SystemExit(f"Could not find array start in {path}")
    prefix = raw[:marker]
    end = raw.rfind("]")
    if end < 0:
        raise SystemExit(f"Could not find array end in {path}")
    body = raw[marker:end + 1]
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        data = json.loads(_normalize_js(body))
    if not isinstance(data, list):
        raise SystemExit(f"{path} did not parse to a list")
    return prefix, data


def save_social_file(path: str, prefix: str, data: list) -> None:
    rendered = prefix + json.dumps(data, ensure_ascii=False, indent=2) + ";\n"
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(rendered)


# ---------------------------------------------------------------------------
# Secrets / ledger
# ---------------------------------------------------------------------------

def load_secrets() -> dict:
    """Local file first (the PC); RTFC_SOCIAL_SECRETS env JSON on CI runners,
    where .secrets.json is git-ignored and therefore absent by design."""
    if os.path.exists(SECRETS_PATH):
        with open(SECRETS_PATH, "r", encoding="utf-8") as fh:
            return json.load(fh)
    blob = os.environ.get("RTFC_SOCIAL_SECRETS", "").strip()
    if blob:
        try:
            value = json.loads(blob)
            if isinstance(value, dict):
                return value
        except json.JSONDecodeError:
            print("WARN: RTFC_SOCIAL_SECRETS is set but is not valid JSON — ignoring")
    return {}


def section_ready(secrets: dict, name: str, required: tuple[str, ...]) -> bool:
    section = secrets.get(name) or {}
    return all(section.get(key) for key in required)


def default_ledger_path() -> str:
    base = os.environ.get("LOCALAPPDATA")
    if base:
        root = os.path.join(base, "RTFCLMGZN")
    else:  # non-Windows (testing)
        root = os.path.join(os.path.expanduser("~"), ".rtfclmgzn")
    os.makedirs(root, exist_ok=True)
    return os.path.join(root, "social-ledger.json")


def load_ledger(path: str) -> dict:
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            if isinstance(data, dict) and isinstance(data.get("posted"), dict):
                return data
        except (json.JSONDecodeError, OSError):
            pass
    return {"posted": {}}


def save_ledger(path: str, ledger: dict) -> None:
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(ledger, fh, ensure_ascii=False, indent=1)
    os.replace(tmp, path)


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

class HttpError(RuntimeError):
    pass


def http_request(method: str, url: str, *, headers: dict | None = None,
                 data: bytes | None = None, timeout: int = 60) -> dict:
    request = urllib.request.Request(url, data=data, method=method,
                                     headers={"User-Agent": UA, **(headers or {})})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")[:600]
        raise HttpError(f"HTTP {exc.code} {url.split('?')[0]}: {body}") from exc
    except Exception as exc:
        raise HttpError(f"{url.split('?')[0]}: {exc}") from exc
    if not payload.strip():
        return {}
    try:
        value = json.loads(payload)
    except json.JSONDecodeError:
        raise HttpError(f"Non-JSON response from {url.split('?')[0]}: {payload[:300]}")
    if isinstance(value, dict) and value.get("error"):
        raise HttpError(f"API error from {url.split('?')[0]}: {json.dumps(value['error'])[:500]}")
    return value if isinstance(value, dict) else {"data": value}


def form(data: dict) -> bytes:
    return urllib.parse.urlencode({k: v for k, v in data.items() if v is not None}).encode("utf-8")


# ---------------------------------------------------------------------------
# Article URL with UTM (query must precede the hash on a hash-routed SPA)
# ---------------------------------------------------------------------------

def article_url(base_url: str, export_url: str, platform: str) -> str:
    """Share link for social posts.

    Uses /share/<slug> (a Cloudflare Pages Function serving per-article OG
    tags, then redirecting into the SPA) so link previews show THE ARTICLE'S
    cover and title — not the site-level card. Crawlers can't see past the
    hash router, which is why every platform showed the same generic image
    before 2026-08-13. Falls back to the hash URL if no slug is found.
    """
    base = base_url.rstrip("/")
    path = str(export_url or "")
    query = urllib.parse.urlencode({
        "utm_source": platform, "utm_medium": "social", "utm_campaign": "autopost",
    })
    marker = "#/article/"
    pos = path.find(marker)
    if pos >= 0:
        slug = path[pos + len(marker):].split("?")[0].split("#")[0].strip("/")
        if slug:
            return f"{base}/share/{urllib.parse.quote(slug)}?{query}"
    if path.startswith("http"):
        hash_pos = path.find("#")
        path = path[hash_pos:] if hash_pos >= 0 else ""
    if path.startswith("/#"):
        path = path[1:]
    if not path.startswith("#"):
        path = "#" + path.lstrip("/")
    return f"{base}/?{query}{path}"


def clip(text: str, limit: int) -> str:
    text = (text or "").strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


# ---------------------------------------------------------------------------
# Platform adapters
# ---------------------------------------------------------------------------

class Skip(RuntimeError):
    """Raised when a post cannot be attempted (config/asset missing)."""


def oauth1_header(method: str, url: str, creds: dict, extra_params: dict | None = None) -> str:
    params = {
        "oauth_consumer_key": creds["api_key"],
        "oauth_nonce": pysecrets.token_hex(16),
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": str(int(time.time())),
        "oauth_token": creds["access_token"],
        "oauth_version": "1.0",
    }
    quote = lambda s: urllib.parse.quote(str(s), safe="~")  # noqa: E731
    signing = dict(params)
    signing.update(extra_params or {})
    pairs = "&".join(f"{quote(k)}={quote(v)}" for k, v in sorted(signing.items()))
    base = "&".join([method.upper(), quote(url), quote(pairs)])
    key = f"{quote(creds['api_secret'])}&{quote(creds['access_token_secret'])}"
    digest = hmac.new(key.encode(), base.encode(), hashlib.sha1).digest()
    params["oauth_signature"] = base64.b64encode(digest).decode()
    header = ", ".join(f'{quote(k)}="{quote(v)}"' for k, v in sorted(params.items()))
    return f"OAuth {header}"


def post_x(secrets: dict, post: dict, url: str) -> dict:
    creds = secrets["x"]
    endpoint = "https://api.x.com/2/tweets"
    text = clip(str(post.get("copy") or ""), 280)
    tags = [t for t in (post.get("hashtags") or []) if isinstance(t, str)][:2]
    if tags and all(t.lower() not in text.lower() for t in tags):
        candidate = f"{text}\n\n{' '.join(tags)}"
        if len(candidate) <= 280:
            text = candidate
    cost = X_COST_PER_POST
    if "http://" in text or "https://" in text:
        cost = X_COST_PER_LINK_POST  # body link surcharge — Agent B should avoid this
    body = json.dumps({"text": text}).encode("utf-8")
    first = http_request("POST", endpoint, data=body, headers={
        "Authorization": oauth1_header("POST", endpoint, creds),
        "Content-Type": "application/json",
    })
    tweet_id = str(((first.get("data") or {}).get("id")) or "")
    if not tweet_id:
        raise HttpError(f"X did not return a tweet id: {json.dumps(first)[:300]}")
    calls = 1
    if post.get("link_in_reply", True):
        reply_text = clip(str(post.get("reply_copy") or "Full analysis:"), 240)
        reply_body = json.dumps({
            "text": f"{reply_text} {url}",
            "reply": {"in_reply_to_tweet_id": tweet_id},
        }).encode("utf-8")
        http_request("POST", endpoint, data=reply_body, headers={
            "Authorization": oauth1_header("POST", endpoint, creds),
            "Content-Type": "application/json",
        })
        calls += 1
        cost += X_COST_PER_POST  # reply carries the link; per current reporting the
        # body-link surcharge applies to the main post, not replies. Verify rates.
    return {"remote_id": tweet_id, "post_url": f"https://x.com/i/web/status/{tweet_id}",
            "cost_usd": round(cost, 4), "calls": calls}


def _graph_base(secrets: dict) -> str:
    version = (secrets.get("meta") or {}).get("graph_version") or "v25.0"
    return f"https://graph.facebook.com/{version}"


def post_facebook(secrets: dict, post: dict, url: str) -> dict:
    meta = secrets["meta"]
    message = str(post.get("copy") or "").strip()
    tags = [t for t in (post.get("hashtags") or []) if isinstance(t, str)][:2]
    if tags:
        message = f"{message}\n\n{' '.join(tags)}"
    value = http_request(
        "POST", f"{_graph_base(secrets)}/{meta['page_id']}/feed",
        data=form({"message": message, "link": url,
                   "access_token": meta["page_access_token"]}),
    )
    remote_id = str(value.get("id") or "")
    if not remote_id:
        raise HttpError("Facebook did not return a post id")
    return {"remote_id": remote_id,
            "post_url": f"https://www.facebook.com/{remote_id}", "cost_usd": 0.0}


def post_instagram(secrets: dict, post: dict, url: str, image_url: str | None) -> dict:
    meta = secrets["meta"]
    if not image_url:
        raise Skip("Instagram needs a public image URL (export.primary_image missing)")
    caption = str(post.get("copy") or "").strip()
    tags = [t for t in (post.get("hashtags") or []) if isinstance(t, str)][:12]
    if tags:
        caption = f"{caption}\n\n{' '.join(tags)}"
    caption = clip(f"{caption}\n\n{url}", 2200)
    base = _graph_base(secrets)
    container = http_request(
        "POST", f"{base}/{meta['instagram_business_id']}/media",
        data=form({"image_url": image_url, "caption": caption,
                   "access_token": meta["page_access_token"]}),
    )
    creation_id = str(container.get("id") or "")
    if not creation_id:
        raise HttpError("Instagram container was not created")
    time.sleep(4)
    published = http_request(
        "POST", f"{base}/{meta['instagram_business_id']}/media_publish",
        data=form({"creation_id": creation_id,
                   "access_token": meta["page_access_token"]}),
    )
    media_id = str(published.get("id") or "")
    if not media_id:
        raise HttpError("Instagram publish returned no media id")
    post_url = None
    try:
        info = http_request(
            "GET",
            f"{base}/{media_id}?fields=permalink&access_token="
            + urllib.parse.quote(meta["page_access_token"]),
        )
        post_url = info.get("permalink")
    except HttpError:
        pass
    return {"remote_id": media_id, "post_url": post_url, "cost_usd": 0.0}


def post_threads(secrets: dict, post: dict, url: str) -> dict:
    creds = secrets["threads"]
    user = creds.get("user_id") or "me"
    text = clip(f"{str(post.get('copy') or '').strip()}\n\n{url}", 500)
    base = "https://graph.threads.net/v1.0"
    container = http_request(
        "POST", f"{base}/{user}/threads",
        data=form({"media_type": "TEXT", "text": text,
                   "access_token": creds["access_token"]}),
    )
    creation_id = str(container.get("id") or "")
    if not creation_id:
        raise HttpError("Threads container was not created")
    time.sleep(2)
    published = http_request(
        "POST", f"{base}/{user}/threads_publish",
        data=form({"creation_id": creation_id, "access_token": creds["access_token"]}),
    )
    media_id = str(published.get("id") or "")
    if not media_id:
        raise HttpError("Threads publish returned no media id")
    post_url = None
    try:
        info = http_request(
            "GET", f"{base}/{media_id}?fields=permalink&access_token="
            + urllib.parse.quote(creds["access_token"]))
        post_url = info.get("permalink")
    except HttpError:
        pass
    return {"remote_id": media_id, "post_url": post_url, "cost_usd": 0.0}


def post_bluesky(secrets: dict, post: dict, url: str, image_url: str | None = None,
                 title: str = "", desc: str = "") -> dict:
    creds = secrets["bluesky"]
    pds = (creds.get("pds") or "https://bsky.social").rstrip("/")
    session = http_request(
        "POST", f"{pds}/xrpc/com.atproto.server.createSession",
        data=json.dumps({"identifier": creds["identifier"],
                         "password": creds["app_password"]}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    jwt, did = session.get("accessJwt"), session.get("did")
    handle = session.get("handle") or creds["identifier"]
    if not jwt or not did:
        raise HttpError("Bluesky session did not return accessJwt/did")
    body_text = clip(str(post.get("copy") or "").strip(), 300 - len(url) - 2)
    text = f"{body_text}\n\n{url}" if body_text else url
    if len(text) > 300:
        text = clip(text, 300)
    prefix_bytes = len(text[: text.rfind(url)].encode("utf-8"))
    record = {
        "$type": "app.bsky.feed.post",
        "text": text,
        "createdAt": iso(utc_now()),
        "facets": [{
            "index": {"byteStart": prefix_bytes,
                      "byteEnd": prefix_bytes + len(url.encode("utf-8"))},
            "features": [{"$type": "app.bsky.richtext.facet#link", "uri": url}],
        }],
        "langs": ["en"],
    }
    # Attach a proper link card (external embed) with the ARTICLE'S cover as
    # the thumbnail — without this, clients show no card (or a generic one).
    if image_url:
        try:
            req = urllib.request.Request(image_url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as resp:
                img_bytes = resp.read()
                content_type = resp.headers.get("Content-Type") or "image/jpeg"
            if 0 < len(img_bytes) <= 900_000:
                blob_resp = http_request(
                    "POST", f"{pds}/xrpc/com.atproto.repo.uploadBlob",
                    data=img_bytes,
                    headers={"Content-Type": content_type,
                             "Authorization": f"Bearer {jwt}"})
                blob = blob_resp.get("blob")
                if blob:
                    record["embed"] = {
                        "$type": "app.bsky.embed.external",
                        "external": {
                            "uri": url,
                            "title": clip(title or "RTFCLMGZN", 250),
                            "description": clip(desc, 280),
                            "thumb": blob,
                        },
                    }
        except (HttpError, OSError):
            pass  # card is cosmetic; the post itself must still go out
    value = http_request(
        "POST", f"{pds}/xrpc/com.atproto.repo.createRecord",
        data=json.dumps({"repo": did, "collection": "app.bsky.feed.post",
                         "record": record}).encode("utf-8"),
        headers={"Content-Type": "application/json",
                 "Authorization": f"Bearer {jwt}"},
    )
    at_uri = str(value.get("uri") or "")
    rkey = at_uri.rsplit("/", 1)[-1] if at_uri else ""
    post_url = f"https://bsky.app/profile/{handle}/post/{rkey}" if rkey else None
    return {"remote_id": at_uri, "post_url": post_url, "cost_usd": 0.0}


def post_reddit(secrets: dict, post: dict, url: str) -> dict:
    creds = secrets["reddit"]
    user_agent = creds.get("user_agent") or UA
    auth = base64.b64encode(
        f"{creds['client_id']}:{creds['client_secret']}".encode()).decode()
    token_resp = http_request(
        "POST", "https://www.reddit.com/api/v1/access_token",
        data=form({"grant_type": "password", "username": creds["username"],
                   "password": creds["password"]}),
        headers={"Authorization": f"Basic {auth}", "User-Agent": user_agent},
    )
    token = token_resp.get("access_token")
    if not token:
        raise HttpError(f"Reddit token failed: {json.dumps(token_resp)[:300]}")
    title = clip(str(post.get("title") or post.get("copy") or ""), 300)
    value = http_request(
        "POST", "https://oauth.reddit.com/api/submit",
        data=form({"sr": creds["subreddit"], "kind": "link", "title": title,
                   "url": url, "api_type": "json", "resubmit": "true",
                   "sendreplies": "false"}),
        headers={"Authorization": f"Bearer {token}", "User-Agent": user_agent},
    )
    payload = (value.get("json") or {})
    errors = payload.get("errors") or []
    if errors:
        raise HttpError(f"Reddit submit errors: {errors}")
    data = payload.get("data") or {}
    return {"remote_id": str(data.get("name") or data.get("id") or ""),
            "post_url": data.get("url"), "cost_usd": 0.0}


ADAPTER_REQUIREMENTS = {
    "x": ("x", ("api_key", "api_secret", "access_token", "access_token_secret")),
    "facebook": ("meta", ("page_access_token", "page_id")),
    "instagram": ("meta", ("page_access_token", "instagram_business_id")),
    "threads": ("threads", ("access_token",)),
    "bluesky": ("bluesky", ("identifier", "app_password")),
    "reddit": ("reddit", ("client_id", "client_secret", "username", "password", "subreddit")),
}


# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------

def dispatch(args: argparse.Namespace) -> int:
    repo = os.path.abspath(args.repo)
    social_path = os.path.join(repo, "web", "data", "social-posts.js")
    if not os.path.exists(social_path):
        raise SystemExit(f"Not found: {social_path}")
    secrets = load_secrets()
    site_base = ((secrets.get("site") or {}).get("base_url")
                 or "https://rtfclmgzn.com")
    ledger_path = args.ledger or default_ledger_path()
    ledger = load_ledger(ledger_path)
    prefix, entries = load_social_file(social_path)

    wanted = set(p.strip() for p in args.platforms.split(",")) if args.platforms else set(PLATFORMS)
    enabled = {}
    for platform in PLATFORMS:
        section, required = ADAPTER_REQUIREMENTS[platform]
        enabled[platform] = platform in wanted and section_ready(secrets, section, required)

    # Platforms that have EVER posted (per the ledger). A platform with no
    # history is being activated for the first time: post ONLY its single
    # newest ready record and retire the rest of the staged backlog, so a
    # fresh account never gets a burst of catch-up posts (learned the hard
    # way on 2026-08-13, when Facebook activation fired 3 days of backlog).
    platform_history = set()
    for _key in ledger["posted"]:
        parts = _key.split("|")
        if len(parts) >= 2:
            platform_history.add(parts[1])

    now = utc_now()
    cutoff = now - timedelta(days=args.max_age_days)
    posted, skipped, failed, planned = [], [], [], []
    spend = 0.0
    changed = False
    budget = args.limit
    per_platform_count: dict[str, int] = {}
    last_platform_post: dict[str, float] = {}

    # Pre-pass for first-activation platforms: find the single newest ready
    # record per such platform; everything older gets retired below.
    first_keep: dict[str, tuple] = {}
    for entry in entries:
        entry_dt = parse_iso(str(entry.get("ts") or "")) or now
        if entry_dt < cutoff:
            continue
        for idx, post in enumerate(entry.get("posts") or []):
            platform = str(post.get("platform") or "")
            if (post.get("status") == "ready" and platform in PLATFORMS
                    and enabled.get(platform) and platform not in platform_history):
                key = f"{entry.get('article_id')}|{platform}|{post.get('variant') or idx}"
                if platform not in first_keep or entry_dt > first_keep[platform][0]:
                    first_keep[platform] = (entry_dt, key)

    for entry in entries:
        export = entry.get("export") or {}
        entry_ts = parse_iso(str(entry.get("ts") or "")) or now
        fresh = entry_ts >= cutoff
        posts = entry.setdefault("posts", [])
        # Auto-synthesize the own-subreddit link post (deterministic, no LLM needed)
        if (fresh and enabled.get("reddit") and export.get("headline")
                and not any((p.get("platform") == "reddit") for p in posts)):
            posts.append({"platform": "reddit", "title": export["headline"],
                          "copy": export["headline"], "status": "ready",
                          "post_url": None, "auto": True})
            changed = True
        for idx, post in enumerate(posts):
            platform = str(post.get("platform") or "")
            if platform not in PLATFORMS or post.get("status") != "ready":
                continue
            key = f"{entry.get('article_id')}|{platform}|{post.get('variant') or idx}"
            reason = None
            if not fresh:
                reason = f"article older than {args.max_age_days}d"
            elif key in ledger["posted"]:
                reason = "already in ledger"
            elif platform not in wanted:
                reason = "platform not selected"
            elif not enabled[platform]:
                reason = "credentials not configured"
            elif (platform not in platform_history
                  and key != (first_keep.get(platform) or (None, None))[1]):
                reason = "first-activation: only the newest posts; backlog retired"
                if args.live:
                    post["status"] = "skipped_backlog"
                    changed = True
            elif per_platform_count.get(platform, 0) >= args.platform_cap:
                reason = f"per-platform cap ({args.platform_cap}/run) reached"
            else:
                not_before = parse_iso(str(post.get("not_before") or ""))
                if not_before and not_before > now:
                    reason = f"scheduled for {post.get('not_before')}"
            if reason:
                skipped.append((key, reason))
                continue
            if budget <= 0:
                skipped.append((key, "per-run limit reached"))
                continue
            url = article_url(site_base, str(export.get("url") or ""), platform)
            image_url = None
            primary = str(export.get("primary_image") or "")
            if primary:
                image_url = primary if primary.startswith("http") else (
                    site_base.rstrip("/") + "/" + primary.lstrip("/"))
            if not args.live:
                planned.append((key, url))
                per_platform_count[platform] = per_platform_count.get(platform, 0) + 1
                budget -= 1
                continue
            per_platform_count[platform] = per_platform_count.get(platform, 0) + 1
            # Cooldown: never hit the same platform twice in quick succession.
            prev_ts = last_platform_post.get(platform)
            if prev_ts is not None:
                wait = args.platform_spacing - (time.time() - prev_ts)
                if wait > 0:
                    time.sleep(min(wait, 300))
            try:
                if platform == "x":
                    result = post_x(secrets, post, url)
                elif platform == "facebook":
                    result = post_facebook(secrets, post, url)
                elif platform == "instagram":
                    result = post_instagram(secrets, post, url, image_url)
                elif platform == "threads":
                    result = post_threads(secrets, post, url)
                elif platform == "bluesky":
                    result = post_bluesky(secrets, post, url, image_url,
                                          title=str(export.get("headline") or ""),
                                          desc=str(export.get("hook") or ""))
                else:
                    result = post_reddit(secrets, post, url)
            except Skip as exc:
                skipped.append((key, str(exc)))
                continue
            except (HttpError, KeyError) as exc:
                attempts = int(post.get("attempts") or 0) + 1
                post["attempts"] = attempts
                post["last_error"] = str(exc)[:500]
                if attempts >= args.max_attempts:
                    post["status"] = "failed"
                failed.append((key, str(exc)[:200]))
                changed = True
                budget -= 1
                continue
            post["status"] = "posted"
            post["post_url"] = result.get("post_url")
            post["remote_id"] = result.get("remote_id")
            post["posted_at"] = iso(now)
            post.pop("last_error", None)
            ledger["posted"][key] = {"ts": iso(now), "post_url": result.get("post_url")}
            spend += float(result.get("cost_usd") or 0.0)
            posted.append((key, result.get("post_url")))
            changed = True
            budget -= 1
            last_platform_post[platform] = time.time()
            save_ledger(ledger_path, ledger)  # persist immediately: crash-safe dedupe
            time.sleep(args.pause)

    if changed and args.live:
        save_social_file(social_path, prefix, entries)

    summary = {
        "mode": "live" if args.live else "dry-run",
        "posted": len(posted), "failed": len(failed),
        "planned": len(planned), "skipped": len(skipped),
        "estimated_x_spend_usd": round(spend, 4),
        "ledger": ledger_path,
        "platforms_enabled": sorted(k for k, v in enabled.items() if v),
    }
    print("SOCIAL_DISPATCH_SUMMARY " + json.dumps(summary))
    for key, url in posted:
        print(f"  POSTED  {key}  {url or ''}")
    for key, url in planned:
        print(f"  WOULD-POST  {key}  ->  {url}")
    for key, err in failed:
        print(f"  FAILED  {key}  {err}")
    if args.verbose:
        for key, reason in skipped:
            print(f"  skip  {key}  ({reason})")
    return 1 if failed and not posted else 0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--live", action="store_true", help="actually post (default: dry-run)")
    parser.add_argument("--repo", default=DEFAULT_REPO)
    parser.add_argument("--platforms", default="", help="csv subset, e.g. bluesky,threads")
    parser.add_argument("--limit", type=int, default=12, help="max posts per run")
    parser.add_argument("--platform-cap", type=int, default=2,
                        help="max posts per platform per run")
    parser.add_argument("--platform-spacing", type=float, default=240.0,
                        help="min seconds between two posts to the SAME platform")
    parser.add_argument("--max-age-days", type=int, default=3)
    parser.add_argument("--max-attempts", type=int, default=3)
    parser.add_argument("--pause", type=float, default=5.0, help="seconds between posts")
    parser.add_argument("--ledger", default="")
    parser.add_argument("--verbose", action="store_true")
    sys.exit(dispatch(parser.parse_args()))


if __name__ == "__main__":
    main()
