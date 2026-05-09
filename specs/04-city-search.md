# 04 — City and abbreviation search

## Purpose

Users add timezones either by searching for cities (Nominatim/OpenStreetMap)
or by picking common timezone abbreviations (PST, EST, GMT, ...).

## Endpoints

- `GET /api/cities?q=<query>` — proxies Nominatim with sane defaults, returns
  `CitySearchResult[]` validated against `CitySearchResultSchema`.
- `GET /api/timezone?lat=<>&lng=<>` — resolves coordinates to an IANA zone
  using BigDataCloud → Nominatim reverse → coordinate fallback.

## Invariants

- I1. The Nominatim request always includes a custom `User-Agent` and `accept-language` header (server-to-server, never from the browser).
- I2. Search query under 2 chars returns an empty array (no upstream call).
- I3. Search query is debounced 300ms in the dialog.
- I4. The dialog cancels the in-flight request on a new keystroke.
- I5. Results are sorted by importance and capped at 12.
- I6. The dialog filters out items that already exist in the workspace
  (case-insensitive on `city + country`).
- I7. The dialog is keyboard-accessible: Tab cycles cities → tabs → input;
  Esc closes; Enter on a result adds it.

## Acceptance scenarios

### Happy path

```gherkin
Scenario: User searches "Tokyo" and adds the first result
  Given the dialog is open on the cities tab
  When the user types "Tokyo"
  And waits 300ms
  Then a request is sent to /api/cities?q=Tokyo
  And the response shows at least one result
  When the user clicks the first result
  Then a /api/timezone?lat=...&lng=... request is sent
  And on success the timezone is added to the workspace and the dialog closes

Scenario: Pick a popular city without searching
  Given the dialog is open and the input is empty
  Then up to 12 popular cities are shown
  When the user clicks "London"
  Then "London" is added and the dialog closes
```

### Edge cases — input

```gherkin
Scenario: Query too short
  Given the input value is "T"
  Then no network request is made

Scenario: Query whitespace-only
  Given the input value is "   "
  Then no network request is made

Scenario: Non-Latin query
  Given the input value is "東京"
  Then the request is URL-encoded correctly
  And results render the original Latin name when present

Scenario: Query with special characters
  Given the input value is "São Paulo"
  Then the request URL contains "S%C3%A3o%20Paulo"

Scenario: Hostile query is escaped
  Given the input value is "<script>"
  Then the request URL is "%3Cscript%3E"
  And no script element appears in the DOM

Scenario: Rapid typing cancels previous in-flight requests
  Given the user types "Tok", then "Toky", then "Tokyo" within 200ms
  Then only the request for "Tokyo" completes; earlier ones are aborted
```

### Edge cases — network

```gherkin
Scenario: Nominatim returns 500
  Given the upstream returns HTTP 500
  Then the dialog shows an inline error
  And does not crash

Scenario: Nominatim returns malformed JSON
  Given the upstream returns "<html>down</html>"
  Then no results are rendered
  And the dialog shows a "couldn't fetch" inline error

Scenario: Network timeout (>8s)
  Given the request takes longer than 8s
  Then the request is aborted
  And the dialog shows an inline timeout message

Scenario: Result missing fields are filtered out
  Given a Nominatim result with no lat/lon
  Then it is excluded from the displayed list

Scenario: Result with out-of-range coordinates is filtered
  Given a result with lat=120
  Then it is excluded
```

### Abbreviations tab

```gherkin
Scenario: Filter by abbreviation
  Given the abbreviations tab is active
  When the user types "PS"
  Then results include "PST" and "PDT"

Scenario: Abbreviation already added is hidden
  Given a workspace with PST already added
  Then PST does not appear in the list

Scenario: DST badge appears on DST variants
  Then PDT, EDT, BST, etc. are tagged with a "DST" badge
```

### API route negative tests

```gherkin
Scenario: GET /api/cities without query returns []
Scenario: GET /api/cities?q=a returns []
Scenario: GET /api/timezone without lat/lng returns 400
Scenario: GET /api/timezone with non-numeric lat returns 400
Scenario: GET /api/timezone with lat=91 returns 400 (out of range)
Scenario: GET /api/timezone when BigDataCloud fails falls back to Nominatim
Scenario: GET /api/timezone when both upstreams fail falls back to longitude-based estimation
```
