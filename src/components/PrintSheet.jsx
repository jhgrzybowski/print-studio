import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { Dialog } from "radix-ui";
import { Printer, SlidersHorizontal, X } from "lucide-react";
import { Button, IconKey, PrintButton, Row, Segmented, Stepper, drawerEase } from "./controls.jsx";
import { OptionRows } from "./Options.jsx";
import { paperName } from "../lib/format.js";
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
              inputMode="numeric"
              placeholder={pageCount > 2 ? `1-${Math.min(3, pageCount)}, ${pageCount}` : "1"}
              value={value}
              aria-invalid={!!error}
              aria-describedby={error ? `${id}-err` : undefined}
              onChange={(e) => onChange(e.target.value.replace(/[^\d,\-\s]/g, ""))}
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
export function PrintDock({ flow, choices, disabled, printDisabled, onPrint, onSaveDefaults, onResetDefaults, defaultsState, status }) {
  const [open, setOpen] = useState(false);
  const drag = useDragControls();
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
        <button type="button" className={`pdock__summary ${rangeError ? "is-invalid" : ""}`} onClick={() => setOpen(true)} disabled={!loaded && disabled}>
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
              <Dialog.Overlay asChild forceMount>
                <motion.div
                  className="scrim scrim--sheet"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.32, ease: drawerEase }}
                />
              </Dialog.Overlay>
              <Dialog.Content asChild forceMount aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
                <motion.div
                  className="sheet-panel"
                  initial={{ transform: "translateY(100%)" }}
                  animate={{ transform: "translateY(0%)" }}
                  exit={{ transform: "translateY(100%)" }}
                  transition={{ duration: 0.36, ease: drawerEase }}
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0.04, bottom: 0.6 }}
                  dragListener={false}
                  dragControls={drag}
                  onDragEnd={(_, info) => {
                    if (info.offset.y > 110 || info.velocity.y > 500) setOpen(false);
                  }}
                >
                  <SheetGrip onClose={() => setOpen(false)} controls={drag} />
                  <div className="sheet-panel__head">
                    <Dialog.Title className="sheet-panel__title">{t("Print settings")}</Dialog.Title>
                    <Dialog.Close asChild>
                      <IconKey label={t("Close")} icon={X} size="sm" />
                    </Dialog.Close>
                  </div>
                  <div className="sheet-panel__body">
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
                      <OptionRows settings={settings} set={set} choices={choices} disabled={disabled} idPrefix="sheet" />
                    </div>
                    <div className="sheet-panel__defaults">
                      <Button variant="quiet" onClick={onResetDefaults}>
                        {t("Use my defaults")}
                      </Button>
                      <Button variant="quiet" onClick={onSaveDefaults} disabled={defaultsState === "saving"}>
                        {defaultsState === "saved" ? t("Saved") : t("Save as defaults")}
                      </Button>
                    </div>
                  </div>
                  <div className="sheet-panel__foot">
                    <PrintButton icon={Printer} onClick={printFromSheet} disabled={printDisabled} state={printing.state} className="print--dock" />
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </div>
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
