import { AnimatePresence, motion } from "motion/react";
import { Check, X } from "lucide-react";
import { Button, Dot, IconKey, ease, tween } from "./controls.jsx";
import { formatBytes, HISTORY_STATUS, ACTIVE_STATUSES } from "../lib/format.js";
import { t, tn } from "../i18n/index.js";

const STAGES = [
  { label: "job|Sent", statuses: ["submitted"] },
  { label: "job|Queued", statuses: ["pending", "pending-held"] },
  { label: "job|Printing", statuses: ["processing", "processing-stopped", "cancel-requested"] },
  { label: "stage|Done", statuses: ["completed"] },
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

/**
 * How far a printing job has got, from the live job attributes: sheets done plus the part of the
 * current sheet already processed. `sheets` is the job's total from its layout plan, when known.
 */
export function jobProgress(job, sheets) {
  if (!job || job.state !== "processing") return null;
  const done = job.sheets_completed ?? job.pages_completed ?? 0;
  const part = Math.min(100, Math.max(0, job.media_progress ?? 0)) / 100;
  if (sheets) {
    const n = Math.min(sheets, done + 1);
    return { fraction: Math.min(0.99, (done + part) / sheets), text: t("Sheet {n} of {total}", { n, total: sheets }), message: job.state_message || "" };
  }
  return { fraction: null, text: done ? tn(done, "{n} sheet done", "{n} sheets done") : "", message: job.state_message || "" };
}

/** One thin mercury track under the job chip: it runs from sent to printed. */
function Track({ status, progress }) {
  const failed = status === "aborted" || status === "canceled";
  const done = status === "completed";
  const printing = stageIndex(status);
  // While printing, the last stretch fills sheet by sheet.
  const fill = failed ? 1 : progress?.fraction != null ? (printing + progress.fraction) / STAGES.length : (printing + 1) / STAGES.length;
  return (
    <span className={`track tone-${jobTone(status)} ${!failed && !done ? "is-running" : ""}`} aria-hidden>
      <motion.span className="track__fill" initial={false} animate={{ scaleX: fill }} transition={{ duration: 0.5, ease }} />
    </span>
  );
}

/** A floating chip on the stage that follows the last job sent from here. */
export function JobStrip({ entry, job, sheets, onCancel, onDismiss, onOpen, cancelling }) {
  // The live job is fresher than the history record, which follows it.
  const live = job && ACTIVE_STATUSES.has(entry?.status) && HISTORY_STATUS[job.state] ? job.state : null;
  const status = live || entry?.status || "submitted";
  const progress = jobProgress(job, sheets);
  const stateLabel = HISTORY_STATUS[status] ? t(HISTORY_STATUS[status].label) : status;
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
      <button
        type="button"
        className="jobchip__main"
        title={progress?.message || undefined}
        onClick={onOpen}
        aria-label={t("{status}: {name}. Open details", { status: stateLabel, name: entry?.original_filename || t("print job") })}
      >
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
            <span className="jobchip__state">{stateLabel}</span>
            <span className="jobchip__name">{progress?.text || entry?.original_filename}</span>
          </span>
          <Track status={status} progress={progress} />
        </span>
      </button>
      {active && entry?.cups_job_id ? (
        <Button variant="quiet" className="btn--sm jobchip__cancel" onClick={onCancel} disabled={cancelling || status === "cancel-requested"}>
          {status === "cancel-requested" ? t("action|Cancelling") : t("Cancel")}
        </Button>
      ) : (
        <IconKey label={t("Dismiss")} icon={X} size="sm" onClick={onDismiss} />
      )}
    </motion.div>
  );
}

/** One status line for the loaded document: what is happening to it right now. */
export function docLine({ flow, printer, canSend }) {
  const { doc, printing, validation, rangeError, pageCount } = flow;
  if (!doc) return null;
  if (printing.state === "sending") return { sub: t("Sending"), tone: "active", pulse: true };
  if (printing.state === "error") return { sub: printing.error, tone: "error" };
  if (doc.phase === "uploading") return { sub: t("Uploading {percent}%", { percent: Math.round((doc.progress || 0) * 100) }), tone: "active", pulse: true };
  if (doc.phase === "converting") return { sub: doc.retry ? t("Converter busy, retrying") : t("Converting to PDF"), tone: "active", pulse: true };
  if (doc.phase === "loading") return { sub: t("Preparing preview"), tone: "active", pulse: true };
  if (doc.phase === "error") return { sub: doc.message, tone: "error" };
  if (rangeError) return { sub: rangeError, tone: "error" };
  if (!canSend) return { sub: printer.info.detail || printer.info.label, tone: "warn" };
  if (validation.result && !validation.result.valid) return { sub: t("Settings won't print"), tone: "error" };
  const meta = [pageCount && tn(pageCount, "{n} page", "{n} pages"), formatBytes(doc.file?.size_bytes), doc.file?.converted && doc.file.detected_mime !== "text/plain" && t("from Office")].filter(Boolean).join(" · ");
  return { sub: meta, tone: "ok", quiet: true };
}
