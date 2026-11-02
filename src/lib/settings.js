// Print settings model shared by the toolbar, the phone sheet, saved defaults, and reprints.
// The values are the API's own (PrintOptions in local_printer_api), plus two of the app's:
// orientation "auto" (sent as no orientation, so CUPS turns each page to suit the paper) and
// scaling "custom" (sent as scale_percent).

export const BASE_SETTINGS = {
  copies: 1,
  pages: "",
  page_set: "all",
  paper_size: "A4",
  orientation: "auto",
  color_mode: "color",
  duplex: "none",
  quality: "normal",
  media_type: "plain",
  scaling: "auto",
  scale_percent: 100,
  pages_per_sheet: 1,
  pages_per_sheet_layout: "lrtb",
  page_border: "none",
  collate: true,
  reverse_order: false,
  media_source: "",
  borderless: false,
  advanced: {},
};

const DEFAULT_KEYS = [
  "copies",
  "paper_size",
  "orientation",
  "color_mode",
  "duplex",
  "quality",
  "media_type",
  "scaling",
  "scale_percent",
  "pages_per_sheet",
  "pages_per_sheet_layout",
  "page_border",
  "collate",
  "reverse_order",
  "media_source",
  "borderless",
  "advanced",
];

// Settings whose absence from a sent job means their default, not "unsupported".
const OMITTED_MEANS = {
  orientation: "auto",
  page_set: "all",
  scaling: "auto",
  pages_per_sheet: 1,
  // CUPS lays pages out left to right, then down, unless told otherwise.
  pages_per_sheet_layout: "lrtb",
  page_border: "none",
  reverse_order: false,
  borderless: false,
  advanced: {},
};

export const SCALE_RANGE = [10, 400];
const LIST_KEYS = ["paper_size", "orientation", "color_mode", "duplex", "quality", "media_type", "scaling", "pages_per_sheet", "pages_per_sheet_layout", "page_border", "page_set"];

/** Which choices the printer supports for each setting, from GET /options. */
export function supportedChoices(options) {
  if (!options) return {};
  const q = options.quality;
  const orient = options.orientation?.supported ? options.orientation.choices.filter((v) => !/^reverse-/.test(v)) : [];
  const sc = options.scaling;
  const nup = options.pages_per_sheet;
  const src = options.media_sources;
  let scaling = [];
  let fitOnly = false;
  if (sc?.supported) {
    scaling = [...sc.choices];
    if (sc.custom_percent?.supported) scaling.push("custom");
  } else if (options.fit_to_page?.supported) {
    // Older queues scale only through a driver option: fit, or leave the page as it is.
    scaling = ["auto", "fit"];
    fitOnly = true;
  }
  return {
    paper_size: options.paper_sizes?.supported ? options.paper_sizes.choices : [],
    orientation: orient.length ? ["auto", ...orient] : [],
    // Upside-down orientations stay sendable for prints whose pages can't be turned here.
    orientationRaw: options.orientation?.supported ? options.orientation.choices : [],
    color_mode: options.color_modes?.supported ? options.color_modes.choices : [],
    duplex: options.duplex_modes?.supported ? options.duplex_modes.choices : [],
    quality: q?.supported
      ? Object.entries(q.recommended_mapping || {})
          .filter(([, v]) => v)
          .map(([k]) => k)
      : [],
    media_type: options.media_types?.supported ? Object.keys(options.media_types.mapping || {}) : [],
    media_type_labels: Object.fromEntries(Object.entries(options.media_types?.mapping || {}).map(([k, raw]) => [k, options.media_types.labels?.[raw] || raw])),
    scaling,
    fitOnly,
    customScale: sc?.custom_percent?.supported ? { min: sc.custom_percent.min ?? SCALE_RANGE[0], max: sc.custom_percent.max ?? SCALE_RANGE[1] } : null,
    pages_per_sheet: nup?.supported ? nup.choices : [],
    pages_per_sheet_layout: nup?.supported ? nup.layouts || [] : [],
    page_border: nup?.supported ? nup.borders || [] : [],
    page_set: options.page_set?.supported ? options.page_set.choices : [],
    collate: !!options.collate?.supported,
    reverse_order: !!options.reverse_order?.supported,
    media_source: src?.supported ? src.choices : [],
    media_source_labels: src?.labels || {},
    borderless: !!options.borderless?.supported,
    advanced: Array.isArray(options.advanced) ? options.advanced.filter((a) => a.choices?.length > 1) : [],
    driverNames: driverNames(options),
    queueDefaults: queueDefaults(options.defaults),
    paperDetails: paperDetails(options.paper_sizes),
    copiesMax: options.copies?.max || 99,
    driver: options.driver || null,
  };
}

/** Sheet size and unprintable margins by paper keyword, in points (margins: left, bottom, right, top). */
function paperDetails(block) {
  const out = {};
  for (const d of block?.details || []) {
    const m = d.margins_pt;
    out[d.value] = { keyword: d.value, label: d.label, width: d.width_pt, height: d.height_pt, margins: m ? [m.left, m.bottom, m.right, m.top] : [0, 0, 0, 0] };
  }
  return out;
}

/** Driver option and choice names by keyword, to word the driver's constraint conflicts. */
function driverNames(options) {
  const out = {};
  for (const a of Array.isArray(options.advanced) ? options.advanced : []) {
    out[a.keyword] = { label: a.label, values: Object.fromEntries(a.choices.map((c) => [c.value, c.label])) };
  }
  if (options.media_types?.raw_option) out[options.media_types.raw_option] = { setting: "Paper type", values: options.media_types.labels || {} };
  if (options.media_sources?.raw_option) out[options.media_sources.raw_option] = { setting: "Paper source", values: options.media_sources.labels || {} };
  if (options.paper_sizes?.raw_option) out[options.paper_sizes.raw_option] = { setting: "Paper size", values: options.paper_sizes.labels || {} };
  out.Duplex = { setting: "Two-sided", values: { DuplexNoTumble: "", DuplexTumble: "" } };
  out.StpFullBleed = { setting: "Borderless", values: { True: "" } };
  out.ColorModel = out.ColorModel || { setting: "Color", values: {} };
  return out;
}

/** The queue's own defaults, for anyone who hasn't saved their own. */
function queueDefaults(d) {
  if (!d) return {};
  const out = {};
  for (const key of ["paper_size", "duplex", "color_mode", "quality", "media_type", "media_source", "pages_per_sheet", "scaling"]) {
    if (d[key] != null) out[key] = d[key];
  }
  return out;
}

/**
 * Clamp settings to what the printer supports. Layers: the app's base, the queue's defaults,
 * then the settings given.
 */
export function reconcile(settings, choices) {
  const given = { ...settings };
  // Fit to page became a scaling mode.
  if (given.fit_to_page && (!given.scaling || given.scaling === "auto")) given.scaling = "fit";
  delete given.fit_to_page;
  const out = { ...BASE_SETTINGS, ...(choices.queueDefaults || {}), ...given };
  // Upside down is a turn of the pages now, not an orientation.
  if (/^reverse-/.test(out.orientation || "")) out.orientation = out.orientation.slice(8);
  out.pages_per_sheet = Number(out.pages_per_sheet) || 1;
  for (const key of LIST_KEYS) {
    const list = choices[key];
    if (list && list.length && !list.includes(out[key])) {
      const fallback = choices.queueDefaults?.[key];
      out[key] = list.includes(fallback) ? fallback : list.includes(BASE_SETTINGS[key]) ? BASE_SETTINGS[key] : list[0];
    }
  }
  const sources = choices.media_source || [];
  if (sources.length && !sources.includes(out.media_source)) {
    const fallback = choices.queueDefaults?.media_source;
    out.media_source = sources.includes(fallback) ? fallback : sources[0];
  }
  out.copies = Math.min(choices.copiesMax || 99, Math.max(1, Number(out.copies) || 1));
  out.scale_percent = Math.min(SCALE_RANGE[1], Math.max(SCALE_RANGE[0], Math.round(Number(out.scale_percent) || 100)));
  for (const key of ["collate", "reverse_order", "borderless"]) out[key] = !!out[key];
  out.advanced = cleanAdvanced(out.advanced, choices.advanced);
  return out;
}

/** Keep advanced choices the driver lists; unknown driver lists keep everything. */
function cleanAdvanced(advanced, list) {
  if (!advanced || typeof advanced !== "object") return {};
  if (!list) return { ...advanced };
  const out = {};
  for (const [k, v] of Object.entries(advanced)) {
    const opt = list.find((a) => a.keyword === k);
    if (opt && opt.choices.some((c) => c.value === v)) out[k] = v;
  }
  return out;
}

/** Whether custom scaling is allowed: the API scales PDF content itself, one page per sheet. */
export const canCustomScale = (settings, choices, isPdf) => !!choices.customScale && isPdf && Number(settings.pages_per_sheet) <= 1;

/** Build the `options` object sent to /print and /print/validate. */
export function toPrintOptions(settings, choices, { isPdf = true } = {}) {
  const o = { copies: settings.copies };
  if (settings.pages) o.pages = settings.pages;
  const has = (key) => (choices[key] || []).includes(settings[key]);
  if (settings.page_set && settings.page_set !== "all" && has("page_set")) o.page_set = settings.page_set;
  for (const key of ["paper_size", "color_mode", "duplex", "quality", "media_type"]) {
    if (settings[key] && has(key)) o[key] = settings[key];
  }
  if (settings.orientation && settings.orientation !== "auto" && (has("orientation") || (choices.orientationRaw || []).includes(settings.orientation))) {
    o.orientation = settings.orientation;
  }

  const nup = Number(settings.pages_per_sheet) || 1;
  if (nup > 1 && has("pages_per_sheet")) {
    o.pages_per_sheet = nup;
    if (has("pages_per_sheet_layout")) o.pages_per_sheet_layout = settings.pages_per_sheet_layout;
    if (settings.page_border && settings.page_border !== "none" && has("page_border")) o.page_border = settings.page_border;
  }

  const scaling = settings.scaling;
  if (choices.fitOnly) {
    if (scaling === "fit") o.fit_to_page = true;
  } else if (scaling === "custom") {
    if (canCustomScale(settings, choices, isPdf)) o.scale_percent = settings.scale_percent;
  } else if (scaling && has("scaling")) {
    o.scaling = scaling;
  }

  if (settings.copies > 1 && choices.collate) o.collate = !!settings.collate;
  if (settings.reverse_order && choices.reverse_order) o.reverse_order = true;
  if (settings.media_source && (choices.media_source || []).includes(settings.media_source)) o.media_source = settings.media_source;
  if (settings.borderless && choices.borderless) o.borderless = true;

  // Only driver options changed from the driver's own default go out.
  const advanced = {};
  for (const opt of choices.advanced || []) {
    const v = settings.advanced?.[opt.keyword];
    if (v != null && v !== opt.default && opt.choices.some((c) => c.value === v)) advanced[opt.keyword] = v;
  }
  if (Object.keys(advanced).length) o.advanced = advanced;
  return o;
}

/** Settings from a history record's requested_options. */
export function fromRequested(requested = {}) {
  if (!requested) return {};
  const s = {};
  for (const key of Object.keys(BASE_SETTINGS)) {
    if (requested[key] !== undefined && requested[key] !== null) s[key] = requested[key];
  }
  // A job leaves out what is at its default, so a gap is that default rather than the saved one.
  for (const [k, v] of Object.entries(OMITTED_MEANS)) if (s[k] === undefined) s[k] = v;
  if (requested.scale_percent != null) s.scaling = "custom";
  else if (requested.fit_to_page && !requested.scaling) s.scaling = "fit";
  if (requested.copies > 1 && requested.collate == null) s.collate = true;
  return s;
}

/** Whether saved defaults ask for upside-down prints (the old reverse orientations). */
export const savedUpsideDown = (saved) => /^reverse-/.test(saved?.orientation || "");

/**
 * Defaults to save, keeping the upside-down marker the settings screen can't show: it stays
 * while the orientation is the one it was saved with, and goes once that is changed.
 */
export function defaultsToSave(settings, upsideDown) {
  const out = pickDefaults(settings);
  if (upsideDown && out.orientation && !/^reverse-/.test(out.orientation)) {
    out.orientation = `reverse-${out.orientation === "auto" ? "portrait" : out.orientation}`;
  }
  return out;
}

export function pickDefaults(settings) {
  const out = {};
  for (const k of DEFAULT_KEYS) out[k] = settings[k];
  return out;
}

/** Whether two settings objects save the same defaults. */
export const sameDefaults = (a, b) => stable(pickDefaults(a)) === stable(pickDefaults(b));
const stable = (v) =>
  v && typeof v === "object" && !Array.isArray(v)
    ? `{${Object.keys(v)
        .sort()
        .map((k) => `${k}:${stable(v[k])}`)
        .join(",")}}`
    : JSON.stringify(v);

/** How many of the less common settings differ from the base, to mark the control that holds them. */
export function changedCount(settings, keys) {
  return keys.filter((k) => {
    if (k === "advanced") return Object.keys(settings.advanced || {}).length > 0;
    return settings[k] !== BASE_SETTINGS[k];
  }).length;
}

// Warnings the backend emits for every mapped option; they add noise, not information.
const NOISE = [
  /^Mapped .+ (?:to|through) detected /i,
  /^Ignored fit_to_page/i,
  /collate/i,
  /preserve the user-specified page order/i,
  /^Ignored pages_per_sheet_layout/i,
];
export const meaningfulWarnings = (list = [], conflicts = []) => (list || []).filter((w) => !NOISE.some((re) => re.test(w)) && !conflicts.includes(w));

/**
 * A driver constraint in words: "Paper type: Glossy Photo Paper can't be combined with Two-sided".
 * `translate` is t(), passed in so this module stays free of the interface strings.
 */
export function conflictText(text, choices, translate) {
  const m = /^(\S+?)=(\S+) cannot be combined with (\S+?)=(\S+)$/.exec(text || "");
  if (!m) return text;
  const name = (opt, value) => {
    const d = choices.driverNames?.[opt];
    const label = d?.setting ? translate(d.setting) : d?.label || opt;
    const v = d?.values?.[value];
    return v === "" ? label : `${label}: ${v || value}`;
  };
  return translate("{a} can't be combined with {b}", { a: name(m[1], m[2]), b: name(m[3], m[4]) });
}
