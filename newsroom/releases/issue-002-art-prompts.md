# Issue 002 art prompts — ready to run

23 new images, budgeted at ~$0.034/img (Nano Banana 2 Lite) = **~$0.78-0.85** for the base set,
landing inside the §9 target of $0.70-1.10/issue. Cover gets 3 concepts per §5/§7 (pick one,
note the other two as unused in the draft-ready file), so 25 actual generations.

Every prompt below is a **scene only** — `gen_image.py` auto-appends the locked house style
(cyberpunk/futurist/photoreal, violet/ink-black/amber, negatives against vintage/fantasy). Don't
add style words; that's the one thing that's already handled.

**Do NOT regenerate these 7 — they're existing, reused site assets, not new art:**
`ad-tokenthread.jpg`, `ad-orbit.jpg`, `ad-helios.jpg`, `ad-dailywire.jpg`, `ad-momentum.jpg`,
`mg-photo-die.jpg`, `primer-cover-c.jpg` — all already on disk from prior issues/site furniture.

**Ratio note (doc inconsistency worth fixing):** MAGAZINE-STANDARD.md §13 says the centerfold
should be "generated at 3:2 (= two 3:4 pages)" in one line, then says pass ratio `"16:9"` to
`gen_image.py` in another. 3:2 is the one that's mathematically consistent with "two 3:4 pages
side by side" (3+3 : 4 = 3:2); 16:9 is a different shape entirely. I used **3:2** below — worth
fixing that line in the standard doc so this doesn't have to be re-decided next issue.

Run each line from the repo root:

```
uv run --with pillow agents/social/gen_image.py "<scene>" <out.jpg> "<ratio>"
```

---

## Cover — 3 concepts, 3:4, founder picks one

`assets/img/issue-002-cover.jpg`

**Concept A — the crack:**
> A single cracked pane of dark glass floating in a void, amber light leaking through the fracture lines like a system alert bleeding out; behind the crack, a dense wall of glowing server racks recedes into deep violet haze. Large dark negative space fills the top third of the frame for a masthead. A lone shaft of amber light cuts diagonally across the racks below, implying a breach that started as one thin crack and spread.

**Concept B — the stack under strain:**
> A towering stack of glowing memory modules and silicon dies, lit in violet and ink-black, rises out of a dense data-hall floor and narrows toward a single glowing seam near the top where the stack appears to be under visible strain, hairline cracks of amber light running through it. Large dark negative space at the top of the frame for a masthead. The scale reads industrial and vast, one structure holding up everything above it.

**Concept C — the countdown hall:**
> A vast dark server hall shot from a low angle, rows of racks glowing violet and ink-black receding to a single point of amber light at the far end, like a countdown. In the foreground, a cracked holographic pane hangs mid-air, its fracture throwing thin amber light across the nearest rack faces. Large dark negative space fills the top of the frame for a masthead.

---

## Act I — The Reckoning (security)

**`issue-002-reckoning-core.jpg`** (opener, 3:4)
> Four separate glowing terminal windows hover in a dark void, each showing a different fractured security perimeter in a different shade of violet and amber, connected by thin glowing threads that converge toward a single point in the center. The convergence point pulses brighter than the rest, implying a pattern only visible once all four are seen together. Full-bleed, deep ink-black background.

**`issue-002-sandbox-escape.jpg`** (3:4 — "one message got a researcher out of Cowork's sandbox")
> A single glowing line of text hovers inside a translucent violet-walled container, and one visible crack radiates outward from it through the container wall into the darker machine architecture beyond, where a much larger silhouette of a host computer's internals is faintly visible. The contained space is small and precise; what's beyond the crack is vast. Cinematic, high-tech, volumetric light.

**`issue-002-huggingface-breach.jpg`** (3:4 — the autonomous Hugging Face chain)
> A glowing autonomous agent-node, rendered as a bright angular light-form, extends a single thin cable of light through a chain of three darker server nodes in sequence, each one lighting up briefly as the connection passes through toward a large central repository structure glowing amber at the back of the frame. No human hand or figure is present. Volumetric violet haze, cinematic depth.

**`issue-002-forensic-timeline.jpg`** (3:4 — the 5-day, 17,600-action chain)
> A long horizontal ribbon of glowing data points stretches across a dark frame like a forensic timeline, thousands of small violet marks densely packed, with five larger amber waypoints spaced unevenly along its length marking distinct stages. The ribbon narrows to a single bright point at its rightmost end. Cinematic, high-tech, no text or labels rendered.

**`issue-002-anthropic-breach.jpg`** (3:4 — Anthropic's own models breached 3 companies)
> Three glowing humanoid-scale light-constructs stand in a dark evaluation chamber, each one facing a different fractured target structure in the middle distance; two of the target structures show total structural collapse in amber light, the third is intact and ringed with a stabilizing violet shield. Full-bleed, dramatic rim light, ink-black atmosphere.

**`issue-002-safety-index.jpg`** (3:4 — nine labs graded themselves, the bar moved)
> Nine separate glowing scorecards float in a loose grid in a dark void, each rendered as an abstract violet panel with a bright amber threshold-line running across it at a different height; behind the grid, a single larger threshold-line is visibly drawn lower than most of the individual panels, implying the bar moved. No readable text or numerals on the panels.

## Act II — The Squeeze (memory/compute)

**`issue-002-memory-core.jpg`** (opener, 3:4)
> A single glowing memory-chip die, rendered at massive scale, sits at the center of a dark industrial void with visible stress-fracture lines of amber light running through its stacked layers; thin violet conduits run outward from it in every direction toward unseen machinery at the frame's edges, as if the entire structure depends on this one component. Full-bleed, cinematic, volumetric light.

**`issue-002-asml-lithography.jpg`** (3:4 — the one company TSMC can't replace)
> A colossal lithography machine, rendered as sleek high-tech sculpture, dominates a vast clean-room hall bathed in violet light, a single intense beam of focused amber light projecting from its core down onto a silicon wafer below. The machine reads as singular and irreplaceable, dwarfing the human-scale walkways around its base. Cinematic, photoreal, dramatic rim light.

**`issue-002-cxmt-samsung.jpg`** (3:4 — one IPO, one profit, one loss, same spike)
> Two glowing memory-fabrication towers stand side by side in a dark industrial skyline, one radiating steady confident violet light from base to top, the other flickering unevenly with visible amber warning light concentrated only in its lower half, its upper floors dim and incomplete. Cinematic wide shot, photoreal.

**`issue-002-amazon-apple-margin.jpg`** (3:4 — the same spike hits capex and margin from opposite sides)
> Two enormous glowing scale-pans hang from a single fulcrum in a dark void, one pan loaded with stacked server racks glowing violet, the other loaded with sleek consumer-device silhouettes glowing amber; both pans sag downward under equal, visible strain from a single glowing weight suspended above the fulcrum. Cinematic, symbolic, photoreal materials.

**`issue-002-circular-deals.jpg`** ($750B in nine days, same company on every side)
> A closed triangular loop of glowing light-conduits connects three identical glowing nodes arranged in a circle in a dark void, the light pulsing continuously around the loop with no external input or output visible. The nodes are abstract architectural forms, not logos or figures. Cinematic, volumetric violet and amber light, high production value.

**`issue-002-moonshot-funding.jpg`** (closed at $35B, pitching $50B)
> A single glowing tower of light rises rapidly through a dark void, its base wide and stable in violet light, its upper section still under visible construction with scaffolding-like light-lattices extending above the completed portion into darkness, reaching for a ceiling that isn't there yet. Cinematic, dramatic upward angle, photoreal.

**`issue-002-centerfold.jpg`** — **3:2**, near the geometric middle of the issue
Kicker "THE MEMORY CHAIN" / title "From Wafer to Warehouse" — continuous left→right progression:
> A single continuous industrial scene reading left to right: on the far left, a massive lithography machine bathed in violet light projects a beam onto raw silicon; moving right, the silicon becomes a glowing stacked memory die mid-frame, wires of light feeding rightward; on the far right, the light-conduits terminate in a vast dimly-lit data hall of server racks stretching into the distance, glowing amber where the memory dies are installed. Cinematic, photoreal, volumetric light, continuous single take with no seams or panel divisions. One single continuous asymmetric cinematic scene, clearly NOT symmetrical, NOT mirrored, no repeated or duplicated halves.

## Act III — The Ledger (jobs/robots)

**`issue-002-labor-core.jpg`** (opener, 3:4)
> A dark office floor stretches into the distance, rows of empty desks glowing faintly violet, while at the far end a small cluster of desks glows brighter amber and remains occupied by abstract humanoid light-figures working alongside a single sleek robotic arm. The transition from empty to occupied is gradual, not a hard line. Full-bleed, cinematic, photoreal.

**`issue-002-layoffs-data.jpg`** (168,000 layoffs, two counts, two stories)
> Two overlapping translucent data-graphs float in a dark void, rendered as glowing violet and amber ribbons rising and falling at different rates across the same timeline, crossing each other twice without ever fully aligning. No readable numerals or labels. Cinematic, abstract data-poetry, high-tech.

**`issue-002-labor-tracker.jpg`** (27% faster hiring, 31% senior vs 6% junior)
> A vertical stack of three glowing bar-forms rises from a dark floor, the tallest reaching furthest into violet light at the top, a much shorter bar beside it barely glowing at its base in dim amber, illustrating a steep imbalance. An abstract dashboard-like instrument panel glows faintly in the background, out of focus. Cinematic, photoreal data visualization.

**`issue-002-robot-hand.jpg`** (1X's Neo hand — better hands, software's the bottleneck)
> An extreme close-up of a sleek robotic hand, individual articulated fingers lit with fine violet rim light, gripping a small glowing object with visible precision; behind it, slightly out of focus, a translucent holographic readout of joint articulation flickers unstably, implying the mechanics are ready but the control software is still catching up. Cinematic, photoreal, dramatic macro lighting.

## Act IV — What August Looks Like

**`issue-002-august-core.jpg`** (opener, 3:4)
> A dark horizon line separates a calm violet sky above from a restructuring industrial landscape below, where several glowing structural beams are visibly being repositioned mid-motion by unseen forces, light-trails showing their movement from old positions to new ones. Full-bleed, cinematic, forward-looking, photoreal.

**`issue-002-deepmind-reshuffle.jpg`** (Hassabis steps back, Dean walks out to a Google-funded startup)
> Three glowing humanoid light-figures stand at a fork in a dark corridor lit in violet, one stepping backward into a dimmer side-passage, one walking through a doorway that opens onto an entirely separate small glowing structure in the distance, and one stepping forward into the main corridor's brightest light. Cinematic, symbolic, photoreal, dramatic rim light.

**`issue-002-copilot-superapp.jpg`** (Copilot family + Cowork under one login)
> Four separate glowing app-icon-like light-panels, each a different shade of violet, converge and merge into a single larger amber-lit panel at the center of a dark void, their edges dissolving into the merged form rather than sitting as visible clip-art icons. Cinematic, abstract, high-tech, no readable text or logos.

**`issue-002-pricing-cliff.jpg`** (this newsroom's own model, 50% pricier Sept 1)
> A glowing violet plateau extends across the middle of a dark frame and then drops sharply into a steep amber-lit cliff edge, a single small light-form standing right at the edge looking down at the drop. The cliff face below is lit dramatically to show real depth and consequence. Cinematic, photoreal, dramatic lighting.

**`issue-002-verticalfold.jpg`** — **9:16**, at an act break
Kicker "THE RECKONING, TOP TO BOTTOM" / title "Four Labs, One Pattern" — continuous top→bottom progression:
> A single continuous vertical scene reading top to bottom: at the top, a small glowing sandbox container with one crack of amber light; descending through the middle, the crack widens into a full breached server architecture glowing violet and amber; continuing down, a row of nine glowing scorecard panels with an uneven threshold line; at the very bottom, the scene resolves into a single sleek terminal window glowing steadily, calmer than everything above it. Cinematic, photoreal, volumetric light, continuous single take with no seams or panel divisions. One single continuous asymmetric cinematic scene, clearly NOT symmetrical, NOT mirrored, no repeated or duplicated halves.

---

After generating: eyeball every image (per §5), regenerate anything that drifts toward vintage/fantasy
or, for the two folds, anything that reads as mirrored/symmetrical. Then run the §6 audit before
the founder review pass.
