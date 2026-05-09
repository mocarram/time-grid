# 01 — Workspace management

## Purpose

A workspace groups a set of timezones with a label, color, icon, and an
optional reference timezone. A user can have many workspaces and switch
between them.

## Domain model

```
Workspace {
  id: string (UUID v4)
  name: string (1..60 chars, trimmed, may not be empty)
  description: string | undefined (0..280 chars)
  color: WorkspaceColor (one of 8 enum values)
  icon: WorkspaceIcon (one of fixed registry of Lucide names)
  timezones: TimezoneData[] (max 50)
  referenceTimezone: TimezoneData | undefined
  createdAt: ISO timestamp
  updatedAt: ISO timestamp
}
```

## Invariants

- I1. `workspaces.length >= 1` at all times. Deleting the last workspace is
  rejected; the UI hides the delete button when only one remains.
- I2. `activeWorkspaceId` is always the id of an existing workspace. If the
  active workspace is deleted, the first remaining workspace becomes active.
- I3. `id` is a UUID v4. Never `Date.now() + Math.random()`.
- I4. `name` is trimmed; whitespace-only names are rejected at the boundary.
- I5. `color` and `icon` are typed enums (no string casts).
- I6. `updatedAt` is set whenever any field of the workspace changes.
- I7. The default workspace is created exactly once if storage is empty.
- I8. The reference timezone is **not** also present in `timezones[]`.

## Acceptance scenarios

### Happy path

```gherkin
Scenario: First load creates a default workspace
  Given an empty localStorage
  When the app loads
  Then exactly one workspace exists
  And it is named "Personal"
  And it has color "blue" and icon "User"
  And it is the active workspace

Scenario: Create a new workspace
  Given a user with one workspace
  When they create a workspace named "Travel" with icon "Plane" and color "orange"
  Then a second workspace exists with those properties
  And the new workspace is automatically active
  And its updatedAt equals its createdAt

Scenario: Rename a workspace
  Given a workspace named "Personal"
  When the user renames it to "Home"
  Then the workspace name is "Home"
  And updatedAt is more recent than createdAt

Scenario: Switch active workspace
  Given two workspaces "A" and "B" with "A" active
  When the user selects "B"
  Then "B" is active
  And the timezone grid renders B's timezones
```

### Edge cases (must all pass)

```gherkin
Scenario: Deleting the active workspace falls back to the first remaining
  Given workspaces "A", "B", "C" with "B" active
  When "B" is deleted
  Then active workspace is "A"

Scenario: Deleting the last workspace is forbidden
  Given exactly one workspace
  When delete is attempted
  Then the operation is rejected
  And the workspace still exists

Scenario: Empty / whitespace name rejected
  Given a create-workspace request with name "   "
  Then the operation is rejected with reason "name required"

Scenario: Name longer than 60 chars rejected
  Given a name of 61 characters
  Then the operation is rejected with reason "name too long"

Scenario: Description longer than 280 chars rejected
  Given a description of 281 characters
  Then the operation is rejected with reason "description too long"

Scenario: Unknown color value rejected
  Given a color value "neon-pink" not in the palette
  Then the operation is rejected with reason "invalid color"

Scenario: Unknown icon value rejected
  Given an icon name "NotALucideIcon"
  Then the operation is rejected with reason "invalid icon"

Scenario: XSS / hostile name is stored verbatim and rendered safely
  Given a name of "<script>alert(1)</script>"
  Then the workspace is created with that exact name
  And the name is rendered as text, never executed

Scenario: Non-Latin name accepted
  Given a name "東京チーム"
  Then the workspace is created with that exact name

Scenario: Two workspaces may have the same name (names are not unique)
  Given a workspace named "Work"
  When another "Work" is created
  Then both exist with distinct ids
```

### Concurrency

```gherkin
Scenario: Rapid renames coalesce to last value
  Given a workspace "A"
  When the name is updated to "B" and then "C" within 50ms
  Then the name is "C"
  And updatedAt reflects the second update

Scenario: Two-tab edit with localStorage event
  Given two browser tabs open on the same user
  When tab 1 renames the workspace
  Then tab 2 reflects the rename within one storage event tick
```

### Persistence

```gherkin
Scenario: Workspaces survive a reload
  Given a workspace "Travel" was created
  When the page reloads
  Then "Travel" still exists with all properties

Scenario: Corrupt workspace JSON resets to defaults
  Given localStorage contains "{ broken json"
  When the app loads
  Then exactly one default workspace exists
  And no error is thrown to the user
```
