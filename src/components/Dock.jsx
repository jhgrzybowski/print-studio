import { AnimatePresence, motion } from "motion/react";
import { Check, X } from "lucide-react";
import { Button, Dot, IconKey, ease, tween } from "./controls.jsx";
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

/** One thin mercury track under the job chip: it runs from sent to printed. */
function Track({ status }) {
  const failed = status === "aborted" || status === "canceled";
  const done = status === "completed";
  const fill = failed ? 1 : (stageIndex(status) + 1) / STAGES.length;
  return (
    <span className={`track tone-${jobTone(status)} ${!failed && !done ? "is-running" : ""}`} aria-hidden>
      <motion.span className="track__fill" initial={false} animate={{ scaleX: fill }} transition={{ duration: 0.5, ease }} />
    </span>
  );
}

/** A floating chip on the stage that follows the last job sent from here. */
export function JobStrip({ entry, onCancel, onDismiss, onOpen, cancelling }) {
  const status = entry?.status || "submitted";
  const st = HISTORY_STATUS[status] || { label: status };
  const active = ACTIVE_STATUSES.has(status);
  const done = status === "completed";
  return (
    <motion.div
      className="jobchip"
      role="status"
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={tween}
    >
      <button type="button" className="jobchip__main" onClick={onOpen} aria-label={`${st.label}: ${entry?.original_filename || "print job"}. Open details`}>
        <span className="jobchip__mark">
          <AnimatePresence initial={false} mode="popLayout">
            {done ? (
              <motion.span
                key="done"
                className="jobchip__check"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
              >
                <Check size={12} strokeWidth={2.4} aria-hidden />
              </motion.span>
            ) : (
              <motion.span key="dot" exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 0.12 }}>
                <Dot tone={jobTone(status)} pulse={active} />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <span className="jobchip__text">
          <span className="jobchip__line">
            <span className="jobchip__state">{st.label}</span>
            <span className="jobchip__name">{entry?.original_filename}</span>
          </span>
          <Track status={status} />
        </span>
      </button>
      {active && entry?.cups_job_id ? (
        <Button variant="quiet" className="btn--sm jobchip__cancel" onClick={onCancel} disabled={cancelling || status === "cancel-requested"}>
          {status === "cancel-requested" ? "Cancelling" : "Cancel"}
        </Button>
      ) : (
        <IconKey label="Dismiss" icon={X} size="sm" onClick={onDismiss} />
      )}
    </motion.div>
  );
}

/** One status line for the loaded document: what is happening to it right now. */
export function docLine({ flow, printer, canSend }) {
  const { doc, printing, validation, rangeError, pageCount } = flow;
  if (!doc) return null;
  if (printing.state === "sending") return { sub: "Sending", tone: "active", pulse: true };
  if (printing.state === "error") return { sub: printing.error, tone: "error" };
  if (doc.phase === "uploading") return { sub: `Uploading ${Math.round((doc.progress || 0) * 100)}%`, tone: "active", pulse: true };
  if (doc.phase === "converting") return { sub: doc.retry ? "Converter busy, retrying" : "Converting to PDF", tone: "active", pulse: true };
  if (doc.phase === "loading") return { sub: "Preparing preview", tone: "active", pulse: true };
  if (doc.phase === "error") return { sub: doc.message, tone: "error" };
  if (rangeError) return { sub: rangeError, tone: "error" };
  if (!canSend) return { sub: printer.info.detail || printer.info.label, tone: "warn" };
  if (validation.result && !validation.result.valid) return { sub: "Settings won't print", tone: "error" };
  const meta = [pageCount && `${pageCount} page${pageCount === 1 ? "" : "s"}`, formatBytes(doc.file?.size_bytes), doc.file?.converted && "from Office"].filter(Boolean).join(" · ");
  return { sub: meta, tone: "ok", quiet: true };
}
