# Architecture

TimeGrid is layered as **domain → infrastructure → application → UI**, with
schemas pinned at every boundary.

```
        ┌──────────────────────────────────────────────┐
        │  ui/features/                                │
        │  React components. Zero business logic.      │
        └──────────────────────────────────────────────┘
                              ▲
                              │ hooks, stores, queries
        ┌──────────────────────────────────────────────┐
        │  application/                                │
        │  Zustand stores, sync engine, app hooks.     │
        │  Orchestrates infra and surfaces state.      │
        └──────────────────────────────────────────────┘
                              ▲
                              │ typed clients, repos
        ┌──────────────────────────────────────────────┐
        │  infrastructure/                             │
        │  fetch helper, localStorage, Redis, logger.  │
        │  Validates with Zod at every I/O boundary.   │
        └──────────────────────────────────────────────┘
                              ▲
                              │ pure functions
        ┌──────────────────────────────────────────────┐
        │  domain/                                     │
        │  Timezone math, workspace ops, share codec.  │
        │  No React, no I/O, no hidden time.           │
        └──────────────────────────────────────────────┘

   schemas/ — Zod definitions cross-cutting all layers.
   config/  — limits, keys, palette enums.
   data/    — static datasets (cities, abbreviations, country map).
```

## Layer rules

- **`domain/`** has zero dependencies on React, browser globals, or fetch.
  Functions take inputs and return outputs (or `Result` types). Date math
  uses ISO strings. Side effects are forbidden.
- **`infrastructure/`** owns I/O. It validates every payload with Zod on the
  way in and returns typed `ApiResult` / `Result` values. Failures never
  throw to callers — they're surfaced as data.
- **`application/`** is the only place that holds **state**. Zustand stores
  validate inputs at the boundary using the same Zod schemas the API uses.
  The sync engine is the only piece that talks to `userDataClient`.
- **`ui/features/`** components are presentational. They consume the stores
  via hooks; they never call `fetch` or touch `localStorage`.

## Time and DST

We never store offsets — we compute them at the instant. `instantUtc` (ISO
8601 UTC) is canonical; wall-clock conversion goes through
`wallClockInZone()` which uses `Intl.DateTimeFormat.formatToParts`. DST
boundaries are handled by `setWallClockInZone()` which iterates twice for
stability and normalizes phantom wall-clocks (the 02:30 "spring-forward"
gap).

Property tests in `tests/unit/domain/timezone/offset.test.ts` assert that
zone offsets never move by more than ±60 minutes across one minute of UTC,
across a year of instants per representative zone.

## Persistence and migration

`localStorage` access is funnelled through `infrastructure/storage/local.ts`.
Reads validate with `StorageStateV2Schema`. Failures route to a
`tg:quarantine:<timestamp>` key for diagnostics, never bubbling to the user.

The adapter migrates legacy `world-clock-workspaces` / `world-clock-active-workspace`
keys into v2 on first read and clears them after a successful save.

## Sync

The wire format is `UserDataV2`:

```ts
{ v: 2, workspaces, activeWorkspaceId, revision: number, updatedAt, userId }
```

Optimistic concurrency: each POST sends `expectedRevision`; mismatch returns
409 with the server payload. The client engine emits a typed `conflict`
event. Retries use exponential backoff capped at 5 attempts. The Redis key
is `tg:user:<userId>:v2`; the legacy `user:<userId>` key is migrated on read
for one release, then sunset.

## Testing

- **Property-based**: `fast-check` for offset math and share codec round-trips.
- **MSW** for API client tests with deliberate failure injection (timeout,
  abort, malformed JSON, 4xx/5xx).
- **`ioredis-mock`** for the Redis repo with revision-conflict scenarios.
- **`axe-playwright`** for accessibility on every E2E scenario.
- **Spec-coverage check** (`scripts/check-specs.mjs`): every Gherkin spec
  must have at least 30% negative scenarios.

## What was removed in the refactor

- `lib/timezone-utils.ts` (759 LOC) → split into `src/domain/timezone/{iana,offset,format,abbreviation}.ts` and `src/data/{abbreviations,popular-cities,timezone-country}.ts`
- `lib/workspace-utils.ts` (157 LOC) → `src/domain/workspace/operations.ts` (Result-typed)
- `app/page.tsx` (798 LOC) → 200 LOC of pure composition
- `components/add-timezone-dialog.tsx` (489 LOC) → 250 LOC, store-aware, with abort + Zod
- `components/manage-workspaces-dialog.tsx` (362 LOC) → 270 LOC, type-safe icons (no `as any`)
- `hooks/use-workspaces.ts`, `use-auth-sync.ts`, `use-url-state.ts` → replaced by Zustand stores + thin hooks
- 28 `console.log` calls → `infrastructure/logger`
- 4 unused shadcn primitives (carousel, chart, drawer, input-otp, etc.)
- `Math.random()`-based ids → `crypto.randomUUID()`
- `(LucideIcons as any)[name]` → typed icon registry
