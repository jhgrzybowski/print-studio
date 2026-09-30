import { test } from "node:test";
import assert from "node:assert/strict";
import { BASE_SETTINGS, supportedChoices, reconcile, toPrintOptions, fromRequested, pickDefaults, meaningfulWarnings } from "../src/lib/settings.js";

// Shape of GET /options from local_printer_api.
const OPTIONS = {
  paper_sizes: { supported: true, choices: ["A4", "Letter", "A5"] },
  orientation: { supported: true, choices: ["portrait", "landscape"] },
  color_modes: { supported: true, choices: ["color", "monochrome"] },
  duplex_modes: { supported: false, choices: ["none", "long-edge"] },
  quality: { supported: true, recommended_mapping: { draft: "300dpi", normal: "600dpi", high: null } },
  media_types: { supported: true, mapping: { plain: "Plain", photo: "Glossy" } },
  fit_to_page: { supported: true },
};

test("supportedChoices keeps only supported values", () => {
  const c = supportedChoices(OPTIONS);
  assert.deepEqual(c.paper_size, ["A4", "Letter", "A5"]);
  assert.deepEqual(c.duplex, []);
  assert.deepEqual(c.quality, ["draft", "normal"]);
  assert.deepEqual(c.media_type, ["plain", "photo"]);
  assert.equal(c.fit_to_page, true);
  assert.deepEqual(supportedChoices(null), {});
});

test("reconcile clamps unsupported values and copies", () => {
  const c = supportedChoices(OPTIONS);
  const s = reconcile({ paper_size: "Legal", quality: "high", copies: 500 }, c);
  assert.equal(s.paper_size, "A4");
  assert.equal(s.quality, "normal");
  assert.equal(s.copies, 99);
  assert.equal(reconcile({ copies: "x" }, c).copies, 1);
  assert.equal(reconcile({ fit_to_page: true }, { fit_to_page: false }).fit_to_page, false);
});

test("toPrintOptions sends only supported options", () => {
  const c = supportedChoices(OPTIONS);
  const o = toPrintOptions({ ...BASE_SETTINGS, copies: 2, pages: "1-2", duplex: "long-edge", fit_to_page: true }, c);
  assert.deepEqual(o, {
    copies: 2,
    pages: "1-2",
    paper_size: "A4",
    orientation: "portrait",
    color_mode: "color",
    quality: "normal",
    media_type: "plain",
    fit_to_page: true,
  });
  assert.equal("fit_to_page" in toPrintOptions(BASE_SETTINGS, c), false);
});

test("meaningfulWarnings drops the per-option mapping notes", () => {
  const notes = [
    "Mapped fit_to_page through detected fit-to-page option",
    "Mapped color mode through detected PPD ColorModel option",
    "Mapped quality to detected cupsPrintQuality=Normal",
  ];
  assert.deepEqual(meaningfulWarnings([...notes, "Paper tray is empty"]), ["Paper tray is empty"]);
  assert.deepEqual(meaningfulWarnings(undefined), []);
});

test("fromRequested and pickDefaults keep known keys only", () => {
  assert.deepEqual(fromRequested({ copies: 3, pages: null, printer: "x" }), { copies: 3 });
  const d = pickDefaults({ ...BASE_SETTINGS, pages: "1" });
  assert.equal("pages" in d, false);
  assert.equal(d.copies, 1);
});
