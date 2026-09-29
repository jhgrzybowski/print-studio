import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, CircleCheck, RectangleHorizontal, RectangleVertical, RotateCcw, Save, TriangleAlert } from "lucide-react";
import { Field, Key, Segmented, Select, Stepper, Switch } from "./controls.jsx";
import { COLOR_LABELS, DUPLEX_LABELS, mediaLabel, paperGroups, paperName, QUALITY_LABELS } from "../lib/format.js";

const ORDER = {
  color_mode: ["color", "monochrome", "auto"],
  duplex: ["none", "long-edge", "short-edge"],
  quality: ["draft", "normal", "high"],
};
const DUPLEX_SHORT = { none: "Off", "long-edge": "Long edge", "short-edge": "Short edge" };
const COLOR_SHORT = { color: "Color", monochrome: "B&W", auto: "Auto" };

function ordered(key, list = []) {
  const o = ORDER[key] || [];
  return [...list].sort((a, b) => (o.indexOf(a) + 1 || 99) - (o.indexOf(b) + 1 || 99));
}

export function paperSelectGroups(choices) {
  const { common, rest } = paperGroups(choices || []);
  const g = [];
  if (common.length) g.push({ label: rest.length ? "Common" : undefined, items: common.map((v) => ({ value: v, label: paperName(v) })) });
  if (rest.length) g.push({ label: "More sizes", items: rest.map((v) => ({ value: v, label: paperName(v) })) });
  return g;
}

/** The option controls shared by the composer pane and the settings view. */
export function OptionControls({ settings, set, choices, disabled, idPrefix = "opt", showCopies = true }) {
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
      {showCopies && (
        <Field label="Copies">
          <Stepper value={settings.copies} onChange={(v) => set("copies", v)} disabled={disabled} />
        </Field>
      )}

      {choices.paper_size?.length > 0 && (
        <Field label="Paper size">
          <Select
            label="Paper size"
            value={settings.paper_size}
            onChange={(v) => set("paper_size", v)}
            groups={paperSelectGroups(choices.paper_size)}
            disabled={disabled}
          />
        </Field>
      )}

      {orient.length > 0 && (
        <Field label="Orientation">
          <Segmented
            label="Orientation"
            layoutKey={`${idPrefix}-orient`}
            value={landscape ? "landscape" : "portrait"}
            onChange={(v) => setOrientation(v, flipped)}
            disabled={disabled}
            options={[
              { value: "portrait", label: "Portrait", icon: RectangleVertical },
              { value: "landscape", label: "Landscape", icon: RectangleHorizontal },
            ]}
          />
        </Field>
      )}

      {choices.color_mode?.length > 0 && (
        <Field label="Color" hint={COLOR_LABELS[settings.color_mode]}>
          <Segmented
            label="Color"
            layoutKey={`${idPrefix}-color`}
            value={settings.color_mode}
            onChange={(v) => set("color_mode", v)}
            disabled={disabled}
            options={ordered("color_mode", choices.color_mode).map((v) => ({ value: v, label: COLOR_SHORT[v] || v }))}
          />
        </Field>
      )}

      {choices.duplex?.length > 0 && (
        <Field label="Two-sided" hint={settings.duplex === "none" ? "" : settings.duplex === "long-edge" ? "Flips like a book" : "Flips like a notepad"}>
          <Segmented
            label="Two-sided printing"
            layoutKey={`${idPrefix}-duplex`}
            value={settings.duplex}
            onChange={(v) => set("duplex", v)}
            disabled={disabled}
            options={ordered("duplex", choices.duplex).map((v) => ({ value: v, label: DUPLEX_SHORT[v] || DUPLEX_LABELS[v] || v }))}
          />
        </Field>
      )}

      {choices.quality?.length > 0 && (
        <Field label="Quality">
          <Segmented
            label="Quality"
            layoutKey={`${idPrefix}-quality`}
            value={settings.quality}
            onChange={(v) => set("quality", v)}
            disabled={disabled}
            options={ordered("quality", choices.quality).map((v) => ({ value: v, label: QUALITY_LABELS[v] || v }))}
          />
        </Field>
      )}

      {choices.media_type?.length > 0 && (
        <Field label="Paper type">
          <Select
            label="Paper type"
            value={settings.media_type}
            onChange={(v) => set("media_type", v)}
            groups={[{ items: choices.media_type.map((v) => ({ value: v, label: mediaLabel(v) })) }]}
            disabled={disabled}
          />
        </Field>
      )}

      {choices.fit_to_page && (
        <div className="toggle-row">
          <label htmlFor={`${idPrefix}-fit`}>
            <span className="toggle-row__label">Fit to page</span>
            <span className="toggle-row__hint">Shrink content that runs past the margins</span>
          </label>
          <Switch id={`${idPrefix}-fit`} checked={!!settings.fit_to_page} onChange={(v) => set("fit_to_page", v)} disabled={disabled} />
        </div>
      )}

      {canFlip && orient.length > 0 && (
        <div className="toggle-row">
          <label htmlFor={`${idPrefix}-flip`}>
            <span className="toggle-row__label">Rotate 180°</span>
            <span className="toggle-row__hint">For paper loaded upside down</span>
          </label>
          <Switch
            id={`${idPrefix}-flip`}
            checked={flipped}
            onChange={(v) => setOrientation(landscape ? "landscape" : "portrait", v)}
            disabled={disabled}
          />
        </div>
      )}
    </>
  );
}

function PagesControl({ value, onChange, pageCount, error, disabled }) {
  const [mode, setMode] = useState(value ? "custom" : "all");
  const inputRef = useRef(null);
  const id = useId();
  useEffect(() => {
    if (value) setMode("custom");
    // Range reset elsewhere (new file, every thumbnail ticked): fall back to All unless the user is typing.
    else if (document.activeElement !== inputRef.current) setMode("all");
  }, [value]);

  return (
    <Field label="Pages" hint={pageCount ? `${pageCount} in file` : ""}>
      <Segmented
        label="Pages"
        layoutKey="pane-pages"
        value={mode}
        disabled={disabled || pageCount === 1}
        onChange={(m) => {
          setMode(m);
          if (m === "all") onChange("");
          else setTimeout(() => inputRef.current?.focus(), 30);
        }}
        options={[
          { value: "all", label: "All" },
          { value: "custom", label: "Custom range" },
        ]}
      />
      <AnimatePresence initial={false}>
        {mode === "custom" && (
          <motion.div
            className="collapse"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="collapse__inner">
              <input
                ref={inputRef}
                id={id}
                className="input"
                placeholder="For example 1-3, 5"
                value={value}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-err` : undefined}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value.replace(/[^\d,\-\s]/g, ""))}
              />
              {error && (
                <p id={`${id}-err`} className="field-error">
                  {error}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Field>
  );
}

function sheetsFor(pages, copies, duplex) {
  const perCopy = duplex && duplex !== "none" ? Math.ceil(pages / 2) : pages;
  return perCopy * copies;
}

function CheckSummary({ validation, settings, rangeError, printerReady }) {
  if (rangeError) return null;
  const { state, result, warnings = [], error } = validation;
  let body;
  if (state === "checking" && !result) {
    body = (
      <div className="check check--loading" aria-busy="true">
        <span className="skel" style={{ width: "70%" }} />
        <span className="skel skel--sm" style={{ width: "45%" }} />
      </div>
    );
  } else if (state === "error") {
    body = (
      <div className="check tone-error">
        <CircleAlert size={17} strokeWidth={1.8} aria-hidden />
        <div>
          <p className="check__title">Couldn't check these settings</p>
          <p className="check__text">{error}</p>
        </div>
      </div>
    );
  } else if (result) {
    const n = result.selected_pages?.length || result.page_count || 0;
    const sheets = sheetsFor(n, settings.copies, settings.duplex);
    const unsupported = result.unsupported_options || [];
    const tone = !result.valid ? "error" : warnings.length || unsupported.length || !printerReady ? "warn" : "ok";
    const Icon = tone === "ok" ? CircleCheck : tone === "warn" ? TriangleAlert : CircleAlert;
    body = (
      <div className={`check tone-${tone} ${state === "checking" ? "is-stale" : ""}`}>
        <Icon size={17} strokeWidth={1.8} aria-hidden />
        <div>
          <p className="check__title">
            {!result.valid
              ? "These settings won't print"
              : n
                ? `${n} page${n === 1 ? "" : "s"}${settings.copies > 1 ? ` × ${settings.copies}` : ""}, ${sheets} sheet${sheets === 1 ? "" : "s"} of paper`
                : `Ready to print${settings.copies > 1 ? `, ${settings.copies} copies` : ""}`}
          </p>
          {!printerReady && result.valid && <p className="check__text">Settings are fine. The printer needs to be on to print.</p>}
          {unsupported.length > 0 && <p className="check__text">Not supported here: {unsupported.join(", ")}</p>}
          {warnings.map((w) => (
            <p key={w} className="check__text">
              {w}
            </p>
          ))}
        </div>
      </div>
    );
  } else return null;
  return (
    <div className="pane__check" aria-live="polite">
      {body}
    </div>
  );
}

export function ToolPane({ flow, choices, printerReady, onSaveDefaults, onResetDefaults, defaultsState, disabled }) {
  const { settings, set, pageCount, rangeError, validation } = flow;
  return (
    <aside className="pane" aria-label="Print settings">
      <div className="pane__scroll">
        <div className="pane__group">
          <Field label="Copies">
            <Stepper value={settings.copies} onChange={(v) => set("copies", v)} disabled={disabled} />
          </Field>
          <PagesControl value={settings.pages} onChange={(v) => set("pages", v)} pageCount={pageCount} error={rangeError} disabled={disabled} />
        </div>
        <div className="pane__group">
          <OptionControls settings={settings} set={set} choices={choices} disabled={disabled} idPrefix="pane" showCopies={false} />
        </div>
      </div>
      <div className="pane__foot">
        <CheckSummary validation={validation} settings={settings} rangeError={rangeError} printerReady={printerReady} />
        <div className="pane__keys">
          <Key variant="ghost" size="sm" icon={RotateCcw} onClick={onResetDefaults}>
            Use defaults
          </Key>
          <Key variant="raised" size="sm" icon={defaultsState === "saved" ? CircleCheck : Save} onClick={onSaveDefaults} disabled={defaultsState === "saving"}>
            {defaultsState === "saved" ? "Saved as default" : "Save as default"}
          </Key>
        </div>
      </div>
    </aside>
  );
}
