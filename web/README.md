# RTFCLMGZN — Web Front-End (prototype)

The reader-facing website. Runs the home feed, topic sections, persona/author pages, and the article template with the full trust stack (AI-authorship disclosure, primary sources, correction log, topic disclaimers).

## Run it

- **Instantly:** open `index.html` in a browser. Content loads as JS globals (no fetch), so it works over `file://` with no server.
- **As a localhost server** (used for the preview tooling): configured in the repo `.claude/launch.json` as `rtfclmgzn-web` on port 4321 (Python `http.server` over this folder).

## Structure

```
web/
├── index.html          shell: prototype ribbon, header/nav, footer, mount point
├── assets/
│   ├── styles.css       theme-aware design system (dark default + light)
│   └── app.js           hash router + renderers (home / section / persona / article)
└── data/
    ├── personas.js      the 7-persona masthead (mirrors agents/personas/*.agent.md)
    └── articles.js      article store — SAMPLE content
```

## Why this shape

The article objects in `data/articles.js` mirror the **published shape of the pipeline state object** (`agents/_shared/pipeline.md`): byline persona, section, format, sources, `disclaimer`, and `corrections[]`. That means when the agent pipeline goes live, its Publishing Agent (stage 8) output maps directly onto this schema — the front-end is already shaped to consume real pipeline output. Swap the sample array for a generated feed (or a CMS/API) and the site is real.

Migrates cleanly to Next.js when SSR/SEO matters (the blueprint's core structural bet vs. inbox competitors): the render functions become components, the data layer becomes the data source.

## Prototype notes

- Every article is marked `sample:true` and the site carries a persistent "Prototype · sample content" ribbon. Nothing here is real reporting — the content demonstrates layout, voice, and the trust stack, not news.
- Article thumbnails are section-colored glyphs, standing in for the image-generation pipeline (blueprint §8.2).
