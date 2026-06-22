# Reify Project

Reify turns operations into first-class data. It owns the core operation model,
builder APIs, execution contract, adapters, package exports, examples, and
release path for the `@sylphx/reify` package family.

## Lifecycle

- Lifecycle: `production`
- Layer: `foundation`
- Doctrine source of truth: [SylphxAI/doctrine](https://github.com/SylphxAI/doctrine)
- Machine manifest: `.doctrine/project.json`

## Goals

- Make operations inspectable, serializable, storable, transmittable,
  transformable, replayable, and executable across environments.
- Keep core operation data independent from adapter-specific execution details.
- Own package boundaries, public exports, adapter contracts, examples, and
  release proof for the Reify package family.

## Non-Goals

- Do not own downstream applications' domain models, database schemas, auth
  policies, workflows, deployment, or commercial logic.
- Do not hide adapter-specific behavior inside the core operation model.
- Do not publish package changes without CI/admission proof, release workflow
  evidence, and npm registry readback.

## Boundaries

Reify owns the operation-as-data model, builder APIs, execution pipeline, plugin
contract, adapters, package exports, and examples. It does not own downstream
business workflows, application persistence semantics, or product-specific
runtime policy.

## Delivery

Pull requests and merge groups run `.github/workflows/ci.yml`, including ADR-29
classification and fan-in contexts. Main pushes run `.github/workflows/release.yml`
to create or publish release changes through the `@sylphx/bump` workflow.
Published package changes are forward-fix only and require npm registry readback.
