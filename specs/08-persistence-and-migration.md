# 08 — Persistence and migration

## Purpose

Local data lives in `localStorage`. Every read validates with Zod, every
write versioned. Schema migrations are explicit, sequenced, and tested.

## Storage layout

```
tg:state:v2 → JSON blob:
  {
    v: 2,
    workspaces: Workspace[],
    activeWorkspaceId: string | null,
    updatedAt: ISO timestamp,
    deviceId: UUID
  }
```

Legacy keys to migrate from:
- `world-clock-workspaces` → workspaces
- `world-clock-active-workspace` → activeWorkspaceId

## Invariants

- I1. Reads always go through the typed adapter; raw `localStorage.getItem`
  is forbidden in application code.
- I2. Validation failure → adapter returns `null` and quarantines the bad
  value under `tg:quarantine:<timestamp>` for diagnostics, never crashes.
- I3. Migrations are pure, reversible-where-possible, and idempotent. Running
  a migration twice is a no-op.
- I4. The adapter handles `QuotaExceededError`, `SecurityError`, and absent
  `localStorage` (SSR / private mode) gracefully — UI degrades to
  in-memory-only.
- I5. Every write adopts a revision (monotonic per session); clients reading
  multi-tab updates use the storage event to reconcile.

## Acceptance scenarios

### Read

```gherkin
Scenario: Empty storage → defaults
  Given the storage is empty
  When the adapter loads
  Then it returns a default state with one "Personal" workspace
  And nothing is written until the first explicit save

Scenario: Valid v2 blob loads as-is
Scenario: v1 legacy keys migrate to v2 on first read
  Given the legacy keys hold valid data
  When the adapter loads
  Then the v2 key is populated
  And the legacy keys are kept until next successful save (then removed)

Scenario: Corrupt JSON quarantines and resets
  Given tg:state:v2 contains "{ broken"
  When the adapter loads
  Then the bad value moves to tg:quarantine:<timestamp>
  And the adapter returns the default state

Scenario: Schema-mismatched JSON quarantines and resets
  Given a v2 blob missing the workspaces array
  Then it is quarantined and defaults are returned

Scenario: Tampered icon name quarantines workspace, not the whole state
  Given a workspace with icon: "<script>"
  Then that workspace is dropped (not the whole state)
  And other valid workspaces are preserved
```

### Write

```gherkin
Scenario: Save to storage round-trips
  Given a state S
  When saved and then loaded
  Then the loaded state equals S (modulo updatedAt)

Scenario: QuotaExceededError → warn and continue
  Given setItem throws QuotaExceededError
  Then a toast warns "couldn't save locally"
  And the in-memory state is preserved

Scenario: SSR / no localStorage
  Given window.localStorage is undefined
  Then reads return defaults and writes are no-ops
  And no error is thrown

Scenario: Private/incognito with denied storage
  Given setItem throws SecurityError
  Then writes are no-ops
  And reads are in-memory only

Scenario: Multi-tab update
  Given two tabs open
  When tab 1 writes the state
  Then tab 2 receives a storage event
  And merges by latest updatedAt
```
