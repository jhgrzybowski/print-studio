import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, degrees } from "pdf-lib";
import { hasRotation, placement, rotatePdf, turn } from "../src/lib/rotate.js";
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

test("cleanRange keeps what a range needs and turns phone dashes into hyphens", () => {
  assert.equal(cleanRange("1–3, 5"), "1-3, 5");
  assert.equal(cleanRange("2—4;7"), "2-4,7");
  assert.equal(cleanRange("1a-2"), "1-2");
});
