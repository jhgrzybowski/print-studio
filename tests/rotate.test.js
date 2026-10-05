import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDict, PDFDocument, PDFName, degrees } from "pdf-lib";
import { deflateSync } from "node:zlib";
import { hasRotation, placement, readDensity, rotatePdf, turn, withDensity } from "../src/lib/rotate.js";
import { cleanRange } from "../src/lib/pages.js";

test("turn normalises angles to clockwise quarter turns", () => {
  assert.equal(turn(0), 0);
  assert.equal(turn(450), 90);
  assert.equal(turn(-90), 270);
  assert.equal(turn(360), 0);
  assert.equal(hasRotation({ 1: 0, 2: 360 }), false);
  assert.equal(hasRotation({ 3: 180 }), true);
});

// Corners of a w×h box turned by `ccw` degrees about (x, y) and scaled.
function bounds(w, h, p) {
  const r = (p.ccw * Math.PI) / 180;
  const pts = [
    [0, 0],
    [w, 0],
    [0, h],
    [w, h],
  ].map(([u, v]) => [p.x + p.scale * (u * Math.cos(r) - v * Math.sin(r)), p.y + p.scale * (u * Math.sin(r) + v * Math.cos(r))]);
  const xs = pts.map((q) => q[0]);
  const ys = pts.map((q) => q[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

test("placement centres the turned page inside the same frame", () => {
  const [W, H] = [595, 842];
  for (const deg of [0, 90, 180, 270]) {
    const p = placement(W, H, W, H, deg);
    const [x0, y0, x1, y1] = bounds(W, H, p);
    assert.ok(x0 >= -0.01 && y0 >= -0.01 && x1 <= W + 0.01 && y1 <= H + 0.01, `fits at ${deg}°`);
    assert.ok(Math.abs((x0 + x1) / 2 - W / 2) < 0.01 && Math.abs((y0 + y1) / 2 - H / 2) < 0.01, `centred at ${deg}°`);
    // A quarter turn fills the width; a half turn fills the page.
    if (deg % 180) assert.ok(Math.abs(x1 - x0 - W) < 0.01);
    else assert.ok(Math.abs(x1 - x0 - W) < 0.01 && Math.abs(y1 - y0 - H) < 0.01);
  }
});

test("rotatePdf keeps every page's size and leaves unturned pages alone", async () => {
  const src = await PDFDocument.create();
  const mark = (page) => page.drawRectangle({ x: 20, y: page.getHeight() - 60, width: 40, height: 40 });
  mark(src.addPage([595, 842]));
  mark(src.addPage([842, 595]));
  const own = src.addPage([595, 842]);
  own.setRotation(degrees(90));
  mark(own);
  src.addPage([595, 842]);
  const out = await PDFDocument.load(await rotatePdf(await src.save(), { 1: 90, 3: 180, 4: 90 }));
  assert.equal(out.getPageCount(), 4);
  const sizes = out.getPages().map((p) => [p.getSize().width, p.getSize().height, p.getRotation().angle]);
  assert.deepEqual(sizes[0], [595, 842, 0]);
  assert.deepEqual(sizes[1], [842, 595, 0]);
  // A page with its own /Rotate becomes the frame the viewer showed, with the turn baked in.
  assert.deepEqual(sizes[2], [842, 595, 0]);
});

test("rotatePdf keeps filled form fields on turned pages", async () => {
  const src = await PDFDocument.create();
  const page = src.addPage([595, 842]);
  page.drawText("Body", { x: 50, y: 780 });
  const field = src.getForm().createTextField("name");
  field.setText("Filled");
  field.addToPage(page, { x: 50, y: 700, width: 300, height: 30 });
  const out = await PDFDocument.load(await rotatePdf(await src.save(), { 1: 90 }));
  // The turned page is one drawing of the old page; that drawing must paint the field's appearance.
  const xobjects = (dict) => dict.lookup(PDFName.of("Resources"), PDFDict)?.lookup(PDFName.of("XObject"), PDFDict);
  const [drawn] = xobjects(out.getPage(0).node).entries().map(([, ref]) => out.context.lookup(ref));
  const inner = xobjects(drawn.dict).keys().map(String);
  assert.ok(inner.some((n) => n.startsWith("/Annot")), `annotation painted, got ${inner}`);
});

test("rotatePdf turns a page whose only marks are annotations", async () => {
  const src = await PDFDocument.create();
  const page = src.addPage([595, 842]);
  src.getForm().createTextField("only").addToPage(page, { x: 50, y: 700, width: 300, height: 30 });
  assert.equal(page.node.Contents(), undefined);
  const out = await PDFDocument.load(await rotatePdf(await src.save(), { 1: 180 }));
  const xobjects = out.getPage(0).node.lookup(PDFName.of("Resources"), PDFDict)?.lookup(PDFName.of("XObject"), PDFDict);
  assert.ok(xobjects?.keys().length, "the page is redrawn turned");
});

test("rotatePdf keeps only the crop box, the part a viewer shows", async () => {
  const src = await PDFDocument.create();
  const page = src.addPage([700, 900]);
  page.setCropBox(50, 30, 595, 842);
  page.drawRectangle({ x: 60, y: 40, width: 40, height: 40 });
  const out = await PDFDocument.load(await rotatePdf(await src.save(), { 1: 90 }));
  const turned = out.getPage(0);
  assert.deepEqual([turned.getWidth(), turned.getHeight()], [595, 842]);
  const xobjects = turned.node.lookup(PDFName.of("Resources"), PDFDict).lookup(PDFName.of("XObject"), PDFDict);
  const [drawn] = xobjects.entries().map(([, ref]) => out.context.lookup(ref));
  const bbox = drawn.dict.lookup(PDFName.of("BBox")).asArray().map((n) => n.asNumber());
  assert.deepEqual(bbox, [50, 30, 645, 872]);
});

test("rotatePdf keeps a large-format page's UserUnit", async () => {
  const src = await PDFDocument.create();
  const page = src.addPage([600, 400]);
  page.node.set(PDFName.of("UserUnit"), src.context.obj(4));
  page.drawRectangle({ x: 10, y: 10, width: 40, height: 40 });
  const out = await PDFDocument.load(await rotatePdf(await src.save(), { 1: 90 }));
  assert.equal(out.getPage(0).node.lookup(PDFName.of("UserUnit")).asNumber(), 4);
});

test("withDensity carries an image's resolution into a canvas copy", () => {
  // What a canvas writes: a 1×1 PNG with no pHYs, and a JPEG whose JFIF names no unit.
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    return Buffer.concat([len, Buffer.from(type), data, Buffer.alloc(4)]);
  };
  const ihdr = Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 0, 0, 0, 0]);
  const png = new Uint8Array(
    Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(Buffer.from([0, 0]))), chunk("IEND", Buffer.alloc(0))]),
  );
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xda]);
  assert.equal(readDensity(png), null);
  assert.equal(readDensity(jpeg), null);
  const near = (d, x, y) => assert.ok(Math.abs(d.x - x) < 0.1 && Math.abs(d.y - y) < 0.1, JSON.stringify(d));
  const png300 = withDensity(png, { x: 300, y: 300 });
  near(readDensity(png300), 300, 300);
  // Writing again replaces the chunk rather than adding a second one.
  near(readDensity(withDensity(png300, { x: 150, y: 72 })), 150, 72);
  assert.equal(withDensity(png300, { x: 150, y: 72 }).length, png300.length);
  near(readDensity(withDensity(jpeg, { x: 200, y: 200 })), 200, 200);
  assert.equal(withDensity(jpeg, null), jpeg);
});

test("cleanRange keeps what a range needs and turns phone dashes into hyphens", () => {
  assert.equal(cleanRange("1–3, 5"), "1-3, 5");
  assert.equal(cleanRange("2—4;7"), "2-4,7");
  assert.equal(cleanRange("1a-2"), "1-2");
});
