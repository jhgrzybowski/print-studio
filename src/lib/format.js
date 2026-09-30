// Human-facing labels for API values.
import { getLocale, t, tn } from "../i18n/index.js";

export function formatBytes(n) {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  const mb = n / 1024 / 1024;
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}

// Dates follow the interface language, not the browser's, so a screen never mixes the two.
const INTL_LOCALE = { en: "en-GB", pl: "pl-PL" };
const FORMATS = {
  time: { hour: "2-digit", minute: "2-digit" },
  day: { weekday: "long" },
  date: { day: "numeric", month: "short" },
  full: { dateStyle: "medium", timeStyle: "short" },
  long: { dateStyle: "long" },
};
const fmtCache = {};
function fmt(kind) {
  const loc = INTL_LOCALE[getLocale()] || "en-GB";
  return (fmtCache[`${loc}:${kind}`] ||= new Intl.DateTimeFormat(loc, FORMATS[kind]));
}
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const formatTime = (d) => fmt("time").format(new Date(d));
export const formatDateTime = (d) => fmt("full").format(new Date(d));

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Group label for the history list. */
export function dayGroup(d) {
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (days <= 0) return t("Today");
  if (days === 1) return t("Yesterday");
  // Polish weekdays are lowercase mid-sentence; this is a heading.
  if (days < 7) return capitalize(fmt("day").format(new Date(d)));
  return fmt("date").format(new Date(d));
}

export function shortWhen(d) {
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  return days <= 0 ? formatTime(d) : `${fmt("date").format(new Date(d))}, ${formatTime(d)}`;
}

export function initials(user) {
  const name = (user?.display_name || user?.username || "?").trim();
  const parts = name.split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || name[0].toUpperCase();
}

// Friendly names for the raw PPD PageSize values the printer reports.
const PAPER_NAMES = {
  A4: "A4",
  A5: "A5",
  A6: "A6",
  Letter: "US Letter",
  Legal: "US Legal",
  Executive: "Executive",
  B5: "B5 (JIS)",
  ISOB5: "B5",
  Postcard: "Postcard (Hagaki)",
  w288h432: "Photo 4 × 6 in",
  w360h504: "Photo 5 × 7 in",
  w576h864: "Photo 8 × 12 in",
  c8x10: "Photo 8 × 10 in",
  w252h360: "Photo 3.5 × 5 in",
  DL: "Envelope DL",
  COM10: "Envelope #10",
  C5: "Envelope C5",
  C6: "Envelope C6",
};
// Size in mm (width × height, portrait) for the paper preview.
const PAPER_MM = {
  A4: [210, 297],
  A5: [148, 210],
  A6: [105, 148],
  Letter: [215.9, 279.4],
  Legal: [215.9, 355.6],
  Executive: [184.2, 266.7],
  B5: [182, 257],
  ISOB5: [176, 250],
  Postcard: [100, 148],
  c8x10: [203.2, 254],
  DL: [110, 220],
  COM10: [104.8, 241.3],
  C5: [162, 229],
  C6: [114, 162],
};
const PAPER_COMMON = ["A4", "Letter", "A5", "A6", "Legal", "w288h432", "w360h504", "c8x10", "Postcard", "DL", "C5", "C6"];

export function paperName(v) {
  if (!v) return t("Printer default");
  if (PAPER_NAMES[v]) return t(PAPER_NAMES[v]);
  const m = /^w(\d+)h(\d+)(J|_l)?$/.exec(v);
  if (m) {
    const w = Math.round((Number(m[1]) / 72) * 25.4);
    const h = Math.round((Number(m[2]) / 72) * 25.4);
    return `${w} × ${h} mm`;
  }
  return v.replace(/_l$/, t("paper| (long edge)")).replace(/_/g, " ");
}

export function paperMM(v) {
  if (PAPER_MM[v]) return PAPER_MM[v];
  const m = /^w(\d+)h(\d+)/.exec(v || "");
  if (m) return [(Number(m[1]) / 72) * 25.4, (Number(m[2]) / 72) * 25.4];
  return PAPER_MM.A4;
}

/** Split printer paper choices into a short common list and the rest. */
export function paperGroups(choices = []) {
  const set = new Set(choices);
  const common = PAPER_COMMON.filter((c) => set.has(c));
  const rest = choices.filter((c) => !common.includes(c)).sort((a, b) => paperName(a).localeCompare(paperName(b), undefined, { numeric: true }));
  return { common, rest };
}

// English keys; show them through label() or t() so they follow the interface language.
export const COLOR_LABELS = { color: "Color", monochrome: "Black & white", auto: "color|Auto" };
export const DUPLEX_LABELS = { none: "One-sided", "long-edge": "Long edge", "short-edge": "Short edge" };
export const QUALITY_LABELS = { draft: "Draft", normal: "Standard", high: "High" };
export const ORIENTATION_LABELS = {
  portrait: "Portrait",
  landscape: "Landscape",
  "reverse-portrait": "Portrait, flipped",
  "reverse-landscape": "Landscape, flipped",
};
export const MEDIA_LABELS = {
  plain: "Plain paper",
  photo: "Photo paper",
  glossy: "Glossy",
  matte: "Matte photo",
};

/** Translated label from one of the maps above, or the raw value. */
export const label = (map, v) => (map[v] ? t(map[v]) : v);

export function mediaLabel(v) {
  if (!v) return t("Printer default");
  if (MEDIA_LABELS[v]) return t(MEDIA_LABELS[v]);
  return v.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/(\d)/, " $1");
}

// Labels are keys: show them with t(). "job|" marks the state of a print job.
export const HISTORY_STATUS = {
  submitted: { label: "job|Sent", tone: "active" },
  pending: { label: "job|Queued", tone: "active" },
  "pending-held": { label: "job|Held", tone: "warn" },
  processing: { label: "job|Printing", tone: "active" },
  "processing-stopped": { label: "job|Stopped", tone: "warn" },
  "cancel-requested": { label: "job|Cancelling", tone: "active" },
  canceled: { label: "job|Cancelled", tone: "muted" },
  aborted: { label: "job|Failed", tone: "error" },
  completed: { label: "job|Printed", tone: "ok" },
  forgotten: { label: "job|Cleared", tone: "muted" },
};

export const ACTIVE_STATUSES = new Set(["submitted", "pending", "pending-held", "processing", "processing-stopped", "cancel-requested"]);
export const TERMINAL_STATUSES = new Set(["canceled", "aborted", "completed"]);

/** Summarise print options in one line. */
export function optionsSummary(o = {}, pageCount) {
  const parts = [];
  if (o.copies && o.copies > 1) parts.push(tn(o.copies, "{n} copy", "{n} copies"));
  if (o.pages) parts.push(t("pages {range}", { range: o.pages.replace(/,/g, ", ") }));
  else if (pageCount) parts.push(tn(pageCount, "{n} page", "{n} pages"));
  if (o.paper_size) parts.push(paperName(o.paper_size));
  if (o.color_mode) parts.push(label(COLOR_LABELS, o.color_mode));
  if (o.duplex && o.duplex !== "none") parts.push(t("two-sided"));
  return parts.join(" · ");
}

// Friendly text for common CUPS printer-state-reasons.
const REASONS = {
  "media-empty": "Out of paper",
  "media-needed": "Load paper",
  "media-jam": "Paper jam",
  "marker-supply-low": "Ink is low",
  "marker-supply-empty": "Out of ink",
  "toner-low": "Ink is low",
  "toner-empty": "Out of ink",
  "door-open": "A cover is open",
  "cover-open": "A cover is open",
  "offline-report": "Printer reports offline",
  paused: "Queue paused",
  "connecting-to-device": "Connecting to printer",
  other: "Printer needs attention",
};

export function reasonText(r) {
  if (!r || r === "none") return "";
  const base = r.replace(/-(error|warning|report)$/, "");
  const known = REASONS[base] || REASONS[r];
  return known ? t(known) : base.replace(/-/g, " ");
}

export function fileKind(mime = "", name = "") {
  const ext = name.split(".").pop()?.toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (["xlsx", "ods", "xls"].includes(ext) || mime.includes("spreadsheet")) return "sheet";
  if (["pptx", "odp", "ppt"].includes(ext) || mime.includes("presentation")) return "slides";
  return "doc";
}

export const formatDate = (d) => fmt("long").format(new Date(d));
