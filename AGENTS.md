# Reify Agent Instructions

## Scope

This file is the repo-local operating policy for agents working in
`SylphxAI/reify`. Organization-wide engineering doctrine is owned by
`SylphxAI/doctrine`; `PROJECT.md` and `.doctrine/project.json` own this
repository's local identity, lifecycle, boundary, and delivery facts.

Reify is a TypeScript package monorepo for representing operations as first-class
data and executing them through pluggable adapters.

## Read First

1. `PROJECT.md` and `.doctrine/project.json` for project goals, boundaries,
   delivery proof, package-release facts, and adoption gaps.
2. `README.md` for the operation-as-data model and public examples.
3. `packages/*/README.md` and package-level `package.json` files before changing
   public APIs, adapters, or exports.
4. `.github/workflows/ci.yml` and `.github/workflows/release.yml` before
   changing validation, admission, or package release behavior.

## Non-Negotiables

- Keep operation data portable and environment-agnostic. Adapter-specific
  behavior belongs in adapter packages, not the core operation model.
- Do not introduce product-specific persistence, auth, tenancy, billing, or
  workflow assumptions into core Reify packages.
- Do not publish package changes without CI/admission proof, release workflow
  evidence, and npm registry readback.
- Preserve serializable operation contracts and adapter boundaries.

## Validation

Use the narrowest meaningful validation first, then broaden as needed:

- `bun run lint`
- `bun run typecheck`
- `bun test`
- `bun run build`

Docs-only boundary changes may be validated by diff review, referenced-file
checks, and the central project manifest audit.
