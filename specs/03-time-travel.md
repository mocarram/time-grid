# 03 — Time travel & DST math

## Purpose

The reference timezone shows a time the user can scrub. All secondary cards
show the equivalent instant in their own zones. When unmodified, the grid
ticks forward with wall-clock time aligned to minute boundaries.

## Domain model

```
TimeState {
  instantUtc: string (ISO 8601, UTC)        // canonical instant
  isModified: boolean                        // user has scrubbed
}
```

`Date` objects exist only at the edges. All math operates on `instantUtc`.

## Invariants

- I1. The same UTC instant in two zones differs only by their offset at that instant.
- I2. `convertInstantToZonedWallClock(instant, zone)` is a pure function with no
  hidden dependency on the running clock.
- I3. When `isModified === false`, the grid ticks at the start of each
  wall-clock minute (≤ ±50ms drift acceptable).
- I4. When `isModified === true`, no automatic tick happens.
- I5. Switching workspaces resets `isModified` to `false`.
- I6. Setting a new reference timezone keeps the **same UTC instant** and
  re-renders the grid.
- I7. `selectedTime` is exposed for UI as a `Date` derived from `instantUtc`,
  never the other way round.

## Acceptance scenarios

### Happy path

```gherkin
Scenario: Live tick aligned to minute boundary
  Given the reference is "Asia/Kolkata"
  And isModified is false
  When the wall clock advances to the next minute
  Then the displayed time advances by exactly one minute
  And the tick fires within ±50ms of the boundary

Scenario: Scrub the time slider
  Given the reference is "America/New_York"
  When the user moves the slider to 14:30
  Then all cards show the equivalent local time
  And isModified is true
  And the auto-tick is paused

Scenario: Reset to current time
  Given isModified is true
  When the user clicks "Reset to current time"
  Then isModified becomes false
  And the grid displays the current instant
```

### DST and exotic zones

```gherkin
Scenario Outline: Spring-forward gap (clocks skip from 2:00 → 3:00)
  Given the reference is "<zone>" with DST start on "<date>"
  When selectedTime is set to a wall-clock time that does not exist (2:30 local)
  Then it resolves to 3:30 local (the next valid instant) — it never appears as 2:30

  Examples:
    | zone               | date           |
    | America/New_York   | 2025-03-09     |
    | Europe/London      | 2025-03-30     |
    | Australia/Sydney   | 2025-10-05     |

Scenario Outline: Fall-back ambiguity (1:00–2:00 occurs twice)
  Given the reference is "<zone>" with DST end on "<date>"
  When selectedTime corresponds to an ambiguous local time
  Then the canonical resolution is the earlier of the two instants (rule: "earlier wins")
  And the next-day card never differs by more than +1 day

  Examples:
    | zone               | date           |
    | America/New_York   | 2025-11-02     |

Scenario: Half-hour offset zone (Asia/Kolkata, +5:30)
  Given UTC instant 12:00:00Z
  Then the wall clock in Asia/Kolkata is 17:30

Scenario: 45-minute offset zone (Asia/Kathmandu, +5:45)
  Given UTC instant 00:00:00Z
  Then the wall clock in Asia/Kathmandu is 05:45

Scenario: Chatham Islands (+12:45/+13:45)
  Given UTC instant on 2025-04-06 11:00:00Z
  Then the wall clock in Pacific/Chatham is computed without rounding errors

Scenario: Polar zone (Antarctica/Troll)
  Given the reference is "Antarctica/Troll"
  Then offsets are computed using IANA rules without crash
```

### Cross-day boundaries

```gherkin
Scenario: Time travel that crosses midnight in the destination zone
  Given the reference is "Asia/Tokyo" and the secondary is "America/Los_Angeles"
  When the user sets the reference time to 09:00 local
  Then the LA card displays the previous calendar day
  And the date label updates

Scenario: Year boundary
  When the reference is set to 2025-01-01 02:00 in "Pacific/Auckland"
  Then a US card shows 2024-12-31
```

### Concurrency / integrity

```gherkin
Scenario: Promoting a zone to reference preserves the instant
  Given reference "London", secondary "Tokyo"
  And selectedTime in London is 09:00 GMT
  When "Tokyo" is promoted to reference
  Then Tokyo card shows 18:00 (or 17:00 during BST)
  And isModified flag is preserved

Scenario: Tick suspended while user is scrubbing
  Given user is dragging the slider
  Then no auto-tick fires while the pointer is held
```

### Property-based (must be implemented as fast-check)

- For every IANA zone supported by the runtime and every minute in calendar
  year `2025`, `convertInstantToZonedWallClock(instant, zone)` round-trips:
  the result, when re-converted to UTC under the same zone, equals the
  original instant **except** at DST transitions where it normalizes to the
  later instant.
- For any zone Z, `formatInZone(instant, Z, "HH:mm")` differs from
  `formatInZone(instant, "UTC", "HH:mm")` by exactly the zone's offset at
  that instant.
