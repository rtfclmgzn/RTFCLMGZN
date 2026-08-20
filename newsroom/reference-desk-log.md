# Reference desk log

One line per reference-desk cycle, appended by the agent **before** it writes the
page. Opened 2026-08-15.

## Why this file exists

The register's Class E failure is *a number nobody measured*. "Did reference
content earn organic traffic" is exactly that number unless the target query is
written down before the page is written, because afterwards every page looks like
it was aimed at whatever it happens to rank for.

The baseline, measured 2026-08-15 from Cloudflare Web Analytics: **470 page views
and 320 visits in 30 days**, across 127 published articles, with autoposting live
to five platforms. Roughly four views per article, lifetime. Search Console had no
verified property at that point, so there is no impressions or query data before
this date and there never will be.

Read this file next to Search Console in ninety days. If pages listed here are
picking up impressions and the news articles are not, the desk works and the beat
should narrow further. If nothing here moves while technical SEO is correct, the
problem is positioning rather than plumbing, and that is worth knowing before any
of this gets packaged and sold to someone.

## The entries

| Date | Page | Target query | Who ranks now, and why we can take it |
|---|---|---|---|
| 2026-08-16 | guides/how-to-tell-if-an-ai-valuation-is-real | "how to tell if an AI startup valuation number is real" | First page is all founder/investor-facing valuation-methodology content (blockchain-council.org, Causo Hub, Eqvista, Qubit Capital, Aventis Advisors, Lucid) answering "how do I price my own company," not "how do I verify a valuation headline I just read." No page teaches the reader-facing method (transaction verb, announced-vs-closed, equity-vs-debt, run-rate-vs-audited) worked through a real, dated example — the gap this guide fills, using Databricks' Aug 13 close and Moonshot AI's Series F/pre-IPO split as its two worked cases. |
| 2026-08-17 | guides/how-to-verify-an-ai-benchmark-claim | "how to verify an AI benchmark score claim is legit" | First page is an enterprise-vendor blog (Omniscient), a Stanford HAI policy brief written for policymakers rather than readers, a "where to find scores" listicle (Label Studio), a voice-AI-niche blog (Digital Applied), and a Medium post — no page teaches an ordinary reader the vendor-table/crowd-vote/independent-aggregate distinction worked through a real, dated launch. TechCrunch and The Verge cover individual model launches but never the general verification method. The gap this guide fills, using Alibaba's Qwen3.8-Max as the worked case: its own July 19 claim, its Aug 3 Arena placement and vendor table, and the independent Artificial Analysis score that didn't land until Aug 10 — three numbers, three weeks, one model. |
| 2026-08-18 | guides/stop-chatgpt-claude-gemini-training-on-your-chats | "how to stop ChatGPT Claude Gemini training on my chats" | First page is scattered, low-authority SEO content (cloaked.com, felloai.com, trustscan.dev, llmnesia.com) that each cover one or two of the three products, often thin or listicle-shaped, with no single page walking through all three side by side using each company's own current help page as the source. No TechCrunch/Verge/Wikipedia on this exact query. The gap this guide fills: a dated (Aug 18, 2026) three-way comparison of the actual setting names and paths (verified against help.openai.com, privacy.claude.com, and support.google.com directly), plus the exceptions (feedback ratings, safety-flagged conversations) none of the low-authority pages named together. |
| 2026-08-19 | guides/check-an-open-weight-models-license | "open weight AI model license commercial use check" | First page is all blogspam-tier content (telnyx.com, a Medium post, a curated GitHub list, digiwit.ai, layer3labs.io, techjacksolutions.com, buildmvpfast.com, two legal-services sites) — no TechCrunch/Verge/Wikipedia/official-docs page, and none of them work through named, dated, primary-sourced examples; digitalapplied.com's licence-audit post is the closest competitor and still reads as a roundup, not a reader-facing check. The gap this guide fills: a four-question procedure plus a compare table across four real 2026 releases (DeepSeek V4 Pro's plain MIT, Moonshot's Kimi K2 modified-MIT attribution clause, Meta's Llama 3 700M-MAU cap, and Tencent Hunyuan Hy3's April-preview-to-July-Apache-2.0 license swing), every term verified against the actual LICENSE file or model card rather than a launch post. |
| 2026-08-20 | guides/check-whether-an-image-is-ai-generated | "how to tell if an image is AI generated check watermark C2PA" | First page is entirely third-party detector-tool marketing sites (apidog.com, layer3labs.io, checkaiwatermarks.com, raiw.cc, eyesift.com, lumethic.com, c2paviewer.com, aiphotocheck.com) plus one security-vendor blog (Malwarebytes) and a photography-niche site — no TechCrunch/Verge/Wikipedia/official-standards page walks a reader through the two real, distinct mechanisms (C2PA's signed file manifest vs. Google's SynthID pixel watermark) in the order to actually check them, or states plainly that neither one proves an image is real when it comes back clean. "watermark" appears 30x and "C2PA" 6x across this archive's own coverage with no page teaching the reader-facing check. The gap this guide fills, grounded in the July 2026 Google Earth image-tool rollback (every fabricated image carried an unchecked SynthID mark) and OpenAI's Feb 2024 C2PA rollout as the two worked, dated anchors. |
