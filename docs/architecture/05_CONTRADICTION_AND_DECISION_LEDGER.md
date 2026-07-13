# 05 — Contradiction and Decision Ledger

Each resolution below is binding unless superseded by a recorded Architecture Decision Record.

| ID | Conflict observed | Evidence examples | Canonical resolution | Rationale |
|---|---|---|---|---|
| ADR-001 | 18 vs 21 vs 26 vs 30 agents | `agents/ORCHESTRATION.md`; root `README.md`; handover/public map/QA; 30 spec files | **26 logical agents**; four extra spec files become workflows/subtasks | Preserves the latest declared/public roster while accounting for every file |
| ADR-002 | 7 vs 9 personas | old system design and parts of agent README vs actual persona data/handover | **9 personas** | Nine specs and nine data records exist; two were later additions |
| ADR-003 | 8 vs 9 vs 12 stages | business blueprint, old system design/shared pipeline, handover/public map | **12 checkpoints as a DAG** | Captures evidence, review, risk, packaging, release, and monitoring without requiring 12 model calls |
| ADR-004 | Fully autonomous vs human oversight | `DAILY-RUN.md` says never human; house style and business material mention oversight | **AI-operated, human-governed** | Truthful, safer, auditable; Phase one requires human public-release approval |
| ADR-005 | AI EIC as final publisher vs deterministic control | current prompts let EIC publish/remediate/spike | EIC recommends; controller and human approval authorize release | A model must not be the sole authority for irreversible action |
| ADR-006 | Preserve no-build vanilla site forever vs future framework migration | handover’s no-build lock vs Next.js/Codex plans | Preserve current site during migration; target **Astro + TypeScript** | Static-first content routes, typed contracts, SEO, minimal client JS, incremental migration |
| ADR-007 | Current site described as operating newsroom | public copy and prompts vs absence of runtime | Current state is a **publication prototype plus newsroom specification** | Prevents architecture and marketing from outrunning implementation |
| ADR-008 | “Not deployed” handover vs current deployment | old handover/deployment docs vs founder-confirmed Cloudflare Pages launch | Current site is deployed; deployment configuration must be captured in source control | Current reality supersedes stale handover state |
| ADR-009 | Brief/synthesis/research bands conflict and leave gaps | prose targets, `trueFormat()` threshold, QA 2,600 research floor | Brief 250–649; Synthesis 650–2,199; Research 2,200+ target ~3,500 | Continuous ranges; preserves editorial intent; one shared validator |
| ADR-010 | UI silently derives a different format | declared `synthesis` records rendered as brief under code threshold | Declared lane is canonical; validation blocks bad data | Labels are editorial contracts, not presentation guesses |
| ADR-011 | Weekly vs monthly magazine cadence | older business blueprint vs current magazine/revenue plan | Monthly flagship plus optional specials | Quality standard and production cost favor a monthly flagship |
| ADR-012 | Web issue and PDF can diverge | Primer JS 39 pages vs PDF 35 | One issue manifest generates both outputs | Eliminates independent drift and enables parity checks |
| ADR-013 | QA claims whole-system coverage but scans a narrow subset | `qa_scan.py` implementation | Layered release gate; existing scanner is one component | Security, routes, SEO, accessibility, visual, and workflow checks need distinct tools |
| ADR-014 | QA says derive counts but hardcodes 26/9 | `qa_scan.py` constants | Machine-readable registry is source; validators read it | Removes count drift at the root |
| ADR-015 | Duplicate Primer QA results | overlapping magazine glob loops | Deduplicate file discovery before validation | One defect should produce one finding |
| ADR-016 | Generic Opus/Sonnet/Haiku and changing model strings | older agent specs and public copy | Stable capability profiles mapped to environment model IDs | Agent identity survives model changes and cost optimization |
| ADR-017 | TTS described as wired/deploy-ready vs client using browser voices | `VOICE-UPGRADE.md`, `web/functions/api/tts.js`, `app.js` | TTS is **not implemented end-to-end** until route, auth/rate limits, client playback, and tests pass | File existence is not production integration |
| ADR-018 | Pages Function inside static output | `web/functions/api/tts.js`; Pages output directory `web` | Put `/functions` at project root or deploy an explicit Worker; verify route | Aligns with platform routing requirements |
| ADR-019 | Global-looking reader heatmap vs per-browser data | `localStorage` and `/cdn-cgi/trace` logic | Label as local visualization or replace with aggregated backend data | Prevents false analytics claims |
| ADR-020 | Static usage log presented as live operating transparency | `web/data/usage-log.js` | Real append-only AgentRun/Usage events power Pulse and transparency | Metrics must correspond to actual execution |
| ADR-021 | Browser-only account/Plus gate vs paid-product plans | `localStorage` and client-delivered issue data | Server-side identity and entitlements before monetization | Client gates do not protect paid content |
| ADR-022 | Hash routes vs publication SEO/social needs | `#/article/...`, root-only canonical and sitemap | Prerendered path routes with per-page metadata; hash redirects retained | Crawlable, shareable, measurable article pages |
| ADR-023 | Agent prompts conceptually edit `web/data` directly | daily-run and publishing specs | Agents produce artifacts; release service writes validated packages | Separates untrusted generation from production mutation |
| ADR-024 | Git as runtime memory vs need for live state | static JS records and prose workflows | Git stores code/config/releases; D1/R2 store runtime state/artifacts | Proper concurrency, audit, durability, and querying |
| ADR-025 | Revenue/cost projections vary widely | business/revenue/upgrade PDFs | Treat all as scenarios until measured telemetry exists | Forecasts are hypotheses, not operating facts |
| ADR-026 | One non-empty credential is gitignored but included in archive | `agents/social/.secrets.json` | Rotate and move all secrets to managed environment storage | Gitignore does not make an already-shared secret safe |
| ADR-027 | Windows Git may normalize text-like PDFs | LF→CRLF warnings and no `.gitattributes` | Mark PDFs/images/fonts/archives binary and verify checksums | Protects irreproducible assets from corruption |
| ADR-028 | Social/email actions described as autonomous | agent specs/templates | External sends are R4 side effects with human approval and idempotency | Prevents accidental or duplicated irreversible actions |
| ADR-029 | Public agent count tied to number of model calls | “26-agent pipeline” framing | 26 roles; workflows invoke only required roles | Avoids unnecessary latency and cost while preserving editorial organization |
| ADR-030 | Public content, runtime state, and code share loose global JS | `web/data/*.js` and monolithic `app.js` | Typed contracts and generated release packages; strangler migration | Makes validation, testing, and independent deployment possible |

## Deferred vendor choices that do not block architecture

The following are intentionally deferred because their interfaces are already bounded:

- public end-user identity provider
- newsletter delivery provider
- product analytics provider
- error-monitoring vendor
- whether approved content packages are committed by a GitHub App or delivered through a dedicated build hook after the first vertical slice

These choices require separate vendor ADRs but do not change the canonical authority, state, artifact, or release model.
