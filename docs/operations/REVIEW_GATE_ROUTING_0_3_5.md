# Review Gate & Editorial Routing Repair 0.3.5

## Purpose

This update repairs the first real Batch News Engine acceptance run without weakening the deterministic publication boundary.

## Changes

- Adds one evidence-preserving shared repair pass when editorial or verification review finds a fixable problem.
- Reconciles verification rows to the canonical claim map and governed source URLs.
- Prevents stale free-text reviewer warnings from blocking a fully supported final claim map.
- Separates owner-review-only restrictions from substantive compliance failures.
- Keeps R3 and genuine safety/evidence defects fail-closed.
- Assigns the canonical editor persona from the story section instead of accepting arbitrary model routing.
- Prefers routine R1/non-blocked-section candidates when the scan has more qualified stories than available slots.
- Uses no additional web searches during repair; the same cached evidence is reused.

## Publication boundary

The update does not enable scheduling, automatic publication, or social posting. The installed operating mode and budgets are preserved. In `draft_only`, clean stories advance to exact-version owner review; blocked stories remain blocked.

## Cost behavior

A repair is a single shared model call for all fixable stories in the lane. It runs only when the initial review identifies a concrete editorial or verification defect. No source is refetched and no web-search tool call is added.
