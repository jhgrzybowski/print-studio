import { RectangleHorizontal, RectangleVertical } from "lucide-react";
import { Row, Segmented, Select, Switch } from "./controls.jsx";
import { AutoGlyph, ColorGlyph, DraftGlyph, HighGlyph, LongEdgeGlyph, MonoGlyph, OneSidedGlyph, ShortEdgeGlyph, StandardGlyph } from "./glyphs.jsx";
import { COLOR_LABELS, DUPLEX_LABELS, mediaLabel, paperGroups, paperMM, paperName, QUALITY_LABELS } from "../lib/format.js";

const ORDER = {
  color_mode: ["color", "monochrome", "auto"],
  duplex: ["none", "long-edge", "short-edge"],
  quality: ["draft", "normal", "high"],
};
const COLOR_ICONS = { color: ColorGlyph, monochrome: MonoGlyph, auto: AutoGlyph };
const COLOR_SHORT = { monochrome: "B&W" };
const DUPLEX_ICONS = { none: OneSidedGlyph, "long-edge": LongEdgeGlyph, "short-edge": ShortEdgeGlyph };
// The toolbar field shows one word; the menu explains the flip.
const DUPLEX_FIELD = { none: "One-sided", "long-edge": "Two-sided", "short-edge": "Two-sided, short" };
const DUPLEX_SUB = { "long-edge": "Flip on long edge", "short-edge": "Flip on short edge" };
const DUPLEX_SHORT = { none: "One", "long-edge": "Long", "short-edge": "Short" };
const QUALITY_ICONS = { draft: DraftGlyph, normal: StandardGlyph, high: HighGlyph };

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
  if (common.length) g.push({ label: rest.length ? "Common" : undefined, items: common.map((v) => ({ value: v, label: paperName(v), sub: mmLabel(v) })) });
  if (rest.length) g.push({ label: "More", items: rest.map((v) => ({ value: v, label: paperName(v) })) });
  return g;
}

export const mediaGroups = (choices) => [{ items: (choices || []).map((v) => ({ value: v, label: mediaLabel(v) })) }];

/** A segmented descriptor as one group for a Select, keeping each option's glyph. */
export const asGroups = (desc) => [{ items: desc.options.map((o) => ({ value: o.value, label: o.field || o.label, sub: o.sub, icon: o.icon })) }];

/** Option descriptors shared by the toolbar, the phone sheet and the defaults in Settings. */
export function optionModel(settings, set, choices) {
  const orient = choices.orientation || [];
  const landscape = /landscape/.test(settings.orientation);
  const flipped = /^reverse/.test(settings.orientation);
  const canFlip = orient.includes("reverse-portrait") || orient.includes("reverse-landscape");
  const setOrientation = (base, flip) => {
    const v = flip ? `reverse-${base}` : base;
    set("orientation", orient.includes(v) ? v : base);
  };
  return {
    landscape,
    flipped,
    canFlip,
    toggleFlip: () => setOrientation(landscape ? "landscape" : "portrait", !flipped),
    orientation: orient.length > 0 && {
      value: landscape ? "landscape" : "portrait",
      onChange: (v) => setOrientation(v, flipped),
      options: [
        { value: "portrait", label: "Portrait", icon: RectangleVertical },
        { value: "landscape", label: "Landscape", icon: RectangleHorizontal },
      ],
    },
    color: choices.color_mode?.length > 0 && {
      value: settings.color_mode,
      onChange: (v) => set("color_mode", v),
      options: ordered("color_mode", choices.color_mode).map((v) => ({ value: v, label: COLOR_LABELS[v] || v, short: COLOR_SHORT[v], icon: COLOR_ICONS[v] || ColorGlyph })),
    },
    duplex: choices.duplex?.length > 0 && {
      value: settings.duplex,
      onChange: (v) => set("duplex", v),
      options: ordered("duplex", choices.duplex).map((v) => ({
        value: v,
        label: DUPLEX_LABELS[v] || v,
        field: DUPLEX_FIELD[v],
        sub: DUPLEX_SUB[v],
        short: DUPLEX_SHORT[v],
        icon: DUPLEX_ICONS[v] || OneSidedGlyph,
      })),
    },
    quality: choices.quality?.length > 0 && {
      value: settings.quality,
      onChange: (v) => set("quality", v),
      options: ordered("quality", choices.quality).map((v) => ({ value: v, label: QUALITY_LABELS[v] || v, icon: QUALITY_ICONS[v] || StandardGlyph })),
    },
  };
}

/** Output rows with words, for the defaults in Settings and the phone sheet. */
export function OptionRows({ settings, set, choices, disabled, idPrefix = "opt" }) {
  const m = optionModel(settings, set, choices);
  return (
    <>
      {choices.paper_size?.length > 0 && (
        <Row label="Paper">
          <Select label="Paper size" value={settings.paper_size} onChange={(v) => set("paper_size", v)} groups={paperSelectGroups(choices.paper_size)} disabled={disabled} />
        </Row>
      )}

      {m.color && (
        <Row label="Color" className="row--seg">
          <Segmented label="Color" layoutKey={`${idPrefix}-color`} disabled={disabled} {...m.color} />
        </Row>
      )}

      {m.duplex && (
        <Row label="Sides" className="row--seg">
          <Segmented label="Sides" layoutKey={`${idPrefix}-duplex`} disabled={disabled} {...m.duplex} />
        </Row>
      )}

      {m.orientation && (
        <Row label="Layout" className="row--seg">
          <Segmented label="Orientation" layoutKey={`${idPrefix}-orient`} disabled={disabled} {...m.orientation} />
        </Row>
      )}

      {m.quality && (
        <Row label="Quality" className="row--seg">
          <Segmented label="Quality" layoutKey={`${idPrefix}-quality`} disabled={disabled} {...m.quality} />
        </Row>
      )}

      {choices.media_type?.length > 0 && (
        <Row label="Paper type">
          <Select label="Paper type" value={settings.media_type} onChange={(v) => set("media_type", v)} groups={mediaGroups(choices.media_type)} disabled={disabled} />
        </Row>
      )}

      {choices.fit_to_page && (
        <Row label="Fit to page" hint="Scale each page to the paper">
          <Switch label="Fit to page" checked={!!settings.fit_to_page} onChange={(v) => set("fit_to_page", v)} disabled={disabled} />
        </Row>
      )}

      {m.canFlip && (
        <Row label="Upside down" hint="Rotate the output 180°">
          <Switch label="Print upside down" checked={m.flipped} onChange={m.toggleFlip} disabled={disabled} />
        </Row>
      )}
    </>
  );
}
