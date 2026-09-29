import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRange, formatRange, selectedPages } from "../src/lib/pages.js";

test("parseRange expands pages and ranges, sorted and unique", () => {
  assert.deepEqual(parseRange("3-5, 1,4", 10), [1, 3, 4, 5]);
  assert.deepEqual(parseRange(" 2 ", 2), [2]);
});

test("parseRange rejects bad input with readable messages", () => {
  assert.throws(() => parseRange("", 3), /Enter pages/);
  assert.throws(() => parseRange("a", 3), /isn't a page/);
  assert.throws(() => parseRange("0", 3), /start at 1/);
  assert.throws(() => parseRange("5-2", 9), /backwards/);
  assert.throws(() => parseRange("1-4", 3), /has 3 pages/);
  assert.throws(() => parseRange("2", 1), /has 1 page$/);
});

test("formatRange collapses runs", () => {
  assert.equal(formatRange([5, 1, 2, 3, 3, 8, 9]), "1-3,5,8-9");
  assert.equal(formatRange([]), "");
  assert.equal(formatRange([4]), "4");
});

test("formatRange and parseRange round-trip", () => {
  const pages = [1, 2, 4, 7, 8, 9, 12];
  assert.deepEqual(parseRange(formatRange(pages), 12), pages);
});

test("selectedPages treats an empty range as every page", () => {
  assert.deepEqual(selectedPages("", 3), [1, 2, 3]);
  assert.deepEqual(selectedPages("2-3", 5), [2, 3]);
  assert.deepEqual(selectedPages("9", 5), []);
  assert.deepEqual(selectedPages("", 0), []);
});
