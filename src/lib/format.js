// Human-facing labels for API values.

export function formatBytes(n) {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  const mb = n / 1024 / 1024;
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}

// The interface is English; a fixed locale keeps dates from mixing languages with the browser's.
const LOCALE = "en-GB";
const timeFmt = new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat(LOCALE, { weekday: "long" });
const dateFmt = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short" });
const fullFmt = new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeStyle: "short" });

export const formatTime = (d) => timeFmt.format(new Date(d));
export const formatDateTime = (d) => fullFmt.format(new Date(d));

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Group label for the history list. */
export function dayGroup(d) {
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return dayFmt.format(new Date(d));
  return dateFmt.format(new Date(d));
}

export function shortWhen(d) {
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  return days <= 0 ? formatTime(d) : `${dateFmt.format(new Date(d))}, ${formatTime(d)}`;
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
  if (!v) return "Printer default";
  if (PAPER_NAMES[v]) return PAPER_NAMES[v];
  const m = /^w(\d+)h(\d+)(J|_l)?$/.exec(v);
  if (m) {
    const w = Math.round((Number(m[1]) / 72) * 25.4);
    const h = Math.round((Number(m[2]) / 72) * 25.4);
    return `${w} × ${h} mm`;
  }
  return v.replace(/_l$/, " (long edge)").replace(/_/g, " ");
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

export const COLOR_LABELS = { color: "Color", monochrome: "Black & white", auto: "Auto" };
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

export function mediaLabel(v) {
  if (!v) return "Printer default";
  if (MEDIA_LABELS[v]) return MEDIA_LABELS[v];
  return v.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/(\d)/, " $1");
}

export const HISTORY_STATUS = {
  submitted: { label: "Sent", tone: "active" },
  pending: { label: "Queued", tone: "active" },
  "pending-held": { label: "Held", tone: "warn" },
  processing: { label: "Printing", tone: "active" },
  "processing-stopped": { label: "Stopped", tone: "warn" },
  "cancel-requested": { label: "Cancelling", tone: "active" },
  canceled: { label: "Cancelled", tone: "muted" },
  aborted: { label: "Failed", tone: "error" },
  completed: { label: "Printed", tone: "ok" },
  forgotten: { label: "Cleared", tone: "muted" },
};

export const ACTIVE_STATUSES = new Set(["submitted", "pending", "pending-held", "processing", "processing-stopped", "cancel-requested"]);
export const TERMINAL_STATUSES = new Set(["canceled", "aborted", "completed"]);

/** Summarise print options in one line. */
export function optionsSummary(o = {}, pageCount) {
  const parts = [];
  if (o.copies && o.copies > 1) parts.push(`${o.copies} copies`);
  if (o.pages) parts.push(`pages ${o.pages.replace(/,/g, ", ")}`);
  else if (pageCount) parts.push(`${pageCount} page${pageCount === 1 ? "" : "s"}`);
  if (o.paper_size) parts.push(paperName(o.paper_size));
  if (o.color_mode) parts.push(COLOR_LABELS[o.color_mode] || o.color_mode);
  if (o.duplex && o.duplex !== "none") parts.push(`two-sided`);
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
  return REASONS[base] || REASONS[r] || base.replace(/-/g, " ");
}

export function fileKind(mime = "", name = "") {
  const ext = name.split(".").pop()?.toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (["xlsx", "ods", "xls"].includes(ext) || mime.includes("spreadsheet")) return "sheet";
  if (["pptx", "odp", "ppt"].includes(ext) || mime.includes("presentation")) return "slides";
  return "doc";
}

const longDateFmt = new Intl.DateTimeFormat(LOCALE, { dateStyle: "long" });
export const formatDate = (d) => longDateFmt.format(new Date(d));
