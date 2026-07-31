# RTFCLMGZN — Evidence-Aware Format Router

This file is mandatory context for the Managing Editor, Research Agent, Persona Writer, Verification Agent, Style Agent, and Publishing Agent. The newsroom must choose format from the **shape of the evidence and the editorial job**, not from a desired word count.

> **CANONICAL: this file is the single authority for source floors.** As of 2026-07-31 the research floor
> was stated as three different numbers in four places — `cycle-runbook.md` §2 said 5+,
> `format-and-image-policy.md` and the (now retired) `DAILY-RUN.md` said 7+, and this file said 8+. A floor
> that any agent is permitted to undercut is not a floor, so all of them were set to the strictest number,
> **8**, and every other file now points here. If a number in another document disagrees with this one,
> **this one wins and the other document is the bug** — fix it there, do not lower it here.

## Core rule

Format is a consequence of reporting depth:

- **Brief** = one discrete development, usually supported by one primary source plus zero or one independent confirmation.
- **Synthesis** = several materially distinct sources that must be reconciled into one useful account.
- **Research** = a broad evidence base, multiple source classes, competing interpretations, and original structured analysis that cannot be responsibly compressed into a normal daily synthesis.

Source count is a routing signal, not a license to pad. Ten copies of the same press release still count as one evidentiary thread.

## Count independent evidence threads, not URLs

Before drafting, the Research Agent must deduplicate the source set into `evidence_threads`.

Examples:

- Company announcement + five articles repeating it = **one primary thread**, perhaps one secondary-confirmation thread.
- Company announcement + filing + model card + independent benchmark + regulator document = **five materially distinct threads**.
- Two outlets citing the same anonymous source = normally **one thread**, not two.
- A source may support several claims, but it still counts once in the source inventory.

Each source record should be tagged internally as one of:

`primary_company | filing_or_official | paper_or_model_card | independent_reporting | expert_or_stakeholder | dataset | historical_context`

## Routing matrix

### Brief

Use a Brief when all of the following are substantially true:

- The story is one event, announcement, filing, result, or correction.
- The useful reader takeaway can be delivered without reconciling competing evidence.
- There are **one or two independent evidence threads**.
- The article can remain accurate and complete at roughly **250–450 words**.
- No chart is needed; a single sourced stat callout is acceptable.

A second source does not automatically create a synthesis when it merely confirms the first.

### Synthesis

Use a Synthesis when any of the following is true and the evidence supports it:

- There are **three to seven independent evidence threads**.
- Multiple companies, documents, studies, or stakeholders must be compared.
- The story needs context, a counter-case, or reconciliation of conflicting claims.
- The reader would otherwise need to open several links to understand what actually happened.
- The piece can support roughly **800–1,900 words** of non-repetitive reporting and analysis.

Minimum expected shape:

- At least **three materially distinct sources**, normally including at least one primary source.
- Thesis → evidence → counterweight/limitations → verdict.
- A real Put-it-to-work block.
- A pull quote or visual rhythm element; a chart when the data genuinely warrants one.

Synthesis is the default daily signature format, but it must be earned by source diversity and analytical work.

### Research

Use Research only when the project clears the full bar:

- At least **eight independent evidence threads**, normally spanning **four or more source classes**.
- At least **three primary/official sources** unless the subject genuinely lacks them.
- **Two or three editorial authors/desks** contribute distinct expertise.
- The piece contains a substantial counter-case, methodology/limitations section, and a conclusion that follows from the evidence rather than from volume.
- At least **2,200 words**, normally around 3,500.
- **Two or three sourced charts** or equivalent structured data displays.
- The work answers a durable question larger than a single news event.

A long article with many links is not automatically Research. A roundup of ten derivative stories is not Research. Research requires evidence diversity, original organization, and multi-editor scrutiny.

## Hard anti-gaming rules

1. **Never add sources merely to unlock a higher label.** Every source must materially change, confirm, challenge, quantify, or contextualize the article.
2. **Never inflate word count to force Synthesis or Research.** If the evidence only supports a brief, publish a strong brief.
3. **Never call one-source commentary a synthesis.** Analysis based primarily on one source remains a Brief or a clearly labeled Opinion column at the appropriate length tier.
4. **Do not count mirrors, syndicated copies, press-release rewrites, or multiple pages from the same document as separate evidence threads.**
5. **The declared `format` and the actual article must agree.** The Publishing Agent must record the source inventory and word count in the pipeline provenance.

## Required routing record

The Managing Editor must create this internal record before drafting:

```json
{
  "format_decision": {
    "format": "brief|synthesis|research",
    "independent_evidence_threads": 0,
    "source_classes": [],
    "primary_sources": 0,
    "reason": "one sentence explaining why this format is the smallest honest container"
  }
}
```

The Verification Agent must re-check this after fact-checking. If sources are removed or collapse into fewer independent threads, downgrade the format and rewrite to the smaller honest container. If research uncovers a genuinely broader evidence base, the Managing Editor may upgrade before publication.

## Final publication gate

Before publishing, all of these must agree:

- source inventory,
- independent evidence-thread count,
- article structure,
- actual word count,
- chart/author requirements,
- declared format.

When they disagree, **downgrade or rebuild**. Never relabel.