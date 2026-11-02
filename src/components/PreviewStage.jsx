import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import { Check, ChevronLeft, ChevronRight, Minus, Plus, RotateCw, Scan } from "lucide-react";
import { api } from "../api/client.js";
import { formatRange, selectedPages } from "../lib/pages.js";
import { paperMM } from "../lib/format.js";
import { planLayout } from "../lib/layout.js";
import { FileGlyph } from "./FileGlyph.jsx";
import { IconKey, Tip, ease } from "./controls.jsx";
import { t } from "../i18n/index.js";

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const NO_TURNS = {};
// Above this many device pixels on screen, a page is drawn from its full render; below it the
// 320-pixel thumbnail is as sharp and renders several times faster on the server.
const THUMB_PX = 420;
const A4 = { width: 595, height: 842 };

const pageUrl = (fileId, page, thumb) => api.previewPageUrl(fileId, page, thumb ? "thumb" : undefined);

// Decoded page images by URL. A page swaps in only once it can paint, so paging and changing
// settings never pass through an empty sheet.
const decoded = new Map();
function preload(src) {
  let e = decoded.get(src);
  if (!e) {
    const img = new Image();
    img.src = src;
    e = { done: false, promise: null };
    e.promise = img.decode().then(() => {
      e.done = true;
    });
    e.promise.catch(() => decoded.delete(src));
    decoded.set(src, e);
    if (decoded.size > 240) decoded.delete(decoded.keys().next().value);
  }
  return e.promise;
}
const isDecoded = (src) => !!decoded.get(src)?.done;

/**
 * The best image of a page that can paint now: the full render when the page is large on screen
 * and it has decoded, otherwise the thumbnail, which the page rail has usually fetched already.
 */
function usePageSrc(fileId, page, wantFull) {
  const thumb = pageUrl(fileId, page, true);
  const full = pageUrl(fileId, page, false);
  const [, bump] = useState(0);
  const [failed, setFailed] = useState(null);
  useEffect(() => {
    let live = true;
    const ok = () => live && bump((n) => n + 1);
    if (!isDecoded(thumb)) preload(thumb).then(ok, () => !wantFull && live && setFailed(thumb));
    if (wantFull && !isDecoded(full)) preload(full).then(ok, () => live && !isDecoded(thumb) && setFailed(full));
    return () => {
      live = false;
    };
  }, [thumb, full, wantFull]);
  if (wantFull && isDecoded(full)) return { src: full };
  if (isDecoded(thumb)) return { src: thumb };
  if (isDecoded(full)) return { src: full };
  return { src: null, error: failed === thumb || failed === full };
}

function RailImage({ fileId, page, className, spin, ar }) {
  const src = pageUrl(fileId, page, true);
  // State is tied to the URL it describes, so a new page starts as loading without a reset effect.
  const [result, setResult] = useState({ src: null, state: "loading" });
  const state = result.src === src ? result.state : "loading";
  return (
    <>
      {state === "loading" && <span className="skel skel--fill" aria-hidden />}
      {state === "error" ? (
        <span className="page-missing">{t("Page {n} didn't load", { n: page })}</span>
      ) : (
        <img
          className={`${className} ${state === "ready" ? "is-ready" : ""}`}
          style={spin ? { rotate: `${spin}deg`, scale: fitScale(spin, ar) } : undefined}
          src={src}
          alt={t("Page {n}", { n: page })}
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => {
            setResult({ src, state: "ready" });
            // The sheet draws from the same thumbnail; mark it ready for it.
            preload(src).catch(() => {});
          }}
          onError={() => setResult({ src, state: "error" })}
        />
      )}
    </>
  );
}

// A quarter turn shrinks the page by its own proportions, as rotate.js does for the printed file.
const fitScale = (spin, ar) => (quarter(spin) && ar ? Math.min(ar, 1 / ar) : 1);
const quarter = (deg) => (((deg % 180) + 180) % 180) === 90;

/**
 * Turns as angles that take the short way round, so going from 270° to 0° spins a quarter
 * forward rather than three quarters back.
 */
function useSpins(turns, count) {
  const seen = useRef(new Map());
  return useMemo(() => {
    const out = [];
    for (let p = 1; p <= count; p++) {
      const deg = turns(p);
      const prev = seen.current.get(p);
      const shown = prev ? prev.shown + (((deg - prev.deg + 540) % 360) - 180) : deg;
      seen.current.set(p, { deg, shown });
      out[p] = shown;
    }
    return out;
  }, [turns, count]);
}

/** The size of an element in CSS pixels, kept current. */
function useSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ width: e.contentRect.width, height: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/**
 * One page in its cell on the sheet. The cell is where the printer puts the page (turned a
 * quarter when CUPS turns it to suit the cell); inside it the page keeps its own frame, and a turn
 * asked for here happens inside that frame, shrinking the page to fit as the printed file does.
 */
const Cell = memo(function Cell({ fileId, cell, sheetAr, pageAr, spin, wantFull, mono, focused, border, animateTurn, onFocus }) {
  const { src, error } = usePageSrc(fileId, cell.page, wantFull);
  const turned = cell.rotate === 90;
  // A turned cell holds the page sideways: its frame is the cell with width and height swapped.
  const frame = turned
    ? { width: `${((cell.height / cell.width) * 100) / sheetAr}%`, height: `${((cell.width / cell.height) * sheetAr) * 100}%` }
    : { width: "100%", height: "100%" };
  return (
    <div
      className={`sheet__cell ${border ? `has-border border-${border}` : ""} ${focused ? "is-focused" : ""}`}
      style={{ left: `${cell.x * 100}%`, top: `${cell.y * 100}%`, width: `${cell.width * 100}%`, height: `${cell.height * 100}%` }}
      onClick={onFocus}
    >
      <div className="sheet__frame" style={{ ...frame, rotate: turned ? "90deg" : undefined }}>
        <motion.div
          className="sheet__turn"
          initial={false}
          animate={{ rotate: spin, scale: fitScale(spin, pageAr) }}
          transition={animateTurn ? { type: "spring", bounce: 0.12, duration: 0.42 } : { duration: 0 }}
        >
          {src ? (
            <img className={`sheet__img is-ready ${mono ? "is-mono" : ""}`} src={src} alt={t("Page {n}", { n: cell.page })} draggable={false} />
          ) : error ? (
            <span className="page-missing">{t("Page {n} didn't load", { n: cell.page })}</span>
          ) : (
            <span className="skel skel--fill" aria-hidden />
          )}
        </motion.div>
      </div>
    </div>
  );
});

/** A page shown on its own, fitted to the paper: a skipped page, or any page while no plan exists. */
function soloSide(page, paper) {
  const p = { keyword: "", label: "", width: paper.width, height: paper.height, margins: [0, 0, 0, 0] };
  return planLayout([{ number: page.page, width: page.width_pt || A4.width, height: page.height_pt || A4.height }], p, { scaling: "fit" }).sides[0];
}

/**
 * The sheet under the stage light, drawn from the layout plan: each printed side shows its pages
 * where the printer puts them (pages per sheet, scaling, orientation, two-sided pairs). Black &
 * white desaturates it and extra copies stack behind it. `head` sits at the top left, `corner` at
 * the top right, and `status` in the floating bar.
 */
export function PreviewStage({ doc, settings, plan, pageCount, onPagesChange, readOnly, head, corner, status, feedKey, rotations = NO_TURNS, onRotate }) {
  const pages = doc.pages || [];
  const count = pageCount || pages.length;
  const [at, setAt] = useState({ side: 0, page: 1 });
  const [zoom, setZoom] = useState(1);
  const railRef = useRef(null);
  const areaRef = useRef(null);
  const [stackRef, animateStack] = useAnimate();
  const area = useSize(areaRef);

  useEffect(() => setAt({ side: 0, page: 1 }), [doc.file?.file_id]);

  // A successful send lifts the sheet as if the printer took it.
  useEffect(() => {
    if (!feedKey || !stackRef.current) return;
    animateStack(stackRef.current, { y: [0, -12, 0], scale: [1, 0.985, 1] }, { duration: 0.6, ease: [0.32, 0.72, 0, 1] });
  }, [feedKey, animateStack, stackRef]);

  const geometry = useMemo(() => new Map(pages.map((p) => [p.page, p])), [pages]);
  const pageAr = (n) => {
    const g = geometry.get(n);
    return g?.width_pt && g?.height_pt ? g.width_pt / g.height_pt : A4.width / A4.height;
  };
  const inRange = useMemo(() => new Set(selectedPages(settings.pages, count)), [settings.pages, count]);
  const sides = plan?.sides || [];
  const printed = useMemo(() => new Set(sides.flatMap((s) => s.cells.map((c) => c.page))), [sides]);
  const sideOf = useCallback((p) => sides.findIndex((s) => s.cells.some((c) => c.page === p)), [sides]);

  // The side in view follows the page in focus when settings move it to another side.
  const sideIndex = sides[at.side]?.cells.some((c) => c.page === at.page) ? at.side : sideOf(at.page);
  const skipped = !!plan && sideIndex === -1;
  const paperPt = useMemo(() => {
    if (plan?.paper) return { width: plan.paper.width_pt, height: plan.paper.height_pt };
    const [w, h] = paperMM(settings.paper_size);
    return { width: (w * 72) / 25.4, height: (h * 72) / 25.4 };
  }, [plan, settings.paper_size]);
  const side = sideIndex >= 0 ? sides[sideIndex] : soloSide(geometry.get(at.page) || { page: at.page }, paperPt);
  const sheetAr = side.width_pt / side.height_pt;

  // Jobs from before page turns printed upside down through a reverse orientation.
  const legacy = /^reverse/.test(settings.orientation || "") ? 180 : 0;
  const turns = useCallback((p) => rotations[p] || legacy, [rotations, legacy]);
  const spins = useSpins(turns, count);
  const mono = settings.color_mode === "monochrome";
  const extra = Math.min(Math.max((plan?.copies ?? settings.copies ?? 1) - 1, 0), 3);

  function toggle(p) {
    const next = new Set(inRange);
    if (next.has(p)) {
      if (next.size === 1) return;
      next.delete(p);
    } else next.add(p);
    onPagesChange(next.size === count ? "" : formatRange([...next]));
  }

  const showPage = useCallback(
    (p) => {
      setAt({ side: sideOf(p), page: p });
      railRef.current?.querySelector(`[data-page="${p}"]`)?.scrollIntoView({ block: "nearest" });
    },
    [sideOf],
  );

  function go(delta) {
    if (!sides.length) {
      showPage(Math.min(count, Math.max(1, at.page + delta)));
      return;
    }
    // From a skipped page, the next side is the first one after it.
    let i;
    if (skipped) {
      const after = sides.findIndex((s) => s.cells.some((c) => c.page > at.page));
      i = delta > 0 ? (after === -1 ? sides.length - 1 : after) : after === -1 ? sides.length - 1 : Math.max(0, after - 1);
    } else i = Math.min(sides.length - 1, Math.max(0, sideIndex + delta));
    const p = sides[i].cells[0].page;
    setAt({ side: i, page: p });
    railRef.current?.querySelector(`[data-page="${p}"]`)?.scrollIntoView({ block: "nearest" });
  }

  function onKeyDown(e) {
    if (e.target.closest("input, textarea, [role=radiogroup], [role=menu], [role=listbox]")) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") (e.preventDefault(), go(1));
    if (e.key === "ArrowLeft" || e.key === "PageUp") (e.preventDefault(), go(-1));
  }

  const zi = ZOOMS.indexOf(zoom);
  const fileId = doc.file?.file_id;
  const hasPreview = pages.length > 0 && fileId;
  const steps = sides.length || count;
  const multi = hasPreview && (count > 1 || sides.length > 1);
  const canTurn = !readOnly && hasPreview && !!onRotate;
  const step = skipped || !sides.length ? at.page : sideIndex + 1;

  // R turns the page in focus from anywhere on the page, not only once the stage has focus.
  const turnRef = useRef(null);
  turnRef.current = canTurn ? (delta) => onRotate([at.page], delta) : null;
  useEffect(() => {
    function onKey(e) {
      if (e.defaultPrevented || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== "r" && e.key !== "R") return;
      const el = e.target instanceof Element ? e.target : null;
      if (el?.closest("input, textarea, select, [contenteditable=''], [contenteditable=true], [role=radiogroup], [role=menu], [role=listbox], [role=dialog]")) return;
      if (!turnRef.current) return;
      e.preventDefault();
      turnRef.current(e.shiftKey ? -90 : 90);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The sheet's size on screen decides which render each cell needs.
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const sheetW = Math.min(area.width, area.height * sheetAr) * zoom || 600;
  const sheetH = sheetW / sheetAr;
  const wantFull = (c) => Math.max(c.width * sheetW, c.height * sheetH) * dpr > THUMB_PX;

  // The neighbouring sides decode ahead, so the next one is ready before it is asked for.
  useEffect(() => {
    if (!hasPreview || !sides.length || sideIndex < 0) return;
    for (const i of [sideIndex + 1, sideIndex - 1]) {
      for (const c of sides[i]?.cells || []) preload(pageUrl(fileId, c.page, !wantFull(c))).catch(() => {});
    }
    // wantFull depends only on the sheet size, which the sides share.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sideIndex, sides, fileId, hasPreview, sheetW]);

  // A turn animates only on the side it was made on; a new side arrives already turned.
  const lastSide = useRef(null);
  const sideKey = `${sideIndex}:${at.page}:${side.cells.map((c) => c.page).join(",")}`;
  const sameSide = lastSide.current === sideKey;
  useEffect(() => {
    lastSide.current = sideKey;
  });

  const border = plan?.page_border || null;
  const face = plan && sides.some((s) => s.face === "back") && !skipped ? side.face : null;
  const printable = side.printable;
  const margins = printable && (printable.x > 0.001 || printable.y > 0.001 || printable.width < 0.999 || printable.height < 0.999);
  const position = sides.length ? (skipped ? t("Page {n}, skipped", { n: at.page }) : sheetLabel(side, plan)) : null;

  return (
    <div className={`stage ${multi && count > 1 ? "has-rail" : ""}`} onKeyDown={onKeyDown}>
      {multi && count > 1 && (
        <div className="rail" ref={railRef} aria-label={t("Pages")}>
          {pages.map((p) => {
            const on = plan ? printed.has(p.page) : inRange.has(p.page);
            const ar = p.width_pt && p.height_pt ? p.width_pt / p.height_pt : A4.width / A4.height;
            return (
              <div key={p.page} className={`thumb ${p.page === at.page ? "is-current" : ""} ${on ? "" : "is-excluded"}`} data-page={p.page}>
                <button
                  type="button"
                  className="thumb__sheet"
                  style={{ aspectRatio: ar }}
                  onClick={() => showPage(p.page)}
                  aria-label={t("Show page {n}", { n: p.page })}
                  aria-current={p.page === at.page ? "page" : undefined}
                >
                  <RailImage fileId={fileId} page={p.page} className={`thumb__img ${mono ? "is-mono" : ""}`} spin={spins[p.page]} ar={ar} />
                </button>
                {readOnly ? (
                  <span className="thumb__num">{p.page}</span>
                ) : (
                  <button type="button" role="checkbox" aria-checked={inRange.has(p.page)} aria-label={t("Print page {n}", { n: p.page })} className="thumb__toggle" onClick={() => toggle(p.page)}>
                    <span className="thumb__box" aria-hidden>
                      {inRange.has(p.page) && <Check size={10} strokeWidth={2.4} />}
                    </span>
                    <span className="thumb__num">{p.page}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="stage__main">
        {head && <div className="stage__head">{head}</div>}
        {corner && <div className="stage__corner">{corner}</div>}

        <div ref={areaRef} className={`stage__paper-area ${zoom > 1 ? "is-zoomed" : ""}`} tabIndex={-1} style={{ "--z": zoom }}>
          <motion.div ref={stackRef} className="sheet-stack" initial={false} animate={{ "--ar": sheetAr }} transition={{ duration: 0.32, ease }}>
            <AnimatePresence>
              {Array.from({ length: extra }, (_, i) => (
                <motion.span
                  key={`copy-${i}`}
                  className="sheet sheet--behind"
                  initial={{ opacity: 0, x: 0, y: 0, rotate: 0 }}
                  animate={{ opacity: 1 - i * 0.22, x: (i + 1) * 7, y: (i + 1) * 6, rotate: (i + 1) * 1.1 }}
                  exit={{ opacity: 0, x: 0, y: 0, rotate: 0 }}
                  transition={{ duration: 0.26, ease }}
                  style={{ zIndex: -1 - i }}
                  aria-hidden
                />
              ))}
            </AnimatePresence>
            <div className={`sheet ${skipped ? "is-excluded" : ""} ${face === "back" ? "is-back" : ""}`}>
              {!hasPreview && doc.text != null ? (
                <div className={`sheet__text ${mono ? "is-mono" : ""}`} style={{ rotate: legacy ? "180deg" : undefined }}>
                  {doc.text}
                </div>
              ) : hasPreview ? (
                <div className="sheet__content">
                  {margins && !skipped && (
                    <span
                      className="sheet__printable"
                      style={{ left: `${printable.x * 100}%`, top: `${printable.y * 100}%`, width: `${printable.width * 100}%`, height: `${printable.height * 100}%` }}
                      aria-hidden
                    />
                  )}
                  {side.cells.map((c, i) => (
                    <Cell
                      key={i}
                      fileId={fileId}
                      cell={c}
                      sheetAr={sheetAr}
                      pageAr={pageAr(c.page)}
                      spin={spins[c.page] || 0}
                      wantFull={wantFull(c)}
                      mono={mono}
                      border={border}
                      focused={side.cells.length > 1 && at.picked && c.page === at.page && canTurn}
                      animateTurn={sameSide}
                      onFocus={side.cells.length > 1 ? () => setAt({ side: sideIndex, page: c.page, picked: true }) : undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className="sheet__none">
                  <FileGlyph kind={doc.kind} size={26} />
                  <span>{doc.file?.detected_mime === "text/plain" ? t("Text file") : t("No preview")}</span>
                  <span className="sheet__none-sub">{t("It prints as it is.")}</span>
                </div>
              )}
              {skipped && <span className="sheet__skip">{t("Skipped")}</span>}
              {face && <span className="sheet__face">{face === "back" ? t("sheet|Back") : t("sheet|Front")}</span>}
            </div>
          </motion.div>
        </div>

        <div className="stage-bar-wrap">
          <div className="stage-bar">
            {status && (
              <>
                {status}
                <span className="stage-bar__sep" aria-hidden />
              </>
            )}
            {multi && (
              <>
                <div className="pager">
                  <IconKey label={sides.length ? t("Previous sheet") : t("Previous page")} icon={ChevronLeft} size="sm" onClick={() => go(-1)} disabled={step <= 1 && !skipped} tipSide="top" />
                  <Tip label={position || t("Page {n}", { n: at.page })} side="top" disabled={!position}>
                    <span className="pager__text" aria-live="polite">
                      <span className="pager__cur">{skipped ? "–" : step}</span> / {steps}
                      {position && <span className="sr-only">{`, ${position}`}</span>}
                    </span>
                  </Tip>
                  <IconKey label={sides.length ? t("Next sheet") : t("Next page")} icon={ChevronRight} size="sm" onClick={() => go(1)} disabled={step >= steps && !skipped} tipSide="top" />
                </div>
                <span className="stage-bar__sep" aria-hidden />
              </>
            )}
            {canTurn && (
              <>
                <IconKey
                  label={count > 1 ? t("Rotate page {n}", { n: at.page }) : t("Rotate page")}
                  icon={RotateCw}
                  size="sm"
                  className={`stage-rotate ${rotations[at.page] ? "is-turned" : ""}`}
                  onClick={() => onRotate([at.page], 90)}
                  tipSide="top"
                />
                <span className="stage-bar__sep" aria-hidden />
              </>
            )}
            <div className="zoom">
              <IconKey label={t("Zoom out")} icon={Minus} size="sm" onClick={() => setZoom(ZOOMS[zi - 1])} disabled={zi <= 0} tipSide="top" />
              <Tip label={t("Fit to stage")} side="top">
                <button type="button" className="zoom__val" onClick={() => setZoom(1)} aria-label={t("Fit to stage")}>
                  {zoom === 1 ? <Scan size={14} strokeWidth={1.5} aria-hidden /> : `${Math.round(zoom * 100)}%`}
                </button>
              </Tip>
              <IconKey label={t("Zoom in")} icon={Plus} size="sm" onClick={() => setZoom(ZOOMS[zi + 1])} disabled={zi >= ZOOMS.length - 1} tipSide="top" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** "Sheet 2, back · pages 5–8", for the pager's tooltip and screen readers. */
function sheetLabel(side, plan) {
  const nums = side.cells.map((c) => c.page);
  const pagesText = nums.length > 1 ? t("pages {range}", { range: formatRange(nums).replace(/,/g, ", ") }) : t("page {n}", { n: nums[0] });
  const two = plan.sides.some((s) => s.face === "back");
  const sheet = two ? (side.face === "back" ? t("Sheet {n}, back", { n: side.sheet }) : t("Sheet {n}, front", { n: side.sheet })) : t("Sheet {n}", { n: side.sheet });
  return `${sheet} · ${pagesText}`;
}
