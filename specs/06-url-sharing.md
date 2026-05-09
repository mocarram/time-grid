# 06 — URL sharing

## Purpose

A user can share a snapshot of their workspace + scrubbed time as a URL.
Loading the URL recreates the snapshot in a new (or current) workspace.

## URL shape (versioned, v2)

```
?v=2&payload=<base64url(JSON)>
```

`payload` decodes to:

```ts
ShareSnapshotV2 {
  v: 2
  ref: { city, country, timezone }
  zones: { city, country, timezone }[]
  instantUtc: string  // ISO 8601
  isModified: boolean
  workspace?: { name, description?, color, icon }
}
```

The opaque base64url payload prevents the URL-decoded JSON soup of v1, and
makes URLs stable when names contain commas, slashes, or non-Latin chars.

## Invariants

- I1. The URL is never longer than 2,048 chars; oversize payloads truncate
  `zones` to fit and surface a notice.
- I2. The decoder validates against `ShareSnapshotV2Schema` (Zod). Any failure
  yields `null`, never throws to the UI.
- I3. After a successful import, the URL params are stripped from the address
  bar (`router.replace(pathname)`).
- I4. Imports never silently overwrite the active workspace; they create a
  new "(Shared)" workspace.
- I5. The decoder accepts and migrates v1 URLs (current legacy format) for at
  least one release.

## Acceptance scenarios

### Round-trip

```gherkin
Scenario: Encode then decode returns the same snapshot
  Given a workspace with reference "Tokyo" and 3 zones
  When generateShareUrl produces a URL
  And decodeShareUrl parses it
  Then the decoded snapshot equals the input
```

### Happy path

```gherkin
Scenario: Open a shared URL
  Given a v2 share URL
  When the app loads with the URL
  Then a new workspace named "(Shared)" is created and activated
  And the reference and timezones match the snapshot
  And the address bar no longer contains the share params
```

### Edge cases

```gherkin
Scenario: Tampered payload (changed character) → ignored
  Given a v2 URL with one altered base64 character
  Then decoding returns null
  And no workspace is created
  And the URL params are stripped

Scenario: Truncated payload → ignored
  Given a URL with the payload cut in half
  Then decoding returns null

Scenario: v1 legacy URL is migrated
  Given a v1 URL (the existing format with ref/time/zones/workspace params)
  Then it decodes into the equivalent v2 snapshot

Scenario: Unknown version (v=99) → ignored
  Then decoding returns null

Scenario: Hostile JSON inside payload (e.g. __proto__: ...)
  Given a payload that attempts prototype pollution
  Then the parser uses safe JSON parsing (no prototype assignment)
  And no global object is mutated

Scenario: Invalid IANA zone in shared URL
  Given a snapshot with timezone "Mars/Olympus_Mons"
  Then that zone is dropped during import
  And valid zones are still imported

Scenario: Zone count exceeds limit
  Given a snapshot with 100 zones
  Then on import the first 50 are kept and the rest dropped with a notice

Scenario: Oversized URL truncates zones, not the reference
  Given an input that would produce >2048 chars
  Then the encoder produces a URL ≤ 2048 chars
  And drops zones from the end first

Scenario: Empty zones is allowed
  Given a snapshot with no zones
  Then the import creates a workspace with only a reference

Scenario: instantUtc absent / invalid
  Given instantUtc is missing or not parseable
  Then the import uses the current instant and isModified=false
```

### Property-based

- For 1,000 random valid snapshots, encode→decode is the identity (modulo zone truncation).
