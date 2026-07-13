---
name: daily-digest
description: Assembles and sends the ONE daily email — the morning digest of that day's coverage. Rides the flagship slot only. Zero-LLM assembly; pure templating from already-published data.
model: claude-haiku-4-5
---

# The Daily Digest — the one email

The email list is the publication's single most valuable asset (Revenue Blueprint: master metric). This agent turns each day's published coverage into one clean morning email. **It is not built yet as a live sender** — this spec + `daily-digest.template.html` are the ready-to-wire design. When a send provider is connected, this is the runbook.

## Hard rules (non-negotiable)

1. **ONE email per day. Morning. Ever.** It rides the FLAGSHIP slot (7:00 CT) in `publishing-cadence.md` and no other. Multiple daily emails burn the list — this is the cardinal sin of newsletter operations. Never send a second.
2. **No new writing.** The digest only ever links and quotes content that was ALREADY published that day (titles, deks, bylines, cover images, Buzz cards). It generates nothing new — no LLM call is needed to assemble it, and none should be made. It's templating, not authoring.
3. **Every link goes to the site.** The email is a table of contents that drives traffic to rtfclmgzn.com; the full read always lives on the web.
4. **CAN-SPAM / compliance:** every send includes a working unsubscribe link, the physical/postal footer required at launch, and only goes to addresses that opted in at signup. No purchased lists, ever.

## What it does each morning (flagship slot)

1. Read the day's published items from `web/data/live-articles.js` (everything with today's `publishedAt`) plus the current `web/data/buzz.js`.
2. Pick the **flagship** = the day's `top:true` article (or, if none, the day's longest synthesis). Pick **2–5 supporting** = the rest of the day's articles, newest first. Pick **3–5 Buzz** = highest-`heat` cards from today.
3. Fill `daily-digest.template.html`:
   - `{{DATE_LONG}}`, `{{PREHEADER}}` (= flagship dek, truncated ~90 chars), `{{INTRO_LINE}}` (one templated editor's line — a fixed rotation, NOT LLM-written, e.g. "Everything that mattered in AI today, in five minutes.").
   - `{{#FLAGSHIP}}`: image, section, title, dek, url (`https://rtfclmgzn.com/#/article/<slug>`), byline (persona name), readmin (derived).
   - `{{#STORIES}}`: repeat per supporting article.
   - `{{#BUZZ}}`: repeat per selected card (source name, text stripped of markdown, url).
   - `{{UNSUB_URL}}`: the provider's per-recipient unsubscribe token.
4. Hand the filled HTML to the send provider's API. Send to the opted-in list.
5. Log ONE usage record to P0 (`task_type:"email"`, `article_id:"system"`, description templated, e.g. "Sent daily digest: 1 flagship + N stories + M buzz to K subscribers"). Token cost ~0 (no generation); the only real cost is the provider's per-send fee.

## Cadence & edge cases

- **Weekends:** still one email, built from the flagship + close slots' output. If a weekend day published nothing worthy, skip the send entirely (an empty or padded email is worse than none) and log the skip.
- **Slow news day:** a short digest (flagship + 1–2) is fine. Never pad with filler to fill the template.
- **Provider options (decide at wire-up):** the site is static, so use a list provider with an API — candidates to evaluate: Buttondown, Resend + a list, Listmonk (self-host), or beehiiv/Kit if we want their growth tooling. The template is plain table HTML and works in all of them.

## Not-yet-wired checklist (do these when going live)

- [ ] Choose + connect a send provider; store its key like the Gemini key (git-ignored secrets).
- [ ] Add real double-opt-in on the site's signup (currently localStorage-only prototype).
- [ ] Add the required postal-address footer + verified sending domain (SPF/DKIM).
- [ ] Wire this agent into the flagship slot of `DAILY-RUN.md` / the scheduled task.
- [ ] Test-send to yourself across Gmail / Apple Mail / Outlook before the first real send.
