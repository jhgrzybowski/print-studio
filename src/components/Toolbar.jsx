import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { DropdownMenu, Popover } from "radix-ui";
import { BookmarkCheck, BookmarkPlus, ChevronDown, Copy, Ellipsis, File, Files, Layers, Printer, RotateCcw, RotateCcwSquare, RotateCwSquare, SlidersHorizontal, Undo2 } from "lucide-react";
import { Dot, IconKey, MOD, PrintButton, quietTips, Segmented, Select, Stepper, Tip } from "./controls.jsx";
import { AdvancedRows, asGroups, ExtraRows, HandlingRows, LayoutRows, layoutSummary, mediaGroups, OptionRows, optionModel, paperSelectGroups, RowGroup } from "./Options.jsx";
import { SheetGridGlyph, TrayGlyph } from "./glyphs.jsx";
import { changedCount, conflictText } from "../lib/settings.js";
import { printerDot } from "./PrinterStatus.jsx";
import { COLOR_LABELS, label as labelOf } from "../lib/format.js";
import { cleanRange } from "../lib/pages.js";
import { nextFold } from "../lib/fold.js";
import { getLocale, t, tn } from "../i18n/index.js";

const PAGE_SET = { odd: "Odd pages", even: "Even pages" };

function PagesField({ value, onChange, pageCount, error, disabled, pageSet = "all", onPageSet, pageSets = [], compact, onOpenChange, onCloseAutoFocus }) {
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
  const range = value ? value.replace(/,/g, ", ") : pageCount ? t("All {n}", { n: pageCount }) : t("All pages");
  const label = pageSet !== "all" && PAGE_SET[pageSet] ? `${range} · ${t(pageSet === "odd" ? "pages|odd" : "pages|even")}` : range;

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        onOpenChange?.(o);
      }}
    >
      <Tip label={compact ? t("Pages: {value}", { value: label }) : t("Pages")} expanded={open}>
        <Popover.Trigger className={`field field--pages ${compact ? "field--compact" : ""} ${error ? "is-invalid" : ""}`} data-field-label={t("Pages")} aria-label={t("Pages: {value}", { value: label })} disabled={disabled || (single && pageSet === "all")}>
          <Files className="field__lead" size={17} strokeWidth={1.5} aria-hidden />
          <span className="field__val">{label}</span>
          <ChevronDown className="field__chev" size={14} strokeWidth={1.6} aria-hidden />
        </Popover.Trigger>
      </Tip>
      <Popover.Portal>
        <Popover.Content
          className="menu pop pop--pages"
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          onCloseAutoFocus={onCloseAutoFocus}
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
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            value={value}
            disabled={mode === "all"}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-err` : undefined}
            onChange={(e) => onChange(cleanRange(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && !error && setOpen(false)}
          />
          {error && (
            <p id={`${id}-err`} className="pop__error">
              {error}
            </p>
          )}
          {pageSets.length > 1 && !single && (
            <>
              <p className="menu__label">{t("Print")}</p>
              <Segmented
                label={t("Odd or even pages")}
                layoutKey="toolbar-pageset"
                value={pageSet}
                onChange={onPageSet}
                options={pageSets.map((v) => ({ value: v, label: v === "all" ? t("pages|All") : t(PAGE_SET[v]) }))}
              />
            </>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function DefaultsMenu({ rotation, onSaveDefaults, onResetDefaults, defaultsState }) {
  const saved = defaultsState === "saved";
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <Tip label={t("More options")} expanded={open}>
        <DropdownMenu.Trigger asChild>
          <button type="button" className={`ikey ikey--plain ikey--md ${saved ? "is-confirmed" : ""}`} aria-label={t("More options")}>
            {saved ? <BookmarkCheck size={18} strokeWidth={1.5} aria-hidden /> : <Ellipsis size={18} strokeWidth={1.5} aria-hidden />}
          </button>
        </DropdownMenu.Trigger>
      </Tip>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="menu" side="bottom" align="end" sideOffset={6} collisionPadding={12}>
          {rotation?.canRotate && (
            <>
              {/* The menu stays open, so a second press turns the pages again. */}
              <DropdownMenu.Item className="menu__item" onSelect={(e) => (e.preventDefault(), rotation.rotateAll(90))}>
                <RotateCwSquare size={16} strokeWidth={1.5} aria-hidden />
                {t("Rotate all pages right")}
              </DropdownMenu.Item>
              <DropdownMenu.Item className="menu__item" onSelect={(e) => (e.preventDefault(), rotation.rotateAll(-90))}>
                <RotateCcwSquare size={16} strokeWidth={1.5} aria-hidden />
                {t("Rotate all pages left")}
              </DropdownMenu.Item>
              {rotation.turned && (
                <DropdownMenu.Item className="menu__item" onSelect={rotation.reset}>
                  <Undo2 size={16} strokeWidth={1.5} aria-hidden />
                  {t("Undo rotation")}
                </DropdownMenu.Item>
              )}
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

/** A toolbar field that opens a panel of rows: layout, or paper handling and driver options. */
function PanelField({ label, icon: Icon, value, changed, children, wide, compact, keepValue, onOpenChange, onCloseAutoFocus }) {
  const [open, setOpen] = useState(false);
  const named = value ? `${label}: ${value}` : label;
  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        onOpenChange?.(o);
      }}
    >
      <Tip label={compact ? named : label} expanded={open}>
        <Popover.Trigger className={`field ${compact ? "field--compact" : ""} ${changed ? "is-changed" : ""}`} data-field-label={label} aria-label={named}>
          <Icon className="field__lead" size={17} strokeWidth={1.5} aria-hidden />
          {value && <span className="field__val">{value}</span>}
          {changed > 0 && (!value || compact || keepValue) && <span className="field__badge">{changed}</span>}
          <ChevronDown className="field__chev" size={14} strokeWidth={1.6} aria-hidden />
        </Popover.Trigger>
      </Tip>
      <Popover.Portal>
        <Popover.Content className={`menu pop pop--rows ${wide ? "pop--wide" : ""}`} side="bottom" align="start" sideOffset={6} collisionPadding={12} onCloseAutoFocus={onCloseAutoFocus}>
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

const HANDLING_KEYS = ["borderless", "reverse_order", "advanced"];
const SECONDARY_KEYS = ["media_type", "orientation", "quality", "pages_per_sheet", "scaling", ...HANDLING_KEYS];
const COMPACT_KEYS = ["color_mode", "duplex", ...SECONDARY_KEYS];

/**
 * How far the toolbar folds to fit, one step at a time:
 * 1 drops the values of the secondary fields, 2 moves them into one panel, 3 drops the values of
 * color and sides, 4 those of pages, paper and the panel, 5 moves color and sides into the panel.
 * The common choices stay in reach longest; copies, pages and paper always stay. Each step remembers
 * how wide the row was before it, so the row unfolds once there is room for exactly that. Changed
 * labels and loaded fonts forget those widths, and the row tries each wider step again before paint.
 */
function useFold(ref, measureKey, held) {
  const [fold, setFold] = useState(0);
  const need = useRef([]);
  const measured = useRef(measureKey);
  const refocus = useRef(null);
  const check = useRef(null);
  check.current = () => {
    const el = ref.current;
    // Hidden, or a panel is open: folding now would pull the panel out from under the pointer.
    if (!el || !el.clientWidth || held) return;
    if (measured.current !== measureKey) {
      measured.current = measureKey;
      need.current = [];
    }
    const overflow = el.scrollWidth > el.clientWidth + 1;
    if (overflow) need.current[fold] = el.scrollWidth;
    const next = nextFold(fold, { overflow, width: el.clientWidth, need: need.current });
    const active = document.activeElement;
    if (next !== fold) {
      // Each step settles before paint, but it may swap out the focused field for another.
      const field = el.contains(active) && active.closest("[data-field-label]");
      if (field) refocus.current = field.dataset.fieldLabel;
      setFold(next);
    } else if (refocus.current) {
      const label = refocus.current;
      refocus.current = null;
      if (active && active !== document.body) return;
      const fields = [...el.querySelectorAll("[data-field-label]")];
      const target = fields.find((e) => e.dataset.fieldLabel === label) || fields.find((e) => e.dataset.fieldLabel === t("More print settings"));
      quietTips();
      target?.focus({ preventScroll: true });
    }
  };
  // After every render, since a longer value can push the row over without a resize.
  useLayoutEffect(() => check.current());
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => check.current());
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  useEffect(() => {
    let live = true;
    const remeasure = () => {
      if (!live) return;
      need.current = [];
      check.current();
    };
    document.fonts.ready.then(remeasure);
    document.fonts.addEventListener("loadingdone", remeasure);
    return () => {
      live = false;
      document.fonts.removeEventListener("loadingdone", remeasure);
    };
  }, []);
  return fold;
}

/**
 * Which floating layers hold the toolbar still, by name. A layer holds from opening until focus
 * is back on its trigger, so a fold never cuts a closing panel short or removes its trigger first.
 */
function useHeld() {
  const [held, setHeld] = useState(() => new Set());
  const hold = useCallback((name) => {
    const set = (on) =>
      setHeld((s) => {
        if (on === s.has(name)) return s;
        const next = new Set(s);
        on ? next.add(name) : next.delete(name);
        return next;
      });
    return { onOpenChange: (open) => open && set(true), onCloseAutoFocus: () => set(false) };
  }, []);
  return [held.size > 0, hold];
}

/** The phone bar: menu, the document in hand, and the printer's state. Settings live in the dock below. */
export function PhoneBar({ lead, printer, onPrinter, onHome }) {
  return (
    <div className="toolbar toolbar--phone">
      {lead}
      {onHome ? (
        <button type="button" className="toolbar__title toolbar__home" onClick={onHome} aria-label={t("Print Studio home")}>
          Print Studio
        </button>
      ) : (
        <p className="toolbar__title">Print Studio</p>
      )}
      <button type="button" className="toolbar__printer" onClick={onPrinter} aria-label={t("Printer: {status}. Open settings", { status: printer.info.label })}>
        <Dot tone={printerDot(printer.info.tone)} pulse={printer.info.tone === "busy"} />
        <span>{printer.info.label}</span>
      </button>
    </div>
  );
}

/** Every print preference on one line above the stage, with Print at the end. */
export function Toolbar({ flow, choices, disabled, printDisabled, onPrint, onSaveDefaults, onResetDefaults, defaultsState, lead, narrow, printer, onPrinter, onHome, rotation }) {
  const { settings, set, pageCount, rangeError, printing } = flow;
  const m = optionModel(settings, set, choices);
  const scrollRef = useRef(null);
  const [held, hold] = useHeld();
  const fold = useFold(scrollRef, JSON.stringify([getLocale(), choices, settings, pageCount]), held);
  const secondaryFolded = fold >= 2;
  const baseCompact = fold >= 4;
  const primaryFolded = fold >= 5;

  // The document chip on the stage carries the file name, so the bar names the place.
  if (narrow) return <PhoneBar lead={lead} printer={printer} onPrinter={onPrinter} onHome={onHome} />;

  const laidOut = Number(settings.pages_per_sheet) > 1 || (settings.scaling && settings.scaling !== "auto");
  const folded = secondaryFolded && {
    ...choices,
    paper_size: [],
    color_mode: primaryFolded ? choices.color_mode : [],
    duplex: primaryFolded ? choices.duplex : [],
  };

  return (
    <div className="toolbar" role="toolbar" aria-label={t("Print settings")}>
      {lead}
      <div className="toolbar__scroll" ref={scrollRef}>
        <div className="toolbar__group">
          <Stepper label={t("Copies")} decLabel={t("Fewer copies")} incLabel={t("More copies")} icon={Copy} value={settings.copies} onChange={(v) => set("copies", v)} disabled={disabled} />
          <PagesField
            value={settings.pages}
            onChange={(v) => set("pages", v)}
            pageCount={pageCount}
            error={rangeError}
            disabled={!flow.doc}
            pageSet={settings.page_set}
            onPageSet={(v) => set("page_set", v)}
            pageSets={choices.page_set}
            compact={baseCompact}
            {...hold("pages")}
          />
          {choices.paper_size?.length > 0 && (
            <Select label={t("Paper size")} icon={File} value={settings.paper_size} onChange={(v) => set("paper_size", v)} groups={paperSelectGroups(choices.paper_size)} disabled={disabled} compact={baseCompact} {...hold("paper")} />
          )}
        </div>

        <span className="toolbar__sep" role="separator" aria-orientation="vertical" />

        <div className="toolbar__group">
          {!primaryFolded && m.color && <Select label={t("Color")} compact={fold >= 3} disabled={disabled} value={m.color.value} onChange={m.color.onChange} groups={asGroups(m.color)} {...hold("color")} />}
          {!primaryFolded && m.duplex && <Select label={t("Sides")} compact={fold >= 3} disabled={disabled} value={m.duplex.value} onChange={m.duplex.onChange} groups={asGroups(m.duplex)} {...hold("duplex")} />}
          {secondaryFolded ? (
            <PanelField
              label={t("More print settings")}
              icon={SlidersHorizontal}
              value={t("Settings")}
              changed={changedCount(settings, primaryFolded ? COMPACT_KEYS : SECONDARY_KEYS)}
              wide
              keepValue
              compact={baseCompact}
              {...hold("more")}
            >
              <div className="rows">
                <OptionRows settings={settings} set={set} choices={folded} disabled={disabled} idPrefix="tb-all" rotation={rotation} />
              </div>
              <ExtraRows settings={settings} set={set} choices={choices} disabled={disabled} isPdf={flow.isPdf} idPrefix="tb-all" />
            </PanelField>
          ) : (
            <>
              {choices.media_type?.length > 0 && (
                <Select
                  label={t("Paper type")}
                  icon={Layers}
                  compact={fold >= 1}
                  value={settings.media_type}
                  onChange={(v) => set("media_type", v)}
                  groups={mediaGroups(choices.media_type, choices.media_type_labels)}
                  disabled={disabled}
                  {...hold("media")}
                />
              )}
              {m.orientation && <Select label={t("Orientation")} compact={fold >= 1} disabled={disabled} value={m.orientation.value} onChange={m.orientation.onChange} groups={asGroups(m.orientation)} {...hold("orientation")} />}
              {m.quality && <Select label={t("Quality")} compact={fold >= 1} disabled={disabled} value={m.quality.value} onChange={m.quality.onChange} groups={asGroups(m.quality)} {...hold("quality")} />}
              {((choices.pages_per_sheet || []).length > 1 || (choices.scaling || []).length > 1) && (
                <PanelField
                  label={t("Layout and scaling")}
                  icon={SheetGridGlyph}
                  // The field names the layout only once it differs from one page per sheet at its own size.
                  value={laidOut ? layoutSummary(settings) : null}
                  changed={laidOut ? 1 : 0}
                  compact={fold >= 1}
                  {...hold("layout")}
                >
                  <p className="menu__label">{t("group|Layout")}</p>
                  <div className="rows">
                    <LayoutRows settings={settings} set={set} choices={choices} disabled={disabled} isPdf={flow.isPdf} idPrefix="tb-lay" />
                  </div>
                </PanelField>
              )}
              {((choices.media_source || []).length > 1 || choices.borderless || choices.reverse_order || choices.collate || (choices.advanced || []).length > 0) && (
                <PanelField label={t("Paper handling and driver")} icon={TrayGlyph} changed={changedCount(settings, HANDLING_KEYS)} wide compact {...hold("handling")}>
                  <div className="rows">
                    <HandlingRows settings={settings} set={set} choices={choices} disabled={disabled} />
                  </div>
                  {(choices.advanced || []).length > 0 && (
                    <RowGroup title={t("Printer driver")}>
                      <AdvancedRows settings={settings} set={set} choices={choices} disabled={disabled} />
                    </RowGroup>
                  )}
                </PanelField>
              )}
            </>
          )}
        </div>

        <span className="toolbar__spacer" />
      </div>

      <div className="toolbar__print">
        <DefaultsMenu rotation={rotation} onSaveDefaults={onSaveDefaults} onResetDefaults={onResetDefaults} defaultsState={defaultsState} />
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
export function Verdict({ validation, current, settings, rangeError, printerReady, plan, choices = {} }) {
  if (rangeError) return null;
  const { state, warnings: lastWarnings = [], error } = validation;
  // Until the printer answers for these very settings, its last answer is about old ones: the
  // local plan still counts what prints, but no old verdict or note stands in for the new one.
  const checking = state === "checking" || (state === "done" && !current);
  const result = current;
  const warnings = current ? lastWarnings : [];
  let tone = "muted";
  let title = t("Checking");
  let notes = [];
  let opts = null;
  if (state === "error") {
    tone = "error";
    title = t("Couldn't check");
    notes = [error];
  } else if (result || plan) {
    // The plan counts what really prints: odd/even pages, pages per sheet and two-sided pairs.
    const n = plan ? plan.selected_page_count : result.selected_pages?.length || result.page_count || 0;
    const sheets = plan ? plan.total_sheets : sheetsFor(n, settings.copies, settings.duplex);
    const unsupported = result?.unsupported_options || [];
    const conflicts = result?.conflicts || [];
    const valid = !result || result.valid;
    tone = !valid ? "error" : !result ? "muted" : warnings.length || unsupported.length || !printerReady ? "warn" : "ok";
    title = !valid
      ? conflicts.length
        ? t("These settings conflict")
        : t("Won't print with these settings")
      : n
        ? `${tn(n, "{n} page", "{n} pages")}${settings.copies > 1 ? ` × ${settings.copies}` : ""} · ${tn(sheets, "{n} sheet", "{n} sheets")}`
        : t("settings|Ready");
    if (valid && n)
      opts = [settings.color_mode && labelOf(COLOR_LABELS, settings.color_mode), settings.duplex && (settings.duplex === "none" ? t("One-sided") : t("Two-sided")), plan?.reverse_order && t("last sheet first")]
        .filter(Boolean)
        .join(" · ");
    notes = [
      !printerReady && valid && result && t("Printer isn't ready yet."),
      ...conflicts.map((c) => conflictText(c, choices, t)),
      unsupported.length > 0 && t("Not supported: {options}", { options: unsupported.join(", ") }),
      ...warnings,
    ].filter(Boolean);
  } else if (!checking) return null;
  if (checking && plan) opts = t("Checking");

  return (
    <div className={`verdict ${checking ? "is-stale" : ""}`} aria-live="polite">
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
        <Dot tone={tone} pulse={checking} />
        {title}
        {opts && <span className="verdict__opts">· {opts}</span>}
      </p>
    </div>
  );
}
