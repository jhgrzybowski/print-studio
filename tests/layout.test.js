import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { planLayout } from "../src/lib/layout.js";

// Cases planned by the API's own layout.py (app/services/layout.py), so the preview drawn
// before /print/validate answers matches the plan it then returns.
const cases = JSON.parse(readFileSync(new URL("./fixtures/layout-cases.json", import.meta.url)));

const close = (a, b, path) => {
  if (typeof a === "number" && typeof b === "number") return assert.ok(Math.abs(a - b) <= 1.5e-4, `${path}: ${a} vs ${b}`);
  if (Array.isArray(b)) {
    assert.equal(a.length, b.length, `${path}.length`);
    return b.forEach((v, i) => close(a[i], v, `${path}[${i}]`));
  }
  if (b && typeof b === "object") return Object.keys(b).forEach((k) => close(a[k], b[k], `${path}.${k}`));
  assert.equal(a, b, path);
};

test("the local planner matches the API's plans", () => {
  assert.ok(cases.length > 100);
  for (const [i, c] of cases.entries()) {
    const o = c.opts;
    const plan = planLayout(c.pages, c.paper, {
      orientation: o.orientation,
      pagesPerSheet: o.pages_per_sheet,
      pagesPerSheetLayout: o.pages_per_sheet_layout,
      pageBorder: o.page_border,
      scaling: o.scaling,
      scalePercent: o.scale_percent ?? null,
      twoSided: o.two_sided,
      copies: o.copies,
      borderless: o.borderless,
      reverseOrder: o.reverse_order,
    });
    close(plan, c.expected, `case ${i}`);
  }
});
