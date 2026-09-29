import { AnimatePresence, motion } from "motion/react";
import { Ban, Paperclip, Printer, X } from "lucide-react";
import { FileGlyph } from "./FileGlyph.jsx";
import { Dot, IconKey, PrintKey, ease, tween } from "./controls.jsx";
import { printerDot, queueLabel } from "./PrinterStatus.jsx";
import { formatBytes, HISTORY_STATUS, ACTIVE_STATUSES } from "../lib/format.js";

const STAGES = [
  { label: "Sent", statuses: ["submitted"] },
  { label: "Queued", statuses: ["pending", "pending-held"] },
  { label: "Printing", statuses: ["processing", "processing-stopped", "cancel-requested"] },
  { label: "Done", statuses: ["completed"] },
];

function stageIndex(status) {
  const i = STAGES.findIndex((s) => s.statuses.includes(status));
  return i === -1 ? 0 : i;
}

export function jobTone(status) {
  if (status === "aborted") return "error";
  if (status === "canceled") return "muted";
  return HISTORY_STATUS[status]?.tone || "active";
}

/** Four short segments that fill as the job moves through CUPS. */
export function Progress({ status }) {
  const failed = status === "aborted" || status === "canceled";
  const idx = failed ? STAGES.length - 1 : stageIndex(status);
  return (
    <span className={`progress tone-${jobTone(status)}`} aria-hidden>
      {STAGES.map((s, i) => (
        <span key={s.label} className={`progress__seg ${i <= idx ? "is-on" : ""} ${i === idx && !failed && status !== "completed" ? "is-now" : ""}`} />
      ))}
    </span>
  );
}

/** A slim line above the dock that follows the last job sent from here. */
export function JobStrip({ entry, onCancel, onDismiss, onOpen, cancelling }) {
  const status = entry?.status || "submitted";
  const st = HISTORY_STATUS[status] || { label: status };
  const active = ACTIVE_STATUSES.has(status);
  return (
    <motion.div
      className="jobstrip"
      role="status"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={tween}
    >
      <button type="button" className="jobstrip__main" onClick={onOpen}>
        <Dot tone={jobTone(status)} pulse={active} />
        <span className="jobstrip__state">{st.label}</span>
        <span className="jobstrip__name">{entry?.original_filename}</span>
      </button>
      <Progress status={status} />
      {active && entry?.cups_job_id ? (
        <IconKey label="Cancel job" icon={Ban} size="sm" variant="danger" onClick={onCancel} disabled={cancelling || status === "cancel-requested"} />
      ) : (
        <IconKey label="Dismiss" icon={X} size="sm" onClick={onDismiss} />
      )}
    </motion.div>
  );
}

function lines({ flow, printer, canSend }) {
  const { doc, printing, validation, rangeError, pageCount } = flow;
  if (!doc) {
    // The sidebar already shows a ready printer; the dock only speaks up when it isn't.
    const ready = printer.info.tone === "ready" || printer.info.tone === "busy";
    return {
      title: "Attach or paste a file",
      sub: ready ? null : `${queueLabel(printer.raw)} · ${printer.info.label}`,
      tone: printerDot(printer.info.tone),
    };
  }
  const title = doc.name;
  if (printing.state === "sending") return { title, sub: "Sending", tone: "active", pulse: true };
  if (printing.state === "error") return { title, sub: printing.error, tone: "error" };
  if (doc.phase === "uploading") return { title, sub: `Uploading ${Math.round((doc.progress || 0) * 100)}%`, tone: "active", pulse: true };
  if (doc.phase === "converting") return { title, sub: doc.retry ? "Converter busy, retrying" : "Converting to PDF", tone: "active", pulse: true };
  if (doc.phase === "loading") return { title, sub: "Preparing preview", tone: "active", pulse: true };
  if (doc.phase === "error") return { title, sub: doc.message, tone: "error" };
  if (rangeError) return { title, sub: rangeError, tone: "error" };
  if (!canSend) return { title, sub: printer.info.detail || printer.info.label, tone: "warn" };
  if (printing.state === "sent") return { title, sub: "Sent", tone: "ok" };
  if (validation.result && !validation.result.valid) return { title, sub: "Settings won't print", tone: "error" };
  const meta = [pageCount && `${pageCount} page${pageCount === 1 ? "" : "s"}`, formatBytes(doc.file?.size_bytes), doc.file?.converted && "from Office"].filter(Boolean).join(" · ");
  return { title, sub: meta, tone: "ok" };
}

export function Dock({ flow, printer, canSend, onBrowse, onPrint }) {
  const { doc, printing, validation } = flow;
  const l = lines({ flow, printer, canSend });
  const ready = doc?.phase === "ready";
  const disabled = !ready || !flow.canPrint || !canSend || printing.state === "sending" || (validation.result && !validation.result.valid);

  return (
    <div className="dock">
      <IconKey label="Attach file" icon={Paperclip} onClick={onBrowse} />
      <div className="dock__body">
        {doc && (
          <span className={`dock__glyph kind-${doc.kind}`}>
            <FileGlyph kind={doc.kind} size={18} />
          </span>
        )}
        <div className="dock__text">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p key={l.title} className={`dock__title ${doc ? "" : "is-hint"}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease }}>
              {l.title}
            </motion.p>
          </AnimatePresence>
          {l.sub && (
            <p className={`dock__sub tone-${l.tone}`} aria-live="polite">
              <Dot tone={l.tone} pulse={l.pulse} />
              <span>{l.sub}</span>
            </p>
          )}
        </div>
        {doc && <IconKey label="Remove file" icon={X} size="sm" onClick={flow.clear} />}
      </div>
      <PrintKey icon={Printer} label={disabled ? "Print" : "Print (Ctrl+Enter)"} onClick={onPrint} disabled={disabled} working={printing.state === "sending"} />
    </div>
  );
}
