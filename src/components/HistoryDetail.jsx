import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Ban, Eraser, ExternalLink, Printer, CircleAlert } from "lucide-react";
import { api } from "../api/client.js";
import { PreviewStage } from "./PreviewStage.jsx";
import { JobTracker } from "./Composer.jsx";
import { Key } from "./controls.jsx";
import { FileGlyph } from "./FileGlyph.jsx";
import { BASE_SETTINGS, fromRequested } from "../lib/settings.js";
import {
  ACTIVE_STATUSES,
  COLOR_LABELS,
  DUPLEX_LABELS,
  fileKind,
  formatBytes,
  formatDateTime,
  mediaLabel,
  ORIENTATION_LABELS,
  paperName,
  QUALITY_LABELS,
  TERMINAL_STATUSES,
} from "../lib/format.js";
import { meaningfulWarnings } from "../hooks/printFlow.js";

export function HistoryDetail({ id, history, onReprint, onOpenCompose, onStatusLine }) {
  const cached = history.items.find((h) => h.id === id);
  const [entry, setEntry] = useState(cached || null);
  const [file, setFile] = useState({ state: "loading" });
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  // Keep the list and the detail in step with polling.
  useEffect(() => {
    if (cached) setEntry((e) => ({ ...e, ...cached }));
  }, [cached]);

  useEffect(() => {
    let alive = true;
    setError(null);
    api
      .historyEntry(id)
      .then((e) => alive && setEntry(e))
      .catch((e) => alive && !cached && setError(e.status === 404 ? "This print is no longer in your history." : e.message));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!entry?.file_id) return;
    let alive = true;
    setFile({ state: "loading" });
    Promise.all([api.file(entry.file_id), api.preview(entry.file_id).catch(() => ({ pages: [] }))])
      .then(([f, p]) => alive && setFile({ state: "ready", file: f, pages: p.pages || [] }))
      .catch((e) => alive && setFile({ state: e.status === 404 ? "expired" : "error", message: e.message }));
    return () => {
      alive = false;
    };
  }, [entry?.file_id]);

  const settings = useMemo(() => ({ ...BASE_SETTINGS, ...fromRequested(entry?.requested_options) }), [entry]);

  if (error) {
    return (
      <div className="empty-view">
        <CircleAlert size={22} strokeWidth={1.6} aria-hidden />
        <p>{error}</p>
        <Key variant="raised" onClick={onOpenCompose}>
          New print
        </Key>
      </div>
    );
  }
  if (!entry) return <div className="detail detail--loading"><span className="skel skel--fill" /></div>;

  const active = ACTIVE_STATUSES.has(entry.status);
  const terminal = TERMINAL_STATUSES.has(entry.status);
  const opts = entry.requested_options || {};
  const kind = fileKind(entry.detected_mime, entry.original_filename);
  const warnings = meaningfulWarnings(entry.warnings);

  async function cancel() {
    setBusy("cancel");
    try {
      const r = await api.cancelJob(entry.cups_job_id);
      onStatusLine?.(r.message || (r.cancelled ? "Cancel requested" : "The job had already finished"));
      await history.pollJobs();
    } catch (e) {
      onStatusLine?.(e.message, "error");
    } finally {
      setBusy(null);
    }
  }
  async function forget() {
    setBusy("forget");
    try {
      await api.forgetJob(entry.cups_job_id);
      await history.refresh();
      const e = await api.historyEntry(id).catch(() => null);
      if (e) setEntry(e);
      onStatusLine?.("Cleared from the printer queue");
    } catch (e) {
      onStatusLine?.(e.message, "error");
    } finally {
      setBusy(null);
    }
  }

  const rows = [
    ["Sent", formatDateTime(entry.created_at)],
    entry.updated_at !== entry.created_at && ["Last update", formatDateTime(entry.updated_at)],
    ["Pages", opts.pages ? `${opts.pages.replace(/,/g, ", ")} of ${entry.page_count ?? "?"}` : entry.page_count ? `All ${entry.page_count}` : "All"],
    ["Copies", opts.copies || 1],
    opts.paper_size && ["Paper", paperName(opts.paper_size)],
    opts.orientation && ["Orientation", ORIENTATION_LABELS[opts.orientation] || opts.orientation],
    opts.color_mode && ["Color", COLOR_LABELS[opts.color_mode] || opts.color_mode],
    opts.duplex && ["Two-sided", DUPLEX_LABELS[opts.duplex] || opts.duplex],
    opts.quality && ["Quality", QUALITY_LABELS[opts.quality] || opts.quality],
    opts.media_type && ["Paper type", mediaLabel(opts.media_type)],
    opts.fit_to_page && ["Fit to page", "On"],
    ["File", `${formatBytes(entry.size_bytes)}${entry.detected_mime ? `, ${entry.detected_mime.split("/").pop().split(".").pop()}` : ""}`],
    entry.cups_job_id && ["Printer job", entry.cups_job_id],
  ].filter(Boolean);

  return (
    <motion.div className="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <div className="detail__stage">
        {file.state === "ready" ? (
          <PreviewStage doc={{ file: file.file, pages: file.pages, kind }} settings={settings} pageCount={file.file.page_count} readOnly onPagesChange={() => {}} />
        ) : file.state === "loading" ? (
          <div className="stage stage--placeholder">
            <span className="skel skel--sheet" />
          </div>
        ) : (
          <div className="stage stage--placeholder">
            <div className="expired">
              <FileGlyph kind={kind} size={28} />
              <p>{file.state === "expired" ? "The upload expired after 7 days, so there's no preview. The record stays for 90 days." : "Preview unavailable."}</p>
            </div>
          </div>
        )}
      </div>

      <aside className="pane pane--detail" aria-label="Print details">
        <div className="pane__scroll">
          <header className="detail__head">
            <span className={`detail__icon kind-${kind}`}>
              <FileGlyph kind={kind} size={18} />
            </span>
            <h1 className="detail__title">{entry.original_filename}</h1>
          </header>

          <JobTracker entry={entry} onCancel={cancel} cancelling={busy === "cancel"} />

          <dl className="facts">
            {rows.map(([k, v]) => (
              <div key={k} className="facts__row">
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>

          {warnings.length > 0 && (
            <div className="check tone-warn">
              <CircleAlert size={17} strokeWidth={1.8} aria-hidden />
              <div>
                {warnings.map((w) => (
                  <p key={w} className="check__text">
                    {w}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pane__foot pane__foot--stack">
          <Key variant="accent" icon={Printer} onClick={() => onReprint(entry)} disabled={file.state === "expired"}>
            Print again
          </Key>
          <div className="pane__keys">
            {file.state === "ready" && file.file.pdf_url && (
              <Key variant="ghost" size="sm" icon={ExternalLink} onClick={() => window.open(api.pdfUrl(entry.file_id), "_blank", "noopener")}>
                Open PDF
              </Key>
            )}
            {active && entry.cups_job_id && (
              <Key variant="danger" size="sm" icon={Ban} onClick={cancel} disabled={busy === "cancel" || entry.status === "cancel-requested"}>
                Cancel job
              </Key>
            )}
            {terminal && entry.cups_job_id && (
              <Key variant="ghost" size="sm" icon={Eraser} onClick={forget} disabled={busy === "forget"}>
                Clear from queue
              </Key>
            )}
          </div>
        </div>
      </aside>
    </motion.div>
  );
}
