// Page rotation baked into the file that goes to the printer. A page keeps its size: a quarter
// turn shrinks the turned content to fit inside it, exactly as the preview shows it. (A PDF's
// /Rotate flag would swap the page to landscape, and CUPS would turn it back to fit the paper.)

export const QUARTER = [0, 90, 180, 270];

/** Normalise any angle to 0, 90, 180 or 270 (clockwise). */
export const turn = (deg) => (((Math.round(deg / 90) * 90) % 360) + 360) % 360;

export const hasRotation = (rotations) => Object.values(rotations || {}).some((d) => turn(d) !== 0);

/** The page turns with every page given an extra half turn, as an upside-down default asks for. */
export function withFlip(rotations, flip, count) {
  if (!flip || !count) return rotations;
  const out = { ...rotations };
  for (let p = 1; p <= count; p++) out[p] = turn((out[p] || 0) + 180);
  return out;
}

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

/**
 * Where a page's own frame sits on the paper, in percent of the sheet: fitted inside it (`fit`),
 * or covering it from the top, as the printer places a page it doesn't scale. `page` and `paper`
 * are width / height.
 */
export function frameOnPaper(page, paper, fit) {
  if (!page || !paper) return { left: 0, top: 0, width: 100, height: 100 };
  const wider = page > paper;
  const [width, height] = wider === fit ? [100, (paper / page) * 100] : [(page / paper) * 100, 100];
  return { left: (100 - width) / 2, top: fit ? (100 - height) / 2 : 0, width, height };
}

/** Turn pages of a PDF in place. `rotations` maps 1-based page numbers to clockwise degrees. */
export async function rotatePdf(bytes, rotations) {
  const lib = await import("pdf-lib");
  const { PDFDocument, degrees } = lib;
  // pdf-lib can't decrypt, and writing an encrypted file's pages out as they are can leave them
  // blank, so a protected PDF isn't turned at all.
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  if (pdf.isEncrypted) throw Object.assign(new Error("This PDF is protected, so its pages can't be turned."), { code: "encrypted" });
  const count = pdf.getPageCount();
  // Fields saved with /NeedAppearances have no drawing of their value, only the value; a viewer
  // draws it at display time. Draw them now, so baking (below) has something to keep. One field at
  // a time: Helvetica can't draw every value (Polish letters, say), and those fields are carried
  // over as live widgets instead.
  let fields = [];
  try {
    fields = pdf.getForm().getFields();
  } catch {
    // An unusual form is left as it is; its other pages still turn.
  }
  let font;
  for (const field of fields) {
    try {
      if (!field.needsAppearancesUpdate()) continue;
      font ??= await pdf.embedFont(lib.StandardFonts.Helvetica);
      field.defaultUpdateAppearances(font);
    } catch {
      // Left without a drawing; see `carry` below.
    }
  }
  for (const [key, value] of Object.entries(rotations)) {
    const index = Number(key) - 1;
    const deg = turn(value);
    if (!deg || index < 0 || index >= count) continue;
    const page = pdf.getPage(index);
    // A page with nothing on it looks the same at any angle.
    if (!page.node.Contents() && !page.node.Annots()?.size()) continue;
    // What the viewer shows: the page's own /Rotate is part of it.
    const own = turn(page.getRotation().angle);
    // Only the crop box is visible (bleed and imposition marks lie outside it), so that is the page.
    const crop = page.getCropBox();
    const { width: w, height: h } = crop;
    const [W, H] = own === 90 || own === 270 ? [h, w] : [w, h];
    const live = bakeAnnotations(pdf, page, lib);
    const embedded = await pdf.embedPage(page, { left: crop.x, bottom: crop.y, right: crop.x + w, top: crop.y + h });
    const p = placement(w, h, W, H, own + deg);
    const fresh = pdf.insertPage(index, [W, H]);
    // Large-format pages scale their units; the new page must measure the same.
    const unit = page.node.get(lib.PDFName.of("UserUnit"));
    if (unit) fresh.node.set(lib.PDFName.of("UserUnit"), unit);
    // Blend modes and soft masks are composited in the page's transparency group.
    const group = page.node.get(lib.PDFName.of("Group"));
    if (group) fresh.node.set(lib.PDFName.of("Group"), group);
    fresh.drawPage(embedded, { x: p.x, y: p.y, xScale: p.scale, yScale: p.scale, rotate: degrees(p.ccw) });
    carry(pdf, live, fresh, crop, p, own + deg, lib);
    pdf.removePage(index + 1);
  }
  // Appearances were drawn above where they could be; redrawing at save would throw on the rest.
  return pdf.save({ updateFieldAppearances: false });
}

/**
 * Move printable annotations that have no drawing to bake onto the turned page, placed where the
 * turned page puts them and turned with it, for the viewer or printer to draw from their values.
 */
function carry(pdf, refs, fresh, crop, p, clockwise, lib) {
  const { PDFName, PDFDict, PDFArray, PDFNumber } = lib;
  if (!refs.length) return;
  const r = (p.ccw * Math.PI) / 180;
  const at = (u, v) => {
    const [x, y] = [(u - crop.x) * p.scale, (v - crop.y) * p.scale];
    return [p.x + x * Math.cos(r) - y * Math.sin(r), p.y + x * Math.sin(r) + y * Math.cos(r)];
  };
  for (const ref of refs) {
    const annot = pdf.context.lookup(ref, PDFDict);
    const rect = annot.lookupMaybe(PDFName.of("Rect"), PDFArray)?.asArray().map((n) => pdf.context.lookup(n, PDFNumber).asNumber());
    if (!rect) continue;
    const pts = [at(rect[0], rect[1]), at(rect[2], rect[1]), at(rect[0], rect[3]), at(rect[2], rect[3])];
    const xs = pts.map((q) => q[0]);
    const ys = pts.map((q) => q[1]);
    annot.set(PDFName.of("Rect"), pdf.context.obj([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]));
    annot.set(PDFName.of("P"), fresh.ref);
    // /MK /R turns a widget's drawing counterclockwise; the page turned clockwise.
    if (annot.get(PDFName.of("Subtype"))?.toString() === "/Widget") {
      const mk = annot.lookupMaybe(PDFName.of("MK"), PDFDict) || pdf.context.obj({});
      const was = mk.lookupMaybe(PDFName.of("R"), PDFNumber)?.asNumber() ?? 0;
      mk.set(PDFName.of("R"), PDFNumber.of((((was - clockwise) % 360) + 360) % 360));
      annot.set(PDFName.of("MK"), mk);
    }
    fresh.node.addAnnot(ref);
  }
  pdf.catalog.getOrCreateAcroForm().dict.set(PDFName.of("NeedAppearances"), lib.PDFBool.True);
}

const PRINT = 4;
const HIDDEN = 2;

/**
 * Filled form fields, stamps and comments sit beside a page's content, and an embedded copy of
 * the page keeps only the content. Paint every printable annotation's appearance into the content
 * first, placed the way a viewer places it (PDF 32000, 12.5.5), so the turned print still has it.
 */
function bakeAnnotations(pdf, page, lib) {
  const { PDFName, PDFDict, PDFArray, PDFNumber, PDFRef, pushGraphicsState, popGraphicsState, concatTransformationMatrix, drawObject } = lib;
  const annots = page.node.Annots();
  const live = [];
  if (!annots || !annots.size()) return live;
  const numbers = (arr) => (arr instanceof PDFArray ? arr.asArray().map((n) => pdf.context.lookup(n, PDFNumber).asNumber()) : null);
  const ops = [];
  for (let i = 0; i < annots.size(); i++) {
    const annot = annots.lookup(i, PDFDict);
    const flags = annot.lookupMaybe(PDFName.of("F"), PDFNumber)?.asNumber() ?? 0;
    if (!(flags & PRINT) || flags & HIDDEN) continue;
    const ap = annot.lookupMaybe(PDFName.of("AP"), PDFDict);
    let ref = ap?.get(PDFName.of("N"));
    // A field with states (a checkbox, a radio button) shows the one named by /AS.
    if (ref && pdf.context.lookup(ref) instanceof PDFDict) {
      const state = annot.lookup(PDFName.of("AS"));
      ref = state ? pdf.context.lookup(ref, PDFDict).get(state) : undefined;
    }
    if (!ref) {
      const own = annots.get(i);
      if (own instanceof PDFRef) live.push(own);
      continue;
    }
    if (!(ref instanceof PDFRef)) ref = pdf.context.register(ref);
    const form = pdf.context.lookup(ref);
    const bbox = numbers(form?.dict?.lookup(PDFName.of("BBox")));
    const rect = numbers(annot.lookup(PDFName.of("Rect")));
    if (!bbox || !rect) continue;
    const [a, b, c, d, e, f] = numbers(form.dict.lookup(PDFName.of("Matrix"))) || [1, 0, 0, 1, 0, 0];
    const corners = [
      [bbox[0], bbox[1]],
      [bbox[2], bbox[1]],
      [bbox[0], bbox[3]],
      [bbox[2], bbox[3]],
    ].map(([x, y]) => [a * x + c * y + e, b * x + d * y + f]);
    const xs = corners.map((q) => q[0]);
    const ys = corners.map((q) => q[1]);
    const [bx0, by0, bx1, by1] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    if (bx1 - bx0 <= 0 || by1 - by0 <= 0) continue;
    const [rx0, ry0, rx1, ry1] = [Math.min(rect[0], rect[2]), Math.min(rect[1], rect[3]), Math.max(rect[0], rect[2]), Math.max(rect[1], rect[3])];
    const sx = (rx1 - rx0) / (bx1 - bx0);
    const sy = (ry1 - ry0) / (by1 - by0);
    const name = page.node.newXObject("Annot", ref);
    ops.push(pushGraphicsState(), concatTransformationMatrix(sx, 0, 0, sy, rx0 - sx * bx0, ry0 - sy * by0), drawObject(name), popGraphicsState());
  }
  if (!ops.length) return live;
  // Close whatever state the page's own content leaves open before painting over it.
  page.node.normalize();
  const context = pdf.context;
  page.node.wrapContentStreams(
    context.register(context.contentStream([pushGraphicsState()])),
    context.register(context.contentStream([popGraphicsState()])),
  );
  page.pushOperators(...ops);
  return live;
}

/** Turn an image clockwise inside its own frame, keeping its type. */
export async function rotateImage(file, deg) {
  const d = turn(deg);
  const source = new Uint8Array(await file.arrayBuffer());
  const bitmap = await createImageBitmap(file);
  const W = bitmap.width;
  const H = bitmap.height;
  const quarter = d === 90 || d === 270;
  const s = quarter ? Math.min(W / H, H / W) : 1;
  const canvas = new OffscreenCanvas(W, H);
  const ctx = canvas.getContext("2d");
  // The browser's MIME type can be empty or odd; the bytes say what the file is.
  const type = isPng(source) ? "image/png" : "image/jpeg";
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
  // A canvas writes no resolution, and without one the printer picks its own physical size.
  const out = withDensity(new Uint8Array(await blob.arrayBuffer()), readDensity(source));
  return new File([out], file.name, { type });
}

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const isPng = (b) => PNG_SIG.every((v, i) => b[i] === v);
const isJpeg = (b) => b[0] === 0xff && b[1] === 0xd8;
const u16 = (b, i) => (b[i] << 8) | b[i + 1];
const u32 = (b, i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const ascii = (b, i, n) => String.fromCharCode(...b.subarray(i, i + n));
const INCH = 0.0254;

/** Pixels per inch stored in a PNG (pHYs) or JPEG (JFIF), or null when the file names none. */
export function readDensity(b) {
  if (isPng(b)) {
    for (let i = 8; i + 8 <= b.length; i += 12 + u32(b, i)) {
      const kind = ascii(b, i + 4, 4);
      if (kind === "pHYs" && b[i + 16] === 1) return { x: u32(b, i + 8) * INCH, y: u32(b, i + 12) * INCH };
      if (kind === "IDAT") break;
    }
    return null;
  }
  if (isJpeg(b)) {
    const j = jfif(b);
    if (j >= 0 && b[j + 11]) {
      const per = b[j + 11] === 2 ? 2.54 : 1;
      return { x: u16(b, j + 12) * per, y: u16(b, j + 14) * per };
    }
    // Cameras and scanners often name it only in EXIF.
    return exifDensity(b);
  }
  return null;
}

// XResolution, YResolution and ResolutionUnit from a JPEG's EXIF IFD0, as pixels per inch.
function exifDensity(b) {
  for (let i = 2; i + 4 <= b.length && b[i] === 0xff; i += 2 + u16(b, i + 2)) {
    if (b[i + 1] === 0xda) break;
    if (b[i + 1] !== 0xe1 || ascii(b, i + 4, 6) !== "Exif\0\0") continue;
    const t = i + 10;
    const le = ascii(b, t, 2) === "II";
    const r16 = (o) => (le ? b[t + o] | (b[t + o + 1] << 8) : u16(b, t + o));
    const r32 = (o) => (le ? (b[t + o] | (b[t + o + 1] << 8) | (b[t + o + 2] << 16) | (b[t + o + 3] << 24)) >>> 0 : u32(b, t + o));
    const ifd = r32(4);
    const end = i + 2 + u16(b, i + 2);
    if (t + ifd + 2 > end) return null;
    const tags = {};
    for (let n = 0, count = r16(ifd); n < count; n++) {
      const e = ifd + 2 + n * 12;
      if (t + e + 12 > end) break;
      const tag = r16(e);
      if (tag === 0x011a || tag === 0x011b) {
        const at = r32(e + 8);
        if (t + at + 8 <= end && r32(at + 4)) tags[tag] = r32(at) / r32(at + 4);
      } else if (tag === 0x0128) tags[tag] = r16(e + 8);
    }
    const unit = tags[0x0128] ?? 2;
    if (!tags[0x011a] || !tags[0x011b] || (unit !== 2 && unit !== 3)) return null;
    const per = unit === 3 ? 2.54 : 1;
    return { x: tags[0x011a] * per, y: tags[0x011b] * per };
  }
  return null;
}

// Offset of a JFIF APP0 segment's marker, or -1.
function jfif(b) {
  for (let i = 2; i + 4 <= b.length && b[i] === 0xff; i += 2 + u16(b, i + 2)) {
    if (b[i + 1] === 0xe0 && ascii(b, i + 4, 5) === "JFIF\0") return i;
    if (b[i + 1] === 0xda) break;
  }
  return -1;
}

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (b) => (b.reduce((c, v) => CRC[(c ^ v) & 0xff] ^ (c >>> 8), 0xffffffff) ^ 0xffffffff) >>> 0;
const be32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];

/** The same image bytes with `density` (pixels per inch) written in, replacing any already there. */
export function withDensity(b, density) {
  if (!density) return b;
  if (isPng(b)) {
    const parts = [b.subarray(0, 8)];
    let i = 8;
    for (; i + 8 <= b.length; i += 12 + u32(b, i)) {
      const kind = ascii(b, i + 4, 4);
      if (kind === "pHYs") continue;
      parts.push(b.subarray(i, i + 12 + u32(b, i)));
      if (kind === "IHDR") {
        const body = new Uint8Array([0x70, 0x48, 0x59, 0x73, ...be32(Math.round(density.x / INCH)), ...be32(Math.round(density.y / INCH)), 1]);
        parts.push(new Uint8Array([...be32(9), ...body, ...be32(crc32(body))]));
      }
    }
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    parts.reduce((at, p) => (out.set(p, at), at + p.length), 0);
    return out;
  }
  if (isJpeg(b)) {
    const j = jfif(b);
    if (j < 0) return b;
    const out = b.slice();
    out[j + 11] = 1;
    out.set([Math.round(density.x) >> 8, Math.round(density.x) & 255, Math.round(density.y) >> 8, Math.round(density.y) & 255], j + 12);
    return out;
  }
  return b;
}
