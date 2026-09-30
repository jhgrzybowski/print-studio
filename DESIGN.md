---
name: Print Studio
description: A household print console in graphite and liquid chrome; one sheet under a lit stage.
colors:
  accent-cobalt: "oklch(0.76 0.13 250)"
  accent-cobalt-light: "oklch(0.52 0.13 250)"
  chrome-highlight: "#ffffff"
  chrome-body: "oklch(0.82 0.008 250)"
  chrome-horizon: "oklch(0.66 0.01 250)"
  chrome-ink: "#0e1012"
  graphite-ground: "#0b0c0e"
  graphite-sidebar: "#111215"
  graphite-panel: "#15171a"
  graphite-raise: "#1d1f23"
  graphite-well: "#0c0d0f"
  graphite-menu: "#1b1d21"
  graphite-text: "#eceef0"
  graphite-text-2: "#a4aab1"
  graphite-text-3: "#858b93"
  steel-ground: "#e4e6e9"
  steel-sidebar: "#dcdfe3"
  steel-panel: "#eceef0"
  steel-raise: "#f3f4f6"
  steel-well: "#d4d8dd"
  steel-menu: "#f6f7f8"
  steel-text: "#16181b"
  steel-text-2: "#4d535b"
  steel-text-3: "#5a6068"
  paper: "#fbfbf9"
  paper-light: "#ffffff"
  ok: "#86d3a3"
  warn: "#e8c071"
  error: "#ff8e7e"
  ok-light: "#2f8a55"
  warn-light-text: "#8a5d06"
  error-light: "#c43d2c"
typography:
  display:
    fontFamily: "Funnel Display Variable, Funnel Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 540
    lineHeight: 1.45
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Funnel Display Variable, Funnel Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 560
    lineHeight: 1.45
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Funnel Display Variable, Funnel Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 560
    lineHeight: 1.45
    letterSpacing: "-0.01em"
  wordmark:
    fontFamily: "Funnel Display Variable, Funnel Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 620
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Funnel Sans Variable, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 420
    lineHeight: 1.45
    fontFeature: "\"tnum\""
  control:
    fontFamily: "Funnel Sans Variable, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.45
  label:
    fontFamily: "Funnel Sans Variable, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.45
rounded:
  paper: "2px"
  xs: "7px"
  key: "8px"
  sm: "10px"
  md: "12px"
  lg: "14px"
  xl: "18px"
  round: "50%"
spacing:
  hair: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  bar: "60px"
  sidebar: "292px"
components:
  button-print:
    backgroundColor: "{colors.chrome-body}"
    textColor: "{colors.chrome-ink}"
    rounded: "{rounded.md}"
    padding: "0 14px 0 16px"
    height: "38px"
  button-print-sending:
    backgroundColor: "{colors.graphite-well}"
    textColor: "{colors.graphite-text}"
    rounded: "{rounded.md}"
    height: "38px"
  button-new-print:
    backgroundColor: "{colors.chrome-body}"
    textColor: "{colors.chrome-ink}"
    rounded: "{rounded.sm}"
    size: "32px"
  button-raised:
    backgroundColor: "{colors.graphite-raise}"
    textColor: "{colors.graphite-text}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "36px"
  icon-key:
    textColor: "{colors.graphite-text-2}"
    rounded: "{rounded.sm}"
    size: "36px"
  icon-key-small:
    textColor: "{colors.graphite-text-2}"
    rounded: "{rounded.key}"
    size: "30px"
  field:
    backgroundColor: "{colors.graphite-raise}"
    textColor: "{colors.graphite-text}"
    typography: "{typography.control}"
    rounded: "{rounded.sm}"
    padding: "0 10px 0 11px"
    height: "36px"
  segmented:
    backgroundColor: "{colors.graphite-well}"
    textColor: "{colors.graphite-text-3}"
    rounded: "{rounded.sm}"
    padding: "3px"
  segmented-thumb:
    backgroundColor: "{colors.chrome-body}"
    textColor: "{colors.chrome-ink}"
    rounded: "{rounded.xs}"
    height: "30px"
  input:
    backgroundColor: "{colors.graphite-well}"
    textColor: "{colors.graphite-text}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "36px"
  input-large:
    backgroundColor: "{colors.graphite-well}"
    textColor: "{colors.graphite-text}"
    rounded: "{rounded.md}"
    height: "46px"
  menu:
    backgroundColor: "{colors.graphite-menu}"
    textColor: "{colors.graphite-text}"
    rounded: "{rounded.md}"
    padding: "5px"
  menu-item:
    textColor: "{colors.graphite-text}"
    rounded: "{rounded.key}"
    padding: "6px 10px"
    height: "34px"
  tooltip:
    backgroundColor: "{colors.graphite-menu}"
    textColor: "{colors.graphite-text}"
    typography: "{typography.label}"
    rounded: "{rounded.key}"
    padding: "5px 9px"
  stage-bar:
    backgroundColor: "{colors.graphite-menu}"
    textColor: "{colors.graphite-text}"
    rounded: "{rounded.lg}"
    padding: "0 6px"
    height: "44px"
  history-row:
    textColor: "{colors.graphite-text}"
    rounded: "{rounded.md}"
    padding: "7px 10px 7px 8px"
    height: "50px"
  history-row-selected:
    backgroundColor: "{colors.graphite-raise}"
    textColor: "{colors.graphite-text}"
    rounded: "{rounded.md}"
  settings-section:
    backgroundColor: "{colors.graphite-panel}"
    textColor: "{colors.graphite-text}"
    rounded: "{rounded.xl}"
    padding: "18px 20px 12px"
  switch:
    backgroundColor: "{colors.graphite-well}"
    rounded: "{rounded.sm}"
    padding: "3px"
    width: "46px"
    height: "28px"
  switch-bead:
    backgroundColor: "{colors.chrome-body}"
    rounded: "{rounded.xs}"
    size: "22px"
  job-track:
    backgroundColor: "{colors.graphite-raise}"
    rounded: "2px"
    height: "3px"
  phone-printer-key:
    backgroundColor: "{colors.graphite-raise}"
    textColor: "{colors.graphite-text-2}"
    rounded: "{rounded.sm}"
    padding: "0 12px 0 10px"
    height: "32px"
  print-dock:
    backgroundColor: "{colors.graphite-ground}"
    padding: "10px 12px calc(12px + safe-area-bottom)"
  dock-summary:
    backgroundColor: "{colors.graphite-raise}"
    textColor: "{colors.graphite-text}"
    rounded: "{rounded.lg}"
    padding: "0 14px 0 12px"
    height: "52px"
  button-print-dock:
    backgroundColor: "{colors.chrome-body}"
    textColor: "{colors.chrome-ink}"
    rounded: "{rounded.lg}"
    padding: "0 20px"
    height: "52px"
  settings-sheet:
    backgroundColor: "{colors.graphite-panel}"
    textColor: "{colors.graphite-text}"
    rounded: "{rounded.xl} {rounded.xl} 0 0"
    padding: "0 20px 8px"
---

# Design System: Print Studio

## Overview

**Creative North Star: "The Chrome Key on a Graphite Desk"**

Print Studio is a dark graphite instrument with one lit object in it: the sheet of paper about to be printed. The ground is flat and quiet, the controls are low dark keys and sunken wells that carry values, and a single material, polished liquid chrome with a highlight that follows the pointer, marks the few things that commit or select. Light mode keeps the same structure on a cool neutral steel grey; it is never cream.

Density is high but calm. Every print preference lives in one 60 px toolbar row of icon keys, wells and value fields; the sidebar is a history list; the rest of the screen is a lit stage where the page floats. On a phone the same desk folds into a column: a title bar, the lit stage, and a print dock under the thumb that raises a settings sheet. Structure comes from tone steps and 1 px hairlines, not boxes. Words are few and sentence case, set in Funnel Sans, with Funnel Display reserved for titles and the wordmark.

Motion is quick and quiet: a strong ease-out, presses that give slightly under the finger, menus that grow from their trigger, and nothing that moves when the keyboard is driving.

**Key Characteristics:**
- Graphite ground (dark) or cool steel grey (light), with a radial-lit stage behind the paper.
- Liquid chrome is a signal, not a finish: Print, the selected segment, the switch bead, New print, the avatar bezel, the checked theme and the empty-state drop mark.
- Two control families: raised dark keys that hold a value, and inset wells that hold a choice.
- The paper sheet is the only object with deep, layered shadow.
- Funnel Display for titles and the wordmark, Funnel Sans for everything else, tabular numerals throughout.
- Ease-out `cubic-bezier(.23,1,.32,1)`, 140 ms presses, 170 ms origin-aware menus, no motion under keyboard control.

## Colors

A near-monochrome graphite (or steel) scale, one tunable accent used in small doses, and chrome as a material rather than a colour.

### Primary
- **Cobalt Signal** (accent-cobalt dark / accent-cobalt-light light): focus rings, the caret, the selected page thumbnail ring, active-job text, drag-over outline, the check mark in menus and the icon of a toggled icon key. Always a thin line or a small glyph, never a fill. Its hue and chroma are user-tunable (Cobalt, Iris, Jade, Ember, Graphite); lightness is fixed per theme (L 0.76 dark, L 0.52 light) so contrast holds for every palette. A 22 % (dark) / 18 % (light) alpha of it is the selection and drop-target wash.

### Secondary
- **Liquid Chrome** (chrome-highlight to chrome-body to chrome-horizon): a seven-stop vertical gradient with a mirror horizon at 50 %, white at the top, the darkest stop at the horizon, and a lighter band just below it. The lightest stops take a trace of the accent hue (chroma 0.004 to 0.01). Text on chrome is always **Chrome Ink** (chrome-ink).

### Neutral
- **Graphite Ground / Steel Ground** (graphite-ground / steel-ground): the app background, toolbar and page bars.
- **Sidebar tone** (graphite-sidebar / steel-sidebar): one step off the ground, separated by a 1 px inset hairline.
- **Panel** (graphite-panel / steel-panel): the history-detail facts column and Settings sections.
- **Raise** (graphite-raise / steel-raise): the selected history row.
- **Well** (graphite-well / steel-well): the floor of segmented controls, steppers, inputs and search.
- **Menu** (graphite-menu / steel-menu): menus, tooltips, notices, the job chip and the floating stage bar.
- **Text ramp** (graphite-text, -2, -3 / steel-text, -2, -3): primary copy; secondary labels and values; meta lines, placeholders, group labels and leading icons.
- **Hairlines**: white at 6 % and 10 % (dark), ink `rgb(20 24 30)` at 8 % and 13 % (light). Hover is 4.5 % / 5 %, press 7 % / 8 %.
- **Paper** (paper / paper-light): the preview sheet and thumbnails; the only near-white surface in dark mode.
- **Status** (ok, warn, error and their light-theme counterparts): dots, meta lines and error text only.

### Named Rules
**The Chrome Is a Signal Rule.** Chrome marks what commits or what is chosen: Print (in the toolbar, the phone dock and the settings sheet, and the Sign in button, which is the same slab), the selected segment thumb, the switch bead, New print, the avatar bezel, the checked theme item and the empty-state drop mark. Nothing else gets the chrome gradient; a new surface earns it only by being the single commit or current selection in its group.

**The Accent Is a Line Rule.** The accent appears as a 1.5 to 2 px ring, a caret, a check, a small glyph or the 3 px job track. It never fills a button, a switch track or a panel; a switch that is on draws a 1.5 px accent ring inside its well.

**The Never Colour Alone Rule.** Every status tone sits next to a word or a shape: a dot plus "Ready", a meta line reading "Failed · 23:38".

## Typography

**Display Font:** Funnel Display Variable (falls back to Funnel Sans, then system UI)
**Body Font:** Funnel Sans Variable (with ui-sans-serif, system-ui, -apple-system, Segoe UI)

**Character:** Funnel Display's squared, slightly engineered forms give titles and the wordmark a machined edge that matches the chrome; Funnel Sans keeps the dense control row neutral and legible. Weights sit between the usual steps (420 body, 500 controls, 560 titles, 620 wordmark and Print) because both faces are variable.

### Hierarchy
- **Display** (Funnel Display 540 to 560, 28 px, -0.02 to -0.025em): the empty-stage prompt and the sign-in title. Drops to 20 px below 860 px.
- **Headline** (Funnel Display 560, 20 px): large page-bar titles.
- **Title** (Funnel Display 560, 16 px): page-bar titles, Settings section heads, account and menu names.
- **Wordmark** (Funnel Display 620, 17 px, -0.015em; 22 px on the splash): "Print Studio" beside the chrome drop mark. Avatar initials also use the display face (640).
- **Body** (Funnel Sans 420, 14 px, 1.45): default copy, with tabular numerals everywhere.
- **Control** (Funnel Sans 500 to 550, 14 px): field values, segment labels, row labels, button text. Print is 620.
- **Label** (Funnel Sans 500, 12 px): meta lines, history group labels, menu labels, tooltips. Keyboard hints are 11 px, 500.

### Named Rules
**The Display Is for Names Rule.** Funnel Display is used only for titles, names and the wordmark. Controls, labels and numbers are always Funnel Sans.

**The Sentence Case Rule.** Labels are sentence case at their natural tracking. No uppercase tracking, no monospace, no italics.

## Layout

A two-column app frame: a 292 px sidebar and a fluid main column. The main column stacks a 60 px bar (the print toolbar on Compose, a title bar elsewhere) over a stage that fills the rest.

- **Toolbar.** Every print preference sits in one scrolling row: groups of controls 6 px apart, groups 12 px apart, 1 px by 22 px separators between families, and Print pinned at the right edge outside the scroll. Below 1480 px, collapsible fields drop their value and chevron to icon-only; below 1240 px, the row fades out over its last 28 px instead of clipping.
- **Stage.** A radial light at 50 % 40 % over the ground. The sheet is centred in a size container (padding 76 px top, 40 px sides, 96 px bottom; 72 / 20 / 70 px below 520 px) and scales to fit both axes. A 112 px page rail (92 px below 1080 px, hidden below 860 px) holds thumbnails. Floating chips sit 16 px from the stage corners; the stage bar floats 20 px above the bottom, centred. Below 520 px the stage bar drops zoom (people pinch instead), keeping the verdict and pager, and disappears when neither is present.
- **Skipped pages.** A skipped page's thumbnail becomes a dashed ghost (transparent sheet, 1 px dashed outline, image at 18 %); on the stage its content drops to 22 % under a "Skipped" chip. The dimming is a `filter: opacity()` so it never fights Motion, which owns `opacity`.
- **History detail.** Stage plus a 300 px facts column; below 860 px it becomes one scrolling column with the stage at `max(320px, 52dvh)` and the facts below it, padded for the safe area. On phones the bar hides the file glyph and shortens "Cancel job" to "Cancel".
- **Phone (860 px and below, on Compose).** The toolbar is replaced by a title bar: drawer key, "Print Studio" in the display face, and a 32 px printer key (dot and state word) that opens Settings. When a document is loaded, a print dock is pinned to the bottom: a centred status line (sheet count and dry-run verdict) over a row of the 52 px settings summary and the 52 px chrome Print. The summary's label reads "Print settings" and its value names copies, paper, color and sides; a bad page range rings it in the error colour and disables Print. Notices rise above the dock.
- **Settings sheet.** Tapping the summary raises a bottom sheet (up to 88 dvh, 18 px top corners, panel tone) over a scrim: a grip, a display-face "Print settings" title with a close key, a scrolling body of stacked option rows (segments go full width with 40 px options), a "Use my defaults / Save as defaults" pair, and a foot with a full-width chrome Print. A page-range field under Pages checks the range against the page count as you type.
- **Settings.** One centred column up to 680 px, 16 px between sections, 28 px top padding.
- **Sign in.** A single 340 px column centred on a lit graphite field, 26 px between groups, printer status pinned 24 px from the bottom.
- **Narrow.** Below 860 px the sidebar becomes a drawer (up to 320 px or 86 vw) over a 50 % black scrim.
- **Polish.** Polish words run about a third longer, so layout folds sooner under `:lang(pl)`. Toolbar fields go icon-only below 1600 px (not 1480). On phones, segments switch to their short forms ("Cz-b", "Wył.", "Dłuższa", "Standard"). Copy is chosen to fit rather than truncated.
- **Rhythm.** Spacing steps are 2, 4, 6, 8, 10, 12, 16 and 20 px; control height is 36 px (30 px inside wells, 46 px for large sign-in fields, 52 px in the phone dock). On coarse pointers small buttons grow an invisible hit area, segment options are 40 px, and keyboard hints are hidden.

## Elevation & Depth

A hybrid. The ground is flat and structure is tonal, but controls carry a shallow physical language: value keys are faintly raised, choice wells are faintly sunk, floating layers get one diffuse shadow, and the paper sheet alone gets a deep, multi-layer drop. Each theme defines its own versions of the same five shadows.

### Shadow Vocabulary
- **Field** (`inset 0 1px 0 rgb(255 255 255 / 0.07), 0 0 0 1px rgb(255 255 255 / 0.06), 0 1px 2px rgb(0 0 0 / 0.5)` dark): raised value keys, toggled icon keys, the page-bar glyph tile. Paired with a subtle top-to-bottom fill gradient.
- **Well** (`inset 0 1px 2px rgb(0 0 0 / 0.6), 0 1px 0 rgb(255 255 255 / 0.04)` dark): segmented controls, steppers, inputs, search, the theme switcher.
- **Float** (`inset 0 1px 0 rgb(255 255 255 / 0.06), 0 0 0 1px rgb(255 255 255 / 0.07), 0 12px 32px -8px rgb(0 0 0 / 0.7), 0 2px 6px rgb(0 0 0 / 0.4)` dark): menus, tooltips, notices, the job chip, the document chip and the stage bar. The chips and stage bar add a 14 to 16 px backdrop blur over an 82 to 86 % menu tone.
- **Chrome** (`inset 0 1px 0 #fff, inset 0 -1px 0 rgb(0 0 0 / 0.3), 0 1px 1px rgb(0 0 0 / 0.55), 0 10px 20px -10px rgb(0 0 0 / 0.9)` dark): every chrome surface; light mode adds a 1 px ink ring.
- **Sheet** (`0 1px 0 rgb(255 255 255 / 0.5) inset, 0 0 0 0.5px rgb(0 0 0 / 0.3), 0 2px 4px rgb(0 0 0 / 0.35), 0 18px 40px -12px rgb(0 0 0 / 0.75), 0 50px 90px -30px rgb(0 0 0 / 0.6)` dark): the preview page only. Copies stack behind it as ghost sheets with a lighter drop.

### Named Rules
**The Only Deep Shadow Is Paper Rule.** The sheet is the one object lifted high off the stage. Everything else stays within 1 to 2 px of the plane, or floats with the single Float shadow.

**The Keys Up, Choices Down Rule.** A control that holds a value (select trigger, text button) is raised; a control that holds a choice among options (segments, stepper, input) is an inset well, and the chosen option rises out of it in chrome.

## Shapes

Softly squared rectangles throughout, on a tight radius ladder: 7 px for anything nested inside a well, 8 px for small keys, menu items and tooltips, 10 px for 36 px controls and wells, 12 px for Print, menus, history rows and large inputs, 14 px for floating chips and the stage bar, 18 px for Settings sections and the top of the settings sheet. The switch is a 10 px track holding a 7 px bead, and the phone printer key is 10 px: no capsules even on phones. Paper is almost square (2 px sheet, 3 px thumbnails). Full circles are reserved for the avatar, status dots, colour swatches and the empty-state drop mark. Borders are drawn as 1 px inset box-shadow hairlines rather than CSS borders. The brand mark is a chrome water drop.

### Named Rules
**The No Pill Rule.** Buttons and controls are never capsules. A 38 px Print slab is 12 px round, not 19.

## Components

### Buttons
Tactile and small. Presses give slightly and spring back.
- **Print (the chrome slab):** 38 px high, 12 px radius, padding 0 14 px 0 16 px, Funnel Sans 620, leading printer icon and a recessed shortcut hint. A slow sheen drifts across it on a 7 s loop, over the pointer-tracked specular. While sending, it empties into a dark well and chrome fills in from the left over 2.4 s, with the label inverted by difference blending; on success the label cross-fades to "Sent" with a green check. Disabled Print falls back to a raised dark key with no chrome, sheen or hint. The Sign in button is the same slab at 46 px; the phone dock's Print is the slab at 52 px, 14 px radius and 16 px text, and the settings sheet ends in a full-width one.
- **New print:** a 32 px chrome square (10 px radius) holding a plus, top right of the sidebar.
- **Raised text button:** 36 px, 10 px radius, 16 px side padding, field fill and shadow; hover lifts the fill one step.
- **Icon key:** the default control. 36 px (30 px small), transparent, secondary text colour, lucide icons at 1.5 stroke, 18 px (16 px small). Hover adds the 4.5 % wash; toggled keys become raised with the icon in accent. Every icon key has a tooltip and an accessible name.
- **Press:** scale to .94 to .98 over 140 ms with the ease-out curve (.94 for small icon keys and New print, .95 segments and steppers, .97 buttons, fields and Print, .98 history rows and the profile).

### Chips
- **Document chip:** a floating Float-shadow chip at 14 px radius in the top-left stage corner, holding a glyph tile, name and meta ("3 pages · 166 KB"), Change and a close key.
- **Job chip:** the same material in the top-right corner (below the title bar on phones). A 22 px status mark (a pulsing dot while working, a green check in a tinted disc when printed), the state word and file name on one line, and under them a 3 px track that fills from sent to printed in the tone colour, with a glint running along the fill while the printer works. Tapping it opens the job's history detail; a quiet Cancel sits at its end while the job is active.

### Cards / Containers
- **Settings section:** the only boxed container. 18 px radius, panel fill with a 1 px hairline ring (raise fill with a faint drop in light mode), padding 18 px 20 px 12 px. Rows inside are 52 px min height, label left in secondary text, control right, divided by hairlines.
- **Workspace:** no cards. The facts column is a panel tone separated by a hairline; sidebar and toolbar are separated from the stage by hairlines.

### Inputs / Fields
- **Value field (select trigger):** a raised dark key, 36 px, 10 px radius, leading icon in tertiary text, value in control weight, chevron that rotates 180 degrees over 200 ms when open. Invalid adds a 1 px error ring.
- **Segmented control:** a well with 3 px padding and 2 px gaps; options are 30 px, 7 px radius, tertiary text. The selected option carries a chrome thumb that slides between options over 200 ms; the active label turns chrome ink. Arrow keys move the selection.
- **Stepper:** the same well with 26 px minus and plus keys around a bold centred number.
- **Switch:** for on/off options (fit to page, upside down), set at the right of a row whose label carries a one-line hint below it. A 46 by 28 px well at 10 px radius; the 22 px chrome bead (7 px radius) slides 18 px over 200 ms and gives to .94 on press. On adds a 1.5 px accent ring inside the well.
- **Text input and search:** wells, 36 px (34 px search, 46 px sign-in), placeholder in tertiary text; focus adds a 1.5 px accent ring inside the well shadow.

### Navigation
- **Sidebar:** wordmark and New print in a 60 px head, search well, then history grouped by day under 12 px tertiary labels. Rows are 50 px: a paper thumbnail, the file name in 500, a 12 px meta line in its tone colour, and a status mark that swaps for a raised reprint key on hover. The selected row is the raise tone with a 1 px hairline ring. The foot holds the printer line (dot, name, state) and the profile with its chrome-bezel avatar.
- **Menus:** menu tone, Float shadow, 12 px radius, 5 px padding, 34 px items at 8 px radius with the hover wash. The theme switcher is a small well whose checked item is chrome.
- **Stage bar:** a 44 px floating translucent bar holding the dry-run verdict, pager and zoom, divided by short hairlines.
- **Print dock (phone):** ground tone with a 1 px top hairline, padded for the safe area. The settings summary is a raised 52 px key at 14 px radius (sliders icon, a 12 px tertiary label over a 550-weight value) that gives to .98 on press; beside it sits the chrome Print.
- **Settings sheet (phone):** the panel tone with an inset top hairline and a long soft upward shadow, a 38 by 5 px grip, and a filler below its bottom edge so an upward overdrag never shows the page behind.

### Liquid Chrome (signature)
The `.metal` material: the chrome gradient, Chrome shadow and chrome-ink text, plus an overlay-blended radial highlight (90 by 46 px) positioned at the pointer. One passive, frame-throttled pointer listener updates every chrome surface at once, and registered `--mx` / `--my` properties let the highlight trail the pointer over 260 ms. The listener runs only on fine hover pointers; on touch the highlight rests above the top edge. Print, the segment thumbs, New print and the empty-state drop mark carry the tracked highlight; the avatar bezel and the checked theme item use the static chrome gradient.

### Motion
- **Easing:** ease-out `cubic-bezier(.23,1,.32,1)` everywhere; the drawer and the Print fill use `cubic-bezier(.32,.72,0,1)`.
- **Menus** open in 170 ms from scale .96 and 2 px up, growing from the Radix transform origin of their trigger; they close in 120 ms.
- **Tooltips** open in 140 ms from scale .97; once one tooltip is open, the next opens instantly.
- **Segment thumb** slides in 200 ms. **Theme change** cross-fades colours and shadows over 300 ms.
- **Settings sheet** rises in 360 ms on the drawer curve over a scrim that fades in 320 ms. It follows the finger downward (elastic 0.6, 0.04 upward) and closes when dragged more than 110 px or flicked faster than 500 px/s; otherwise it springs back.
- **Job track** fills with a transform (`scaleX`) from the left; the working glint is a 1.4 s linear gradient sweep that stops under reduced motion.
- **Keyboard:** while the last input was a key press (`html[data-kbd]`), menus, tooltips and the segment thumb change without animation.
- **Reduced motion:** menus and tooltips keep an opacity fade only; press scaling, the Print sheen, the pulse and skeleton shimmer stop; Motion components follow the user setting.

## Do's and Don'ts

### Do:
- **Do** give chrome only to the commit or the current selection in a group, and keep text on it in chrome ink.
- **Do** put a new print preference in the toolbar as an icon key, value field or segmented well at 36 px, with a tooltip and an accessible name.
- **Do** separate regions with 1 px inset hairlines (6 % white dark, 8 % ink light) and tone steps, not borders or cards.
- **Do** use the accent only as a 1.5 to 2 px ring, a caret, a check or a small glyph.
- **Do** pair every status colour with a word or a shape.
- **Do** press with a .94 to .98 scale over 140 ms on `cubic-bezier(.23,1,.32,1)`, and skip animation when `html[data-kbd]` is set.
- **Do** define every new surface in both the graphite and the steel theme.
- **Do** keep Print within thumb reach on phones: a new phone action goes into the dock or the settings sheet, never back into a scrolling toolbar.

### Don't:
- **Don't** use cream or off-white for any background; the only near-white is paper.
- **Don't** make buttons or controls pill-shaped.
- **Don't** fill buttons or panels with the accent colour.
- **Don't** give anything other than the paper sheet a deep, layered drop shadow.
- **Don't** set controls, labels or numbers in Funnel Display, or use uppercase tracking, monospace or italics for labels.
- **Don't** nest a boxed pane inside another pane in the workspace.
- **Don't** animate movement under reduced motion; keep fades only.
