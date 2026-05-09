# 02 — Timezone grid

## Purpose

A workspace contains a primary **reference timezone** and an ordered list of
secondary timezones. The grid shows each as a card with the local time at the
selected instant.

## Domain model

```
TimezoneData {
  id: string (UUID v4)
  city: string (1..80 chars)
  country: string (1..80 chars)
  timezone: IANA zone (e.g. "Asia/Kolkata")
  offsetMinutes: number (computed; -780..+840)
  kind: "city" | "abbreviation"
  abbreviation?: string (only when kind === "abbreviation")
  region?: string  (only when kind === "abbreviation")
}
```

## Invariants

- I1. `timezone` is a valid IANA zone (validated against `Intl.supportedValuesOf("timeZone")` when available, with a curated fallback list).
- I2. No duplicate within a workspace, where duplicate means same `(city, country)` case-insensitive **AND** same `kind`.
- I3. The reference timezone is not present in the secondary list.
- I4. Max 50 secondary timezones per workspace; attempts beyond rejected.
- I5. Reordering is pure: it never mutates input arrays.
- I6. `offsetMinutes` is computed from the current instant (or the time-travel instant) — never stored as the source of truth.

## Acceptance scenarios

### Happy path

```gherkin
Scenario: Add a city to the active workspace
  Given an active workspace with no timezones
  When the user adds "Tokyo, Japan, Asia/Tokyo"
  Then the workspace has exactly one timezone "Tokyo"
  And the grid shows the current Tokyo time

Scenario: Remove a timezone
  Given a workspace with "Tokyo" and "London"
  When the user removes "London"
  Then only "Tokyo" remains

Scenario: Reorder timezones via drag
  Given a workspace with ["A", "B", "C"]
  When the user drags "C" to index 0
  Then the workspace order is ["C", "A", "B"]
  And the change is persisted

Scenario: Promote a secondary zone to reference
  Given a workspace with reference "London" and secondary ["Tokyo"]
  When the user sets "Tokyo" as the reference
  Then reference is "Tokyo"
  And secondary list is ["London"] (the previous reference moved in)

Scenario: Add a timezone abbreviation (e.g. PST)
  Given an active workspace
  When the user adds the abbreviation "PST"
  Then a card with city "PST" and kind "abbreviation" is added
  And the card is visually distinguished (orange accent in UI)
```

### Edge cases

```gherkin
Scenario: Adding a duplicate city is rejected silently
  Given a workspace with "Tokyo, Japan"
  When the user attempts to add "Tokyo, Japan" again
  Then the workspace still has exactly one Tokyo card
  And no error is shown but the dialog reports "already added"

Scenario: Two cities in the same IANA zone may coexist
  Given a workspace with "Mumbai, India, Asia/Kolkata"
  When the user adds "Chennai, India, Asia/Kolkata"
  Then both exist as separate cards

Scenario: Adding the same city as the reference is rejected
  Given a workspace with reference "Tokyo, Japan"
  When the user tries to add "Tokyo, Japan" to the secondary list
  Then it is rejected
  Exception: if the reference id is "local" (auto-detected), the add succeeds
    and replaces the auto-detected reference

Scenario: Adding a 51st timezone is rejected
  Given a workspace with 50 secondary timezones
  When the user attempts to add another
  Then the operation is rejected with reason "max timezones reached"
  And the dialog displays the limit

Scenario: Promote a city already equal to reference is a no-op
  Given a workspace with reference "Tokyo"
  When the user tries to promote a "Tokyo" card (same id)
  Then no state change occurs

Scenario: Invalid IANA zone is rejected at the boundary
  Given an attempt to add "Mars/Olympus_Mons"
  Then the operation is rejected with reason "invalid timezone"

Scenario: Empty city or country is rejected
  Given an attempt to add { city: "", country: "USA", timezone: "America/New_York" }
  Then the operation is rejected

Scenario: Reorder where source equals target is a no-op
  Given a workspace with ["A","B","C"]
  When reorder(from: 1, to: 1) is called
  Then the order is unchanged

Scenario: Reorder with out-of-bounds index is rejected
  When reorder(from: 5, to: 0) on a list of length 3
  Then the operation is rejected and order is unchanged
```

### Performance

```gherkin
Scenario: Workspace with 50 timezones renders under 200ms
  Given a workspace with the maximum 50 timezones
  When the page is rendered
  Then time-to-interactive is under 200ms on a 4x CPU throttle
```
