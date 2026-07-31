// ============================================================================
// THE FIGURES REGISTER — every comparable number this newsroom has published,
// normalized to one unit per kind so any story can be ranked against the whole
// archive automatically.
//
// WHY THIS FILE EXISTS
// A human desk cannot hold 200 normalized figures in working memory, so it
// compares a new deal against whatever it happens to remember. This holds all
// of them permanently. The `rank` body component reads this file, sorts live,
// and renders "this is the Nth largest on record" — a claim that can never go
// stale, because nothing about the ordering is written down.
//
// MAINTENANCE (newsroom, every cycle)
//   - Publishing a story with a figure of an existing `kind`? Add it here in the
//     same cycle, then use a {"type":"rank"} block in the article.
//   - `value` MUST already be normalized to that kind's `unit`. Do the
//     conversion here, once, not in the article.
//   - `note` states the scope of the number, because same-unit does not mean
//     same-meaning: a 15-year lease-revenue total and a construction budget are
//     both "USD billions" and are not the same thing. Where two figures in one
//     kind measure different things, say so in `note` — that honesty is the
//     whole point of the component.
//   - NEVER add a figure this publication has not actually reported and sourced.
//     `slug` must be a real published article.
// ============================================================================
window.RTFC_FIGURES = {
  updated: "2026-07-30",

  // Per-kind display metadata. `unit` is the normalized unit every value in
  // that kind must already be expressed in.
  kinds: {
    "datacenter-capacity": {
      title: "Announced AI data-center capacity, ranked",
      sub: "Every capacity figure on record, normalized to megawatts. Contracted and optioned capacity are both listed and labelled — an option is not a commitment.",
      unit: " MW", dec: 0, noun: "capacity commitments",
      source: "Each figure as reported in the linked article, from that story's primary sources."
    },
    "infra-commitment-usd": {
      title: "AI infrastructure commitments, ranked",
      sub: "Headline dollar figures on record, in USD billions. Read the scope note on each: these numbers measure genuinely different things.",
      unit: "B", prefix: "$", dec: 1, noun: "commitments",
      source: "Each figure as reported in the linked article. Scope differs by deal — see the note on each entry."
    },
    "funding-raise-usd": {
      title: "AI funding raises, ranked",
      sub: "Capital actually raised in a closed round or listing, in USD billions. Asks and in-progress talks are excluded by definition.",
      unit: "B", prefix: "$", dec: 1, noun: "closed raises",
      source: "Each figure as reported in the linked article."
    },
    "valuation-usd": {
      title: "Valuations on record, ranked",
      sub: "In USD billions, at the moment reported. Closed prices only — an ask in active talks is not a valuation.",
      unit: "B", prefix: "$", dec: 0, noun: "valuations",
      source: "Each figure as reported in the linked article."
    }
  },

  items: [
    // ---- data-center capacity (MW) ----
    { id:"cap-openai-ohio", kind:"datacenter-capacity", value:10000,
      label:"OpenAI / SoftBank, Piketon OH (reported)", slug:"nvidia-openai-250-billion-ohio-data-center-financing",
      note:"10 GW campus; first phase ~800 MW targeted 2028. Terms unconfirmed by either company." },
    { id:"cap-amd-option", kind:"datacenter-capacity", value:2455,
      label:"AMD / Core Scientific, incl. reservation option", slug:"amd-meta-14-billion-data-center-financing-wave",
      note:"530 MW contracted plus a 1,925 MW reservation right expiring Dec 28 2028. Optioned, not committed." },
    { id:"cap-sk-telecom", kind:"datacenter-capacity", value:2000,
      label:"SK Telecom / Nvidia, Korea", slug:"nvidia-sk-group-korea-500-billion-ai-partnership",
      note:"2 GW on Nvidia's Vera Rubin platform; first facility scheduled 2027." },
    { id:"cap-meta-elpaso", kind:"datacenter-capacity", value:1000,
      label:"Meta / BlackRock, El Paso TX", slug:"amd-meta-14-billion-data-center-financing-wave",
      note:"1 GW campus in an 80/20 joint venture; capacity online 2028." },
    { id:"cap-amd-contracted", kind:"datacenter-capacity", value:530,
      label:"AMD / Core Scientific, contracted", slug:"amd-meta-14-billion-data-center-financing-wave",
      note:"Contracted across five sites under 15-year leases; fully live by end of 2028." },
    { id:"cap-naver", kind:"datacenter-capacity", value:200,
      label:"Naver, after Nvidia-funded expansion", slug:"nvidia-sk-group-korea-500-billion-ai-partnership",
      note:"Expanding roughly fourfold from 55 MW; Nvidia put in $1B, Brookfield up to $9B more (nonbinding)." },

    // ---- infrastructure commitments (USD B) ----
    { id:"inf-sk-group", kind:"infra-commitment-usd", value:500,
      label:"Nvidia / SK Group, Korea", slug:"nvidia-sk-group-korea-500-billion-ai-partnership",
      note:"A combination of infrastructure spend, vendor financing and forward supply contracts — not a single payment." },
    { id:"inf-ohio-chips", kind:"infra-commitment-usd", value:350,
      label:"Nvidia chip financing for the Ohio campus (reported)", slug:"nvidia-openai-250-billion-ohio-data-center-financing",
      note:"A separate, additional commitment up to this figure to finance the accelerators. Reported, not confirmed." },
    { id:"inf-ohio-guarantee", kind:"infra-commitment-usd", value:250,
      label:"Nvidia lease/construction guarantee, Ohio (reported)", slug:"nvidia-openai-250-billion-ohio-data-center-financing",
      note:"A guarantee so OpenAI can lease the campus, not money spent. Terms unsettled; the deal could still collapse." },
    { id:"inf-amd-lease", kind:"infra-commitment-usd", value:14,
      label:"AMD / Core Scientific", slug:"amd-meta-14-billion-data-center-financing-wave",
      note:"Base contracted LEASE REVENUE to the landlord over 15 years — a topline forecast, not a construction cost." },
    { id:"inf-meta-elpaso", kind:"infra-commitment-usd", value:14,
      label:"Meta / BlackRock, El Paso", slug:"amd-meta-14-billion-data-center-financing-wave",
      note:"Total projected DEVELOPMENT COST of the campus — same headline number as the AMD deal, measuring a different thing." },

    // ---- closed raises (USD B) ----
    { id:"raise-cxmt-ipo", kind:"funding-raise-usd", value:8.6,
      label:"CXMT, Shanghai STAR Market IPO", slug:"cxmt-shanghai-ipo-489-billion-debut-no-hbm",
      note:"57.92 billion yuan. Largest semiconductor listing in the exchange's history." },
    { id:"raise-moonshot-f", kind:"funding-raise-usd", value:3.5,
      label:"Moonshot AI, Series F", slug:"moonshot-ai-series-f-35-billion-close",
      note:"Oversubscribed, above an original $1-2B target. Led by China's National AI Industry Investment Fund." },

    // ---- valuations (USD B) ----
    { id:"val-cxmt", kind:"valuation-usd", value:489,
      label:"CXMT, at Shanghai open", slug:"cxmt-shanghai-ipo-489-billion-debut-no-hbm",
      note:"Roughly 3.31 trillion yuan at the open, briefly mainland China's most valuable listed company." },
    { id:"val-moonshot", kind:"valuation-usd", value:35,
      label:"Moonshot AI, post-money (Series F)", slug:"moonshot-ai-series-f-35-billion-close",
      note:"A closed price. A separate $50B pre-money figure is an ask in active talks and is deliberately not listed here." }
  ]
};
