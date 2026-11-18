# Preferences and navigation continuity

- Status: COMPLETE
- Baseline: 8faf674 (main after PR #6, 2026-11-16)
- Scope: the print preferences toolbar, its floating layers, and moving between the current print and other views.

## Intent

Preserve the graphite/steel and chrome language in DESIGN.md. Keep the 60 px desktop toolbar, 36 px fields, existing Funnel fonts, and current mobile dock. Prioritize clarity and continuity over new effects. No new dependencies or backend contract changes.

## Work

1. Keep copies, pages, paper, color and sides readily accessible at ordinary desktop widths. Fold secondary preferences into a clearly named panel when space is constrained. Avoid remembered-width oscillation when labels, language or viewport change. Every preference remains reachable down to the phone dock breakpoint.
2. A collapsed value control's tooltip names both its function and selection. Tooltips wait initially, then open immediately while moving along adjacent controls. Suppress tooltip collisions with open menus. Open state, selected state and hover remain visually distinct without moving hit targets.
3. Keep a direct route back to the current document from history, archive and account settings. Preserve preview position and zoom across these view changes. A new file still starts fresh. Hidden content must be inaccessible and its keyboard listeners inactive; close floating layers on navigation.
4. Honor keyboard modality on view changes as well as menus: no keyboard-triggered entrance animation. Pointer navigation may use at most a 140 ms opacity fade. No new layout-property motion. Popovers retain trigger-based origins and 170 ms entry / 120 ms exit, with cubic-bezier(0.23, 1, 0.32, 1), and reduced motion removes movement. Do not stagger frequently visited app views.
5. Check loading/checking feedback for stale validation and preserve the current local preview while the server checks new preferences. Clearly communicate checking rather than showing an old success as current. Do not weaken print validation or introduce real print submissions for testing.

## Verification

- npm run check and npm run build.
- Browser fixture with at least two history entries and a multipage PDF; intercept print submissions.
- Exercise 1920, 1440, 1280, 1100, 900 and 390 px; English and Polish; dark and light themes.
- Change color, sides, pages, copies, layout, custom scaling and driver preferences. Close with Escape and outside click; open a nested Select inside a panel; resize while a panel is open.
- Hover across adjacent controls and rapidly open/close panels. Inspect initial/skip tooltip delays, origins and reduced motion. Ensure keyboard-triggered navigation remains immediate.
- Move to page 2, zoom, visit history/settings/home and return. Preserve page/zoom/settings, with no hidden preview keyboard handlers. New print resets the preview.
- Independent Terra high real-user testing after implementation; address material findings before filing the PR.
- PR evidence: matched before/after screenshots with exact change callouts, and a short real browser recording of hover, panel and navigation behavior. Captions explicitly identify fixture documents and mocked print submission.

## Baseline evidence

- `npm run check`: 48 passing tests before implementation.
- Browser fixture used public printer options plus intercepted account, history, files and validation. POST `/print` was intercepted; no print job was submitted.
- Polish at 1440 px: color, sides, orientation and quality were icon-only with roughly 160 px unused before the Print group.
- Polish at 1100 px: toolbar contents measured 605 px with 590 px available; at 900 px only 390 px were available and the Settings trigger extended past the visible row.
- With the Color select visibly open, its trigger had `aria-expanded=true` and `data-state=closed`. Tooltip state masked the attribute used by the open-state CSS.
- Navigating away from page 2 at 125% zoom through history and home, then using the existing resume action, returned the document to page 1 at fit-to-stage.
- Shared T3 preview snapshots timed out twice. Playwright was used as the browser fallback.

## Boundaries

No deployment, printer queue mutations, real paper jobs, dependency updates, unrelated backend fixes, commits or pushes until the final PR step.

## Result

Implemented and verified on `polish/preferences-and-view-flow`. The [UX review](../docs/reviews/ux-polish/README.md) records the exact changes, matched screenshots, normal-speed Polish interaction video, browser matrices, user journeys and independent Terra review limits. All 52 tests and the production build pass. The final delivery is a reviewable PR; no deployment or live print submission was performed.
