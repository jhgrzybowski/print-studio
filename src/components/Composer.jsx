import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Ban, Paperclip, X } from "lucide-react";
import { FileGlyph } from "./FileGlyph.jsx";
import { ChromeKey, IconKey, Key } from "./controls.jsx";
import { formatBytes, HISTORY_STATUS, optionsSummary, ACTIVE_STATUSES } from "../lib/format.js";

const STEPS = [
  { key: "sent", label: "Sent", statuses: ["submitted"] },
  { key: "queued", label: "Queued", statuses: ["pending", "pending-held"] },
  { key: "printing", label: "Printing", statuses: ["processing", "processing-stopped", "cancel-requested"] },
  { key: "done", label: "Done", statuses: ["completed"] },
];

function stepIndex(status) {
  const i = STEPS.findIndex((s) => s.statuses.includes(status));
  return i === -1 ? 0 : i;
}

export function JobTracker({ entry, onCancel, onDismiss, onOpen, cancelling }) {
  const status = entry?.status || "submitted";
  const failed = status === "aborted" || status === "canceled";
  const idx = failed ? -1 : stepIndex(status);
  const st = HISTORY_STATUS[status] || { label: status, tone: "active" };
  const active = ACTIVE_STATUSES.has(status);
  const fill = failed ? 1 : idx / (STEPS.length - 1);

  return (
    <motion.div
      className={`tracker tone-${failed ? (status === "aborted" ? "error" : "muted") : st.tone}`}
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      role="status"
    >
      <div className="tracker__head">
        {onOpen ? (
          <button type="button" className="tracker__title" onClick={onOpen}>
            {entry?.original_filename || "Print job"}
          </button>
        ) : (
          <span className="tracker__title">Progress</span>
        )}
        <span className="tracker__state">
          {active && <span className="led led--pulse" aria-hidden />}
          {st.label}
          {entry?.cups_job_id ? `, job ${entry.cups_job_id}` : ""}
        </span>
        <div className="tracker__actions">
          {active && entry?.cups_job_id && (
            <Key variant="ghost" size="sm" icon={Ban} onClick={onCancel} disabled={cancelling || status === "cancel-requested"}>
              Cancel
            </Key>
          )}
          {!active && onDismiss && <IconKey label="Dismiss" icon={X} size="sm" onClick={onDismiss} />}
        </div>
      </div>
      <div className="tracker__track" aria-hidden>
        <motion.span
          className="tracker__fill"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: Math.max(0.04, fill) }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        />
      </div>
      <ol className="tracker__steps">
        {STEPS.map((s, i) => (
          <li key={s.key} className={i <= idx ? "is-done" : ""} aria-current={i === idx ? "step" : undefined}>
            {s.label}
          </li>
        ))}
      </ol>
    </motion.div>
  );
}

function statusLine({ flow, printer, canSend }) {
  const { doc, printing, validation, rangeError, settings, pageCount } = flow;
  if (printing.state === "sending") return { tone: "active", text: "Sending to the printer" };
  if (printing.state === "error") return { tone: "error", text: printing.error };
  if (!doc) {
    if (!canSend) return { tone: "warn", text: `${printer.info.label}. You can still set up a print.` };
    return { tone: "muted", text: "Attach a file or drop it anywhere on this page" };
  }
  if (doc.phase === "uploading") return { tone: "active", text: `Uploading, ${Math.round((doc.progress || 0) * 100)}%` };
  if (doc.phase === "converting") return { tone: "active", text: doc.retry ? "Converter busy, trying again" : "Converting to PDF" };
  if (doc.phase === "loading") return { tone: "active", text: "Preparing preview" };
  if (doc.phase === "error") return { tone: "error", text: doc.message };
  if (rangeError) return { tone: "error", text: rangeError };
  if (!canSend) return { tone: "warn", text: `${printer.info.label}. ${printer.info.detail || ""}`.trim() };
  if (printing.state === "sent") return { tone: "ok", text: "Sent. Print again or attach another file." };
  if (validation.state === "error") return { tone: "error", text: validation.error };
  if (validation.result && !validation.result.valid) return { tone: "error", text: "These settings won't print. Check the pane." };
  const summary = optionsSummary({ ...settings, paper_size: settings.paper_size }, validation.result?.selected_pages?.length || pageCount);
  return { tone: "ok", text: summary ? `Ready: ${summary}` : "Ready to print" };
}

export function Composer({ flow, printer, canSend, onBrowse, onPrint }) {
  const { doc, printing, validation } = flow;
  const line = statusLine({ flow, printer, canSend });
  const ready = doc?.phase === "ready";
  const disabled =
    !ready || !flow.canPrint || !canSend || printing.state === "sending" || (validation.result && !validation.result.valid);

  return (
    <div className="composer">
      <IconKey label="Attach a file" icon={Paperclip} variant="raised" onClick={onBrowse} />

      <div className="composer__body">
        <AnimatePresence mode="popLayout" initial={false}>
          {doc && (
            <motion.div
              key={doc.name}
              className="file-chip"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className={`file-chip__icon kind-${doc.kind}`}>
                <FileGlyph kind={doc.kind} size={16} />
              </span>
              <span className="file-chip__text">
                <span className="file-chip__name">{doc.name}</span>
                <span className="file-chip__meta">
                  {ready
                    ? [flow.pageCount && `${flow.pageCount} page${flow.pageCount === 1 ? "" : "s"}`, formatBytes(doc.file.size_bytes), doc.file.converted && "converted to PDF"]
                        .filter(Boolean)
                        .join(", ")
                    : doc.size
                      ? formatBytes(doc.size)
                      : ""}
                </span>
              </span>
              <IconKey label="Remove file" icon={X} size="sm" onClick={flow.clear} />
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={line.text}
            className={`status-line tone-${line.tone}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.18 }}
            aria-live="polite"
          >
            <span className="led" aria-hidden />
            <span className="status-line__text">{line.text}</span>
          </motion.p>
        </AnimatePresence>
      </div>

      <ChromeKey icon={ArrowUp} label={disabled ? "Print (not ready)" : "Print (Ctrl+Enter)"} onClick={onPrint} disabled={disabled} working={printing.state === "sending"} size={60} />
    </div>
  );
}
