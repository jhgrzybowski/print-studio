import { Dot } from "./controls.jsx";

export function queueLabel(raw) {
  return (raw?.queue_name || "Printer").replace(/_/g, " ");
}

// Printer tones (ready | busy | warn | offline | down | unknown) mapped to dot tones.
export function printerDot(tone) {
  if (tone === "ready") return "ok";
  if (tone === "busy") return "active";
  if (tone === "unknown") return "muted";
  if (tone === "warn") return "warn";
  return "error";
}

/** Dot, printer name and one word of state. */
export function PrinterLine({ printer, as: As = "p", className = "", ...rest }) {
  const { info, raw } = printer;
  return (
    <As className={`printer-line ${className}`} {...rest}>
      <Dot tone={printerDot(info.tone)} pulse={info.tone === "busy"} />
      <span className="printer-line__name">{queueLabel(raw)}</span>
      <span className="printer-line__state" aria-live="polite">
        {info.label}
      </span>
    </As>
  );
}
