# RTFCLMGZN Pulse Scan Runbook (every 3 hours · cheap model)

You are a small, fast model on a tight budget. This is NOT a newsroom cycle: you write no articles, you make no editorial judgments a bigger model would need to review. You keep the live surfaces fresh — that is all. Total runtime target: under 10 minutes. If any step balloons, do the honest minimum and note it in the report.

**Repo root:** `D:\BUSINESS\RTFCLMGZN` (already your working directory).

## 0. Kill switch
If `newsroom/runner/PAUSED` exists: print `PAUSED — exiting` and stop.

## 1. The Buzz (`web/data/buzz.js`) — the main job
Read the file's header rules; they are binding (§buzz of the compliance rulebook).
1. Retire every card older than ~7 days.
2. Run 2-4 quick WebSearches for the last few hours of AI news ("AI news today", one lab-specific query, one policy/hardware query). Add **2-4 new cards** — only genuinely new, loud signals. Every `text` paraphrases something verifiably public; every `url` must resolve to the real post/announcement. No primary source, no card. Fresh sequential `bz-NNN` ids, real `date`, honest `heat`.
3. If 3 hours produced nothing loud enough, add nothing. An unchanged-but-checked feed is a legitimate outcome — say so in the report.

## 2. Live events (`web/data/events.js` + `web/data/livetv.js`)
For each event whose window plausibly includes today (check `sort`), do ONE WebFetch of its official page:
- Actually live/underway right now → set `status:"live"`, `checkedAt:"<UTC now>"`, and `liveUrl` to the stream page if one exists.
- Inside roughly the next 7 days → `status:"soon"`.
- Otherwise → remove any `status`/`checkedAt` you previously set. Concluded events: delete the item.
NEVER set `live` from the calendar alone — only from the page actually saying so. Update `updated` to today. Skip events whose window is clearly months away; do not fetch them.

## 2b. Close open claims (the Claims Ledger) — the highest-value thing this scan does
Every article names what it does not yet know and the specific document or event that would settle it. Those are collected automatically at `#/claims`. A human newsroom never goes back to close them; you do.

1. Open `web/data/resolutions.js` and read its header — the key format and the append-only rule are binding.
2. Get the current open claims. They are DERIVED, not stored, so read them out of the articles. **The ledger has TWO kinds of claim and this step must list both:**
   - `<slug>|sc|<n>` — a scorecard item still marked `partial`/`contested`/`unverified`/`company` that names a `resolver`.
   - `<slug>|w|<n>` — an `apply` item on a **watch-type** article. "Watch-type" is `applyType(a)` in `app.js`, which *defaults by desk* when the field is absent (Frontier/Markets/Robotics → `watch`, briefs → `bottomline`), so testing the raw `applyType` field alone undercounts.

   ```
   python -c "import json,re;Q=chr(34);src=open('web/data/resolutions.js',encoding='utf-8').read();R=set(re.findall('key:'+Q+'([^'+Q+']+)'+Q,''.join(l for l in src.splitlines(True) if not l.lstrip().startswith('//'))));s=open('web/data/newsroom-articles.js',encoding='utf-8').read();A=json.loads(s[s.index('['):].rstrip().rstrip(';'));U={'partial','contested','unverified','company'};T={'work','watch','matters','stakes','bottomline','context','numbers'};D={'Frontier':'watch','Products':'work','Compute':'work','Policy':'stakes','Health':'matters','Markets':'watch','Robotics':'watch','Opinion':'bottomline','Ethics':'stakes','Guide':'work'};ty=lambda a:a.get('applyType') if a.get('applyType') in T else ('bottomline' if a.get('format')=='brief' else D.get(a.get('section'),'work'));C=[(x['publishedAt'],'%s|sc|%d'%(x['slug'],i),'['+it['level']+']',it['claim'],it['resolver']) for x in A for i,it in enumerate([q for b in (x.get('body') or []) if b['type']=='scorecard' for q in (b['scorecard'].get('items') or [])]) if it['level'] in U and it.get('resolver')]+[(x['publishedAt'],'%s|w|%d'%(x['slug'],i),'[watch]',it.get('label',''),it.get('text','')) for x in A if ty(x)=='watch' for i,it in enumerate(x.get('apply') or [])];C=sorted(c for c in C if c[1] not in R);print('OPEN CLAIMS:',len(C),'--',sum('|sc|' in c[1] for c in C),'scorecard,',sum('|w|' in c[1] for c in C),'watch. Oldest first.');[print(k,t,c,'>>',r) for d,k,t,c,r in C]"
   ```

   What changed and why it matters: **the previous version of this command enumerated `|sc|` claims only.** At the 2026-07-31 audit that was 14 of 63 open claims — the other **49 were watch items, structurally invisible to the one process whose stated job is closing them.** A watch item is usually the *more* closeable of the two, because it names a dated event ("Watch Microsoft's July 29 earnings call") rather than a document that may never be published. The command above also drops anything already answered in `resolutions.js` (comment lines stripped first, so the commented shape example in that file's header is not mistaken for a real resolution) and sorts **oldest first**, because your job is closing claims and the old ones are the ones whose deadlines have already passed.

   Guides (`guides.js`) feed the same ledger in `app.js` but currently contribute no claims of either kind; if that changes, this command needs the second file added.

3. **Three resolvers have already fired and nobody noticed** — they were all watch items, so no scan ever saw them. Close these first, in this order:
   - `moonshot-ai-50-billion-pre-ipo-valuation|w|*` and `white-house-moonshot-fable-distillation-accusation|w|*` — **already answered by this newsroom's own later articles.** Check the archive before you search the web: `grep -oE '"slug": *"[^"]+"|"publishedAt": *"[^"]+"' web/data/newsroom-articles.js`. A later published piece is not by itself a source — find the primary source *that article* cited and cite that, per step 5.
   - `microsoft-nadella-ai-bubble-compute-rationing|w|0` — "Watch Microsoft's July 29 earnings call." That date has passed; the call either happened or it didn't, and either way there is a filing or transcript that settles it.

   These are examples of the failure mode, not a special case: a dated watch item is *ready to close the moment its date passes*, and until now nothing was looking.
4. Pick **at most 3** whose resolver looks checkable right now (a filing that was due, a company that said it would respond, a deadline that passed). Do ONE WebSearch or WebFetch each. With watch items now visible, prefer a dated one whose date has passed over a scorecard item waiting on a document that may never appear.
5. Append an entry to `resolutions.js` ONLY when the source actually shows the thing the resolver named. Never resolve on inference, on a secondary summary, or because time passed and it seems likely. No source, no resolution.
6. A resolver's own deadline passing with no answer IS a result: log it with `outcome:"expired"`. That is a real finding about how these stories end, not a gap.

**Never edit an article to reflect a resolution.** The resolution renders beneath the unchanged piece automatically. If you got one wrong, append a correcting entry — never amend or delete the original. This publication's whole claim is that it does not quietly rewrite history.

## 3. Scoreboard freshness (`web/data/scoreboard.js`)
One WebSearch for the Artificial Analysis leaderboard / major model-launch news since the last scan.
- Nothing changed (the usual case): update `scannedAt` only, and append nothing to `basisNote`.
- A NEW model launched or an independent score genuinely moved: do NOT edit rows yourself — you are the cheap scan. Add one line to `basisNote`: "Pulse scan <UTC time> flagged <what> for the next full cycle." The next cycle (bigger model) makes the edit. Exception: `status` and `updated`/`scannedAt` fields are yours to maintain.

## 4. Ship
1. `git status --short` — you should only see the data files above (`buzz.js`, `events.js`, `livetv.js`, `scoreboard.js`, `resolutions.js`). If anything else is modified, do NOT stage it; note it in the report.
2. Bump every `?b=N` in `web/index.html` by 1 (all occurrences, same number; UTF-8-safe tools ONLY — see the cycle runbook's warnings; `grep -c 'â€' web/index.html` must print 0).
3. `git add` only: the data files you touched + `web/index.html`.
3b. If you appended to `resolutions.js`, run `python -m newsroom.quality.component_audit` — it must exit clean before you push.
4. `python -m newsroom.runner.verify_publish_surface` — non-zero: STOP, do not push.
5. Commit ("pulse scan: <what changed>").
6. **`git pull --rebase origin main`** — REQUIRED, after the commit and before the push. You are the most frequent of the three schedules (every 3h) and the most likely to collide: a full cycle or a breaking scan is often mid-run when you commit. Without this the push is **rejected** as non-fast-forward, and a scan that reads a push as "done" reports resolved claims and refreshed cards that exist only on this machine — the next run's checkout discards them silently. Nothing errors. The claim you closed simply reopens.
   - **Conflict → `git rebase --abort` and STOP.** Never force-push. `resolutions.js` is append-only, and a force-push deletes another run's appended entries — which is precisely the "quietly rewrites history" failure this publication's whole claim is against. Leave the commit unpushed and say so in the §5 report.
7. `git push origin main`, then confirm the new `?b=` appears on the live site (30-90s poll). If it never does, re-read `web/index.html` before bumping again — a run that landed during your rebase may have taken the same cache-buster number.

## 5. Report
Six lines max: cards retired/added, event statuses changed, **claims checked and any resolved (with the source that settled each)**, scoreboard flag raised or "no change", cache-buster number, deploy confirmed. Then stop — no second pass, nothing outside this runbook.
