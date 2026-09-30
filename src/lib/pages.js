// Page-range helpers. The API takes CUPS-style ranges such as "1,3-5,8".
import { t, tn } from "../i18n/index.js";

/** Parse "1,3-5" into a sorted array of unique page numbers, or throw. */
export function parseRange(input, pageCount) {
  const text = String(input || "").replace(/\s+/g, "");
  if (!text) throw new Error(t("Enter pages, for example 1-3, 5"));
  const pages = new Set();
  for (const part of text.split(",")) {
    if (!part) continue;
    const m = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!m) throw new Error(t('"{part}" isn\'t a page or range', { part }));
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    if (a < 1 || b < 1) throw new Error(t("Pages start at 1"));
    if (b < a) throw new Error(t("{part} runs backwards", { part }));
    if (pageCount && b > pageCount) throw new Error(tn(pageCount, "This file has {n} page", "This file has {n} pages"));
    for (let p = a; p <= b; p++) pages.add(p);
  }
  if (!pages.size) throw new Error(t("Enter at least one page"));
  return [...pages].sort((x, y) => x - y);
}

/** Collapse [1,2,3,5] into "1-3,5". */
export function formatRange(pages) {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const parts = [];
  let start = null;
  let prev = null;
  for (const p of sorted) {
    if (start === null) {
      start = prev = p;
    } else if (p === prev + 1) {
      prev = p;
    } else {
      parts.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = prev = p;
    }
  }
  if (start !== null) parts.push(start === prev ? `${start}` : `${start}-${prev}`);
  return parts.join(",");
}

/** Pages selected by a range string, or all pages when the range is empty. */
export function selectedPages(range, pageCount) {
  if (!pageCount) return [];
  if (!range) return Array.from({ length: pageCount }, (_, i) => i + 1);
  try {
    return parseRange(range, pageCount);
  } catch {
    return [];
  }
}
