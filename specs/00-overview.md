# TimeGrid Specifications

This directory holds the canonical behavioral contract for TimeGrid. Every test
in `tests/` traces back to a **scenario** here. Scenarios use Gherkin form
(`Given / When / Then`) so that test names map directly.

## Spec → test traceability

- `specs/01-workspace-management.md` → `tests/unit/domain/workspace/**` and `tests/e2e/workspace.spec.ts`
- `specs/02-timezone-grid.md` → `tests/unit/domain/timezone/**`, `tests/integration/stores/timezone.spec.ts`, `tests/e2e/grid.spec.ts`
- `specs/03-time-travel.md` → `tests/unit/domain/time-state/**`, `tests/e2e/time-travel.spec.ts`
- `specs/04-city-search.md` → `tests/integration/api-clients/cities.spec.ts`, `tests/e2e/add-timezone.spec.ts`
- `specs/05-ip-timezone-detection.md` → `tests/integration/api-clients/ip-timezone.spec.ts`
- `specs/06-url-sharing.md` → `tests/unit/domain/sharing/**`, `tests/e2e/share.spec.ts`
- `specs/07-auth-and-sync.md` → `tests/integration/sync/**`, `tests/e2e/sync.spec.ts`
- `specs/08-persistence-and-migration.md` → `tests/integration/storage/**`
- `specs/09-accessibility.md` → `tests/e2e/a11y.spec.ts`
- `specs/10-theming-and-responsive.md` → `tests/e2e/responsive.spec.ts`

## Conventions

Each scenario is required to have **at least one negative pair** — for every
happy-path scenario, there is an explicit failure or edge-case scenario.

The test runner can verify this with `npm run specs:check`.

## Cross-cutting invariants

- **Workspace count ≥ 1**: there is always at least one workspace.
- **Active workspace exists**: `activeWorkspaceId` always references a
  workspace in `workspaces[]`.
- **No duplicate timezones in a workspace** (case-insensitive on `city + country`).
- **Reference timezone is never present in the secondary list** of the same
  workspace.
- **All persisted data validates** against its Zod schema; corrupt data is
  reset, never crashed on.
- **Times are stored as UTC ISO 8601 strings** in storage and over the wire;
  `Date` objects exist only at the edges (UI render, domain math).
- **No PII** beyond what Kinde returns is persisted client-side.
