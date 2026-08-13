#!/usr/bin/env python3
"""RTFCLMGZN — clean up the Facebook first-activation burst (2026-08-13).

Lists every Facebook post the dispatcher has made (they're recorded in
web/data/social-posts.js with their Facebook post ids), lets you keep the
newest few, and deletes the rest FROM YOUR PAGE after you explicitly type
DELETE. Nothing is touched without that confirmation.

Run via UNDO_FB_BURST.bat, or:  py -3 tools/undo_fb_burst.py
"""
import json
import os
import sys
import time
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
SOCIAL_DIR = os.path.join(REPO, "agents", "social")
sys.path.insert(0, SOCIAL_DIR)
from post_social import (HttpError, http_request, load_secrets,  # noqa: E402
                         load_social_file, save_social_file)


def main():
    secrets = load_secrets()
    meta = secrets.get("meta") or {}
    token = meta.get("page_access_token")
    if not token:
        print("No Facebook page token in .secrets.json — link Facebook first.")
        return 1
    version = meta.get("graph_version") or "v25.0"
    social_path = os.path.join(REPO, "web", "data", "social-posts.js")
    prefix, entries = load_social_file(social_path)

    fb_posts = []
    for entry in entries:
        for post in entry.get("posts") or []:
            if (post.get("platform") == "facebook" and post.get("status") == "posted"
                    and post.get("remote_id")):
                fb_posts.append((str(post.get("posted_at") or ""), entry, post))
    fb_posts.sort(key=lambda t: t[0])  # oldest first

    if not fb_posts:
        print("No recorded Facebook posts to clean up.")
        return 0

    print(f"\nThe dispatcher has made {len(fb_posts)} Facebook post(s):")
    for i, (ts, entry, post) in enumerate(fb_posts, 1):
        title = (entry.get("export") or {}).get("headline") or entry.get("article_id")
        print(f"  {i:2}. [{ts}] {str(title)[:70]}")

    keep_raw = input("\nHow many of the NEWEST posts should stay up? (Enter = 1) > ").strip()
    try:
        keep = max(0, int(keep_raw)) if keep_raw else 1
    except ValueError:
        keep = 1
    victims = fb_posts[:-keep] if keep else fb_posts
    if not victims:
        print("Nothing to delete with that choice.")
        return 0

    print(f"\nThis will DELETE {len(victims)} post(s) from the RTFCLMGZN Page, "
          f"keeping the newest {keep}.")
    if input("Type DELETE (all caps) to proceed, anything else cancels > ").strip() != "DELETE":
        print("Cancelled. Nothing was deleted.")
        return 0

    removed, failed = 0, 0
    for ts, entry, post in victims:
        remote_id = str(post["remote_id"])
        try:
            http_request(
                "DELETE",
                f"https://graph.facebook.com/{version}/{urllib.parse.quote(remote_id)}"
                f"?access_token={urllib.parse.quote(token)}")
            post["status"] = "deleted_cleanup"
            post["post_url"] = None
            removed += 1
            print(f"  deleted {remote_id}")
        except HttpError as exc:
            failed += 1
            print(f"  FAILED on {remote_id}: {str(exc)[:160]}")
        time.sleep(2)

    save_social_file(social_path, prefix, entries)
    print(f"\nDone: {removed} deleted, {failed} failed. Records updated in "
          "social-posts.js (they ride the next cycle's commit).")
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
