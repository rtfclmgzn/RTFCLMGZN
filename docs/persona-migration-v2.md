# Persona Migration v2 — the nine-editor masthead (July 16, 2026)

The masthead moved from the founding lineup to Persona Training v2.0. Four editors
retired, four joined, one changed desks, and every editor gained a portrait.

## Active lineup & routing (authoritative)

| Section (site key) | Beat (display) | Editor | Slug | Portrait |
|---|---|---|---|---|
| Frontier | Frontier Labs & Model Releases | **Luka Petrović** (Senior Editor) | `luka-petrovic` | `web/assets/img/personas/luka-petrovic.jpg` |
| Products | Consumer AI & Culture | Nova Reyes | `nova-reyes` | `nova-reyes.jpg` |
| Compute | Chips, Compute & Quantum | Jin Park | `jin-park` | `jin-park.jpg` |
| Policy | Policy, Regulation & Geopolitics | Evelyn Zhao | `evelyn-zhao` | `evelyn-zhao.jpg` |
| Health | AI in Health & Biotech | Priya Anand | `priya-anand` | `priya-anand.jpg` |
| Markets | Markets, Crypto & AI Business | Kian Farzan | `kian-farzan` | `kian-farzan.jpg` |
| Robotics | Robotics & Hardware | Ash Lindqvist | `ash-lindqvist` | `ash-lindqvist.jpg` |
| Opinion | Opinion & The Long View | Sage Okafor | `sage-okafor` | `sage-okafor.jpg` |
| Ethics | Ethics, Labor & Human Stakes | Samira Nasser | `samira-nasser` | `samira-nasser.jpg` |

`Guide` content routes to Nova Reyes (unchanged). Priya Anand's display name
carries no honorific anywhere in the active system.

## Replacement map

- Idris Vale → retired; **Sage Okafor** moved from Frontier to Opinion & The Long View.
- Marcus Webb → retired; **Evelyn Zhao** owns Policy.
- Maya Serrano → retired; **Samira Nasser** owns Ethics.
- Ronan Cole → retired; **Kian Farzan** owns Markets.
- **Luka Petrović** (new) owns Frontier Labs & Model Releases.

## Source of truth

- Active persona definitions: `agents/personas/*.agent.md` (YAML frontmatter:
  `name`, `display_name`, `role`, `section`, `sensitivity`, `status: active`).
- Archive: `agents/personas/_old/` — never loaded, never deleted. The runtime
  loader is `newsroom/prompts/agent-spec-map.json` (an explicit allowlist of
  file paths), so `_old` and any future backup directories are structurally
  ignored: only mapped paths enter generation context.
- One persona file per article generation (checkpoint 5), layered as:
  constitution → assigned editor file → research brief → format contract →
  verification/compliance. Never all nine at once.

## Portrait mapping (source → production)

`image-library/personas/{ash,sage,jin,evelyn,samira,nova,priya,kian,luka}.png`
→ center-cropped 640×640 JPEGs at `web/assets/img/personas/<slug>.jpg`.
Source PNGs are untouched; production copies are generated. Site-side, a
persona with a `photo` field renders the portrait (cover-fit, centered,
persona-color ring, `aria-label` alt); a persona without one falls back to
initials-on-gradient. Masthead avatars open a lightbox closeup.
Known cosmetic nit: ash/nova/priya source PNGs carry a small generator badge
in the top-left corner, visible only in the enlarged lightbox view.

## Historical articles (owner-directed full reassignment, July 16 2026)

The owner directed a complete byline reassignment: **every** published
article, prediction, usage-log row, social post, and RSS item is credited to
the active nine-editor lineup. Marcus Webb → Evelyn Zhao (6 pieces),
Ronan Cole → Kian Farzan (6), Idris Vale → Sage Okafor (1 Opinion essay),
and Sage Okafor's seven Frontier-era pieces (incl. pipeline agent records
and the Great Repricing co-author slot) → Luka Petrović. Maya Serrano had
no published bylines. Retired personas were then removed from
`web/data/personas.js` entirely — zero references to the retired lineup
remain anywhere under `web/` (test-enforced). Pre-migration bylines are
recoverable from git history (commits ≤ `97be183`).

`activePersonas()` in app.js remains the pattern for listing surfaces, and
`persona()` still guards against unknown keys. The retired names survive
only in non-web historical documents: `HANDOVER-FOR-CHATGPT.md`,
`RTFCLMGZN_Agent_System_Design.md`, `docs/architecture/00_EXECUTIVE_AUDIT.md`
(dated audit), `agents/examples/sample-pipeline-run.md`,
`agents/email/daily-digest-sample.html`, and `agents/personas/_old/`.

## Validation

`newsroom/tests/test_persona_registry.py` (9 checks): exactly nine active
personas in the registry; no retired slug in registry or spec map; spec map
points only at existing active files (never `_old`); active agent files match
the lineup and carry `status: active`; discovery routing matches the table
above; `personas.js` has the active lineup, retired flags, correct section
owners, no "Dr. Priya", and Luka's UTF-8 name; all nine portraits exist and
are distinct; fallback initials derive correctly (AL SO JP EZ SN NR PA KF LP).
Run: `python -m pytest newsroom/tests/test_persona_registry.py` (or execute
the functions directly if pytest isn't installed).

## Adding or replacing a persona safely (future)

1. Write `agents/personas/<slug>.agent.md` with v2 frontmatter; move any
   replaced file to `_old/`.
2. Add the slug → path entry in `newsroom/prompts/agent-spec-map.json`.
3. Add/update the persona entry in `newsroom/registry/agents.json`.
4. Update `PERSONA_BY_SECTION` in `newsroom/autonomy/discovery.py`.
5. Update `web/data/personas.js` (entry + section `editor:`), flagging any
   predecessor `retired:true` instead of deleting it.
6. Update `agents/managing-editor.agent.md` routing and both
   `newsroom-map.html` files.
7. Drop a portrait in `image-library/personas/`, generate the 640px JPEG into
   `web/assets/img/personas/<slug>.jpg`, set `photo:` in personas.js.
8. Run the validation tests; bump `?b=` in `web/index.html`; commit and push.
