import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import { Check, ChevronLeft, ChevronRight, Minus, Plus, Scan } from "lucide-react";
import { api } from "../api/client.js";
import { formatRange, selectedPages } from "../lib/pages.js";
import { paperMM } from "../lib/format.js";
import { FileGlyph } from "./FileGlyph.jsx";
import { IconKey, Tip, ease } from "./controls.jsx";

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function PageImage({ fileId, page, className, eager }) {
  const src = api.previewPageUrl(fileId, page);
  // State is tied to the URL it describes, so a new page starts as loading without a reset effect.
  const [result, setResult] = useState({ src: null, state: "loading" });
  const state = result.src === src ? result.state : "loading";
  return (
    <>
      {state === "loading" && <span className="skel skel--fill" aria-hidden />}
      {state === "error" ? (
        <span className="page-missing">Page {page} didn't load</span>
      ) : (
        <img
          className={`${className} ${state === "ready" ? "is-ready" : ""}`}
          src={src}
          alt={`Page ${page}`}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          onLoad={() => setResult({ src, state: "ready" })}
          onError={() => setResult({ src, state: "error" })}
        />
      )}
    </>
  );
}

/**
 * The page on its paper, under the stage light. Paper size and orientation set the sheet's
 * proportions, black & white desaturates it, and extra copies stack behind it. `head` sits at
 * the top left, `corner` at the top right, and `status` in the floating bar.
 */
export function PreviewStage({ doc, settings, pageCount, onPagesChange, readOnly, head, corner, status, feedKey }) {
  const pages = doc.pages || [];
  const count = pageCount || pages.length;
  const [current, setCurrent] = useState(1);
  const [zoom, setZoom] = useState(1);
  const railRef = useRef(null);
  const [stackRef, animateStack] = useAnimate();

  useEffect(() => setCurrent(1), [doc.file?.file_id]);

  // A successful send lifts the sheet as if the printer took it.
  useEffect(() => {
    if (!feedKey || !stackRef.current) return;
    animateStack(stackRef.current, { y: [0, -12, 0], scale: [1, 0.985, 1] }, { duration: 0.6, ease: [0.32, 0.72, 0, 1] });
  }, [feedKey, animateStack, stackRef]);

  const included = useMemo(() => new Set(selectedPages(settings.pages, count)), [settings.pages, count]);

  const [w, h] = paperMM(settings.paper_size);
  const landscape = /landscape/.test(settings.orientation);
  const flipped = /^reverse/.test(settings.orientation);
  const ratio = landscape ? `${h} / ${w}` : `${w} / ${h}`;
  const ar = landscape ? h / w : w / h;
  const mono = settings.color_mode === "monochrome";
  const extra = Math.min(Math.max((settings.copies || 1) - 1, 0), 3);

  function toggle(p) {
    const next = new Set(included);
    if (next.has(p)) {
      if (next.size === 1) return;
      next.delete(p);
    } else next.add(p);
    onPagesChange(next.size === count ? "" : formatRange([...next]));
  }

  function go(delta) {
    setCurrent((c) => {
      const n = Math.min(count, Math.max(1, c + delta));
      railRef.current?.querySelector(`[data-page="${n}"]`)?.scrollIntoView({ block: "nearest" });
      return n;
    });
  }

  function onKeyDown(e) {
    if (e.target.closest("input, textarea, [role=radiogroup], [role=menu], [role=listbox]")) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") (e.preventDefault(), go(1));
    if (e.key === "ArrowLeft" || e.key === "PageUp") (e.preventDefault(), go(-1));
  }

  const zi = ZOOMS.indexOf(zoom);
  const fileId = doc.file?.file_id;
  const hasPreview = pages.length > 0 && fileId;
  const multi = count > 1 && hasPreview;

  return (
    <div className={`stage ${multi ? "has-rail" : ""}`} onKeyDown={onKeyDown}>
      {multi && (
        <div className="rail" ref={railRef} aria-label="Pages">
          {pages.map((p) => {
            const on = included.has(p.page);
            return (
              <div key={p.page} className={`thumb ${p.page === current ? "is-current" : ""} ${on ? "" : "is-excluded"}`} data-page={p.page}>
                <button
                  type="button"
                  className="thumb__sheet"
                  style={{ aspectRatio: ratio }}
                  onClick={() => setCurrent(p.page)}
                  aria-label={`Show page ${p.page}`}
                  aria-current={p.page === current ? "page" : undefined}
                >
                  <PageImage fileId={fileId} page={p.page} className={`thumb__img ${mono ? "is-mono" : ""}`} />
                </button>
                {readOnly ? (
                  <span className="thumb__num">{p.page}</span>
                ) : (
                  <button type="button" role="checkbox" aria-checked={on} aria-label={`Print page ${p.page}`} className="thumb__toggle" onClick={() => toggle(p.page)}>
                    <span className="thumb__box" aria-hidden>
                      {on && <Check size={10} strokeWidth={2.4} />}
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

        <div className={`stage__paper-area ${zoom > 1 ? "is-zoomed" : ""}`} tabIndex={-1} style={{ "--z": zoom }}>
          <motion.div ref={stackRef} className="sheet-stack" initial={false} animate={{ "--ar": ar }} transition={{ duration: 0.32, ease }}>
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
            <div className={`sheet ${included.has(current) || !hasPreview ? "" : "is-excluded"}`}>
              {!hasPreview && doc.text != null ? (
                <div className={`sheet__text ${mono ? "is-mono" : ""}`} style={{ rotate: flipped ? "180deg" : undefined }}>
                  {doc.text}
                </div>
              ) : hasPreview ? (
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={`${fileId}-${current}`}
                    className="sheet__content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.16 }}
                    style={{ rotate: flipped ? 180 : 0 }}
                  >
                    <PageImage
                      fileId={fileId}
                      page={current}
                      eager
                      className={`sheet__img ${mono ? "is-mono" : ""} ${settings.fit_to_page || doc.kind === "image" ? "is-fit" : ""}`}
                    />
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="sheet__none">
                  <FileGlyph kind={doc.kind} size={26} />
                  <span>{doc.file?.detected_mime === "text/plain" ? "Text file" : "No preview"}</span>
                  <span className="sheet__none-sub">It prints as it is.</span>
                </div>
              )}
              {hasPreview && !included.has(current) && <span className="sheet__skip">Skipped</span>}
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
                  <IconKey label="Previous page" icon={ChevronLeft} size="sm" onClick={() => go(-1)} disabled={current <= 1} tipSide="top" />
                  <span className="pager__text" aria-live="polite">
                    {current} / {count}
                    {!included.has(current) && <span className="sr-only">, skipped</span>}
                  </span>
                  <IconKey label="Next page" icon={ChevronRight} size="sm" onClick={() => go(1)} disabled={current >= count} tipSide="top" />
                </div>
                <span className="stage-bar__sep" aria-hidden />
              </>
            )}
            <div className="zoom">
              <IconKey label="Zoom out" icon={Minus} size="sm" onClick={() => setZoom(ZOOMS[zi - 1])} disabled={zi <= 0} tipSide="top" />
              <Tip label="Fit to stage" side="top">
                <button type="button" className="zoom__val" onClick={() => setZoom(1)} aria-label="Fit to stage">
                  {zoom === 1 ? <Scan size={14} strokeWidth={1.5} aria-hidden /> : `${Math.round(zoom * 100)}%`}
                </button>
              </Tip>
              <IconKey label="Zoom in" icon={Plus} size="sm" onClick={() => setZoom(ZOOMS[zi + 1])} disabled={zi >= ZOOMS.length - 1} tipSide="top" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
