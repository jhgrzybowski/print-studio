---
version: 1
slug: "src-app-jsx"
primary_target: "src/App.jsx"
related_targets: []
---

# Surface: Print Studio app shell (auth, workspace, history, settings)

**Context.**
- Mode: Operate.
- Audience: a household on the LAN, printing to one Canon MG5350.
- Job: sign in, drop a file, check the sheet, set the output, print, and watch the job finish.

**Constraints.**
- Liquid-metal studio: dark graphite by default, with a brushed-aluminium light theme and five accents kept working.
- A sidebar holding history, the printer and the account. The main pane has a preferences toolbar on top and the preview stage below.
- Few words and icon-first controls; every icon has a tooltip and an aria-label.
- Banned: cream or off-white grounds, italic accent words, numbered section labels, monospace labels, pill buttons, and anything borrowed from another app.

## Direction contract

**Thesis.**
- A dark studio where the paper is the brightest object and polished chrome marks what you can touch to commit: the Print button, the selected segment and the mark.
- It turns away from two things: the soft neumorphic plane and the settings form stacked in cards.

**Own world.**
- Graphite ground (#0b0c0e to #24272c), with hairlines drawn in white at 6–10 % alpha.
- Liquid chrome is a vertical gradient with a mirror horizon at 50 %. A pointer-tracked specular sits on every chrome surface, and a slow sheen drifts across the Print button.
- Raised dark fields (36 px, radius 10) carry the options. Inset wells hold the steppers and segments, and each segment's thumb is a chrome slug.
- Funnel Sans (UI) and Funnel Display (wordmark and headings). lucide icons at 1.5 stroke, plus custom print glyphs.
- The mark is a chrome drop that wobbles through an SVG turbulence filter.

**Story.**
1. Sign-in: a chrome drop above a short form on a lit graphite stage. The submit button is the same chrome slab as Print.
2. The empty stage holds a dim sheet outline under a spotlight. Drop, paste or click to fill it.
3. The page lands on the stage at paper proportions. Every toolbar change reshapes it: it turns, desaturates, and stacks copies as ghost sheets.
4. The floating stage bar counts sheets and pages. Print fills with mercury while it sends, then the new job slides into the history.
5. The history row walks through its stages with a pulse, and a check mark appears when the job is done.

**First viewport.**
- A 292 px sidebar: the brand row (drop mark, wordmark, new print), search, day-grouped history rows with mini sheet thumbnails, then the printer line and the account chip at the foot.
- A 60 px toolbar: copies, paper, media, pages | color, orientation, sides, quality | defaults menu, with Print on the far right.
- The stage fills the rest, with the document name at top left and the stage bar floating at the bottom centre.

**Form.**
- Motion uses ease-out cubic-bezier(.23,1,.32,1). Presses take 120–160 ms at scale .97, menus 150–200 ms from their trigger origin, and the drawer 300 ms on the iOS drawer curve.
- Nothing animates on keyboard shortcuts. Reduced motion removes movement and keeps the fades.

**Finish line.**
- Every existing function still works: auth, upload/convert/preview, dry-run verdict, print, tracking, cancel, dismiss, history search and infinite scroll, reprint, defaults save and reset, theme, accent, and the mobile drawer.
- Build and tests pass. Screens are checked at 1440 and 390.
