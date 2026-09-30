import { useEffect, useId, useRef, useState } from "react";
import { DropdownMenu, Popover } from "radix-ui";
import { BookmarkCheck, BookmarkPlus, Check, ChevronDown, Copy, Ellipsis, File, Files, FlipVertical2, Layers, Printer, RotateCcw, Shrink } from "lucide-react";
import { Dot, IconKey, MOD, PrintButton, Segmented, Select, Stepper, Tip } from "./controls.jsx";
import { asGroups, mediaGroups, optionModel, paperSelectGroups } from "./Options.jsx";
import { printerDot } from "./PrinterStatus.jsx";
import { COLOR_LABELS, label as labelOf } from "../lib/format.js";
import { t, tn } from "../i18n/index.js";

function PagesField({ value, onChange, pageCount, error, disabled }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(value ? "range" : "all");
  const inputRef = useRef(null);
  const id = useId();
  useEffect(() => {
    if (value) setMode("range");
    // Range cleared elsewhere (new file, every thumbnail ticked): fall back to All unless the user is typing.
    else if (document.activeElement !== inputRef.current) setMode("all");
  }, [value]);

  const single = pageCount === 1;
  const label = value ? value.replace(/,/g, ", ") : pageCount ? t("All {n}", { n: pageCount }) : t("All pages");

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Tip label={t("Pages")}>
        <Popover.Trigger className={`field field--pages ${error ? "is-invalid" : ""}`} aria-label={t("Pages: {value}", { value: label })} disabled={disabled || single}>
          <Files className="field__lead" size={17} strokeWidth={1.5} aria-hidden />
          <span className="field__val">{label}</span>
          <ChevronDown className="field__chev" size={14} strokeWidth={1.6} aria-hidden />
        </Popover.Trigger>
      </Tip>
      <Popover.Portal>
        <Popover.Content
          className="menu pop"
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          onOpenAutoFocus={(e) => {
            if (mode === "range") {
              e.preventDefault();
              inputRef.current?.focus();
            }
          }}
        >
          <p className="menu__label">{t("Pages")}</p>
          <Segmented
            label={t("Pages")}
            layoutKey="toolbar-pages"
            value={mode}
            onChange={(m) => {
              setMode(m);
              if (m === "all") onChange("");
              else setTimeout(() => inputRef.current?.focus(), 30);
            }}
            options={[
              { value: "all", label: pageCount ? t("All {n}", { n: pageCount }) : t("pages|All") },
              { value: "range", label: t("Range") },
            ]}
          />
          <label className="sr-only" htmlFor={id}>
            {t("Page range")}
          </label>
          <input
            ref={inputRef}
            id={id}
            className="input pop__input"
            placeholder="1-3, 5"
            value={value}
            disabled={mode === "all"}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-err` : undefined}
            onChange={(e) => onChange(e.target.value.replace(/[^\d,\-\s]/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && !error && setOpen(false)}
          />
          {error && (
            <p id={`${id}-err`} className="pop__error">
              {error}
            </p>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function DefaultsMenu({ model, onSaveDefaults, onResetDefaults, defaultsState }) {
  const saved = defaultsState === "saved";
  return (
    <DropdownMenu.Root>
      <Tip label={t("More options")}>
        <DropdownMenu.Trigger asChild>
          <button type="button" className={`ikey ikey--plain ikey--md ${saved ? "is-confirmed" : ""}`} aria-label={t("More options")}>
            {saved ? <BookmarkCheck size={18} strokeWidth={1.5} aria-hidden /> : <Ellipsis size={18} strokeWidth={1.5} aria-hidden />}
          </button>
        </DropdownMenu.Trigger>
      </Tip>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="menu" side="bottom" align="end" sideOffset={6} collisionPadding={12}>
          {model.canFlip && (
            <>
              <DropdownMenu.CheckboxItem className="menu__item menu__item--check" checked={model.flipped} onCheckedChange={model.toggleFlip}>
                <DropdownMenu.ItemIndicator className="menu__check">
                  <Check size={14} strokeWidth={1.8} />
                </DropdownMenu.ItemIndicator>
                <FlipVertical2 size={16} strokeWidth={1.5} aria-hidden />
                {t("Print upside down")}
              </DropdownMenu.CheckboxItem>
              <DropdownMenu.Separator className="menu__sep" />
            </>
          )}
          <DropdownMenu.Item className="menu__item" onSelect={onSaveDefaults} disabled={defaultsState === "saving"}>
            <BookmarkPlus size={16} strokeWidth={1.5} aria-hidden />
            {t("Save as my defaults")}
          </DropdownMenu.Item>
          <DropdownMenu.Item className="menu__item" onSelect={onResetDefaults}>
            <RotateCcw size={16} strokeWidth={1.5} aria-hidden />
            {t("Use my defaults")}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** The phone bar: menu, the document in hand, and the printer's state. Settings live in the dock below. */
function PhoneBar({ lead, title, printer, onPrinter }) {
  return (
    <div className="toolbar toolbar--phone">
      {lead}
      <p className="toolbar__title">{title}</p>
      <button type="button" className="toolbar__printer" onClick={onPrinter} aria-label={t("Printer: {status}. Open settings", { status: printer.info.label })}>
        <Dot tone={printerDot(printer.info.tone)} pulse={printer.info.tone === "busy"} />
        <span>{printer.info.label}</span>
      </button>
    </div>
  );
}

/** Every print preference on one line above the stage, with Print at the end. */
export function Toolbar({ flow, choices, disabled, printDisabled, onPrint, onSaveDefaults, onResetDefaults, defaultsState, lead, narrow, printer, onPrinter }) {
  const { settings, set, pageCount, rangeError, printing } = flow;
  const m = optionModel(settings, set, choices);

  // The document chip on the stage carries the file name, so the bar names the place.
  if (narrow) return <PhoneBar lead={lead} title="Print Studio" printer={printer} onPrinter={onPrinter} />;

  return (
    <div className="toolbar" role="toolbar" aria-label={t("Print settings")}>
      {lead}
      <div className="toolbar__scroll">
        <div className="toolbar__group">
          <Stepper
            label={t("Copies")}
            decLabel={t("Fewer copies")}
            incLabel={t("More copies")}
            icon={Copy}
            value={settings.copies}
            onChange={(v) => set("copies", v)}
            disabled={disabled}
          />
          <PagesField value={settings.pages} onChange={(v) => set("pages", v)} pageCount={pageCount} error={rangeError} disabled={!flow.doc} />
          {choices.paper_size?.length > 0 && (
            <Select
              label={t("Paper size")}
              icon={File}
              value={settings.paper_size}
              onChange={(v) => set("paper_size", v)}
              groups={paperSelectGroups(choices.paper_size)}
              disabled={disabled}
            />
          )}
          {choices.media_type?.length > 0 && (
            <Select
              label={t("Paper type")}
              icon={Layers}
              collapse
              value={settings.media_type}
              onChange={(v) => set("media_type", v)}
              groups={mediaGroups(choices.media_type)}
              disabled={disabled}
            />
          )}
        </div>

        <span className="toolbar__sep" role="separator" aria-orientation="vertical" />

        <div className="toolbar__group">
          {m.color && <Select label={t("Color")} collapse="compact" disabled={disabled} value={m.color.value} onChange={m.color.onChange} groups={asGroups(m.color)} />}
          {m.duplex && <Select label={t("Sides")} collapse="compact" disabled={disabled} value={m.duplex.value} onChange={m.duplex.onChange} groups={asGroups(m.duplex)} />}
          {m.orientation && <Segmented label={t("Orientation")} layoutKey="tb-orient" iconOnly disabled={disabled} {...m.orientation} />}
          {m.quality && <Select label={t("Quality")} collapse="compact" disabled={disabled} value={m.quality.value} onChange={m.quality.onChange} groups={asGroups(m.quality)} />}
          {choices.fit_to_page && (
            <IconKey
              label={settings.fit_to_page ? t("Fit to page: on") : t("Fit to page: off")}
              icon={Shrink}
              pressed={!!settings.fit_to_page}
              onClick={() => set("fit_to_page", !settings.fit_to_page)}
              disabled={disabled}
            />
          )}
        </div>

        <span className="toolbar__spacer" />
      </div>

      <div className="toolbar__print">
        <DefaultsMenu model={m} onSaveDefaults={onSaveDefaults} onResetDefaults={onResetDefaults} defaultsState={defaultsState} />
        <PrintButton icon={Printer} shortcut={`${MOD}P`} onClick={onPrint} disabled={printDisabled} state={printing.state} />
      </div>
    </div>
  );
}

export function sheetsFor(pages, copies, duplex) {
  const perCopy = duplex && duplex !== "none" ? Math.ceil(pages / 2) : pages;
  return perCopy * copies;
}

/** The dry-run result, as a count of sheets with any notes above it. */
export function Verdict({ validation, settings, rangeError, printerReady }) {
  if (rangeError) return null;
  const { state, result, warnings = [], error } = validation;
  let tone = "muted";
  let title = t("Checking");
  let notes = [];
  let opts = null;
  if (state === "error") {
    tone = "error";
    title = t("Couldn't check");
    notes = [error];
  } else if (result) {
    const n = result.selected_pages?.length || result.page_count || 0;
    const sheets = sheetsFor(n, settings.copies, settings.duplex);
    const unsupported = result.unsupported_options || [];
    tone = !result.valid ? "error" : warnings.length || unsupported.length || !printerReady ? "warn" : "ok";
    title = !result.valid
      ? t("Won't print with these settings")
      : n
        ? `${tn(n, "{n} page", "{n} pages")}${settings.copies > 1 ? ` × ${settings.copies}` : ""} · ${tn(sheets, "{n} sheet", "{n} sheets")}`
        : t("settings|Ready");
    if (result.valid && n)
      opts = [settings.color_mode && labelOf(COLOR_LABELS, settings.color_mode), settings.duplex && (settings.duplex === "none" ? t("One-sided") : t("Two-sided"))]
        .filter(Boolean)
        .join(" · ");
    notes = [
      !printerReady && result.valid && t("Printer isn't ready yet."),
      unsupported.length > 0 && t("Not supported: {options}", { options: unsupported.join(", ") }),
      ...warnings,
    ].filter(Boolean);
  } else if (state !== "checking") return null;

  return (
    <div className={`verdict ${state === "checking" ? "is-stale" : ""}`} aria-live="polite">
      {notes.length > 0 && (
        <div className="verdict__notes">
          {notes.map((w) => (
            <p key={w} className="verdict__note">
              {w}
            </p>
          ))}
        </div>
      )}
      <p className="verdict__title">
        <Dot tone={tone} pulse={state === "checking" && !result} />
        {title}
        {opts && <span className="verdict__opts">· {opts}</span>}
      </p>
    </div>
  );
}
