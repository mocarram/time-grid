# 10 — Theming and responsive

## Purpose

Dark theme is the default and only theme for v1. The app adapts cleanly from
360px to 1440px+.

## Acceptance scenarios

```gherkin
Scenario: Layout at 360px (small mobile)
  Then the workspace selector is full-width
  And the auth button stacks below
  And the timezone grid is single-column
  And the floating Add and Share buttons render in a horizontal row

Scenario: Layout at 768px (tablet)
  Then the workspace selector and auth button align horizontally
  And the timezone grid is two-column

Scenario: Layout at 1280px+ (desktop)
  Then the timezone grid is three-column

Scenario: No horizontal scrollbar at any viewport >= 320px
  Then body overflow-x is hidden and content fits

Scenario: Long city name truncates cleanly
  Given a city name 80 chars long
  Then the card truncates with an ellipsis after 10 chars (non-reference)
  And the reference card shows the full name

Scenario: Touch device — drag uses long-press, not tap
  Given a touch input with a 250ms threshold
  Then a tap on the drag handle does NOT initiate drag
  And a long-press DOES

Scenario: System dark/light preference respected
  Given the OS is in light mode
  Then v1 still renders in dark theme (single theme by design)
  But all colors meet AA contrast against the dark background

Scenario: Print stylesheet
  When the user prints
  Then the floating buttons are hidden
  And the grid renders without backgrounds
```
