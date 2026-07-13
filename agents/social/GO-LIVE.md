# RTFCLMGZN — Social Pipeline: Go-Live Guide

The social pipeline (Agent A → Agent B) is built and runs in **DRY-RUN by default**: it generates real platform-native copy, hashtags, and image prompts, and stages them as `status:"ready"` post records in `web/data/social-posts.js` — but it does **not** post to any account or spend any money until you provision the credentials below. This is deliberate: nothing hits your real audience or your wallet without your explicit setup.

> All model IDs, API versions, and pricing below shift over time — **verify current details at setup time**, don't trust these as permanently accurate.

## What you need to provision

Put credentials in `agents/social/.secrets.json` (git-ignored via `agents/social/.gitignore` — never commit it). Schema:

```json
{
  "gemini": { "api_key": null },
  "meta":   { "page_access_token": null, "page_id": null, "instagram_business_id": null },
  "x":      { "api_key": null, "api_secret": null, "access_token": null, "access_token_secret": null }
}
```

Fill in a section as its credentials become available; leave the rest `null`. The agents check each section — a `null` field means that platform stays dry-run.

**Status as of 2026-07-10:**
- `gemini.api_key` — ✅ filled, images can generate live.
- `meta` — ⏸ **paused by founder decision.** Facebook Page created; Business Suite / Graph API app / tokens not started. Revisit when founder resumes.
- `x` — 🔄 **in progress, blocked on account restriction.** Founder's X account has a restriction until end of month (or pending appeal). Developer portal application may also be delayed/flagged because of this — not a setup error if so. Resume once restriction clears or appeal succeeds.

### 1. Images — Google Gemini (Nano Banana)
- **Key:** a Google AI Studio / Gemini API key.
- **Model:** `gemini-2.5-flash-image` (verify current id).
- **Cost:** pay-as-you-go, ~$0.039/image standard (~$0.0195 batch). No subscription. This is the only *hard* per-use cost in the pipeline.
- Enables: real image generation. Without it, Agent B stages the image *prompt* only.

### 2. Facebook + Instagram — Meta Graph API
- **Setup:** a Meta developer app + a Facebook Page + an Instagram Business/Creator account linked to that Page.
- **Tokens:** a long-lived Page access token with `pages_manage_posts`, `pages_read_engagement`, and (for IG) `instagram_content_publish`.
- **Note:** IG image posts require the image to be hosted at a public URL first (Graph API pulls it from a URL, not a direct upload) — plan a place to host generated images (your CDN/site).
- Verify the current Graph API version at setup.

### 3. X (Twitter) — X API
- **Setup:** an X developer account + app with OAuth 1.0a or OAuth 2.0 user-context credentials (API key/secret + access token/secret).
- **Access tier:** posting requires at least the tier that permits write/media — verify the current tier and its posting limits (they change and can affect how many posts/day are allowed).

## Flipping to live

Once `.secrets.json` has a platform's credentials, Agent B posts to that platform on the next run and sets `status:"posted"` with the returned `post_url`. Platforms without credentials stay `status:"ready"`. You can go live one platform at a time.

## Cost expectation (with P0 tracking on)

Per article distributed to all three platforms:
- Copy generation (Sonnet, ~3 short posts): a few thousand tokens, cents.
- Images (Gemini): 1–3 images × ~$0.039 = ~$0.04–0.12.
- Posting calls: ~free.

So distribution adds roughly **$0.05–0.15 per article** on top of the ~$0.17 writing cost — and every cent of it shows up on `/usage`, tagged to the article, so you'll see the true "article + 3 posts" number.

## Safety

- The agents never post content the compliance gate hasn't cleared (they source only from Agent A's export of a *published* article).
- Health/financial posts carry the article's disclaimer.
- Dry-run is the default and the safe state; live posting is opt-in per platform.
