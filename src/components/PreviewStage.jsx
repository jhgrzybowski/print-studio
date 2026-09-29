import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../api/client.js";
import { formatRange, selectedPages } from "../lib/pages.js";
import { paperMM } from "../lib/format.js";
import { FileGlyph } from "./FileGlyph.jsx";
import { IconKey, ease } from "./controls.jsx";

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
    <div className={`stage ${count > 1 && hasPreview ? "has-rail" : ""}`} onKeyDown={onKeyDown}>
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
                {readOnly ? (
                  <span className="thumb__num">{p.page}</span>
                ) : (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    aria-label={`Print page ${p.page}`}
                    className="thumb__toggle"
                    onClick={() => toggle(p.page)}
                  >
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

      <div className="stage__main" tabIndex={-1}>
        {count > 1 && hasPreview && (
          <div className="pager">
            <IconKey label="Previous page" icon={ChevronLeft} size="sm" onClick={() => go(-1)} disabled={current <= 1} />
            <span className="pager__text" aria-live="polite">
              {current} / {count}
              {!included.has(current) && <span className="sr-only">, skipped</span>}
            </span>
            <IconKey label="Next page" icon={ChevronRight} size="sm" onClick={() => go(1)} disabled={current >= count} />
          </div>
        )}
        <div className="stage__paper-area">
          <motion.div className="sheet-stack" initial={false} animate={{ "--ar": ar }} transition={{ duration: 0.32, ease }}>
            <AnimatePresence>
              {Array.from({ length: extra }, (_, i) => (
                <motion.span
                  key={`copy-${i}`}
                  className="sheet sheet--behind"
                  initial={{ opacity: 0, x: 0, y: 0, rotate: 0 }}
                  animate={{ opacity: 1 - i * 0.25, x: (i + 1) * 6, y: (i + 1) * 5, rotate: (i + 1) * 1.2 }}
                  exit={{ opacity: 0, x: 0, y: 0, rotate: 0 }}
                  transition={{ duration: 0.26, ease }}
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
                  <FileGlyph kind={doc.kind} size={26} />
                  <span>No preview</span>
                </div>
              )}
              {hasPreview && !included.has(current) && <span className="sheet__skip">Skipped</span>}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
