# Design

## Direction: one quiet plane

The whole app is one continuous plane. Nothing sits in a card, and no pane holds another pane.

Depth is used for only two things:

- **The paper.** The preview sheet floats above the plane, because it is the object being made.
- **Things you press.** Keys are softly raised out of the plane. When pressed or selected, they sink into it.

Everything else is flat type on the plane, grouped by spacing, alignment and the odd 1 px hairline.

Liquid metal is reserved for one object, the print key. The print key has the same shape wherever a print can start: the dock and a history entry. So the chrome always means "send to the printer".

## Layout

```
┌ sidebar ┐┌──────── canvas ────────┐┌ inspector ┐
│ mark  + ││                        ││ Copies  - 1 + │
│ search  ││      ┌──────────┐      ││ Pages   All   │
│ history ││      │  sheet   │      ││ Paper   A4 ⌄  │
│  ·      ││      └──────────┘      ││ …             │
│ printer ││   ╭ dock ─────────── ◉╮ ││ ● 3 sheets    │
│ avatar ⚙││   ╰──────────────────╯ ││               │
└─────────┘└────────────────────────┘└───────────────┘
```

- **Sidebar (248 px).**
  - It is a slightly deeper tone of the plane, with no border.
  - History rows are one line each: a status dot, the file name, and the time.
- **Canvas.**
  - The sheet is centred, with page thumbnails in a slim column at its left and a small pager above it.
  - The dock floats at the bottom centre. It is the only rounded container in the workspace: a 20 px radius rectangle, not a pill.
- **Inspector (296 px).**
  - A hairline separates it from the canvas, with no background change.
  - Each row has a label on the left and a compact control on the right, with no hints.
  - The dry-run result sits at its foot on one line.
- **Settings.**
  - A single 620 px column with the same row pattern.
  - Section titles are plain text. There are no cards and no subtitles.
- **Narrow screens.**
  - Below 1080 px, the inspector moves under the canvas.
  - Below 860 px, the sidebar becomes a drawer.

## Tokens (`src/styles/tokens.css`)

- **Color.**
  - All colors are OKLCH.
  - The neutral hue follows the accent, so the greys are tinted cool.
  - Light mode uses a blue-grey plane at L 0.94, never cream. Dark mode uses a graphite plane at L 0.19.
  - Palettes: Cobalt, Iris, Jade, Ember and Graphite.
- **Type.**
  - Geist Variable, weights 450, 540 and 600.
  - Sizes: 12, 13, 14, 15, 18 and 24 px. Numbers are tabular.
  - Labels are sentence case at 13 px. There is no uppercase tracking, no monospace and no italics.
- **Radii.**
  - 8 px for small controls and 10 px for inputs and segments.
  - 20 px for the dock and menus.
  - Circles only for icon keys, avatar, dots and the print key.
- **Elevation.**
  - `--raise` for a key at rest and `--sunk` for a pressed or selected key.
  - `--float` for the dock and menus, and `--paper` for the sheet.
- **Icons.**
  - lucide at 1.5 stroke, 18 px (16 px in dense rows).
  - Custom glyphs for color mode, two-sided and quality, drawn on the same 24 px grid and stroke, live in `src/components/glyphs.jsx`.
- **Motion.**
  - Transitions run 160 to 240 ms on ease-out quart, with no bounce.
  - The segmented thumb and the sheet's aspect ratio are the only shared-layout moves.
  - Copies fan out behind the sheet.
  - `MotionConfig reducedMotion="user"` is set.

## Copy

- Labels are one word where possible: Copies, Pages, Paper, Layout, Color, Sides, Quality, Media.
- Status is a dot plus two or three words, such as "Ready", "Printing" or "Printer off".
- Errors are one sentence that ends with what to do.
- No em dashes.
