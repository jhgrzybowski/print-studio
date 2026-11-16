import { useState } from "react";
import { ChevronDown, RectangleHorizontal, RectangleVertical, RotateCcwSquare, RotateCwSquare, Undo2 } from "lucide-react";
import { Button, IconKey, Row, Segmented, Select, Stepper, Switch } from "./controls.jsx";
import { AutoGlyph, AutoOrientGlyph, ColorGlyph, DraftGlyph, HighGlyph, LongEdgeGlyph, MonoGlyph, OneSidedGlyph, orderGlyph, ShortEdgeGlyph, StandardGlyph } from "./glyphs.jsx";
import { COLOR_LABELS, DUPLEX_LABELS, label, mediaLabel, paperGroups, paperMM, paperName, QUALITY_LABELS } from "../lib/format.js";
import { canCustomScale } from "../lib/settings.js";
import { t, tn } from "../i18n/index.js";

const ORDER = {
  color_mode: ["color", "monochrome", "auto"],
  duplex: ["none", "long-edge", "short-edge"],
  quality: ["draft", "normal", "high"],
};
const COLOR_ICONS = { color: ColorGlyph, monochrome: MonoGlyph, auto: AutoGlyph };
// English keys, translated where the descriptors are built.
const COLOR_SHORT = { monochrome: "B&W", auto: "short|Auto" };
const DUPLEX_ICONS = { none: OneSidedGlyph, "long-edge": LongEdgeGlyph, "short-edge": ShortEdgeGlyph };
// The toolbar field shows one word; the menu explains the flip.
const DUPLEX_FIELD = { none: "One-sided", "long-edge": "Two-sided", "short-edge": "Two-sided, short" };
const DUPLEX_SUB = { "long-edge": "Flip on long edge", "short-edge": "Flip on short edge" };
const DUPLEX_SHORT = { none: "One", "long-edge": "Long", "short-edge": "Short" };
const QUALITY_ICONS = { draft: DraftGlyph, normal: StandardGlyph, high: HighGlyph };
const QUALITY_SHORT = { normal: "short|Standard" };

function ordered(key, list = []) {
  const o = ORDER[key] || [];
  return [...list].sort((a, b) => (o.indexOf(a) + 1 || 99) - (o.indexOf(b) + 1 || 99));
}

function mmLabel(v) {
  if (!/^w\d|^[A-Z]/.test(v || "")) return undefined;
  const [w, h] = paperMM(v);
  const name = paperName(v);
  return /mm|in\b/.test(name) ? undefined : `${Math.round(w)} × ${Math.round(h)} mm`;
}

export function paperSelectGroups(choices) {
  const { common, rest } = paperGroups(choices || []);
  const g = [];
  if (common.length) g.push({ label: rest.length ? t("Common") : undefined, items: common.map((v) => ({ value: v, label: paperName(v), sub: mmLabel(v) })) });
  if (rest.length) g.push({ label: t("paper|More"), items: rest.map((v) => ({ value: v, label: paperName(v) })) });
  return g;
}

/** Paper types with the driver's own name beneath, so "Photo paper" says which photo paper. */
export const mediaGroups = (choices, driver = {}) => [
  { items: (choices || []).map((v) => ({ value: v, label: mediaLabel(v), sub: driver[v] && driver[v] !== mediaLabel(v) ? driver[v] : undefined })) },
];

/** A segmented descriptor as one group for a Select, keeping each option's glyph. */
export const asGroups = (desc) => [{ items: desc.options.map((o) => ({ value: o.value, label: o.field || o.label, sub: o.sub, icon: o.icon })) }];

/** Option descriptors shared by the toolbar, the phone sheet and the defaults in Settings. */
export function optionModel(settings, set, choices) {
  const orient = choices.orientation || [];
  const value = (settings.orientation || "auto").replace(/^reverse-/, "");
  const landscape = value === "landscape";
  return {
    landscape,
    orientation: orient.length > 0 && {
      value,
      onChange: (v) => set("orientation", v),
      options: [
        { value: "auto", label: t("orientation|Auto"), sub: t("Each page as it is"), icon: AutoOrientGlyph },
        { value: "portrait", label: t("Portrait"), icon: RectangleVertical },
        { value: "landscape", label: t("Landscape"), icon: RectangleHorizontal },
      ].filter((o) => orient.includes(o.value)),
    },
    color: choices.color_mode?.length > 0 && {
      value: settings.color_mode,
      onChange: (v) => set("color_mode", v),
      options: ordered("color_mode", choices.color_mode).map((v) => ({
        value: v,
        label: label(COLOR_LABELS, v),
        short: COLOR_SHORT[v] && t(COLOR_SHORT[v]),
        icon: COLOR_ICONS[v] || ColorGlyph,
      })),
    },
    duplex: choices.duplex?.length > 0 && {
      value: settings.duplex,
      onChange: (v) => set("duplex", v),
      options: ordered("duplex", choices.duplex).map((v) => ({
        value: v,
        label: label(DUPLEX_LABELS, v),
        field: DUPLEX_FIELD[v] && t(DUPLEX_FIELD[v]),
        sub: DUPLEX_SUB[v] && t(DUPLEX_SUB[v]),
        short: DUPLEX_SHORT[v] && t(DUPLEX_SHORT[v]),
        icon: DUPLEX_ICONS[v] || OneSidedGlyph,
      })),
    },
    quality: choices.quality?.length > 0 && {
      value: settings.quality,
      onChange: (v) => set("quality", v),
      options: ordered("quality", choices.quality).map((v) => ({
        value: v,
        label: label(QUALITY_LABELS, v),
        short: QUALITY_SHORT[v] && t(QUALITY_SHORT[v]),
        icon: QUALITY_ICONS[v] || StandardGlyph,
      })),
    },
  };
}

/** Output rows with words, for the defaults in Settings and the phone sheet. */
export function OptionRows({ settings, set, choices, disabled, idPrefix = "opt", rotation }) {
  const m = optionModel(settings, set, choices);
  return (
    <>
      {choices.paper_size?.length > 0 && (
        <Row label={t("Paper")}>
          <Select label={t("Paper size")} value={settings.paper_size} onChange={(v) => set("paper_size", v)} groups={paperSelectGroups(choices.paper_size)} disabled={disabled} />
        </Row>
      )}

      {m.color && (
        <Row label={t("Color")} className="row--seg">
          <Segmented label={t("Color")} layoutKey={`${idPrefix}-color`} disabled={disabled} {...m.color} />
        </Row>
      )}

      {m.duplex && (
        <Row label={t("Sides")} className="row--seg">
          <Segmented label={t("Sides")} layoutKey={`${idPrefix}-duplex`} disabled={disabled} {...m.duplex} />
        </Row>
      )}

      {m.orientation && (
        <Row label={t("Orientation")} className="row--seg">
          <Segmented label={t("Orientation")} layoutKey={`${idPrefix}-orient`} disabled={disabled} {...m.orientation} />
        </Row>
      )}

      {m.quality && (
        <Row label={t("Quality")} className="row--seg">
          <Segmented label={t("Quality")} layoutKey={`${idPrefix}-quality`} disabled={disabled} {...m.quality} />
        </Row>
      )}

      {choices.media_type?.length > 0 && (
        <Row label={t("Paper type")}>
          <Select label={t("Paper type")} value={settings.media_type} onChange={(v) => set("media_type", v)} groups={mediaGroups(choices.media_type, choices.media_type_labels)} disabled={disabled} />
        </Row>
      )}

      {rotation?.canRotate && (
        <Row label={t("Rotate all pages")} hint={t("Turned pages shrink to fit the paper")}>
          <div className="rotate-pair">
            <IconKey label={t("Rotate left")} icon={RotateCcwSquare} onClick={() => rotation.rotateAll(-90)} disabled={disabled} />
            <IconKey label={t("Rotate right")} icon={RotateCwSquare} onClick={() => rotation.rotateAll(90)} disabled={disabled} />
          </div>
        </Row>
      )}
    </>
  );
}

/* ---------- Layout, paper handling and driver options ---------- */

// English keys, translated where shown.
const NUP_ORDER = {
  lrtb: "Left to right, then down",
  rltb: "Right to left, then down",
  tblr: "Top to bottom, then right",
  tbrl: "Top to bottom, then left",
  lrbt: "Left to right, then up",
  rlbt: "Right to left, then up",
  btlr: "Bottom to top, then right",
  btrl: "Bottom to top, then left",
};
const BORDERS = { none: "border|None", single: "Thin line", "single-thick": "Thick line", double: "Double line", "double-thick": "Thick double line" };
export const SCALING = {
  auto: { label: "scaling|Automatic", sub: "Actual size when the page fits the paper", short: "Auto size" },
  "auto-fit": { label: "Shrink to fit", sub: "Only pages larger than the printable area", short: "Shrink" },
  fit: { label: "Fit to page", sub: "Scale up or down to the printable area", short: "Fit" },
  fill: { label: "Fill page", sub: "Cover the paper, cropping the edges", short: "Fill" },
  none: { label: "Actual size", sub: "100%; what doesn't fit is cut off", short: "100%" },
  custom: { label: "Custom", sub: "Your own percentage", short: "Custom" },
};
const orderIcons = {};
const orderIcon = (v) => (orderIcons[v] ||= orderGlyph(v));

/** The layout setting in a few characters, for the toolbar field. */
export function layoutSummary(settings) {
  const n = Number(settings.pages_per_sheet) || 1;
  if (n > 1) return t("{n} per sheet", { n });
  if (settings.scaling === "custom") return `${settings.scale_percent}%`;
  return t(SCALING[settings.scaling]?.short || "Auto size");
}

/** Pages per sheet, their order and borders, and scaling. */
export function LayoutRows({ settings, set, choices, disabled, isPdf = true, idPrefix = "lay" }) {
  const nupList = choices.pages_per_sheet || [];
  const n = Number(settings.pages_per_sheet) || 1;
  const custom = canCustomScale(settings, choices, isPdf);
  const scaling = (choices.scaling || []).filter((v) => v !== "custom" || custom);
  const scaled = settings.scaling === "custom" && custom;
  return (
    <>
      {nupList.length > 1 && (
        <Row label={t("Pages per sheet")} className="row--seg">
          <Segmented
            label={t("Pages per sheet")}
            layoutKey={`${idPrefix}-nup`}
            disabled={disabled}
            value={n}
            onChange={(v) => set("pages_per_sheet", v)}
            options={nupList.map((v) => ({ value: v, label: String(v) }))}
          />
        </Row>
      )}
      {n > 1 && (choices.pages_per_sheet_layout || []).length > 1 && (
        <Row label={t("Page order")}>
          <Select
            label={t("Page order")}
            value={settings.pages_per_sheet_layout}
            onChange={(v) => set("pages_per_sheet_layout", v)}
            disabled={disabled}
            groups={[{ items: choices.pages_per_sheet_layout.map((v) => ({ value: v, label: t(NUP_ORDER[v] || v), icon: orderIcon(v) })) }]}
          />
        </Row>
      )}
      {n > 1 && (choices.page_border || []).length > 1 && (
        <Row label={t("Borders")}>
          <Select
            label={t("Borders")}
            value={settings.page_border}
            onChange={(v) => set("page_border", v)}
            disabled={disabled}
            groups={[{ items: choices.page_border.map((v) => ({ value: v, label: t(BORDERS[v] || v) })) }]}
          />
        </Row>
      )}
      {scaling.length > 1 && (
        <Row label={t("Scaling")} hint={n > 1 ? t("Each page fits its place on the sheet") : undefined}>
          <Select
            label={t("Scaling")}
            value={scaling.includes(settings.scaling) ? settings.scaling : scaling[0]}
            onChange={(v) => set("scaling", v)}
            disabled={disabled || n > 1}
            groups={[{ items: scaling.map((v) => ({ value: v, label: t(SCALING[v]?.label || v), sub: SCALING[v] && t(SCALING[v].sub) })) }]}
          />
        </Row>
      )}
      {scaled && (
        <Row label={t("Scale")}>
          <Stepper
            label={t("Scale")}
            decLabel={t("Smaller")}
            incLabel={t("Larger")}
            min={choices.customScale.min}
            max={choices.customScale.max}
            step={5}
            suffix="%"
            value={settings.scale_percent}
            onChange={(v) => set("scale_percent", v)}
            disabled={disabled}
          />
        </Row>
      )}
    </>
  );
}

/** Tray, borderless, collation and output order. */
export function HandlingRows({ settings, set, choices, disabled, copies = settings.copies }) {
  const sources = choices.media_source || [];
  const labels = choices.media_source_labels || {};
  return (
    <>
      {sources.length > 1 && (
        <Row label={t("Paper source")}>
          <Select
            label={t("Paper source")}
            value={settings.media_source}
            onChange={(v) => set("media_source", v)}
            disabled={disabled}
            groups={[{ items: sources.map((v) => ({ value: v, label: sourceLabel(v, labels) })) }]}
          />
        </Row>
      )}
      {choices.borderless && (
        <Row label={t("Borderless")} hint={t("Print to the edges of photo paper")}>
          <Switch label={t("Borderless")} checked={!!settings.borderless} onChange={(v) => set("borderless", v)} disabled={disabled} />
        </Row>
      )}
      {choices.collate && copies > 1 && (
        <Row label={t("Collate")} hint={settings.collate ? t("1, 2, 3 · 1, 2, 3") : t("1, 1 · 2, 2 · 3, 3")}>
          <Switch label={t("Collate")} checked={!!settings.collate} onChange={(v) => set("collate", v)} disabled={disabled} />
        </Row>
      )}
      {choices.reverse_order && (
        <Row label={t("Reverse order")} hint={t("Last sheet comes out first")}>
          <Switch label={t("Reverse order")} checked={!!settings.reverse_order} onChange={(v) => set("reverse_order", v)} disabled={disabled} />
        </Row>
      )}
    </>
  );
}

// Tray names the driver gives in English; the rest show as the driver writes them.
const SOURCES = { auto: "Automatic", autoselect: "Automatic", autoswitch: "Automatic", rear: "Rear tray", cassette: "Cassette", manual: "Manual feed", cd: "CD tray" };
export function sourceLabel(v, labels = {}) {
  const known = SOURCES[String(v).toLowerCase()];
  return known ? t(known) : labels[v] || v;
}

/** Every remaining driver option, as the driver names it, like a dialog's Advanced tab. */
export function AdvancedRows({ settings, set, choices, disabled }) {
  const list = choices.advanced || [];
  if (!list.length) return null;
  const chosen = settings.advanced || {};
  const setOne = (k, v) => {
    const opt = list.find((a) => a.keyword === k);
    const next = { ...chosen };
    if (opt && v === opt.default) delete next[k];
    else next[k] = v;
    set("advanced", next);
  };
  return (
    <>
      {list.map((a) => (
        <Row key={a.keyword} label={a.label}>
          <Select
            label={a.label}
            value={chosen[a.keyword] ?? a.default ?? a.choices[0].value}
            onChange={(v) => setOne(a.keyword, v)}
            disabled={disabled}
            groups={[{ items: a.choices.map((c) => ({ value: c.value, label: c.label, sub: c.value === a.default ? t("Driver default") : undefined })) }]}
          />
        </Row>
      ))}
      {Object.keys(chosen).length > 0 && (
        <div className="rows__tools">
          <Button variant="quiet" className="btn--sm" onClick={() => set("advanced", {})} disabled={disabled}>
            <Undo2 size={14} strokeWidth={1.6} aria-hidden />
            {t("Driver defaults")}
          </Button>
        </div>
      )}
    </>
  );
}

/** A labelled group of rows; `collapsible` starts closed, for the driver's long list. */
export function RowGroup({ title, children, collapsible, count }) {
  const [open, setOpen] = useState(!collapsible);
  return (
    <div className="rowgroup">
      {collapsible ? (
        <button type="button" className="rowgroup__head is-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span>{title}</span>
          {count > 0 && <span className="rowgroup__count">{tn(count, "{n} changed", "{n} changed")}</span>}
          <ChevronDown size={14} strokeWidth={1.6} aria-hidden className="rowgroup__chev" />
        </button>
      ) : (
        <p className="rowgroup__head">{title}</p>
      )}
      {open && <div className="rowgroup__rows">{children}</div>}
    </div>
  );
}

/** Layout, paper handling and driver options under their own headings, for the sheet and Settings. */
export function ExtraRows({ settings, set, choices, disabled, isPdf, idPrefix }) {
  const layout = (choices.pages_per_sheet || []).length > 1 || (choices.scaling || []).length > 1;
  const handling = (choices.media_source || []).length > 1 || choices.borderless || choices.reverse_order || (choices.collate && settings.copies > 1);
  const advanced = (choices.advanced || []).length > 0;
  return (
    <>
      {layout && (
        <RowGroup title={t("group|Layout")}>
          <LayoutRows settings={settings} set={set} choices={choices} disabled={disabled} isPdf={isPdf} idPrefix={idPrefix} />
        </RowGroup>
      )}
      {handling && (
        <RowGroup title={t("Paper handling")}>
          <HandlingRows settings={settings} set={set} choices={choices} disabled={disabled} />
        </RowGroup>
      )}
      {advanced && (
        <RowGroup title={t("Printer driver")} collapsible count={Object.keys(settings.advanced || {}).length}>
          <AdvancedRows settings={settings} set={set} choices={choices} disabled={disabled} />
        </RowGroup>
      )}
    </>
  );
}
