# RTFCLMGZN — Source-Aware Format & Cover Uniqueness Policy

Loaded by the Managing Editor, Research, Verification, Publishing, image-selection, QA, and scheduled-run agents.

## 1. Format planning uses evidence depth

> **Canonical source floor: `agents/_shared/format-routing.md`.** That file is the single authority for how
> many sources each tier needs; this table restates it. The Research row said **7+** while the router said
> 8+ and `cycle-runbook.md` §2 said 5+ — three floors for one decision. All are now **8+**, the strictest.
> If this table ever disagrees with `format-routing.md` again, the router wins and this table is the bug.
> Corrected 2026-07-31.

The system chooses a target tier before drafting.

| Planned tier | Default evidence profile | Finished structure |
|---|---|---|
| Brief | 1–2 credible sources; one event or narrow fact pattern | 250–450 words; inverted pyramid; no padding |
| Synthesis | 3–6 credible sources; multiple documents/viewpoints | 800–1,900 words; thesis, evidence, counter-case, verdict |
| Research | **8+** independent evidence threads; normally 3+ primary/high-value sources across 4+ source classes; multi-angle question | 2,200+ words; multiple authors where warranted; 2–3 sourced charts |

Source count is a strong default, not the only signal. Source independence, primary-source quality, disagreement, novelty, and analytical breadth matter. Overrides require an explicit recorded rationale.

Every article must carry:

```js
formatDecision: {
  planned: "brief|synthesis|research",
  source_count: 0,
  primary_source_count: 0,
  override: false,
  rationale: "..."
}
```

The site still derives the visible tier from actual word count. The pipeline must reconcile the evidence plan with the finished article before publishing.

## 2. Source classification

Every source record should include `primary:true|false`.

Primary/high-value examples:
- official announcement, filing, model card, paper, dataset, transcript, regulator document;
- direct first-party technical documentation;
- original interview or attributable primary evidence.

Secondary examples:
- news report, analysis, newsletter, aggregator, commentary.

A large stack of duplicated secondary write-ups does not qualify a story for Research.

## 3. Cover image law

Every article gets a distinct editorial cover.

Hard rules:
1. No two different articles may use the same cover within 90 days.
2. No cover may be reused anywhere inside the same publication batch.
3. A renamed or recompressed copy of the same artwork does not count as unique.
4. The same article may retain its cover during a correction or update.
5. Search the curated SOL/Gemini library only after excluding cooldown-blocked art.
6. If no eligible relevant library image remains, generate a new copyright-clean cover through Gemini/Nano Banana.
7. The Publishing Agent must run the registry validator before commit. Violations block publication.
8. Article social exports use the article's assigned cover and do not create a second competing cover assignment.

## 4. Selection order

1. Build the 90-day blocked set from all published content arrays.
2. Add the current batch's chosen images to the blocked set.
3. Score remaining images for semantic relevance, orientation, crop safety, visual quality, and prior topical similarity.
4. Select the highest-scoring eligible image.
5. Generate a new image if the best eligible library candidate is weak or misleading.
6. Record the chosen image path in the article and validate again.

## 5. QA failures

Publication fails when:
- a planned synthesis finishes below the site's synthesis threshold without an override;
- a planned research piece is below 2,200 words or lacks 2–3 sourced charts;
- `formatDecision` is missing;
- source counts disagree with the attached source list;
- two different recent articles share an image;
- any current-batch cover is reused;
- an image was renamed or copied to evade cooldown;
- a generated image is not stored in the managed library with metadata.

A skipped slot is preferable to weak evidence, padded copy, or repeated artwork.
