# 09 — Accessibility

## Purpose

Every flow is keyboard-operable, screen-reader-readable, and respects user
motion preferences.

## Targets

- WCAG 2.1 AA color contrast.
- All interactive controls reachable via Tab in logical order.
- ARIA roles for the timezone grid (list/listitem) and the time slider.
- `prefers-reduced-motion` honored: animations dropped to instant where appropriate.
- Drag-and-drop has a keyboard alternative (arrow keys with Space pickup, per dnd-kit defaults).

## Acceptance scenarios

```gherkin
Scenario: Keyboard navigates the entire main page
  Given a user with no mouse
  When they press Tab repeatedly
  Then focus visits: workspace selector, auth button, reference card, time slider, date picker, each timezone card's actions, share button, add button — in that order
  And focus is always visible

Scenario: Keyboard reorder via dnd-kit
  Given focus is on a card's drag handle
  When the user presses Space, then ↓, then Space
  Then the card is moved one position down

Scenario: Screen reader announces card content
  Given JAWS / VoiceOver
  When the reference card receives focus
  Then the city, country, current time, and abbreviation are read

Scenario: Reduced motion
  Given prefers-reduced-motion: reduce
  Then card-flip and slider-thumb animations are skipped
  And drag-overlay rotation is removed

Scenario: All dialogs trap focus
  When the Add Timezone dialog opens
  Then focus is on the search input
  And Tab does not escape the dialog
  And Esc closes and returns focus to the trigger

Scenario: Color contrast meets AA
  Then no text on its background falls below 4.5:1 (or 3:1 for large)

Scenario: Forms have labels and error messages
  When the workspace name is empty
  Then the input has aria-invalid=true and an associated error message

Scenario: Live regions announce sync status
  When a sync starts and finishes
  Then an aria-live="polite" region updates with the status

Scenario: Form validation errors are announced (negative)
  Given a workspace name field with an invalid value
  Then aria-invalid is true and aria-describedby points to the error message
  And the error is read out by the screen reader

Scenario: Disabled controls have accessible explanation (edge)
  Given the Save button is disabled because a sync is in flight
  Then it has aria-disabled and a tooltip explaining why

Scenario: No keyboard trap outside dialogs (negative)
  Given any non-dialog UI
  Then the user can Tab and Shift+Tab without becoming stuck on any element

Scenario: Animations skipped under reduced motion (edge)
  Given prefers-reduced-motion: reduce
  When a card is reordered
  Then the move is instant — no slide animation
```
