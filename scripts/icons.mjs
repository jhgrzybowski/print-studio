// Renders the app icons in public/ from the favicon's liquid-chrome drop. Needs rsvg-convert
// (brew install librsvg). Run with `npm run icons` after changing the mark.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const out = (name) => fileURLToPath(new URL(`../public/${name}`, import.meta.url));

// The drop from public/favicon.svg, in its 64-unit box: x 14–50, y 9–57.2.
const DROP = "M32 9c10.6 11.9 18 21.2 18 30.2a18 18 0 0 1-36 0C14 30.2 21.4 20.9 32 9z";
const GLINT = "M23 40.5c.6 4.5 3.8 8.1 8.3 9.1";

/**
 * One icon in a 1024 box. `tile` is the dark ground: full bleed where the platform applies its own
 * mask, a rounded square with clear corners where it shows the image as is. `drop` is the drop's
 * height as a share of the box.
 */
function svg({ tile, drop }) {
  const s = (1024 * drop) / 48.2;
  // Centred a little above the middle: the drop's weight sits in its round base.
  const place = `translate(512 500) scale(${s.toFixed(3)}) translate(-32 -33.1)`;
  // The rounded tile gets a faint lit rim, as the app's panels do, so it holds its edge on dark launchers.
  const ground =
    tile === "bleed"
      ? `<rect width="1024" height="1024" fill="url(#bg)"/>`
      : `<rect x="32" y="32" width="960" height="960" rx="215" fill="url(#bg)"/><rect x="34" y="34" width="956" height="956" rx="213" fill="none" stroke="#fff" stroke-opacity=".1" stroke-width="4"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="72%">
      <stop offset="0" stop-color="#1c1e22"/><stop offset=".68" stop-color="#0e0f11"/><stop offset="1" stop-color="#08090a"/>
    </radialGradient>
    <radialGradient id="halo" cx="50%" cy="46%" r="34%">
      <stop offset="0" stop-color="#fff" stop-opacity=".09"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#c3c8ce"/>
      <stop offset=".5" stop-color="#8e949b"/><stop offset=".54" stop-color="#c3c8ce"/>
      <stop offset=".85" stop-color="#eef0f2"/><stop offset="1" stop-color="#b9bec4"/>
    </linearGradient>
    <filter id="soft" x="-50%" y="-400%" width="200%" height="900%"><feGaussianBlur stdDeviation="1.1"/></filter>
  </defs>
  ${ground}
  <rect width="1024" height="1024" fill="url(#halo)"/>
  <g transform="${place}">
    <ellipse cx="32" cy="57.4" rx="12.5" ry="1.6" fill="#000" opacity=".6" filter="url(#soft)"/>
    <path d="${DROP}" fill="url(#metal)"/>
    <path d="${DROP}" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width=".35"/>
    <path d="${GLINT}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".85"/>
  </g>
</svg>`;
}

const ICONS = [
  // iOS rounds the corners itself and fills any transparency with black.
  { file: "apple-touch-icon.png", size: 180, tile: "bleed", drop: 0.6 },
  { file: "icon-192.png", size: 192, tile: "rounded", drop: 0.56 },
  { file: "icon-512.png", size: 512, tile: "rounded", drop: 0.56 },
  // Android crops maskable icons to shapes as small as a circle of 80 % of the box.
  { file: "icon-maskable-512.png", size: 512, tile: "bleed", drop: 0.5 },
];

for (const icon of ICONS) {
  execFileSync("rsvg-convert", ["-w", String(icon.size), "-h", String(icon.size), "-o", out(icon.file)], { input: svg(icon) });
  console.log(`public/${icon.file}`);
}
