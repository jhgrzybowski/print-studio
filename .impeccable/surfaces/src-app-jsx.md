---
version: 1
slug: "src-app-jsx"
primary_target: "src/App.jsx"
related_targets: []
---

# Surface: Print Studio app shell (auth, workspace, history, settings)

Mode: Operate. Audience: household LAN users printing to one Canon MG5350. Job: sign in, drop a file, check the preview, set the output, print, follow the job. Constraints: brief-pinned neumorphic + liquid-metal world, light/dark, switchable palette; sidebar (history, profile, settings) + main panel. Banned by user: cream/off-white ground, italic accent words, numbered section labels, monospace labels, pill buttons.

## Direction contract

THESIS: The print station as a molded instrument, an espresso-machine grammar: a soft matte neumorphic body in which liquid chrome appears only where the user acts or the machine reports. It refuses the flat dashboard of form fields and the generic file-upload page.

OWN-WORLD: Cool graphite (dark) or cool mist grey (light) extruded surfaces with paired light/dark shadows; controls are pressed-in wells or raised keys at 12–16px radii. Chrome is a conic, iridescent liquid-metal ring, reserved for the print key, the copies "+" key, and the printer gauge bezel. One palette accent colours live state only. Geist Variable with tabular numerals.

STORY: The user sees whether the printer is ready (gauge), drops a file into the folder well, watches it land and render page by page, taps settings on one tool pane, sees the validated summary, presses the chrome key and watches the ring sweep while the job moves through queued, printing, and done. History sits in the sidebar and any entry can be reopened, reprinted, cancelled, or forgotten.

FIRST VIEWPORT: A 280px sidebar on the left: wordmark, "New print" key, a gauge with the printer state, history grouped by day, and profile + settings at the foot. The main panel shows a centred upload instrument (a folder well with a glass file chip that slides in on drag) over a bottom composer bar: attach key, file summary, and a 64px chrome-ring print key at its right. With a file loaded, the canvas splits into a preview stage (page + thumbnail rail) and a 340px tool pane on the right.

FORM: Pinned brief world; the assigned grounded direction is #6, an espresso machine (steel body, single chrome group head, pressure gauge, pull ritual). Seed 505d4f38. Declined challengers donate these raises:
- Raise (Game Boy four-shade): one accent hue per palette; states come from inversion or pressed depth, not new colours.
- Raise (drawcord cape): chrome is the single cord. No chrome decoration anywhere else.
- Raise (phosphor terminal): the system reports itself in one live status line on the composer instead of toasts.
- Raise (Ikeda datamatics): every number is set in tabular figures in the UI face.
- Raise (Labanotation): the job-progress lengths encode real stages; the page rail encodes page selection exactly.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
