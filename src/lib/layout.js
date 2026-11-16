// How the selected pages land on sheets: a port of the API's layout planner
// (local_printer_api app/services/layout.py). /print/validate returns the same
// plan, but planning here too redraws the preview the moment a setting changes,
// before the dry run answers. Fractions are of the sheet, from its top-left corner.

// Grid (long side, short side) per pages-per-sheet value.
export const NUP_GRID = { 1: [1, 1], 2: [2, 1], 4: [2, 2], 6: [3, 2], 9: [3, 3], 16: [4, 4] };

const r2 = (n) => Math.round(n * 100) / 100;
const r4 = (n) => Math.round(n * 1e4) / 1e4;

/**
 * pages: [{ number, width, height }] in points, in print order.
 * paper: { keyword, label, width, height, margins: [left, bottom, right, top] } in points, portrait.
 */
export function planLayout(pages, paper, opts = {}) {
  const {
    orientation = null,
    pagesPerSheetLayout = null,
    pageBorder = null,
    scaling = null,
    scalePercent = null,
    twoSided = false,
    copies = 1,
    borderless = false,
    reverseOrder = false,
  } = opts;
  const perSheet = NUP_GRID[opts.pagesPerSheet] ? opts.pagesPerSheet : 1;
  const mode = scalePercent != null ? "custom" : scaling || "auto";
  const impressions = pages.length ? Math.ceil(pages.length / perSheet) : 0;
  const sheetsPerCopy = twoSided ? Math.ceil(impressions / 2) : impressions;

  const sides = [];
  for (let i = 0; i < impressions; i++) {
    const group = pages.slice(i * perSheet, (i + 1) * perSheet);
    const side =
      perSheet === 1
        ? singlePageSide(group[0], paper, orientation, mode, scalePercent, borderless)
        : nupSide(group, paper, orientation, perSheet, pagesPerSheetLayout, borderless);
    side.sheet = twoSided ? Math.floor(i / 2) + 1 : i + 1;
    side.face = twoSided && i % 2 ? "back" : "front";
    sides.push(side);
  }

  return {
    paper: { keyword: paper.keyword, label: paper.label, width_pt: r2(paper.width), height_pt: r2(paper.height) },
    pages_per_sheet: perSheet,
    pages_per_sheet_layout: perSheet > 1 ? pagesPerSheetLayout || "lrtb" : null,
    page_border: perSheet > 1 && pageBorder && pageBorder !== "none" ? pageBorder : null,
    scaling: mode,
    scale_percent: scalePercent,
    selected_page_count: pages.length,
    impressions_per_copy: impressions,
    sheets_per_copy: sheetsPerCopy,
    copies,
    total_sheets: sheetsPerCopy * copies,
    reverse_order: reverseOrder,
    sides,
  };
}

/** Width, height and [left, top, right, bottom] margins of the sheet as viewed. */
function frame(paper, landscape, borderless) {
  const [left, bottom, right, top] = borderless ? [0, 0, 0, 0] : paper.margins || [0, 0, 0, 0];
  // Turning a portrait sheet a quarter turn moves its right edge to the top.
  if (landscape) return [paper.height, paper.width, [top, right, bottom, left]];
  return [paper.width, paper.height, [left, top, right, bottom]];
}

function singlePageSide(page, paper, orientation, mode, scalePercent, borderless) {
  let landscape;
  if (orientation === "landscape" || orientation === "reverse-landscape") landscape = true;
  else if (orientation === "portrait" || orientation === "reverse-portrait") landscape = false;
  // CUPS turns a landscape page to match the paper automatically.
  else landscape = page.width > page.height;
  const [width, height, margins] = frame(paper, landscape, borderless);
  const [left, top, right, bottom] = margins;
  const areaW = width - left - right;
  const areaH = height - top - bottom;
  const fit = Math.min(areaW / page.width, areaH / page.height);
  let scale;
  if (mode === "custom") scale = (scalePercent || 100) / 100;
  else if (mode === "fit") scale = fit;
  else if (mode === "auto-fit") scale = Math.min(1, fit);
  else if (mode === "fill") scale = Math.max(width / page.width, height / page.height);
  else if (mode === "none") scale = 1;
  else scale = page.width <= width + 1 && page.height <= height + 1 ? 1 : fit;
  const w = page.width * scale;
  const h = page.height * scale;
  let x;
  let y;
  if (mode === "fit" || mode === "auto-fit" || (mode === "auto" && scale !== 1)) {
    x = left + (areaW - w) / 2;
    y = top + (areaH - h) / 2;
  } else {
    x = (width - w) / 2;
    y = (height - h) / 2;
  }
  return side(width, height, margins, [cell(page.number, x, y, w, h, 0, width, height)]);
}

function nupSide(pages, paper, orientation, count, layout, borderless) {
  const [longCount, shortCount] = NUP_GRID[count];
  let landscape = orientation === "landscape" || orientation === "reverse-landscape";
  // 2-up and 6-up turn the sheet so each cell keeps the page's shape.
  if (longCount !== shortCount) landscape = !landscape;
  const [width, height, margins] = frame(paper, landscape, borderless);
  const [left, top, right, bottom] = margins;
  const [columns, rows] = width >= height ? [longCount, shortCount] : [shortCount, longCount];
  const cellW = (width - left - right) / columns;
  const cellH = (height - top - bottom) / rows;
  const cells = pages.map((page, index) => {
    const [column, row] = gridPosition(index, columns, rows, layout || "lrtb");
    // CUPS turns a page to suit its cell only when no orientation is set.
    const turn = orientation == null && page.width !== page.height;
    const rotate = turn && page.width > page.height !== cellW > cellH ? 90 : 0;
    const [pw, ph] = rotate ? [page.height, page.width] : [page.width, page.height];
    const scale = Math.min(cellW / pw, cellH / ph);
    const w = pw * scale;
    const h = ph * scale;
    const x = left + column * cellW + (cellW - w) / 2;
    const y = top + row * cellH + (cellH - h) / 2;
    return cell(page.number, x, y, w, h, rotate, width, height);
  });
  return side(width, height, margins, cells);
}

export function gridPosition(index, columns, rows, layout) {
  const primary = layout.slice(0, 2);
  const secondary = layout.slice(2);
  let column;
  let row;
  if (primary === "lr" || primary === "rl") [column, row] = [index % columns, Math.floor(index / columns)];
  else [row, column] = [index % rows, Math.floor(index / rows)];
  if (primary === "rl" || secondary === "rl") column = columns - 1 - column;
  if (primary === "bt" || secondary === "bt") row = rows - 1 - row;
  return [column, row];
}

function cell(page, x, y, w, h, rotate, fw, fh) {
  return { page, x: r4(x / fw), y: r4(y / fh), width: r4(w / fw), height: r4(h / fh), rotate };
}

function side(width, height, [left, top, right, bottom], cells) {
  return {
    width_pt: r2(width),
    height_pt: r2(height),
    printable: {
      x: r4(left / width),
      y: r4(top / height),
      width: r4((width - left - right) / width),
      height: r4((height - top - bottom) / height),
    },
    cells,
  };
}
