# 07 — Auth and cloud sync

## Purpose

Authenticated (Kinde) users can sync their workspaces to a Redis-backed
server store. Unauthenticated users get full local-only functionality.

## Endpoints (all protected by Kinde middleware)

- `GET    /api/user-data` — fetch current snapshot
- `POST   /api/user-data` — upsert with revision check
- `DELETE /api/user-data` — clear server data
- `GET    /api/user-data/check` — does the user have data?

## Wire format (v2)

```ts
UserDataV2 {
  v: 2
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  revision: number       // monotonically increasing
  updatedAt: string      // ISO
  userId: string
}
```

## Invariants

- I1. **Auto-sync** is debounced 2,000ms after the last edit (configurable
  via `SYNC_DEBOUNCE_MS`). Manual sync remains available.
- I2. **Optimistic concurrency**: a POST sends `expectedRevision`. If server
  revision differs, a 409 is returned with the server payload, and the
  client surfaces a conflict toast.
- I3. Server `revision` is a strictly increasing integer per user.
- I4. All payloads validate against `UserDataV2Schema` on read and write.
- I5. Logged-out → in: server data is **not** auto-applied; the user sees
  "server has data, load it?" if both client and server have data.
- I6. Data is stored under `tg:user:<userId>:v2`; the v1 key continues to be
  read for one release for migration.
- I7. **Offline queue**: if a sync POST fails with network error, it is
  retried with exponential backoff (1s, 2s, 4s, 8s, 16s, max 5 attempts).
- I8. Rate limit: clients send at most one POST per 2s; bursts coalesce.

## Acceptance scenarios

### Authentication

```gherkin
Scenario: Logged-out user sees no sync UI
  Given the user is not authenticated
  Then the AuthButton renders only "Sign in"

Scenario: Logging in checks server data
  Given a user with no client data and no server data
  When they log in
  Then the app makes one GET /api/user-data/check
  And no auto-load happens

Scenario: Logging in with both local and server data → prompt
  Given a user with local workspaces and server data
  When they log in
  Then the UI offers "Load from server" or "Keep local"
  And nothing changes until a choice is made

Scenario: Session expires mid-sync
  Given the user is authenticated and starts a POST
  When the server returns 401
  Then the offline queue retries after re-auth
  And no data is lost
```

### Sync

```gherkin
Scenario: Auto-sync after edit
  Given the user is authenticated and idle
  When they add a timezone
  Then exactly one POST /api/user-data is sent ~2s later
  And revision increments by exactly one on success

Scenario: Burst of edits coalesces to one POST
  Given the user is authenticated
  When 5 edits happen within 1s
  Then exactly one POST is sent 2s after the last edit

Scenario: POST 409 conflict → conflict toast
  Given the local revision is N
  And the server has advanced to N+1 (other device)
  When a POST is sent with expectedRevision=N
  Then server returns 409 with the latest snapshot
  And the toast offers "use server / keep local / merge"
  And no auto-resolution happens

Scenario: Manual save still works without auto-sync
  Given auto-sync is disabled in settings
  When the user clicks "Save to server"
  Then a POST is sent immediately
```

### Offline / network

```gherkin
Scenario: Network error queues and retries
  Given the device is offline
  When edits happen
  Then POSTs are queued
  When the device comes online
  Then the queued POSTs flush in order with exponential backoff
  And the final state matches local

Scenario: Server returns 500 → retried with backoff
  Given the server returns 500 three times
  Then the third retry delay is 4s
  And no further retry happens after 5 attempts

Scenario: Server returns malformed JSON → treated as failure
  Then the user sees "sync failed, will retry"

Scenario: Cross-tab sync fan-out
  Given two tabs of the same user
  When tab 1 syncs
  Then tab 2 receives a storage event and refreshes its in-memory copy
```

### Persistence and migration

```gherkin
Scenario: User had v1 data on server
  Given the v2 GET returns 404
  And the v1 GET returns data
  Then the v1 data is migrated, written under v2, and v1 is left untouched

Scenario: DELETE clears server only, not local
  When the user clicks "Delete cloud data"
  Then DELETE /api/user-data returns 200
  And local data is unaffected
```

### Security

```gherkin
Scenario: POST without auth → 401
Scenario: POST with body that fails schema → 400 with error code
Scenario: POST with userId that doesn't match session → 403
Scenario: GET another user's data → 401 (Kinde middleware)
Scenario: Request body > 1MB → 413
```
