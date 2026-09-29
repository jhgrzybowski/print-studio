import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../api/client.js";
import { formatRange, selectedPages } from "../lib/pages.js";
import { paperMM, paperName } from "../lib/format.js";
import { FileGlyph } from "./FileGlyph.jsx";
import { IconKey } from "./controls.jsx";

function PageImage({ fileId, page, className, eager }) {
  const src = api.previewPageUrl(fileId, page);
  // State is tied to the URL it describes, so a new page starts as loading without a reset effect.
  const [result, setResult] = useState({ src: null, state: "loading" });
  const state = result.src === src ? result.state : "loading";
  return (
    <>
      {state === "loading" && <span className="skel skel--fill" aria-hidden />}
      {state === "error" ? (
        <span className="page-missing">Page {page} didn't render</span>
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
 * The page on its paper. Paper size and orientation set the sheet's proportions,
 * black & white desaturates it, and extra copies stack behind it.
 */
export function PreviewStage({ doc, settings, pageCount, onPagesChange, readOnly }) {
  const pages = doc.pages || [];
  const count = pageCount || pages.length;
  const [current, setCurrent] = useState(1);
  const railRef = useRef(null);

  useEffect(() => setCurrent(1), [doc.file?.file_id]);

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
      railRef.current?.querySelector(`[data-page="${n}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return n;
    });
  }

  function onKeyDown(e) {
    if (e.target.closest("input, textarea, [role=radiogroup]")) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") (e.preventDefault(), go(1));
    if (e.key === "ArrowLeft" || e.key === "PageUp") (e.preventDefault(), go(-1));
  }

  const fileId = doc.file?.file_id;
  const hasPreview = pages.length > 0 && fileId;

  return (
    <div className={`stage ${count > 1 ? "has-rail" : ""}`} onKeyDown={onKeyDown}>
      {count > 1 && hasPreview && (
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
                <span className="thumb__foot">
                  <span className="thumb__num">{p.page}</span>
                  {!readOnly && (
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      aria-label={`Print page ${p.page}`}
                      className="thumb__check"
                      onClick={() => toggle(p.page)}
                    >
                      {on && <Check size={11} strokeWidth={3} />}
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="stage__main" tabIndex={-1}>
        <div className="stage__paper-area">
          <motion.div
            className="sheet-stack"
            initial={false}
            animate={{ "--ar": ar }}
            transition={{ type: "spring", stiffness: 220, damping: 28 }}
          >
            <AnimatePresence>
              {Array.from({ length: extra }, (_, i) => (
                <motion.span
                  key={`copy-${i}`}
                  className="sheet sheet--behind"
                  initial={{ opacity: 0, x: 0, y: 0 }}
                  animate={{ opacity: 1 - i * 0.22, x: (i + 1) * 7, y: (i + 1) * 7 }}
                  exit={{ opacity: 0, x: 0, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 26 }}
                  style={{ zIndex: -1 - i }}
                  aria-hidden
                />
              ))}
            </AnimatePresence>
            <div className={`sheet ${included.has(current) || !hasPreview ? "" : "is-excluded"}`}>
              {hasPreview ? (
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={`${fileId}-${current}`}
                    className="sheet__content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{ rotate: flipped ? 180 : 0 }}
                  >
                    <PageImage fileId={fileId} page={current} eager className={`sheet__img ${mono ? "is-mono" : ""} ${settings.fit_to_page ? "is-fit" : ""}`} />
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="sheet__none">
                  <FileGlyph kind={doc.kind} size={28} />
                  <span>No preview for this file</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        <div className="stage__bar">
          <span className="stage__paper">
            {paperName(settings.paper_size)}, {landscape ? "landscape" : "portrait"}
            {mono ? ", black & white" : ""}
          </span>
          {count > 1 && (
            <span className="pager">
              <IconKey label="Previous page" icon={ChevronLeft} size="sm" onClick={() => go(-1)} disabled={current <= 1} />
              <span className="pager__text" aria-live="polite">
                Page {current} of {count}
                {!included.has(current) && <span className="pager__skip">, skipped</span>}
              </span>
              <IconKey label="Next page" icon={ChevronRight} size="sm" onClick={() => go(1)} disabled={current >= count} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
