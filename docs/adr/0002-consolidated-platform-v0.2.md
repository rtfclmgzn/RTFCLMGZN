# ADR-0002: Consolidated local platform v0.2

**Status:** Accepted  
**Date:** 2026-07-13

## Decision

The architecture documents, 26-agent registry, Newsroom Core, Newsroom Studio, and Editorial Release Manager are distributed and upgraded as one versioned platform package.

Editorial releases remain separate checksum-sealed packages. The platform installer contains no article release and cannot publish editorial content.

## Rationale

Separate overlapping installers created uncertainty about which components were installed and whether one package depended on another. A single idempotent installer gives the platform one version, one backup boundary, one validation suite, one Git commit, and one rollback path.

## Authority

- Deterministic code owns lifecycle state.
- Agents produce versioned artifacts and recommendations.
- The owner approves an exact artifact version.
- The Release Manager performs publication only after explicit owner confirmation.
- Provider credentials remain outside Git and browser code.

## Consequences

Future platform upgrades increment the consolidated platform version. Story and magazine releases continue to use independent release IDs and approval records.
