# Design

## Direction

The app is a tools pane, not a page. Surfaces are neumorphic: soft paired shadows raise controls out of the ground, and inputs sit in inset wells. Chrome (a conic, slowly shifting liquid-metal gradient) is reserved for the few objects you actually press or read: the print key, the copies `+` key, and the printer gauge's bezel and hub. Everything else stays matte, so the chrome keeps its meaning.

## Tokens (`src/styles/tokens.css`)

- **Color.** All colors are OKLCH. The neutral hue (`--n-h`) follows the palette, so greys are tinted, never pure. Grounds are cool grey-blue, never cream or off-white. Accents come from `[data-palette]`: cobalt, iris, jade, ember, and graphite.
- **Themes.** Dark is the default. Light comes from `[data-theme="light"]`, and the System setting follows `prefers-color-scheme`. Theme changes cross-fade over about 400 ms.
- **Elevation.** `--raise-1/2/3` for raised surfaces, `--inset-1/2` for wells, and `--edge-top` for the lit upper edge.
- **Radii.** 8 / 10 / 12 / 16 / 22 px. There are no pill buttons; round shapes are used only for true circles such as the avatar, LEDs, the gauge, and the chrome key.
- **Type.** Geist Variable, with tabular numerals for counts. There are no italics, monospace labels, eyebrow labels, or numbered section labels.
- **Motion.** Springs from Motion: a shared-layout segmented thumb, the gauge needle, the sheet's aspect ratio when the paper or orientation changes, and copies stacking behind the sheet. Easing is `--ease-out` (a quint curve) with no bounce. `MotionConfig reducedMotion="user"` respects the OS setting.

## Patterns

- Loading uses skeletons, not spinners.
- Feedback goes in a live status line in the composer and a short top-bar notice. There are no toasts.
- The printer's state is always visible: a gauge and LED in the sidebar, and a line on the sign-in screen.
- Destructive actions (cancel job) use the danger key. Clearing a finished job uses a ghost key.
