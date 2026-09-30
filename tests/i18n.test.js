import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { getLocale, setLocalePref, t, tn } from "../src/i18n/index.js";
import { parseRange } from "../src/lib/pages.js";
import { optionsSummary } from "../src/lib/format.js";
import pl from "../src/i18n/pl.js";

test("English is the default outside the browser", () => {
  setLocalePref("system");
  assert.equal(getLocale(), "en");
  assert.equal(t("job|Printing"), "Printing");
  assert.equal(tn(1, "{n} page", "{n} pages"), "1 page");
  assert.equal(tn(3, "{n} page", "{n} pages"), "3 pages");
});

test("Polish picks the right plural form", () => {
  setLocalePref("pl");
  const pages = (n) => tn(n, "{n} page", "{n} pages");
  assert.equal(pages(1), "1 strona");
  assert.equal(pages(2), "2 strony");
  assert.equal(pages(4), "4 strony");
  assert.equal(pages(5), "5 stron");
  assert.equal(pages(12), "12 stron");
  assert.equal(pages(22), "22 strony");
  assert.equal(pages(25), "25 stron");
  assert.equal(tn(3, "{n} copy", "{n} copies"), "3 kopie");
  assert.equal(tn(11, "{n} sheet", "{n} sheets"), "11 arkuszy");
  setLocalePref("en");
});

test("Polish page-range errors", () => {
  setLocalePref("pl");
  assert.throws(() => parseRange("", 3), /^Error: Wpisz strony/);
  assert.throws(() => parseRange("a", 3), /„a” to nie jest numer strony/);
  assert.throws(() => parseRange("5-2", 9), /Zakres 5-2 jest odwrócony/);
  assert.throws(() => parseRange("1-4", 3), /Ten plik ma 3 strony$/);
  assert.throws(() => parseRange("2", 1), /Ten plik ma 1 stronę$/);
  assert.throws(() => parseRange("9", 5), /Ten plik ma 5 stron$/);
  setLocalePref("en");
});

test("summaries follow the language", () => {
  setLocalePref("pl");
  assert.equal(optionsSummary({ copies: 2, paper_size: "A4", color_mode: "monochrome", duplex: "long-edge" }, 5), "2 kopie · 5 stron · A4 · Czarno-biały · dwustronnie");
  setLocalePref("en");
  assert.equal(optionsSummary({ copies: 2, paper_size: "A4", color_mode: "monochrome", duplex: "long-edge" }, 5), "2 copies · 5 pages · A4 · Black & white · two-sided");
});

// Every literal key passed to t() or tn() needs a Polish entry.
test("every interface string has a Polish translation", () => {
  const files = [];
  const walk = (dir) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) f !== "i18n" && walk(p);
      else if (/\.jsx?$/.test(f)) files.push(p);
    }
  };
  walk("src");
  const missing = new Set();
  const lit = String.raw`"((?:[^"\\]|\\.)*)"`;
  for (const p of files) {
    const s = readFileSync(p, "utf8");
    for (const m of s.matchAll(new RegExp(String.raw`\bt\(\s*` + lit, "g"))) {
      const key = JSON.parse(`"${m[1]}"`);
      if (!(key in pl)) missing.add(`${p}: ${key}`);
    }
    for (const m of s.matchAll(new RegExp(String.raw`\btn\([^,]+,\s*` + lit, "g"))) {
      const key = JSON.parse(`"${m[1]}"`);
      if (typeof pl[key] !== "object") missing.add(`${p}: plural ${key}`);
    }
  }
  assert.deepEqual([...missing], []);
});

// Keys that reach t() through a lookup table rather than a literal.
test("label tables are translated", async () => {
  const src = readFileSync("src/lib/format.js", "utf8") + readFileSync("src/components/Options.jsx", "utf8") + readFileSync("src/components/PrintSheet.jsx", "utf8");
  const tables = src.match(
    /const (PAPER_NAMES|COLOR_LABELS|DUPLEX_LABELS|QUALITY_LABELS|ORIENTATION_LABELS|MEDIA_LABELS|HISTORY_STATUS|REASONS|COLOR_SHORT|DUPLEX_FIELD|DUPLEX_SUB|DUPLEX_SHORT|QUALITY_SHORT|COLOR_WORD|SIDES_WORD) = \{[\s\S]*?\n?\};/g,
  );
  assert.ok(tables.length >= 14);
  const missing = [];
  for (const block of tables) {
    for (const m of block.replace(/tone: "\w+"/g, "").matchAll(/(?:^|[{,]\s*|label:\s*)(?:[\w"-]+:\s*)?"([^"]+)"(?=\s*[,}\n])/gm)) {
      const v = m[1];
      // Paper names that read the same in Polish stay as they are.
      if (/^(A\d|B5.*|US \w+|Executive)$/.test(v) || v in pl) continue;
      missing.push(v);
    }
  }
  assert.deepEqual(missing, []);
});
