# PUBLISHING CADENCE — the clock the newsroom runs on
### Locked by the founder 2026-07-11 after competitor research. Every pipeline run MUST read this doc and behave per its slot.

## The two-product rule (the foundation — never violate it)

The winning AI publications (TLDR AI: 1.1M readers, one 8AM-ET email · The Rundown: ~$10M/yr, one morning email · Superhuman: same) all obey one law: **the WEBSITE publishes throughout the day; the EMAIL goes out ONCE, in the morning.** The email list is the business's master asset — multiple daily emails burn it down with unsubscribes. So:

- **Site:** up to 5 publish windows a day (below).
- **Email (when the digest engine exists):** ONE send, attached to the flagship slot only. Never more. This is a standing hard rule, not a tuning knob.

## The five slots (times in CENTRAL — this machine's local clock; ET in parens)

| # | Local (CT) | ET | Slot name | Editorial shape |
|---|---|---|---|---|
| 1 | 5:00 AM | 6:00 AM | **Overnight wire** | 1–2 briefs: overnight + Asia developments (Chinese labs ship during US night). Fast, factual, tight. |
| 2 | 7:00 AM | 8:00 AM | **THE FLAGSHIP** ⭐ | The day's defining story as a full synthesis + 1–2 supporting pieces. The daily "event." Same hour TLDR sends. When the digest email exists, it rides THIS slot only. |
| 3 | 11:00 AM | 12:00 PM | **Midday break** | Breaking-news window — most US lab launches land 9a–1p ET. 1–2 pieces; a brief is fine if news is thin. |
| 4 | 3:00 PM | 4:00 PM | **The close** | End-of-US-workday analysis; catches Europe's evening. 1–2 pieces, angle over speed. |
| 5 | 7:00 PM | 8:00 PM | **Evening light** | Lightest slot: refresh The Buzz, at most 1 brief. Catches US West Coast evening + Asia morning. |

**Weekends (Sat/Sun):** slots 2 and 4 only. Slots 1/3/5 fire but must triage-and-exit within one search unless something genuinely seismic broke (a frontier release, a major suspension, a market shock) — then treat it as a special. The Rundown proved 7-day works; we do 7-day *lighter*.

## Slots are OPPORTUNITIES, not quotas (the anti-slop law)

- A slot with nothing worth saying publishes **nothing** and logs "no publishable story met the bar this slot." A skipped slot costs nothing; a filler piece costs trust, and trust is the entire business.
- Never stretch a brief into a synthesis to "fill" a slot. Derived metadata will expose it anyway (N-001).
- Target output at steady state: **5–9 pieces/day weekdays** (mix: 1–2 syntheses, rest briefs), 2–4 on weekend days. Under-delivering on a slow news day is correct behavior.
- **One story can bump another slot's plan.** If a seismic story lands at 2 PM, the 3 PM slot takes it as a full synthesis and the planned analysis moves or dies. News outranks the grid.

## Per-run mechanics (every slot, no exceptions)

1. Read the machine clock → determine which slot this run is. Follow that slot's shape.
2. Research sweep sized to the slot (flagship: broad; others: targeted "what broke since the last run").
3. Full pipeline per DAILY-RUN.md for anything published — every stage, every slot, no shortcuts because a slot is "light."
4. **Buzz Desk refresh every slot** (3–6 cards/day total across slots, retire >5 days — compliance-rulebook §7).
5. Section pages, RSS, and usage-log updates ride every publish. Bump the `?b=` cache version in index.html once per run that changes any file.
6. Log records to P0 per slot (`task_type` as usual). The /usage page is public — the cadence is visible proof the newsroom runs itself.

## Story budget discipline

- The flagship synthesis gets the deepest research budget of the day. Don't spend flagship-depth tokens on an 8 PM brief.
- If two syntheses-worthy stories land the same day, the second becomes the NEXT morning's flagship unless it's time-critical — a strong flagship queue beats two half-depth pieces in one day.
- Covers: every published piece gets its Nano Banana cover per the scene-brief doctrine (~$0.034 each; at full cadence ≈ $0.20–0.30/day — the founder pays this per-image, so never generate covers for spiked pieces).
