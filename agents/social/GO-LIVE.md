# RTFCLMGZN — Social Pipeline: Go-Live Guide

**Updated 2026-08-10.** The pipeline is now: Agent A (export) → Agent B (stage copy) → `post_social.py` (deterministic dispatcher, actually posts). It runs in **DRY-RUN by default**: real platform-native copy is staged as `status:"ready"` records in `web/data/social-posts.js`, and nothing posts until a platform's credentials exist in `agents/social/.secrets.json`. You go live one platform at a time by filling in that platform's section (schema: `secrets.template.json`; the real file stays git-ignored — never commit it).

> API versions, prices, and limits below shift — **verify current details at setup time.**

Test any time with:
```
py -3 agents\social\post_social.py            # dry-run: shows what WOULD post
py -3 agents\social\post_social.py --live --platforms bluesky   # go live per platform
```
Or run `RTFCLMGZN_SOCIAL_DISPATCH.bat` (same thing, logged to %LOCALAPPDATA%\RTFCLMGZN\logs\social.log).

## Platform status & what you need to provision

### 1. Bluesky — easiest, start here (~5 min)
1. Create the account (suggest `rtfclmgzn.bsky.social`).
2. Settings → App Passwords → create one (never your main password).
3. Fill `bluesky.identifier` (the handle) and `bluesky.app_password`.
No approval process, no cost. This is the "prove the whole pipe works end-to-end" platform.

### 2. Reddit — own subreddit only (~15 min)
1. Create r/RTFCLMGZN from your Reddit account (any account ≥30 days old with minimal karma can create a sub — verify current requirements).
2. https://www.reddit.com/prefs/apps → create app → type **script**. Copy client id (under the app name) + secret.
3. Fill `reddit.client_id`, `client_secret`, `username`, `password`, and set `user_agent` to include your username.
The dispatcher auto-submits each article's headline as a link post to your own sub — nothing else. **Policy line we hold:** no automated posting to public subreddits; that is the textbook account + domain-ban pattern. Crosspost by hand when a story genuinely fits a community.

### 3. Meta — Facebook Page + Instagram (~45 min, was paused by founder)
Status July: Page created; app/tokens not started. To finish:
1. developers.facebook.com → Create App (Business type).
2. Link the RTFCLMGZN Facebook Page; convert/link an Instagram **Business/Creator** account to that Page.
3. Graph API Explorer (or Business settings) → generate a **long-lived Page access token** with `pages_manage_posts`, `pages_read_engagement`, `instagram_content_publish`. Posting to your **own** Page/IG with your own app does not require public App Review — verify the current permission names.
4. Fill `meta.page_access_token`, `meta.page_id`, `meta.instagram_business_id` (the IG account's numeric id, from `me/accounts?fields=instagram_business_account`).
Note: IG image posts pull the image from a public URL — the dispatcher uses the article's live cover art on rtfclmgzn.com automatically.

### 4. Threads — rides the same Meta developer account (~20 min)
1. In the same Meta app (or a dedicated one), add the **Threads API** use case.
2. Authorize your Threads profile → get a long-lived Threads access token (`threads_basic`, `threads_content_publish`).
3. Fill `threads.access_token` (leave `user_id: "me"`).
Free, rate-limited (~250 posts/day — far above our volume).

### 5. X — works, but it now costs money (decide, then ~30 min)
X removed the free API tier for new developers (early 2026). Posting is **pay-per-use**: ~$0.015 per post, **~$0.20 if the post body contains a link**. Our dispatcher therefore posts the hook WITHOUT a link and puts the article URL in an immediate reply (reply link avoids the body-link surcharge per current reporting — verify at developer.x.com).
1. Confirm the account restriction from July is cleared.
2. developer.x.com → project + app → OAuth 1.0a user-context keys (api key/secret + access token/secret with Read/Write).
3. Buy a small credit pack; at ~2 calls per article (hook + reply), 5 articles/day ≈ **$4.50/month**, second-wave posts add ~$2/month.
4. Fill the four `x.*` fields.
If you'd rather not pay, leave `x` null — everything else still runs.

### 6. TikTok — deferred (decision 2026-08-10)
Two hard gates: content must be video, and an unaudited app can only post **private/self-only** (invisible to the public) until TikTok approves an app audit. Revisit when a video pipeline exists. Until then TikTok gets nothing automated; the pipeline stages nothing for it.

### 7. Images — Google Gemini (Nano Banana)
`gemini.api_key` — ✅ already filled. Default is to **reuse the article's cover art** (already live, $0); bespoke social images are the exception, ~$0.034–0.039/image.

## Going live on the Actions runner (one extra step)

`.secrets.json` is git-ignored, so the GitHub Actions cycles can't see it. The
dispatcher therefore also reads env var `RTFC_SOCIAL_SECRETS` (the entire
.secrets.json content as one JSON string), and newsroom-cycle.yml passes it in.
Once your local file works: GitHub repo → Settings → Secrets and variables →
Actions → **New repository secret** → name `RTFC_SOCIAL_SECRETS`, value = the
full text of your filled-in `.secrets.json`. Update the secret whenever you add
a platform. No secret = Actions dispatch stays dry-run (safe default).

## How it runs automatically

- The publishing cycle (cycle-runbook §4c/§5b) stages copy **before** ship and runs the dispatcher **after** the deploy is verified live, so every link and image URL already resolves.
- Dedupe is a ledger **outside the repo** (`%LOCALAPPDATA%\RTFCLMGZN\social-ledger.json`) — a git reset can never cause a double post.
- Guards: articles older than 3 days never post (no backlog floods); max 12 posts per run; 3 attempts then `failed`; per-platform enable by credentials.
- Every article link carries `utm_source=<platform>&utm_medium=social&utm_campaign=autopost` (query before the `#` — required by the hash router) so /usage-style traffic honesty is possible later.

## Cost expectation per article (all platforms live)

- Copy generation (Sonnet, ~5 short posts): cents.
- Images: $0 by default (cover art reuse).
- Posting: free everywhere except X (~$0.03/article with link-in-reply; ~$0.045 with a second wave).
- Total distribution adds roughly **$0.05–0.10 per article**, and X is the only part that isn't $0.

## Safety

- Agents never post; only the dispatcher does, and only from records downstream of the compliance gate.
- Dry-run is the default and the safe state; live posting is opt-in per platform.
- Health/financial posts carry the article's disclaimer.
- Known limitation: article links currently preview with the site-level OG card (hash routing means crawlers don't see per-article meta). A Cloudflare Pages Function serving per-article `/share/<slug>` OG pages is the fix — worth doing once posts are flowing.
