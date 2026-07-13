# 06 — Existing Document Disposition

## 1. Root documents

| Document | Status after v1 adoption | Action |
|---|---|---|
| `HANDOVER-FOR-CHATGPT.md` | Historical handover/evidence | Retain in `archive/legacy-docs`; remove its authority over current counts, autonomy, and workflow |
| `CODEX-ONBOARDING-BLUEPRINT.md` | Partially aligned predecessor | Extract useful principles, then archive; this package becomes implementation authority |
| `README.md` | Must be replaced | Rewrite as the truthful current-state entry point and link to canonical architecture |
| `DEPLOY-TONIGHT.md` | Historical deployment checklist | Archive after current Cloudflare configuration is captured in versioned infra docs |
| `LAUNCH-POSTS.md` | Draft marketing copy | Do not publish claims that exceed actual runtime; revise at launch |
| `RTFCLMGZN_Agent_System_Design.md` | Superseded design | Archive; it contains the old 7-persona and 9-stage model |
| `VOICE-UPGRADE.md` | Incomplete integration note | Rewrite as a tracked feature design; do not claim TTS is wired |
| `AI_Automation_Architecture_Research.pdf` | Research input | Retain as background, not source of truth |
| `RTFCLMGZN_Business_Blueprint.pdf` | Business hypothesis archive | Retain; mark revenue, cadence, staffing, and architecture assumptions as nonbinding |
| `RTFCLMGZN_Deployment_Guide.pdf` | Historical deployment input | Retain; replace operational steps with current Cloudflare runbook |
| `RTFCLMGZN_Revenue_Blueprint.pdf` | Scenario planning | Retain as hypotheses; reconcile against actual audience/revenue data later |
| `RTFCLMGZN_System_Upgrade_Brief.pdf` | Superseded upgrade proposal | Archive after mapping any remaining backlog items into the roadmap |

## 2. Agent-system documents

| Document/group | Status | Action |
|---|---|---|
| `agents/README.md` | Conflicted | Generate from canonical registry; remove 7-persona and “no human ever” contradictions |
| `agents/ORCHESTRATION.md` | Superseded | Replace with the 12-checkpoint workflow contract |
| `agents/DAILY-RUN.md` | Unsafe as production authority | Convert into a workflow recipe; remove direct publication and no-human rules |
| `agents/_shared/pipeline.md` | Superseded | Generate/update from workflow contracts |
| `agents/_shared/house-style-guide.md` | Partially authoritative | Preserve editorial craft; align disclosure and oversight language |
| `agents/_shared/compliance-rulebook.md` | Useful policy input | Version into `packages/policies`; change EIC-only final authority to governed escalation |
| `agents/_shared/editorial-notes.md` | Valuable historical lessons | Preserve as decision/evaluation input; separate immutable incident lessons from current policy |
| `agents/_shared/observability.md` | Design input | Replace static-file logging with AgentRun/Event contracts |
| `agents/_shared/publishing-cadence.md` | Product input | Align to monthly magazine and current edition schedule |
| `agents/magazine/MAGAZINE-STANDARD.md` | Strong quality policy with drift | Preserve quality bar; derive counts and unify web/PDF manifest |
| `agents/magazine/MAGAZINE-QA-GATE.md` | Useful manual gate | Integrate into layered automated/manual release gate |
| `agents/magazine/qa_scan.py` | Limited validator | Fix duplication/hardcoding and split into focused validators |
| `agents/examples/sample-pipeline-run.md` | Unsafe example | Rewrite to demonstrate durable approval instead of AI-only publication |
| 26 canonical role specs | Migration input | Normalize into registry-driven versioned instructions and contracts |
| Four workflow/subtask specs | Misclassified | Rename and move into workflow/task definitions |

## 3. Public-site files

| Area | Status | Action |
|---|---|---|
| `web/index.html` | Live prototype | Keep operational; correct claims and metadata during Phase 0 |
| `web/assets/app.js` | Functional monolith | Freeze except critical fixes; migrate route-by-route to typed components |
| `web/assets/styles.css` | Aesthetic source | Extract design tokens and components without flattening the visual identity |
| `web/data/*.js` | Prototype content store | Import into typed content contracts; stop treating globals as runtime state |
| `web/functions/api/tts.js` | Unverified/incomplete server route | Disable or move to correct runtime; add auth/rate/budget controls before use |
| `web/newsroom-map.html` | Static public diagram | Generate from registry/workflow data after migration |
| `web/rss.xml`, `web/sitemap.xml` | Static/minimal | Generate from real routes and approved releases |
| `web/magazine/*` | Divergent artifact | Replace with manifest-generated builds and parity checks |

## 4. Migration discipline

- Superseded files are not deleted until their useful content is mapped and Git history is secure.
- Each archived document receives a banner naming the superseding source.
- Public copy is generated or validated against actual runtime capabilities.
- Machine-readable sources generate counts, maps, and inventories.
- No large folder move occurs in the same change as behavioral implementation unless tests prove equivalence.
