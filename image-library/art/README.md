# RTFCLMGZN art library

87 pre-generated editorial images, catalogued in [`manifest.json`](manifest.json).
This is a **cost lever and a variety lever**: pulling from here costs nothing,
while every generated cover costs an API call.

## The two rules

1. **Pull from the library about half the time.** Roughly one in two article or
   magazine covers should come from here rather than a fresh generation. If a
   library image genuinely fits the story, prefer it.
2. **90-day no-reuse.** No image — from this library *or* freshly generated —
   may appear on a second article or magazine issue within 90 days of its
   previous use. This mirrors the site-side policy enforced by
   `web/data/image-usage.js`.

## Picking an image without opening it

Every entry carries enough metadata to choose from text alone:

| field | use |
|---|---|
| `title` / `description` | what is actually depicted |
| `subjects` | tag match against the story (e.g. `fab`, `humanoid-robots`, `substation`) |
| `best_for_sections` | which desks the image suits |
| `mood` / `palette` | tonal fit — a storm-lit substation is not a product review |
| `orientation` | `landscape` (81), `portrait` (3), `ultrawide` (3 banners) |
| `text_space` | where a headline can sit without covering the subject |
| `brand_visible` | **read this before choosing** — see below |
| `used_in` | prior uses; check dates against the 90-day rule |

## Brand-visible images (14 of 87)

Some images have a real company's name or logo rendered into the artwork
(Anthropic, OpenAI, xAI, Meta, Gemini), and one has "GPT-5.6" baked into a
dashboard. These are **AI-generated depictions, not photographs of real
buildings or products**.

- Never use a brand-visible image on a story about a *different* company.
- Never use one where a reader could take it as documentary evidence of a real
  place, event, or product.
- Prefer the unbranded alternatives for general frontier-lab coverage.

## Workflow

1. Filter `manifest.json` by `best_for_sections` and `subjects`.
2. Drop anything whose `used_in` contains a use inside the last 90 days.
3. Check `brand_visible` against the story's subject.
4. Resize the chosen PNG to a web JPEG (~1536px wide, quality ~82) into
   `web/assets/img/newsroom/<article-id>.jpg` — never link the source PNG
   into the site; these are 2–3 MB originals.
5. Append `{"article_id": "...", "used_at": "YYYY-MM-DD"}` to that image's
   `used_in` and commit the manifest with the article.

## Regenerating

`manifest.json` is generated from a vision pass over every file. If images are
added or removed, re-scan the new files and rebuild rather than hand-editing —
`count` and the `file` list must always match the directory exactly.
