# ADR 0001: Add GroundAtlas Project-Control Gate

## Status

Accepted

## Context

Reify is a public production foundation package family for operation-as-data contracts and adapter execution. It already had ADR-29 admission, CI, and shared release workflow coverage, but it did not expose a vendor-neutral project manifest and did not dogfood the released GroundAtlas package/action.

The project-control surface must not make `.doctrine/project.json` a public default and must not make generated `.groundatlas*` reports authoritative. This change must not alter Reify's operation data semantics, adapter behavior, package APIs, or downstream workflow responsibilities.

## Decision

Add:

- a vendor-neutral `project.manifest.json`;
- CI steps that run `bun run validate`, project-control tests, and `SylphxAI/groundatlas@v0.1.2` with `groundatlas@0.1.2`;
- assertions that GroundAtlas selects `project.manifest.json`, reports `.doctrine/project.json` only as an adapter, and has zero strict fleet warnings/blockers;
- a small Node project-control boundary test;
- docs/spec/ADR/PROJECT/AGENTS updates that clarify GroundAtlas as evidence/navigation, not SSOT.

## Consequences

- Pull requests and merge groups now get existing ADR-29 admission plus GroundAtlas package/action dogfooding.
- `.doctrine/project.json` remains the Sylphx Doctrine adapter and local governance catalog.
- Release proof remains a successful Release workflow plus npm registry readback for changed packages.
- Generated `.groundatlas*` reports remain evidence/navigation only.
