import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookmarkCheck, BookmarkPlus, RectangleHorizontal, RectangleVertical, RotateCcw, Shrink, FlipVertical2 } from "lucide-react";
import { Dot, IconKey, Row, Segmented, Select, Stepper, tween } from "./controls.jsx";
import { AutoGlyph, ColorGlyph, DraftGlyph, HighGlyph, LongEdgeGlyph, MonoGlyph, OneSidedGlyph, ShortEdgeGlyph, StandardGlyph } from "./glyphs.jsx";
import { COLOR_LABELS, DUPLEX_LABELS, mediaLabel, paperGroups, paperName, QUALITY_LABELS } from "../lib/format.js";

const ORDER = {
  color_mode: ["color", "monochrome", "auto"],
  duplex: ["none", "long-edge", "short-edge"],
  quality: ["draft", "normal", "high"],
};
const COLOR_ICONS = { color: ColorGlyph, monochrome: MonoGlyph, auto: AutoGlyph };
const DUPLEX_ICONS = { none: OneSidedGlyph, "long-edge": LongEdgeGlyph, "short-edge": ShortEdgeGlyph };
const DUPLEX_TIPS = { none: "One-sided", "long-edge": "Two-sided, flip on long edge", "short-edge": "Two-sided, flip on short edge" };
const QUALITY_ICONS = { draft: DraftGlyph, normal: StandardGlyph, high: HighGlyph };

function ordered(key, list = []) {
  const o = ORDER[key] || [];
  return [...list].sort((a, b) => (o.indexOf(a) + 1 || 99) - (o.indexOf(b) + 1 || 99));
}

export function paperSelectGroups(choices) {
  const { common, rest } = paperGroups(choices || []);
  const g = [];
  if (common.length) g.push({ label: rest.length ? "Common" : undefined, items: common.map((v) => ({ value: v, label: paperName(v) })) });
  if (rest.length) g.push({ label: "More", items: rest.map((v) => ({ value: v, label: paperName(v) })) });
  return g;
}

/** Output rows shared by the inspector and the defaults in Settings. */
export function OptionRows({ settings, set, choices, disabled, idPrefix = "opt" }) {
  const orient = choices.orientation || [];
  const landscape = /landscape/.test(settings.orientation);
  const flipped = /^reverse/.test(settings.orientation);
  const canFlip = orient.includes("reverse-portrait") || orient.includes("reverse-landscape");

  function setOrientation(base, flip) {
    const v = flip ? `reverse-${base}` : base;
    set("orientation", orient.includes(v) ? v : base);
  }

  return (
    <>
      {choices.paper_size?.length > 0 && (
        <Row label="Paper">
          {choices.fit_to_page && (
            <IconKey
              label={settings.fit_to_page ? "Fit to page: on" : "Fit to page"}
              icon={Shrink}
              size="sm"
              pressed={!!settings.fit_to_page}
              onClick={() => set("fit_to_page", !settings.fit_to_page)}
              disabled={disabled}
            />
          )}
          <Select label="Paper size" value={settings.paper_size} onChange={(v) => set("paper_size", v)} groups={paperSelectGroups(choices.paper_size)} disabled={disabled} />
        </Row>
      )}

      {orient.length > 0 && (
        <Row label="Layout">
          {canFlip && (
            <IconKey
              label={flipped ? "Upside down: on" : "Print upside down"}
              icon={FlipVertical2}
              size="sm"
              pressed={flipped}
              onClick={() => setOrientation(landscape ? "landscape" : "portrait", !flipped)}
              disabled={disabled}
            />
          )}
          <Segmented
            label="Orientation"
            layoutKey={`${idPrefix}-orient`}
            iconOnly
            value={landscape ? "landscape" : "portrait"}
            onChange={(v) => setOrientation(v, flipped)}
            disabled={disabled}
            options={[
              { value: "portrait", label: "Portrait", icon: RectangleVertical },
              { value: "landscape", label: "Landscape", icon: RectangleHorizontal },
            ]}
          />
        </Row>
      )}

      {choices.color_mode?.length > 0 && (
        <Row label="Color">
          <Segmented
            label="Color"
            layoutKey={`${idPrefix}-color`}
            iconOnly
            value={settings.color_mode}
            onChange={(v) => set("color_mode", v)}
            disabled={disabled}
            options={ordered("color_mode", choices.color_mode).map((v) => ({ value: v, label: COLOR_LABELS[v] || v, icon: COLOR_ICONS[v] || ColorGlyph }))}
          />
        </Row>
      )}

      {choices.duplex?.length > 0 && (
        <Row label="Sides">
          <Segmented
            label="Sides"
            layoutKey={`${idPrefix}-duplex`}
            iconOnly
            value={settings.duplex}
            onChange={(v) => set("duplex", v)}
            disabled={disabled}
            options={ordered("duplex", choices.duplex).map((v) => ({ value: v, label: DUPLEX_TIPS[v] || DUPLEX_LABELS[v] || v, icon: DUPLEX_ICONS[v] || OneSidedGlyph }))}
          />
        </Row>
      )}

      {choices.quality?.length > 0 && (
        <Row label="Quality">
          <Segmented
            label="Quality"
            layoutKey={`${idPrefix}-quality`}
            iconOnly
            value={settings.quality}
            onChange={(v) => set("quality", v)}
            disabled={disabled}
            options={ordered("quality", choices.quality).map((v) => ({ value: v, label: QUALITY_LABELS[v] || v, icon: QUALITY_ICONS[v] || StandardGlyph }))}
          />
        </Row>
      )}

      {choices.media_type?.length > 0 && (
        <Row label="Media">
          <Select
            label="Paper type"
            value={settings.media_type}
            onChange={(v) => set("media_type", v)}
            groups={[{ items: choices.media_type.map((v) => ({ value: v, label: mediaLabel(v) })) }]}
            disabled={disabled}
          />
        </Row>
      )}
    </>
  );
}

function PagesRow({ value, onChange, pageCount, error, disabled }) {
  const [mode, setMode] = useState(value ? "range" : "all");
  const inputRef = useRef(null);
  const id = useId();
  useEffect(() => {
    if (value) setMode("range");
    // Range cleared elsewhere (new file, every thumbnail ticked): fall back to All unless the user is typing.
    else if (document.activeElement !== inputRef.current) setMode("all");
  }, [value]);

  return (
    <>
      <Row label="Pages">
        <Segmented
          label="Pages"
          layoutKey="inspector-pages"
          value={mode}
          disabled={disabled || pageCount === 1}
          onChange={(m) => {
            setMode(m);
            if (m === "all") onChange("");
            else setTimeout(() => inputRef.current?.focus(), 30);
          }}
          options={[
            { value: "all", label: pageCount ? `All ${pageCount}` : "All" },
            { value: "range", label: "Range" },
          ]}
        />
      </Row>
      <AnimatePresence initial={false}>
        {mode === "range" && (
          <motion.div className="collapse" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={tween}>
            <div className="range">
              <label className="sr-only" htmlFor={id}>
                Page range
              </label>
              <input
                ref={inputRef}
                id={id}
                className="input"
                placeholder="1-3, 5"
                value={value}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-err` : undefined}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value.replace(/[^\d,\-\s]/g, ""))}
              />
              {error && (
                <p id={`${id}-err`} className="range__error">
                  {error}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function sheetsFor(pages, copies, duplex) {
  const perCopy = duplex && duplex !== "none" ? Math.ceil(pages / 2) : pages;
  return perCopy * copies;
}

/** The dry-run result, on one line. */
function Verdict({ validation, settings, rangeError, printerReady }) {
  if (rangeError) return null;
  const { state, result, warnings = [], error } = validation;
  let tone = "muted";
  let title = "Checking";
  let notes = [];
  if (state === "error") {
    tone = "error";
    title = "Couldn't check";
    notes = [error];
  } else if (result) {
    const n = result.selected_pages?.length || result.page_count || 0;
    const sheets = sheetsFor(n, settings.copies, settings.duplex);
    const unsupported = result.unsupported_options || [];
    tone = !result.valid ? "error" : warnings.length || unsupported.length || !printerReady ? "warn" : "ok";
    title = !result.valid
      ? "Won't print with these settings"
      : n
        ? `${n} page${n === 1 ? "" : "s"}${settings.copies > 1 ? ` × ${settings.copies}` : ""} · ${sheets} sheet${sheets === 1 ? "" : "s"}`
        : "Ready";
    notes = [
      !printerReady && result.valid && "Printer isn't ready yet.",
      unsupported.length > 0 && `Not supported: ${unsupported.join(", ")}`,
      ...warnings,
    ].filter(Boolean);
  } else if (state !== "checking") return null;

  return (
    <div className={`verdict ${state === "checking" ? "is-stale" : ""}`} aria-live="polite">
      <p className="verdict__title">
        <Dot tone={tone} pulse={state === "checking" && !result} />
        {title}
      </p>
      {notes.map((w) => (
        <p key={w} className="verdict__note">
          {w}
        </p>
      ))}
    </div>
  );
}

export function Inspector({ flow, choices, printerReady, onSaveDefaults, onResetDefaults, defaultsState, disabled }) {
  const { settings, set, pageCount, rangeError, validation } = flow;
  const saved = defaultsState === "saved";
  return (
    <aside className="inspector" aria-label="Print settings">
      <header className="inspector__head">
        <h2 className="inspector__title">Output</h2>
        <div className="inspector__tools">
          <IconKey label="Use my defaults" icon={RotateCcw} size="sm" onClick={onResetDefaults} tipSide="bottom" />
          <IconKey
            label={saved ? "Saved as defaults" : "Save as my defaults"}
            icon={saved ? BookmarkCheck : BookmarkPlus}
            size="sm"
            className={saved ? "is-confirmed" : ""}
            onClick={onSaveDefaults}
            disabled={defaultsState === "saving"}
            tipSide="bottom"
          />
        </div>
      </header>
      <div className="inspector__body">
        <Row label="Copies">
          <Stepper value={settings.copies} onChange={(v) => set("copies", v)} disabled={disabled} />
        </Row>
        <PagesRow value={settings.pages} onChange={(v) => set("pages", v)} pageCount={pageCount} error={rangeError} disabled={disabled} />
        <div className="rule" role="presentation" />
        <OptionRows settings={settings} set={set} choices={choices} disabled={disabled} idPrefix="inspector" />
      </div>
      <footer className="inspector__foot">
        <Verdict validation={validation} settings={settings} rangeError={rangeError} printerReady={printerReady} />
      </footer>
    </aside>
  );
}
