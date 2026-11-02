// The sheet plan for the settings in hand, drawn before /print/validate answers.
import { planLayout } from "./layout.js";
import { printOrder } from "./pages.js";
import { paperMM } from "./format.js";
import { toPrintOptions } from "./settings.js";

const PT_PER_MM = 72 / 25.4;
const A4 = { width: 595, height: 842 };

/** The paper the job lands on: the chosen size, or the queue's default. */
export function paperFor(keyword, choices) {
  const key = keyword && (choices.paper_size || []).includes(keyword) ? keyword : choices.queueDefaults?.paper_size || keyword || "A4";
  const known = choices.paperDetails?.[key];
  if (known) return known;
  const [w, h] = paperMM(key);
  return { keyword: key, label: key, width: w * PT_PER_MM, height: h * PT_PER_MM, margins: [0, 0, 0, 0] };
}

/**
 * Plan sheets the way the API does. `geometry` is the preview's page list ({ page, width_pt,
 * height_pt }); pages without a size are taken as A4. Returns null when no page is selected.
 */
export function localPlan(settings, choices, geometry, pageCount, { isPdf = true } = {}) {
  return planFromOptions(toPrintOptions(settings, choices, { isPdf }), choices, geometry, pageCount);
}

/** Plan sheets from options as sent to the API (a history record's requested_options, say). */
export function planFromOptions(o, choices, geometry, pageCount) {
  const order = printOrder(o.pages || "", pageCount, o.page_set || "all");
  if (!order.length) return null;
  const sizes = new Map((geometry || []).map((g) => [g.page, g]));
  const pages = order.map((n) => {
    const g = sizes.get(n);
    return { number: n, width: g?.width_pt || A4.width, height: g?.height_pt || A4.height };
  });
  return planLayout(pages, paperFor(o.paper_size, choices), {
    orientation: o.orientation || null,
    pagesPerSheet: o.pages_per_sheet || 1,
    pagesPerSheetLayout: o.pages_per_sheet_layout || null,
    pageBorder: o.page_border || null,
    scaling: o.scale_percent != null ? "none" : o.scaling || (o.fit_to_page ? "fit" : null),
    scalePercent: o.scale_percent ?? null,
    twoSided: !!o.duplex && o.duplex !== "none",
    copies: o.copies,
    borderless: !!o.borderless,
    reverseOrder: !!o.reverse_order,
  });
}
