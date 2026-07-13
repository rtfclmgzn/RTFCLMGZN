# 🎙️ Studio-grade voice upgrade (ElevenLabs) — how to turn it on

Right now the Briefing and article "Listen" use your **device's built-in voices** (free, zero cost, but robotic on some machines). To make it sound like a real human narrator, we wired an **ElevenLabs** path. It's built and deployed-ready — it just needs your key, because a paid voice API can't run for free and the key can't live in the browser.

## What's already done ✅
- `web/functions/api/tts.js` — a Cloudflare Function that safely proxies ElevenLabs (keeps your key private). Ships automatically with the site.
- The player is built to fall back to the browser voice whenever the key isn't set, so nothing breaks in the meantime.

## What you do to switch it on (~10 min + a paid account)
1. **Make an ElevenLabs account** → get an **API key**, and pick a **voice** you like (copy its *voice ID*). A warm female voice is the vibe we're going for.
2. In **Cloudflare → your Pages project → Settings → Environment variables**, add (encrypt them):
   - `ELEVENLABS_KEY` = your key
   - `ELEVENLABS_VOICE` = the voice ID
3. **Redeploy.** Done — the narration upgrades automatically.
4. **Tell me "the voice key is set"** and I'll do the final ~20-minute step: wire the player to fetch audio from `/api/tts` and verify end-to-end that it plays, scrubs, and persists (I want to test it live with the real key rather than ship it blind).

## The honest cost picture
ElevenLabs bills **per character spoken**. Ballpark on their Turbo model: roughly **$0.10–0.30 per full 10-minute briefing**, and a few cents per article listen. Two ways we keep that sane:
- **Cache aggressively** — a briefing is generated once per edition and served to everyone from cache (so it's ~one generation per day, not per listener).
- **Fall back** — long/rare article listens can stay on the free browser voice; reserve ElevenLabs for the Briefing where quality matters most.

At real traffic this is a small line item (single-digit dollars/month early on), but it's a *real* pay-as-you-go cost on top of Gemini — so it's your call whether the quality jump is worth it. My honest take: **do it for the Briefing** (it's your signature audio product and the quality gap is huge), keep article Listen on the free voice for now.
