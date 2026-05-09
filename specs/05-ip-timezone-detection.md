# 05 — IP timezone detection

## Purpose

When a workspace has no reference timezone, the app suggests one based on the
client's location, falling back to the browser's `Intl.DateTimeFormat`.

## Endpoint

`GET /api/ip-timezone` — returns `{ city, country, timezone, source }` where
`source ∈ "ip" | "browser"`.

## Provider chain

1. ipapi.co (HTTPS)
2. ip-api.com (HTTP)
3. browser `Intl.DateTimeFormat().resolvedOptions().timeZone`
4. UTC (last resort)

## Invariants

- I1. If the client IP is loopback (`127.0.0.1`, `::1`) or empty, providers
  are skipped and the browser fallback is used.
- I2. Detection result is cached client-side for the session (no repeat
  requests on re-render).
- I3. Detection is **non-blocking**: the UI renders without it.
- I4. The detected timezone is set as the workspace reference **only when the
  workspace has none** — never overrides a user-set reference.

## Acceptance scenarios

```gherkin
Scenario: ipapi.co succeeds
  Given a non-loopback IP and ipapi.co returns city/timezone
  Then source is "ip" and timezone matches the response

Scenario: ipapi.co returns error: true → falls back to ip-api.com
  Given ipapi.co returns { error: true }
  Then ip-api.com is queried
  And on success, source is "ip"

Scenario: Both providers fail → browser fallback
  Then source is "browser" and timezone equals Intl resolvedOptions().timeZone

Scenario: Browser timezone is "UTC" → return UTC
  Then the response is { city: "UTC", country: "UTC", timezone: "UTC", source: "browser" }

Scenario: Loopback IP skips upstream
  Given x-forwarded-for is "127.0.0.1"
  Then no upstream request is made

Scenario: Auto-suggest does not override user reference
  Given a workspace with reference "Europe/Berlin"
  When IP detection returns "America/New_York"
  Then the workspace reference is still "Europe/Berlin"

Scenario: First-load suggestion when workspace has no reference
  Given a workspace with referenceTimezone: undefined
  When IP detection completes successfully
  Then the workspace reference is set to the detected zone

Scenario: SSRF-safe — endpoint never proxies arbitrary URLs
  Given a request to /api/ip-timezone?url=http://internal
  Then the URL parameter is ignored
```
