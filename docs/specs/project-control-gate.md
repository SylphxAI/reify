# Project-Control Gate Spec

## Goal

Validate Reify's project-control and GroundAtlas adoption surfaces without changing operation data semantics, adapter behavior, package APIs, or downstream workflow responsibilities.

## Scope

The gate validates repository control-plane facts only:

- neutral identity and truth homes live in `project.manifest.json`;
- Sylphx-specific governance facts remain in `.doctrine/project.json`;
- generated `.groundatlas*` outputs are evidence/navigation only;
- package validation remains `bun run validate`, matching the current lint, typecheck, test, and build CI baseline;
- package release proof remains ADR-29 admission, Release workflow evidence, and npm registry/readback when versions change.

It does not own downstream applications' domain models, database schemas, auth policies, workflows, deployment, commercial logic, or shared organization rulesets.

## CI Contract

`.github/workflows/ci.yml` must preserve ADR-29 admission jobs and the `ci` job must:

1. install dependencies with `bun install --frozen-lockfile`;
2. run `bun run validate`;
3. run `node --test test/project-control.node-test.mjs`;
4. run `SylphxAI/groundatlas@v0.1.3` with `package-spec: groundatlas@0.1.3`, `require-atlas: "true"`, and `strict: "true"`;
5. assert that GroundAtlas selects `project.manifest.json` and treats `.doctrine/project.json` only as an adapter;
6. assert that the human-readable Markdown scorecard reports one adopted project with zero warnings and zero blockers;
7. upload the manifest JSON, fleet JSON, and fleet Markdown reports as `groundatlas-package-dogfood`.

## Acceptance

- `bun run validate` passes.
- `node --test test/project-control.node-test.mjs` passes.
- `ga audit` passes after `ga update`.
- `ga manifest --json` selects `project.manifest.json`.
- `ga fleet --require-atlas --strict --json` reports one adopted project with zero warnings and zero blockers.
- `ga fleet --require-atlas --strict` renders a Markdown scorecard with the same adopted summary.
- The release workflow keeps `id-token: write` and delegates to `SylphxAI/.github/.github/workflows/release.yml@main`.
