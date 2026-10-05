import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Archive, ChevronRight, FolderOpen, Plus, RotateCw } from "lucide-react";
import { Mark } from "./glyphs.jsx";
import { FileGlyph } from "./FileGlyph.jsx";
import { Thumb } from "./Sidebar.jsx";
import { PhoneBar } from "./Toolbar.jsx";
import { printerDot } from "./PrinterStatus.jsx";
import { Button, Dot, IconKey, ease } from "./controls.jsx";
import { useMedia } from "../hooks/data.js";
import { ACTIVE_STATUSES, formatBytes, HISTORY_STATUS, paperName, shortWhen } from "../lib/format.js";
import { selectedPages } from "../lib/pages.js";
import { t, tn } from "../i18n/index.js";

const RECENT = 4;
// Seen now and then, so the panels may arrive with a little motion; only on the way in.
const rise = (i) => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.32, ease, delay: 0.04 * i } });

function RecentRow({ item, onOpen, onReprint }) {
  const active = ACTIVE_STATUSES.has(item.status);
  const o = item.requested_options || {};
  const state = active || item.status === "aborted" || item.status === "canceled" ? t(HISTORY_STATUS[item.status]?.label || item.status) : null;
  const printed = selectedPages(o.pages, item.page_count).length;
  const pages = printed && tn(printed, "{n} page", "{n} pages");
  const meta = [state, pages, o.paper_size && paperName(o.paper_size), shortWhen(item.created_at)].filter(Boolean).join(" · ");
  return (
    <li className="recent">
      <button type="button" className="recent__main" onClick={() => onOpen(item)}>
        <Thumb item={item} />
        <span className="recent__text">
          <span className="recent__name">{item.original_filename}</span>
          <span className="recent__meta">{meta}</span>
        </span>
        <ChevronRight className="recent__chev" size={16} strokeWidth={1.5} aria-hidden />
      </button>
      {item.file_id && !active && <IconKey label={t("Print again")} icon={RotateCw} size="sm" className="recent__again" onClick={() => onReprint(item)} />}
    </li>
  );
}

export function HomeView({ narrow, lead, printer, onPrinter, history, archive, capabilities, dragging, current, onResume, onBrowse, onOpen, onReprint, onOpenArchive }) {
  const coarse = useMedia("(pointer: coarse)");
  const choose = narrow || coarse;
  const limit = capabilities?.max_upload_bytes ? formatBytes(capabilities.max_upload_bytes) : "50 MB";
  const office = capabilities?.office?.available !== false;
  const kinds = office ? ["PDF", "JPG", "PNG", "TXT", "DOCX", "XLSX", "PPTX"] : ["PDF", "JPG", "PNG", "TXT"];

  const recent = useMemo(() => history.items.filter((i) => !archive.hidden.has(i.id)).slice(0, RECENT), [history.items, archive.hidden]);
  const loading = history.status === "loading" || history.status === "idle" || !archive.loaded;
  // When the newest prints are all archived, older ones fill the list. On a phone the sidebar that
  // would page them in isn't mounted, so home asks for them itself.
  const { items, total, loadMore, loadingMore } = history;
  const short = !loading && recent.length < RECENT && items.length < total;
  const asked = useRef(-1);
  const [retries, setRetries] = useState(0);
  useEffect(() => {
    // One request per list length; a failed one is tried again after a pause, not in a loop.
    if (!short || loadingMore || asked.current === items.length) return;
    asked.current = items.length;
    loadMore().catch(() => {
      setTimeout(() => {
        asked.current = -1;
        setRetries((n) => n + 1);
      }, 5000);
    });
  }, [short, loadingMore, loadMore, items.length, retries]);
  const archivedCount = archive.ids.length;
  const { info } = printer;

  return (
    <div className="page">
      {narrow && <PhoneBar lead={lead} printer={printer} onPrinter={onPrinter} />}
      <div className="home">
        <div className="home__inner">
          <motion.header className="home__hero" {...rise(0)}>
            <Mark size={narrow ? 46 : 60} />
            <h1 className="home__title">Print Studio</h1>
            <p className="home__slogan">{t("Drop a file, check every page, and get it right on the first print.")}</p>
            {!narrow && (
              <button type="button" className={`home__printer tone-${printerDot(info.tone)}`} onClick={onPrinter} aria-label={t("Printer: {status}. Open settings", { status: info.label })}>
                <Dot tone={printerDot(info.tone)} pulse={info.tone === "busy"} />
                <span>{info.label}</span>
              </button>
            )}
          </motion.header>

          <div className="home__choices">
            <motion.section className={`choice choice--drop ${dragging ? "is-dragging" : ""}`} aria-labelledby="home-new" {...rise(1)}>
              <p className="choice__eyebrow">{t("New print")}</p>
              <h2 id="home-new" className="choice__title">
                {choose ? t("Choose a file") : t("Drop a file here")}
              </h2>
              <p className="choice__desc">{t("PDFs, photos, text and Office documents. Every page shows in the preview before anything reaches the printer.")}</p>
              <button type="button" className="drop" onClick={onBrowse} aria-label={t("Choose a file")}>
                <span className="drop__sheet" aria-hidden>
                  <span className="drop__icon metal">
                    <Plus size={22} strokeWidth={1.5} />
                  </span>
                </span>
                <span className="drop__hint">{dragging ? t("Release to add") : choose ? t("Tap to choose a file") : t("Drag it in, or click to browse")}</span>
              </button>
              {current && (
                <button type="button" className="choice__link choice__link--resume" onClick={onResume}>
                  <FileGlyph kind={current.kind} size={15} />
                  <span className="choice__link-text">{t("Continue with {name}", { name: current.name })}</span>
                  <ChevronRight size={15} strokeWidth={1.5} aria-hidden />
                </button>
              )}
              <div className="choice__foot">
                <ul className="kinds" aria-label={t("Supported files")}>
                  {kinds.map((k) => (
                    <li key={k}>{k}</li>
                  ))}
                  <li className="kinds__limit">{t("up to {size}", { size: limit })}</li>
                </ul>
                <Button variant="metal" onClick={onBrowse}>
                  <FolderOpen size={16} strokeWidth={1.6} aria-hidden />
                  {t("Choose file")}
                </Button>
              </div>
            </motion.section>

            <motion.section className="choice choice--recent" aria-labelledby="home-recent" {...rise(2)}>
              <p className="choice__eyebrow">{t("Print again")}</p>
              <h2 id="home-recent" className="choice__title">
                {t("Recent prints")}
              </h2>
              <p className="choice__desc">{t("Open a print to see its pages and settings, or send it again just as it was.")}</p>
              {loading ? (
                <div className="recent-list" aria-hidden>
                  {[0.7, 0.5, 0.62].map((w, i) => (
                    <span key={i} className="hskel">
                      <span className="skel hskel__thumb" />
                      <span className="skel hskel__line" style={{ width: `${w * 100}%` }} />
                    </span>
                  ))}
                </div>
              ) : recent.length ? (
                <ul className="recent-list">
                  {recent.map((item) => (
                    <RecentRow key={item.id} item={item} onOpen={onOpen} onReprint={onReprint} />
                  ))}
                </ul>
              ) : (
                <p className="choice__empty">{t("Nothing printed yet. Your prints will show up here.")}</p>
              )}
              {archivedCount > 0 && (
                <button type="button" className="choice__link" onClick={onOpenArchive}>
                  <Archive size={15} strokeWidth={1.5} aria-hidden />
                  {t("Archive ({n})", { n: archivedCount })}
                  <ChevronRight size={15} strokeWidth={1.5} aria-hidden />
                </button>
              )}
            </motion.section>
          </div>
        </div>
      </div>
    </div>
  );
}
