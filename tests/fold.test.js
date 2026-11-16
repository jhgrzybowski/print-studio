import { test } from "node:test";
import assert from "node:assert/strict";
import { FOLD_MAX, nextFold } from "../src/lib/fold.js";

// Measures a bar whose row is `widths[fold]` wide at each step, the way the toolbar does.
function settle(width, widths, need = [], fold = 0) {
  for (let i = 0; i < 20; i++) {
    const overflow = widths[fold] > width;
    if (overflow) need[fold] = widths[fold];
    const next = nextFold(fold, { overflow, width, need });
    if (next === fold) return fold;
    fold = next;
  }
  throw new Error("the toolbar never settles");
}

const widths = [1100, 980, 900, 760, 640, 520];

test("folds only as far as the width needs", () => {
  assert.equal(settle(1200, widths), 0);
  assert.equal(settle(1000, widths), 1);
  assert.equal(settle(800, widths), 3);
  assert.equal(settle(600, widths), 5);
  // Past the last step the row scrolls rather than folding forever.
  assert.equal(settle(400, widths), FOLD_MAX);
});

test("unfolds once there is room again and settles without flipping", () => {
  const need = [];
  let fold = settle(700, widths, need);
  assert.equal(fold, 4);
  fold = settle(600, widths, need, fold);
  assert.equal(fold, 5);
  fold = settle(950, widths, need, fold);
  assert.equal(fold, 2);
  fold = settle(1100, widths, need, fold);
  assert.equal(fold, 0);
  // A width between two steps stays put across repeated measurements.
  assert.equal(settle(950, widths, need, 2), 2);
});

test("forgotten widths unfold to the new fit when labels shrink, without staying stale", () => {
  const need = [];
  let fold = settle(800, widths, need);
  assert.equal(fold, 3);
  // Shorter labels: the remembered widths are too wide now, so the toolbar forgets them.
  const shorter = [790, 700, 650, 600, 560, 500];
  need.length = 0;
  fold = settle(800, shorter, need, fold);
  assert.equal(fold, 0);
  // Longer labels at the same fold overflow and fold further.
  const longer = [1300, 1200, 1000, 840, 700, 600];
  need.length = 0;
  fold = settle(800, longer, need, fold);
  assert.equal(fold, 4);
});

test("a forgotten step is tried once, then the row stays put", () => {
  const need = [];
  let tries = 0;
  let fold = 3;
  for (let i = 0; i < 6; i++) {
    const overflow = widths[fold] > 800;
    if (overflow) need[fold] = widths[fold];
    const next = nextFold(fold, { overflow, width: 800, need });
    if (next < fold) tries++;
    fold = next;
  }
  assert.equal(fold, 3);
  assert.equal(tries, 1);
});
