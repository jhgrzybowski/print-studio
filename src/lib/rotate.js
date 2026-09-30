// Page rotation baked into the file that goes to the printer. A page keeps its size: a quarter
// turn shrinks the turned content to fit inside it, exactly as the preview shows it. (A PDF's
// /Rotate flag would swap the page to landscape, and CUPS would turn it back to fit the paper.)

export const QUARTER = [0, 90, 180, 270];

/** Normalise any angle to 0, 90, 180 or 270 (clockwise). */
export const turn = (deg) => (((Math.round(deg / 90) * 90) % 360) + 360) % 360;

export const hasRotation = (rotations) => Object.values(rotations || {}).some((d) => turn(d) !== 0);

/**
 * Where a w×h box, turned clockwise by `deg` about its origin and scaled to fit a W×H page,
 * must be placed so it ends up centred. PDF coordinates: y up, positive angles counterclockwise.
 */
export function placement(w, h, W, H, deg) {
  const d = turn(deg);
  const quarter = d === 90 || d === 270;
  const rw = quarter ? h : w;
  const rh = quarter ? w : h;
  const s = Math.min(W / rw, H / rh);
  const a = w * s;
  const b = h * s;
  const cx = W / 2;
  const cy = H / 2;
  const at = {
    0: [cx - a / 2, cy - b / 2],
    90: [cx - b / 2, cy + a / 2],
    180: [cx + a / 2, cy + b / 2],
    270: [cx + b / 2, cy - a / 2],
  }[d];
  return { x: at[0], y: at[1], scale: s, ccw: -d };
}

/** Turn pages of a PDF in place. `rotations` maps 1-based page numbers to clockwise degrees. */
export async function rotatePdf(bytes, rotations) {
  const { PDFDocument, degrees } = await import("pdf-lib");
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const count = pdf.getPageCount();
  for (const [key, value] of Object.entries(rotations)) {
    const index = Number(key) - 1;
    const deg = turn(value);
    if (!deg || index < 0 || index >= count) continue;
    const page = pdf.getPage(index);
    // A page with nothing on it looks the same at any angle.
    if (!page.node.Contents()) continue;
    // What the viewer shows: the page's own /Rotate is part of it.
    const own = turn(page.getRotation().angle);
    const { width: w, height: h } = page.getSize();
    const [W, H] = own === 90 || own === 270 ? [h, w] : [w, h];
    const embedded = await pdf.embedPage(page);
    const p = placement(w, h, W, H, own + deg);
    const fresh = pdf.insertPage(index, [W, H]);
    fresh.drawPage(embedded, { x: p.x, y: p.y, xScale: p.scale, yScale: p.scale, rotate: degrees(p.ccw) });
    pdf.removePage(index + 1);
  }
  return pdf.save();
}

/** Turn an image clockwise inside its own frame, keeping its type. */
export async function rotateImage(file, deg) {
  const d = turn(deg);
  const bitmap = await createImageBitmap(file);
  const W = bitmap.width;
  const H = bitmap.height;
  const quarter = d === 90 || d === 270;
  const s = quarter ? Math.min(W / H, H / W) : 1;
  const canvas = new OffscreenCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  // JPEG has no transparency; the margins a quarter turn opens must be paper white.
  if (type === "image/jpeg") {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);
  }
  ctx.translate(W / 2, H / 2);
  ctx.rotate((d * Math.PI) / 180);
  ctx.scale(s, s);
  ctx.drawImage(bitmap, -W / 2, -H / 2);
  bitmap.close();
  const blob = await canvas.convertToBlob({ type, quality: 0.95 });
  return new File([blob], file.name, { type });
}
