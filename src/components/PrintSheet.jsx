import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useDragControls, useMotionValue, usePresence, useReducedMotion, useTransform } from "motion/react";
import { Dialog } from "radix-ui";
import { Printer, SlidersHorizontal, X } from "lucide-react";
import { Button, IconKey, PrintButton, Row, Segmented, Stepper, glide } from "./controls.jsx";
import { OptionRows } from "./Options.jsx";
import { paperName } from "../lib/format.js";
import { cleanRange } from "../lib/pages.js";
import { t, tn } from "../i18n/index.js";

// English keys, translated in the summary.
const COLOR_WORD = { color: "Color", monochrome: "B&W", auto: "Auto color" };
const SIDES_WORD = { none: "One-sided", "long-edge": "Two-sided", "short-edge": "Two-sided" };

/** Copies, paper, color and sides in one line: what Print will do, readable at a glance. */
export function settingsSummary(settings, pageCount) {
  const range = settings.pages ? t("Pages {range}", { range: settings.pages.replace(/,/g, ", ") }) : null;
  return [
    tn(settings.copies, "{n} copy", "{n} copies"),
    range,
    settings.paper_size && paperName(settings.paper_size),
    COLOR_WORD[settings.color_mode] && t(COLOR_WORD[settings.color_mode]),
    pageCount !== 1 && SIDES_WORD[settings.duplex] && t(SIDES_WORD[settings.duplex]),
  ]
    .filter(Boolean)
    .join(" · ");
}

function PagesRow({ value, onChange, pageCount, error }) {
  const [mode, setMode] = useState(value ? "range" : "all");
  const inputRef = useRef(null);
  const id = useId();
  useEffect(() => {
    if (value) setMode("range");
    else if (document.activeElement !== inputRef.current) setMode("all");
  }, [value]);

  return (
    <Row label={t("Pages")} className="row--seg">
      <div className="pages-row">
        <Segmented
          label={t("Pages")}
          layoutKey="sheet-pages"
          value={mode}
          onChange={(m) => {
            setMode(m);
            if (m === "all") onChange("");
            else setTimeout(() => inputRef.current?.focus(), 30);
          }}
          options={[
            { value: "all", label: pageCount ? t("All {n}", { n: pageCount }) : t("pages|All") },
            { value: "range", label: t("pages|Choose") },
          ]}
        />
        {mode === "range" && (
          <>
            <label className="sr-only" htmlFor={id}>
              {t("Page range")}
            </label>
            <input
              ref={inputRef}
              id={id}
              className="input"
              // A numeric keypad has no hyphen, so ranges need the text keyboard.
              inputMode="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="done"
              placeholder={pageCount > 2 ? `1-${Math.min(3, pageCount)}, ${pageCount}` : "1"}
              value={value}
              aria-invalid={!!error}
              aria-describedby={error ? `${id}-err` : undefined}
              onChange={(e) => onChange(cleanRange(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
            {error && (
              <p id={`${id}-err`} className="pop__error">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </Row>
  );
}

/**
 * The phone's print dock: a summary of the settings that opens the sheet, and Print within
 * thumb reach. The sheet slides up from the dock and can be flicked away.
 */
export function PrintDock({ flow, choices, disabled, printDisabled, onPrint, onSaveDefaults, onResetDefaults, defaultsState, status, rotation }) {
  const [open, setOpen] = useState(false);
  const summaryRef = useRef(null);
  const { settings, set, pageCount, rangeError, printing } = flow;
  const loaded = flow.doc?.phase === "ready";
  const summary = settingsSummary(settings, pageCount);

  function printFromSheet() {
    setOpen(false);
    onPrint();
  }

  return (
    <div className="pdock">
      {status && <div className="pdock__status">{status}</div>}
      <div className="pdock__row">
        <button ref={summaryRef} type="button" className={`pdock__summary ${rangeError ? "is-invalid" : ""}`} onClick={() => setOpen(true)} disabled={!loaded && disabled}>
          <SlidersHorizontal size={18} strokeWidth={1.5} aria-hidden />
          <span className="pdock__text">
            <span className="pdock__label">{t("Print settings")}</span>
            <span className="pdock__value">{summary}</span>
          </span>
        </button>
        <PrintButton icon={Printer} onClick={onPrint} disabled={printDisabled} state={printing.state} className="print--dock" />
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <AnimatePresence>
          {open && (
            <Dialog.Portal forceMount>
              <SheetLayers
                trigger={summaryRef}
                onClose={() => setOpen(false)}
                head={
                  <>
                    <Dialog.Title className="sheet-panel__title">{t("Print settings")}</Dialog.Title>
                    <Dialog.Close asChild>
                      <IconKey label={t("Close")} icon={X} size="sm" />
                    </Dialog.Close>
                  </>
                }
                foot={<PrintButton icon={Printer} onClick={printFromSheet} disabled={printDisabled} state={printing.state} className="print--dock" />}
              >
                <div className="rows">
                  <Row label={t("Copies")}>
                    <Stepper
                      label={t("Copies")}
                      decLabel={t("Fewer copies")}
                      incLabel={t("More copies")}
                      value={settings.copies}
                      onChange={(v) => set("copies", v)}
                      disabled={disabled}
                    />
                  </Row>
                  {pageCount > 1 && <PagesRow value={settings.pages} onChange={(v) => set("pages", v)} pageCount={pageCount} error={rangeError} />}
                  <OptionRows settings={settings} set={set} choices={choices} disabled={disabled} idPrefix="sheet" rotation={rotation} />
                </div>
                <div className="sheet-panel__defaults">
                  <Button variant="quiet" onClick={onResetDefaults}>
                    {t("Use my defaults")}
                  </Button>
                  <Button variant="quiet" onClick={onSaveDefaults} disabled={defaultsState === "saving"}>
                    {defaultsState === "saved" ? t("Saved") : t("Save as defaults")}
                  </Button>
                </div>
              </SheetLayers>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </div>
  );
}

/**
 * The scrim and the sheet, both driven by one offset. The sheet springs from wherever it is with
 * whatever speed the finger left it, so a flick carries straight into the close and a sheet
 * grabbed on its way out follows the finger again. The scrim dims with the sheet's position.
 */
function SheetLayers({ trigger, onClose, head, foot, children }) {
  const panel = useRef(null);
  const body = useRef(null);
  const pull = useRef(null);
  const drag = useDragControls();
  const height = useRef(window.innerHeight);
  const y = useMotionValue(height.current);
  const scrim = useTransform(y, (v) => Math.min(1, Math.max(0, 1 - v / height.current)));
  const [isPresent, safeToRemove] = usePresence();
  const reduce = useReducedMotion();

  // Without a velocity the spring inherits the value's current one, so a retarget never stalls.
  const move = useCallback(
    (to, options) => {
      if (!reduce) return animate(y, to, { ...glide, ...options });
      y.jump(to);
      return { stop() {}, then: (done) => Promise.resolve().then(done) };
    },
    [reduce, y],
  );

  useLayoutEffect(() => {
    height.current = panel.current.offsetHeight;
    y.jump(height.current);
  }, [y]);

  // Up while present, down while leaving. Reopened mid-close, the sheet turns around from where it is.
  useLayoutEffect(() => {
    if (isPresent) {
      const a = move(0);
      return () => a.stop();
    }
    height.current = panel.current?.offsetHeight || height.current;
    let live = true;
    // Done once it is out of sight, not when the spring's last pixel settles, so the dialog's
    // scroll lock lifts as the sheet disappears.
    const a = move(height.current, { restDelta: 2, restSpeed: 60 });
    a.then(() => live && safeToRemove());
    return () => {
      live = false;
      a.stop();
    };
  }, [isPresent, move, safeToRemove]);

  const grab = (e) => {
    if (e.target.closest("button")) return;
    drag.start(e);
  };

  // The content pulls the sheet down too, as in native sheets: when the finger lands with the
  // content at its top and first moves down. Anything else scrolls as usual. Touch and pen only;
  // a mouse has the grip and the header.
  const pullStart = (e) => {
    pull.current = e.pointerType !== "mouse" && e.isPrimary && body.current.scrollTop <= 0 ? { x: e.clientX, y: e.clientY, on: false } : null;
  };
  const pullMove = (e) => {
    const p = pull.current;
    if (!p || p.on || !e.isPrimary) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (Math.hypot(dx, dy) < 4) return;
    if (dy > Math.abs(dx)) {
      p.on = true;
      drag.start(e);
    } else pull.current = null;
  };
  useEffect(() => {
    const el = body.current;
    // Once the pull owns the touch, the browser must not start an overscroll, which would cancel it.
    const hold = (e) => pull.current?.on && e.cancelable && e.preventDefault();
    el.addEventListener("touchmove", hold, { passive: false });
    return () => el.removeEventListener("touchmove", hold);
  }, []);

  // While closing, taps pass through to the app rather than landing on a scrim that is nearly gone.
  const taps = isPresent ? "auto" : "none";

  return (
    <>
      <Dialog.Overlay asChild forceMount>
        <motion.div className="scrim scrim--sheet" style={{ opacity: scrim, pointerEvents: taps }} />
      </Dialog.Overlay>
      <Dialog.Content
        asChild
        forceMount
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => e.preventDefault()}
        // A tap on the summary reopens a sheet still sliding away; it is not a tap outside that closes it again.
        onPointerDownOutside={(e) => trigger.current?.contains(e.target) && e.preventDefault()}
      >
        <motion.div
          ref={panel}
          className="sheet-panel"
          style={{ y, pointerEvents: taps }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.04, bottom: 1 }}
          dragListener={false}
          dragControls={drag}
          onDragEnd={(_, info) => {
            const close = info.offset.y > height.current * 0.3 || info.velocity.y > 500;
            // Take over from the constraint's snap-back in the same frame, carrying the finger's speed.
            move(close ? height.current : 0, { velocity: info.velocity.y });
            if (close) onClose();
          }}
        >
          <SheetGrip onClose={onClose} controls={drag} />
          <div className="sheet-panel__head" onPointerDown={grab}>
            {head}
          </div>
          <div ref={body} className="sheet-panel__body" onPointerDown={pullStart} onPointerMove={pullMove}>
            {children}
          </div>
          <div className="sheet-panel__foot">{foot}</div>
        </motion.div>
      </Dialog.Content>
    </>
  );
}

/** The grab handle: a drag here moves the whole sheet (the body keeps its scroll); a tap closes it. */
function SheetGrip({ onClose, controls }) {
  const start = useRef(null);
  return (
    <div
      className="sheet-panel__grip"
      role="presentation"
      onPointerDown={(e) => {
        start.current = e.clientY;
        controls.start(e);
      }}
      onPointerUp={(e) => {
        if (start.current != null && Math.abs(e.clientY - start.current) < 4) onClose();
        start.current = null;
      }}
    >
      <span aria-hidden />
    </div>
  );
}
