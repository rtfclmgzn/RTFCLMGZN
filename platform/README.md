# RTFCLMGZN Platform v0.3.3

This directory contains the machine-readable platform contract.

Version 0.3.3 repairs Story Viewer selection, adds visible loading and retry states, and guarantees strict JSON-safe API responses while preserving the Batch News Engine and all publishing safeguards.

Version 0.3.2 adds the cost-optimized Batch News Engine to the verified v0.3 foundation. A single shared scan can select zero to three qualified stories, source pages are fetched and cached once with a direct-fetch maturity gate, brief and synthesis stories are composed and independently reviewed in shared lane-level model calls, and deterministic distribution drafts add no model cost.

The intended cadence is one scan every four hours, with zero to three stories per scan and a hard maximum of twelve per UTC day. The planner is brief-dominant, permits synthesis selectively, and schedules no more than two research stories per week. It remains fail-closed: no filler is forced, model outputs cannot publish directly, and the package ships with scheduling and automatic publication disabled.

Credentials remain outside Git in the Windows DPAPI vault or environment variables. No editorial release is included.
