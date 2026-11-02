import { test } from "node:test";
import assert from "node:assert/strict";
import { BASE_SETTINGS, supportedChoices, reconcile, toPrintOptions, fromRequested, pickDefaults, meaningfulWarnings, defaultsToSave, savedUpsideDown } from "../src/lib/settings.js";

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
  assert.equal(c.fitOnly, true);
  assert.deepEqual(c.scaling, ["auto", "fit"]);
  assert.deepEqual(supportedChoices(null), {});
});

test("reconcile clamps unsupported values and copies", () => {
  const c = supportedChoices(OPTIONS);
  const s = reconcile({ paper_size: "Legal", quality: "high", copies: 500 }, c);
  assert.equal(s.paper_size, "A4");
  assert.equal(s.quality, "normal");
  assert.equal(s.copies, 99);
  assert.equal(reconcile({ copies: "x" }, c).copies, 1);
  assert.equal(reconcile({ scaling: "fit" }, { scaling: ["auto"] }).scaling, "auto");
});

test("toPrintOptions sends only supported options", () => {
  const c = supportedChoices(OPTIONS);
  const o = toPrintOptions({ ...BASE_SETTINGS, copies: 2, pages: "1-2", duplex: "long-edge", orientation: "portrait", scaling: "fit" }, c);
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
  // Auto orientation leaves the turn to CUPS; fit off sends nothing.
  const plain = toPrintOptions(BASE_SETTINGS, c);
  assert.equal("fit_to_page" in plain, false);
  assert.equal("orientation" in plain, false);
});

test("an old fit-to-page default becomes the fit scaling", () => {
  const c = supportedChoices(OPTIONS);
  assert.equal(reconcile({ fit_to_page: true }, c).scaling, "fit");
  assert.equal("fit_to_page" in reconcile({ fit_to_page: true }, c), false);
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
  const r = fromRequested({ copies: 3, pages: null, printer: "x" });
  assert.equal(r.copies, 3);
  assert.equal("pages" in r, false);
  assert.equal("printer" in r, false);
  // What a job left out printed at its default.
  assert.equal(r.orientation, "auto");
  assert.equal(r.pages_per_sheet, 1);
  assert.equal(fromRequested({ scale_percent: 80 }).scaling, "custom");
  assert.equal(fromRequested({ fit_to_page: true }).scaling, "fit");
  const d = pickDefaults({ ...BASE_SETTINGS, pages: "1" });
  assert.equal("pages" in d, false);
  assert.equal(d.copies, 1);
});

test("saving defaults keeps an upside-down default only while asked to", () => {
  assert.equal(savedUpsideDown({ orientation: "reverse-portrait" }), true);
  assert.equal(savedUpsideDown({ orientation: "portrait" }), false);
  assert.equal(savedUpsideDown(null), false);
  const s = { ...BASE_SETTINGS, orientation: "landscape", copies: 3 };
  assert.equal(defaultsToSave(s, true).orientation, "reverse-landscape");
  assert.equal(defaultsToSave(s, true).copies, 3);
  assert.equal(defaultsToSave(s, false).orientation, "landscape");
  assert.equal(defaultsToSave({ ...s, orientation: "reverse-portrait" }, true).orientation, "reverse-portrait");
});

// GET /options from the MG5350 queue (Gutenprint), as local_printer_api reports it.
const MG5350 = {
  paper_sizes: { supported: true, choices: ["A4", "Letter", "w288h432"] },
  duplex_modes: { supported: true, choices: ["none", "long-edge", "short-edge"] },
  color_modes: { supported: true, choices: ["monochrome", "color", "auto"] },
  quality: { supported: true, recommended_mapping: { draft: "300dpi", normal: "4", high: "5" } },
  media_types: { supported: true, mapping: { plain: "Plain", photo: "PhotoPlusGloss2" } },
  collate: { supported: true },
  fit_to_page: { supported: true },
  orientation: { supported: true, choices: ["portrait", "landscape", "reverse-landscape", "reverse-portrait"] },
  copies: { supported: true, min: 1, max: 99 },
  page_set: { supported: true, choices: ["all", "odd", "even"] },
  pages_per_sheet: { supported: true, choices: [1, 2, 4, 6, 9, 16], layouts: ["lrtb", "tblr"], borders: ["none", "single"] },
  scaling: { supported: true, choices: ["auto", "auto-fit", "fit", "fill", "none"], custom_percent: { supported: true, min: 10, max: 400 } },
  reverse_order: { supported: true },
  media_sources: { supported: true, choices: ["AutoSwitch", "Rear", "Cassette"], labels: { Rear: "Rear tray" }, default: "AutoSwitch" },
  borderless: { supported: true },
  defaults: { paper_size: "Letter", duplex: "none", color_mode: null, quality: "normal", media_type: "plain", media_source: "AutoSwitch", copies: 1, pages_per_sheet: 1, scaling: "auto" },
  advanced: [
    { keyword: "StpImageType", label: "Image Type", default: "TextGraphics", choices: [{ value: "TextGraphics", label: "Mixed" }, { value: "Photo", label: "Photograph" }] },
    { keyword: "Lonely", label: "One choice", default: "x", choices: [{ value: "x", label: "X" }] },
  ],
};

test("the print-dialog settings come from the queue", () => {
  const c = supportedChoices(MG5350);
  assert.deepEqual(c.orientation, ["auto", "portrait", "landscape"]);
  assert.deepEqual(c.scaling, ["auto", "auto-fit", "fit", "fill", "none", "custom"]);
  assert.deepEqual(c.pages_per_sheet, [1, 2, 4, 6, 9, 16]);
  assert.deepEqual(c.media_source, ["AutoSwitch", "Rear", "Cassette"]);
  // A driver option with one choice has nothing to choose.
  assert.deepEqual(c.advanced.map((a) => a.keyword), ["StpImageType"]);
  // Without saved defaults, the queue's own apply.
  const s = reconcile({}, c);
  assert.equal(s.paper_size, "Letter");
  assert.equal(s.media_source, "AutoSwitch");
  assert.equal(reconcile({ paper_size: "A4" }, c).paper_size, "A4");
});

test("print-dialog settings map to the API's PrintOptions", () => {
  const c = supportedChoices(MG5350);
  const s = reconcile(
    {
      copies: 2,
      collate: false,
      page_set: "odd",
      pages_per_sheet: 4,
      pages_per_sheet_layout: "tblr",
      page_border: "single",
      scaling: "fill",
      reverse_order: true,
      media_source: "Rear",
      borderless: true,
      advanced: { StpImageType: "Photo", Unknown: "y" },
    },
    c,
  );
  assert.deepEqual(toPrintOptions(s, c), {
    copies: 2,
    page_set: "odd",
    paper_size: "Letter",
    color_mode: "color",
    duplex: "none",
    quality: "normal",
    media_type: "plain",
    pages_per_sheet: 4,
    pages_per_sheet_layout: "tblr",
    page_border: "single",
    scaling: "fill",
    collate: false,
    reverse_order: true,
    media_source: "Rear",
    borderless: true,
    advanced: { StpImageType: "Photo" },
  });
  // A driver option at its default goes unsaid.
  assert.equal("advanced" in toPrintOptions(reconcile({ advanced: { StpImageType: "TextGraphics" } }, c), c), false);
});

test("custom scaling is sent as a percentage, for one PDF page per sheet", () => {
  const c = supportedChoices(MG5350);
  const s = reconcile({ scaling: "custom", scale_percent: 1000 }, c);
  assert.equal(s.scale_percent, 400);
  const o = toPrintOptions(s, c);
  assert.equal(o.scale_percent, 400);
  assert.equal("scaling" in o, false);
  assert.equal("scale_percent" in toPrintOptions(s, c, { isPdf: false }), false);
  assert.equal("scale_percent" in toPrintOptions({ ...s, pages_per_sheet: 2 }, c), false);
});

test("conflicts are not repeated as warnings", () => {
  assert.deepEqual(meaningfulWarnings(["A conflicts with B", "Paper tray is empty"], ["A conflicts with B"]), ["Paper tray is empty"]);
});

test("driver conflicts are worded with the driver's names", async () => {
  const { conflictText } = await import("../src/lib/settings.js");
  const c = supportedChoices({ ...MG5350, media_types: { ...MG5350.media_types, raw_option: "MediaType", labels: { PhotoPlusGloss2: "Photo Paper Plus Glossy II" } } });
  const fake = (k, v = {}) => k.replace(/\{(\w+)\}/g, (_, n) => v[n]);
  assert.equal(
    conflictText("MediaType=PhotoPlusGloss2 cannot be combined with Duplex=DuplexNoTumble", c, fake),
    "Paper type: Photo Paper Plus Glossy II can't be combined with Two-sided",
  );
  assert.equal(conflictText("StpImageType=Photo cannot be combined with Resolution=300dpi", c, fake), "Image Type: Photograph can't be combined with Resolution: 300dpi");
  assert.equal(conflictText("something else", c, fake), "something else");
});

test("a reprint keeps the page order a job printed with, not a saved one", () => {
  const c = supportedChoices(MG5350);
  const s = reconcile({ pages_per_sheet_layout: "tblr", ...fromRequested({ copies: 1, pages_per_sheet: 4 }) }, c);
  assert.equal(s.pages_per_sheet_layout, "lrtb");
  assert.equal(toPrintOptions(s, c).pages_per_sheet_layout, "lrtb");
});
