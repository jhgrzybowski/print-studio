import { RectangleHorizontal, RectangleVertical, RotateCcwSquare, RotateCwSquare } from "lucide-react";
import { IconKey, Row, Segmented, Select, Switch } from "./controls.jsx";
import { AutoGlyph, ColorGlyph, DraftGlyph, HighGlyph, LongEdgeGlyph, MonoGlyph, OneSidedGlyph, ShortEdgeGlyph, StandardGlyph } from "./glyphs.jsx";
import { COLOR_LABELS, DUPLEX_LABELS, label, mediaLabel, paperGroups, paperMM, paperName, QUALITY_LABELS } from "../lib/format.js";
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

export const mediaGroups = (choices) => [{ items: (choices || []).map((v) => ({ value: v, label: mediaLabel(v) })) }];

/** A segmented descriptor as one group for a Select, keeping each option's glyph. */
export const asGroups = (desc) => [{ items: desc.options.map((o) => ({ value: o.value, label: o.field || o.label, sub: o.sub, icon: o.icon })) }];

/** Option descriptors shared by the toolbar, the phone sheet and the defaults in Settings. */
export function optionModel(settings, set, choices) {
  const orient = choices.orientation || [];
  const landscape = /landscape/.test(settings.orientation);
  return {
    landscape,
    orientation: orient.length > 0 && {
      value: landscape ? "landscape" : "portrait",
      onChange: (v) => set("orientation", v),
      options: [
        { value: "portrait", label: t("Portrait"), icon: RectangleVertical },
        { value: "landscape", label: t("Landscape"), icon: RectangleHorizontal },
      ],
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
        <Row label={t("Layout")} className="row--seg">
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
          <Select label={t("Paper type")} value={settings.media_type} onChange={(v) => set("media_type", v)} groups={mediaGroups(choices.media_type)} disabled={disabled} />
        </Row>
      )}

      {choices.fit_to_page && (
        <Row label={t("Fit to page")} hint={t("Scale each page to the paper")}>
          <Switch label={t("Fit to page")} checked={!!settings.fit_to_page} onChange={(v) => set("fit_to_page", v)} disabled={disabled} />
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
