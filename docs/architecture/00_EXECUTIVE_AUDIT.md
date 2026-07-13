# 00 — Executive Repository Audit

## 1. Audit scope

The audit covered the complete uploaded repository, including all root handover and planning documents, every Markdown agent specification, all public-site source and data files, Python utilities, magazines, PDFs, image assets, email/social materials, and deployment-related files.

The uploaded archive contains:

| Inventory item | Observed quantity |
|---|---:|
| Files | 241 |
| Directories | 26 |
| Uncompressed data | 79,980,345 bytes |
| Markdown files | 53 |
| JavaScript files | 22 |
| HTML files | 7 |
| PDFs | 6 |
| Python files | 3 |
| `*.agent.md` specifications | 30 |
| Public article records | 22 |
| Guides | 3 |
| Editorial personas | 9 |
| Buzz records | 20 |
| Company records | 8 |
| Prediction records | 7 |
| Static usage-log records | 81 |
| Magazine issue records | 2 |

The root documents reviewed were:

- `HANDOVER-FOR-CHATGPT.md`
- `CODEX-ONBOARDING-BLUEPRINT.md`
- `README.md`
- `DEPLOY-TONIGHT.md`
- `LAUNCH-POSTS.md`
- `RTFCLMGZN_Agent_System_Design.md`
- `VOICE-UPGRADE.md`
- `AI_Automation_Architecture_Research.pdf`
- `RTFCLMGZN_Business_Blueprint.pdf`
- `RTFCLMGZN_Deployment_Guide.pdf`
- `RTFCLMGZN_Revenue_Blueprint.pdf`
- `RTFCLMGZN_System_Upgrade_Brief.pdf`

## 2. Current-state classification

The repository is best described as:

> **A visually mature static publication prototype plus a detailed newsroom specification.**

It is not yet a functioning autonomous operating system. The public site works, but most “operating system” behavior is represented by prose specifications, static records, browser-local state, or simulated dashboards.

### What is functioning

- A responsive, hash-routed single-page publication built with vanilla HTML, CSS, and JavaScript
- A coherent visual identity with desktop and mobile layouts
- Article, guide, magazine, archive, dictionary, company, prediction, scoreboard, Buzz, Pulse, usage, and newsroom-map views
- 22 public article records and 3 guides
- 9 persona definitions
- Two magazine readers and one downloadable Primer PDF
- Cloudflare Pages deployment through GitHub, confirmed by the founder during handover
- Valid JavaScript syntax, valid JSON, and compilable Python in the audited working copy
- Local asset references and core routes that render without the previously identified magazine-route crash after the takeover repair

### What is currently simulated or browser-local

- “Account,” Plus access, saved items, newsletter sign-up, consent, and reading history use `localStorage`
- Premium content is present in client-delivered data, so the existing gate is presentation, not entitlement security
- The Control Room/Pulse and usage dashboards are fed by static data rather than actual agent runs
- The reader geography map records the current browser’s own country history; it is not a global audience heatmap
- The “26-agent newsroom” consists primarily of prompt/specification files; there is no persistent orchestrator, durable queue, scheduler, runtime database, release controller, or approval system
- The TTS proxy exists as a file, but the public player still uses browser `speechSynthesis` and does not call `/api/tts`
- Social and email agents are specifications/templates, not an authenticated production distribution system

## 3. High-priority findings

### P0 — Resolve before autonomous execution or monetization

| Finding | Evidence | Consequence | Required disposition |
|---|---|---|---|
| A non-empty API credential exists in `agents/social/.secrets.json` | Secret file inspected without exposing its value | Credential was included in an uploaded archive and should be treated as exposed | Rotate the key; keep all future secrets in Cloudflare/GitHub environment storage only |
| Public copy claims “fully autonomous” and “0 humans” while the repository is not autonomous | `web/index.html`, `README.md`, `agents/README.md`, `DAILY-RUN.md` | Misleading product and trust claim | Replace with truthful “AI-native prototype” wording until runtime evidence exists |
| Paid access is client-side | Public data and `localStorage` account logic | Any user can inspect protected issue content | Do not sell access until server-side authentication and entitlements exist |
| Runtime side effects lack governance | TTS/social/email designs | Cost abuse, accidental publishing, or irreversible sends | Require authentication, rate limits, idempotency, allowlists, and approval gates |
| PDF line-ending risk on Windows | No `.gitattributes`; several PDFs look text-like to Git and Git emitted LF→CRLF warnings | A checkout or Git normalization can corrupt binary PDFs | Add a binary-safe `.gitattributes` policy before further asset churn |

### P1 — Resolve during Newsroom Core v0

| Finding | Consequence | Required disposition |
|---|---|---|
| Counts conflict: 18, 21, 26, and 30 | Architecture and public claims drift | Adopt the 26-agent logical registry in this package and derive every display count |
| Pipeline conflicts: 8, 9, and 12 stages | No stable workflow contract | Adopt the 12-checkpoint governed DAG in this package |
| Human-oversight claims conflict with “no human ever” rules | Unsafe and internally inconsistent governance | Adopt AI-operated, human-governed release policy |
| Agent prompts can conceptually publish directly | No deterministic authority boundary | Only the release controller may change lifecycle state or publish |
| Static usage data is presented like live telemetry | False observability | Replace it with append-only run and usage events from the runtime |
| Hash routes prevent article-specific canonical metadata | Weak SEO, social previews, and analytics | Migrate to real, prerendered `/article/<slug>/` routes |
| Current Pages Function location needs verification | `web/functions` is inside the static output folder while Cloudflare expects `/functions` at project root | Move/verify function deployment before relying on `/api/tts` |

### P2 — Product-quality debt

| Finding | Current state |
|---|---|
| Article-format labels drift from actual length | Multiple items declared `synthesis` are below the runtime’s own synthesis threshold; one brief is below the stated brief floor |
| Persona utilization is incomplete | Seven of nine personas have public articles; Idris Vale and Maya Serrano have none |
| Magazine page-count gate fails | Primer renders 39 pages; Issue 001 renders 38; standard is 40–80 |
| Magazine art reuse gate fails | Six unique image-reuse findings across the two issues |
| Primer web and PDF editions diverge | JS reader renders 39 pages; exported PDF has 35 pages |
| Issue 001 has no exported PDF | Violates the magazine standard’s downloadable-PDF requirement |
| QA scope is overstated | Scanner checks a limited set of web/data files and magazine patterns, not the whole repository |
| QA duplicates Primer results | Overlapping `*issue*.js` and `primer*.js` globs scan the Primer twice |
| Research floor conflicts | Planning material says 2,200 words; scanner hard-fails below 2,600 |

## 4. Verification results

The audited working copy passed:

- JavaScript syntax validation
- JSON parsing
- Python compilation
- Article ID and slug uniqueness checks
- Referenced article source and image existence checks
- Local asset-reference scans
- Core desktop and mobile route rendering
- Browser console-error checks on representative routes
- Broken-image checks
- Horizontal overflow checks

The magazine QA scanner reports 10 lines, but two are duplicate Primer results caused by overlapping glob patterns. There are **8 unique release-gate failures**:

1. Issue 001 has 38 pages, below 40
2. Issue 001 reuses its cover artwork
3. Issue 001 reuses `live-002` artwork
4. Issue 001 reuses `live-001` artwork
5. Issue 001 reuses `a2` artwork three times
6. Issue 001 reuses `a7` artwork
7. The Primer has 39 pages, below 40
8. The Primer reuses its cover artwork

## 5. Architecture conclusion

The front end should be preserved while the control plane is built behind it. A full rewrite before a working vertical slice would add risk without proving the newsroom. The correct migration is a **strangler pattern**:

1. Freeze and truthfully label the current prototype.
2. Build a deterministic Newsroom Core alongside it.
3. Publish one complete story through the new system into a staging release.
4. Migrate the publication to real routes and typed content contracts.
5. Cut traffic over only after visual and functional parity.

The system is ready to move into implementation after the high-impact decisions in this package are accepted. It is not ready for unsupervised publication, paid entitlements, or automated external posting today.
