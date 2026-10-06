// Print settings model shared by the tool pane, saved defaults, and reprints.

export const BASE_SETTINGS = {
  copies: 1,
  pages: "",
  paper_size: "A4",
  orientation: "portrait",
  color_mode: "color",
  duplex: "none",
  quality: "normal",
  media_type: "plain",
  fit_to_page: false,
};

const DEFAULT_KEYS = ["copies", "paper_size", "orientation", "color_mode", "duplex", "quality", "media_type", "fit_to_page"];

/** Which choices the printer supports for each setting, from GET /options. */
export function supportedChoices(options) {
  if (!options) return {};
  const q = options.quality;
  return {
    paper_size: options.paper_sizes?.supported ? options.paper_sizes.choices : [],
    orientation: options.orientation?.supported ? options.orientation.choices : [],
    color_mode: options.color_modes?.supported ? options.color_modes.choices : [],
    duplex: options.duplex_modes?.supported ? options.duplex_modes.choices : [],
    quality: q?.supported
      ? Object.entries(q.recommended_mapping || {})
          .filter(([, v]) => v)
          .map(([k]) => k)
      : [],
    media_type: options.media_types?.supported ? Object.keys(options.media_types.mapping || {}) : [],
    fit_to_page: !!options.fit_to_page?.supported,
  };
}

/** Clamp a settings object to what the printer supports. */
export function reconcile(settings, choices) {
  const out = { ...BASE_SETTINGS, ...settings };
  // Upside down is a turn of the pages now, not an orientation.
  if (/^reverse-/.test(out.orientation || "")) out.orientation = out.orientation.slice(8);
  for (const key of ["paper_size", "orientation", "color_mode", "duplex", "quality", "media_type"]) {
    const list = choices[key];
    if (list && list.length && !list.includes(out[key])) {
      out[key] = list.includes(BASE_SETTINGS[key]) ? BASE_SETTINGS[key] : list[0];
    }
  }
  out.copies = Math.min(99, Math.max(1, Number(out.copies) || 1));
  if (choices.fit_to_page === false) out.fit_to_page = false;
  return out;
}

/** Build the `options` object sent to /print and /print/validate. */
export function toPrintOptions(settings, choices) {
  const o = { copies: settings.copies };
  if (settings.pages) o.pages = settings.pages;
  for (const key of ["paper_size", "orientation", "color_mode", "duplex", "quality", "media_type"]) {
    const list = choices[key];
    if (settings[key] && (!list || list.length === 0 ? false : list.includes(settings[key]))) o[key] = settings[key];
  }
  if (settings.fit_to_page && choices.fit_to_page) o.fit_to_page = true;
  return o;
}

/** Settings from a history record's requested_options. */
export function fromRequested(requested = {}) {
  const s = {};
  for (const key of Object.keys(BASE_SETTINGS)) {
    if (requested[key] !== undefined && requested[key] !== null) s[key] = requested[key];
  }
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
  if (upsideDown && out.orientation && !/^reverse-/.test(out.orientation)) out.orientation = `reverse-${out.orientation}`;
  return out;
}

export function pickDefaults(settings) {
  const out = {};
  for (const k of DEFAULT_KEYS) out[k] = settings[k];
  return out;
}

// Warnings the backend emits for every mapped option; they add noise, not information.
const NOISE = [/^Mapped .+ (?:to|through) detected /i, /^Ignored fit_to_page/i, /collate/i, /preserve the user-specified page order/i];
export const meaningfulWarnings = (list = []) => list.filter((w) => !NOISE.some((re) => re.test(w)));
