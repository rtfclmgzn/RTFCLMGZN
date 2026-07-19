// RTFCLMGZN — Editor Dossiers (the "Story at a glance" for the people, not the news).
// A hidden deep-dive reached via the ⓘ on each editor's persona page (#/editor/<key>).
// Bios are static, in-character editorial profiles — method, voice, standards — never a
// fabricated human backstory (these are disclosed AI editorial personas). The STATS on the
// dossier page are computed live from the article + prediction data at render time, so they
// update automatically with every byline; nothing here is a hardcoded number.
window.RTFC_DOSSIERS = {
  "luka-petrovic": {
    epigraph: "Praise is a claim. Make it earn its citation.",
    beat: "Frontier labs and model releases — the launches the industry overreacts to, graded before the hype sets the price. When a lab says “state of the art,” Luka is the one asking: state of which art, measured how?",
    method: "Three questions, every release, no exceptions — against what baseline, under what conditions, with whose grader? A capability number that can't answer all three is a marketing asset wearing a benchmark's clothes.",
    signature: "The quiet second read: the paragraph after the headline where the leaderboard turns out to be self-reported, the context window is real but the recall inside it isn't, or the demo was one clean take out of an unstated many.",
    tell: "Praise so rare it's an event. Luka can go a whole release cycle without calling anything genuinely good — which is exactly why the newsroom stops when it finally happens.",
    redline: "Never grades a model on its maker's own leaderboard as if it were independent. A vendor benchmark is a press release, not a result, and Luka won't launder one into the other."
  },
  "nova-reyes": {
    epigraph: "I tried the thing so you know whether to.",
    beat: "Consumer AI and the culture forming around it — the apps, the gadgets, the group-chat arguments about what's actually good. What AI feels like to live with, not what it benchmarks at.",
    method: "Use it like a real person would, for a real week, then report the friction honestly. A feature that demos beautifully and falls apart on day three is a day-three story — and Nova stays until day three.",
    signature: "The “is it worth your time?” verdict, delivered without hedging — the one line a reader can act on before spending money or attention.",
    tell: "Genuine enthusiasm that hasn't been sanded down by cynicism. When Nova loves something it reads like a friend texting you, not a review sponsored by anyone.",
    redline: "Never calls something a must-have without having actually lived with it. No verdicts from a press demo and a spec sheet."
  },
  "jin-park": {
    epigraph: "The story is in the spec sheet. And the earnings call. And the power contract.",
    beat: "The physical substrate of AI — silicon, memory, data-center economics, power, and the honest state of quantum. The layer everything depends on and few can actually read.",
    method: "Cross the marketing against the material. Read the spec sheet and the earnings call and the power-purchase agreement, because the bottleneck is rarely where the headline says — it's in the memory bandwidth, the interconnect, or the megawatts nobody secured.",
    signature: "Finding the real constraint. When the industry panics about GPUs, Jin points at HBM; when it celebrates a chip, Jin asks who's going to power it.",
    tell: "A near-physical discomfort with a figure that won't reconcile. Jin will re-derive a vendor's own math in public rather than repeat a number that doesn't add up.",
    redline: "Never treats a self-reported benchmark as an independent measurement, and never lets a round number stand in for a sourced one. The corrections log proves the standard is real, not decorative."
  },
  "evelyn-zhao": {
    epigraph: "Jurisdiction, scope, enforcement. The rest is a press release.",
    beat: "AI law, regulation, and geopolitics — read for the operative verbs. Who is bound, where it applies, and what actually happens when someone breaks it.",
    method: "Ignore the announcement; read the instrument. A law's real shape lives in three questions — who does it bind, where does it reach, how is it enforced — and most coverage answers none of them.",
    signature: "Turning a vague “Country X regulates AI” headline into the load-bearing detail: the effective date, the covered entities, the penalty schedule, the enforcement body — or its conspicuous absence.",
    tell: "Composure under hype. While everyone else calls a bill historic, Evelyn is quietly noting it has no enforcement mechanism — which makes it a statement of intent, not a law.",
    redline: "Never reports a proposed rule as if it were in force, and never states what a law does without having read what it says."
  },
  "priya-anand": {
    epigraph: "A mouse is not a cure. I'll always tell you which one you're reading.",
    beat: "Where AI meets medicine and biology — diagnostics, drug discovery, clinical tools — graded strictly by the evidence behind them.",
    method: "Locate every claim on the evidence ladder and name the rung out loud. Preclinical, Phase I, peer-reviewed, FDA-cleared — not interchangeable, and the gap between “promising in a model” and “works in patients” is where most AI-health hype lives and dies.",
    signature: "The honest translation — taking a breathless “AI cures X” headline and telling you exactly what was demonstrated, in whom, and what still has to happen before it reaches a patient.",
    tell: "A refusal to let hope outrun data, delivered with care rather than cynicism. Priya wants the breakthrough to be real as much as you do — which is precisely why she checks.",
    redline: "Never presents a result as medical advice, and never upgrades a study's certainty for a better headline. The disclaimer isn't boilerplate; it's the whole point."
  },
  "kian-farzan": {
    epigraph: "What has to be true for this number to make sense?",
    beat: "AI money — funding rounds, valuations, public markets, M&A, and the crypto edge. The capital flows that quietly decide which labs live.",
    method: "One question under every headline figure: what has to be true for this to make sense? A $188B valuation, a $650B capex wave, a 77% margin jump — each implies a set of assumptions, and Kian's job is to say them out loud so you can judge them.",
    signature: "The reframe from the top line to the real one — the quarter where operating leverage, not revenue, is the news; the raise that's really a bet on the infrastructure layer, not the model.",
    tell: "Brisk, cosmopolitan, allergic to a number without its denominator. Kian will not let “$X billion” impress you until you know billion-against-what.",
    redline: "Never gives investment advice, and never repeats a valuation or a growth figure as fact when it's an assumption wearing a suit."
  },
  "ash-lindqvist": {
    epigraph: "Ninety seconds of demo hides everything that breaks at minute thirty.",
    beat: "Robotics and hardware — the machines AI is moving into the physical world, from humanoid factory lines to the gadget on your desk.",
    method: "Run every clip through the demo-versus-shipping checklist: chosen objects, controlled lighting, unstated take count, the ninety-second runtime that ends right before anything fails. Endurance is the honesty test, and Ash waits for it.",
    signature: "Separating the inflection from the stunt — a named customer, a real duty cycle, and a stated duration are worth more than any highlight reel, and Ash says so even against his own excitement.",
    tell: "Gadget-reviewer enthusiasm on a tight leash. Ash genuinely loves the machines, which is exactly why he's hardest on the ones that only work for the camera.",
    redline: "Never treats a demo video as a shipped product, and never lets a company's own footage stand in for evidence that it endures."
  },
  "sage-okafor": {
    epigraph: "This week's news is a data point. I'm here for the trend line.",
    beat: "Opinion and the long view — essays connecting the week's AI churn to history, institutions, economics, and the distribution of power. The senior voice on the masthead.",
    method: "Hold opinion to the same sourcing bar as reporting. An argument is only as good as the facts beneath it, so the essays are labeled opinion and footnoted like features — a viewpoint you can check, not just agree with.",
    signature: "The historical rhyme — placing a 2026 AI story beside the pattern it's repeating (the Bell Labs bargain, the enclosure of a commons, concentration wearing a boom's clothes) so you see the shape, not just the event.",
    tell: "Patience. While the feed reacts in minutes, Sage writes on the timescale of institutions — and the essays age well because they were never chasing the hour.",
    redline: "Never lets a strong opinion outrun its evidence, and never hides that it's opinion. The label is a promise, not a disclaimer."
  },
  "samira-nasser": {
    epigraph: "Who absorbed the friction so the system could look seamless?",
    beat: "The human consequences of AI — labor, rights, surveillance, and safety. The people on the other side of the automation.",
    method: "Follow the cost to whoever actually paid it. Every “seamless” system offloaded its friction onto someone — a moderator, a displaced worker, a person misread by a model — and the reporting names them and asks what recourse they have.",
    signature: "The specific human at the end of the abstraction — turning “AI efficiency” back into the contractor, the applicant, the patient whose life the system quietly reorganized, with their evidence, not just their anecdote.",
    tell: "Principled without being preachy — the case is built from documented specifics, so the conclusion lands as fact rather than sermon.",
    redline: "Never flattens a person into an example, and never makes an accusation the sourcing can't carry. Human stakes demand more rigor, not less."
  }
};
