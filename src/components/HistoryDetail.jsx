import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { DropdownMenu } from "radix-ui";
import { CircleAlert, Ellipsis, Eraser, ExternalLink, RotateCw } from "lucide-react";
import { api } from "../api/client.js";
import { PreviewStage } from "./PreviewStage.jsx";
import { jobTone } from "./Dock.jsx";
import { Button, Dot, PrintButton, Tip } from "./controls.jsx";
import { FileGlyph } from "./FileGlyph.jsx";
import { BASE_SETTINGS, fromRequested } from "../lib/settings.js";
import {
  ACTIVE_STATUSES,
  COLOR_LABELS,
  DUPLEX_LABELS,
  label,
  fileKind,
  formatBytes,
  formatDateTime,
  HISTORY_STATUS,
  mediaLabel,
  ORIENTATION_LABELS,
  paperName,
  QUALITY_LABELS,
  shortWhen,
  TERMINAL_STATUSES,
} from "../lib/format.js";
import { meaningfulWarnings } from "../hooks/printFlow.js";
import { t } from "../i18n/index.js";

export function HistoryDetail({ id, history, onReprint, onOpenCompose, onStatusLine, lead }) {
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
      .catch((e) => alive && !cached && setError(e.status === 404 ? t("This print is no longer in your history.") : e.message));
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
      <div className="page">
        <div className="bar">{lead}</div>
        <div className="notice-view">
          <CircleAlert size={22} strokeWidth={1.5} aria-hidden />
          <p>{error}</p>
          <Button onClick={onOpenCompose}>{t("New print")}</Button>
        </div>
      </div>
    );
  }
  if (!entry)
    return (
      <div className="page">
        <div className="bar">{lead}</div>
        <div className="stage stage--center">
          <span className="skel skel--sheet" />
        </div>
      </div>
    );

  const active = ACTIVE_STATUSES.has(entry.status);
  const terminal = TERMINAL_STATUSES.has(entry.status);
  const opts = entry.requested_options || {};
  const kind = fileKind(entry.detected_mime, entry.original_filename);
  const warnings = meaningfulWarnings(entry.warnings);
  const stLabel = HISTORY_STATUS[entry.status] ? t(HISTORY_STATUS[entry.status].label) : entry.status;

  async function cancel() {
    setBusy("cancel");
    try {
      const r = await api.cancelJob(entry.cups_job_id);
      onStatusLine?.(r.message || (r.cancelled ? t("action|Cancelling") : t("Already finished")));
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
      onStatusLine?.(t("Cleared from the queue"));
    } catch (e) {
      onStatusLine?.(e.message, "error");
    } finally {
      setBusy(null);
    }
  }

  const rows = [
    [t("fact|Sent"), formatDateTime(entry.created_at)],
    [
      t("Pages"),
      opts.pages
        ? t("{range} of {total}", { range: opts.pages.replace(/,/g, ", "), total: entry.page_count ?? "?" })
        : entry.page_count
          ? t("All {n}", { n: entry.page_count })
          : t("pages|All"),
    ],
    [t("Copies"), opts.copies || 1],
    opts.paper_size && [t("Paper"), `${paperName(opts.paper_size)}${opts.fit_to_page ? t(", fit") : ""}`],
    opts.orientation && [t("Layout"), label(ORIENTATION_LABELS, opts.orientation)],
    opts.color_mode && [t("Color"), label(COLOR_LABELS, opts.color_mode)],
    opts.duplex && [t("Sides"), label(DUPLEX_LABELS, opts.duplex)],
    opts.quality && [t("Quality"), label(QUALITY_LABELS, opts.quality)],
    opts.media_type && [t("Media"), mediaLabel(opts.media_type)],
    [t("File"), formatBytes(entry.size_bytes)],
    entry.cups_job_id && [t("Job"), entry.cups_job_id],
  ].filter(Boolean);

  const expired = file.state === "expired";
  const pdf = file.state === "ready" && file.file.pdf_url;
  const forgettable = terminal && entry.cups_job_id;

  return (
    <motion.div className="page page--detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <div className="bar">
        {lead}
        <span className={`bar__glyph kind-${kind}`}>
          <FileGlyph kind={kind} size={17} />
        </span>
        <div className="bar__text">
          <h1 className="bar__title">{entry.original_filename}</h1>
          <p className={`bar__sub tone-${jobTone(entry.status)}`}>
            <Dot tone={jobTone(entry.status)} pulse={active} />
            <span>
              {stLabel} · {shortWhen(entry.created_at)}
            </span>
          </p>
        </div>
        <span className="bar__spacer" />
        <div className="bar__tools">
          {active && entry.cups_job_id && (
            <Button variant="quiet" className="btn--danger" onClick={cancel} disabled={busy === "cancel" || entry.status === "cancel-requested"}>
              {entry.status === "cancel-requested" ? (
                t("action|Cancelling")
              ) : (
                <>
                  {t("Cancel")}
                  <span className="bar__long">{t("cancel| job")}</span>
                </>
              )}
            </Button>
          )}
          {(pdf || forgettable) && (
            <DropdownMenu.Root>
              <Tip label={t("More")}>
                <DropdownMenu.Trigger asChild>
                  <button type="button" className="ikey ikey--plain ikey--md" aria-label={t("More")}>
                    <Ellipsis size={18} strokeWidth={1.5} aria-hidden />
                  </button>
                </DropdownMenu.Trigger>
              </Tip>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="menu" side="bottom" align="end" sideOffset={6} collisionPadding={12}>
                  {pdf && (
                    <DropdownMenu.Item className="menu__item" onSelect={() => window.open(api.pdfUrl(entry.file_id), "_blank", "noopener")}>
                      <ExternalLink size={16} strokeWidth={1.5} aria-hidden />
                      {t("Open PDF")}
                    </DropdownMenu.Item>
                  )}
                  {forgettable && (
                    <DropdownMenu.Item className="menu__item" onSelect={forget} disabled={busy === "forget"}>
                      <Eraser size={16} strokeWidth={1.5} aria-hidden />
                      {t("Clear from printer queue")}
                    </DropdownMenu.Item>
                  )}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
        </div>
        <PrintButton icon={RotateCw} label={expired ? t("Upload expired") : t("Print again")} onClick={() => onReprint(entry)} disabled={expired} />
      </div>

      <div className="detail">
        {file.state === "ready" ? (
          <PreviewStage doc={{ file: file.file, pages: file.pages, kind }} settings={settings} pageCount={file.file.page_count} readOnly onPagesChange={() => {}} />
        ) : file.state === "loading" ? (
          <div className="stage stage--center">
            <span className="skel skel--sheet" />
          </div>
        ) : (
          <div className="stage stage--center">
            <div className="gone">
              <FileGlyph kind={kind} size={24} />
              <p>{expired ? t("Upload expired, so there's no preview.") : t("No preview.")}</p>
            </div>
          </div>
        )}

        <aside className="facts-panel" aria-label={t("Print details")}>
          <header className="facts-panel__head">
            <h2>{t("Details")}</h2>
          </header>
          <dl className="facts">
            {rows.map(([k, v]) => (
              <div key={k} className="facts__row">
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {warnings.length > 0 && (
            <div className="facts-panel__notes">
              {warnings.map((w) => (
                <p key={w} className="verdict__note">
                  {w}
                </p>
              ))}
            </div>
          )}
        </aside>
      </div>
    </motion.div>
  );
}
