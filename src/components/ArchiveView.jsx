import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Archive, ArchiveRestore, RotateCw, Trash2 } from "lucide-react";
import { api } from "../api/client.js";
import { Thumb } from "./Sidebar.jsx";
import { Button, IconKey, tween } from "./controls.jsx";
import { formatDateTime, paperName } from "../lib/format.js";
import { selectedPages } from "../lib/pages.js";
import { t, tn } from "../i18n/index.js";

/**
 * Entries for the archived ids: from the loaded history where possible, fetched one by one
 * otherwise. A print the server no longer has comes back as `missing` so it can still be deleted.
 */
function useEntries(ids, items) {
  const [fetched, setFetched] = useState({});
  const asked = useRef(new Set());
  useEffect(() => {
    const known = new Set(items.map((i) => i.id));
    for (const id of ids) {
      if (known.has(id) || asked.current.has(id)) continue;
      asked.current.add(id);
      api
        .historyEntry(id)
        .then((e) => setFetched((f) => ({ ...f, [id]: e })))
        .catch((e) => setFetched((f) => ({ ...f, [id]: { id, missing: e.status === 404, failed: e.status !== 404 } })));
    }
  }, [ids, items]);
  return ids.map((id) => items.find((i) => i.id === id) || fetched[id] || { id, pending: true });
}

/** Asks once more in place: the first press arms it, the second commits, and it disarms on its own. */
function ConfirmKey({ label, confirm, icon, onConfirm, disabled, className = "", text }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 3200);
    return () => clearTimeout(id);
  }, [armed]);
  if (armed)
    return (
      <Button variant="quiet" className={`btn--sm btn--danger is-armed ${className}`} onClick={onConfirm} onBlur={() => setArmed(false)} disabled={disabled} autoFocus>
        {confirm}
      </Button>
    );
  if (text)
    return (
      <Button variant="quiet" className={`btn--sm ${className}`} onClick={() => setArmed(true)} disabled={disabled}>
        {text}
      </Button>
    );
  return <IconKey label={label} icon={icon} size="sm" className={className} onClick={() => setArmed(true)} disabled={disabled} />;
}

function meta(item) {
  if (item.missing) return t("No longer on the print server");
  if (item.failed) return t("Couldn't load this print");
  if (item.pending) return "";
  const o = item.requested_options || {};
  const printed = selectedPages(o.pages, item.page_count).length;
  return [printed && tn(printed, "{n} page", "{n} pages"), o.paper_size && paperName(o.paper_size), formatDateTime(item.created_at)].filter(Boolean).join(" · ");
}

export function ArchiveView({ lead, archive, history, onOpen, onReprint, onRestore, onRemove }) {
  const entries = useEntries(archive.ids, history.items);
  const [busy, setBusy] = useState(false);
  const count = entries.length;

  async function removeAll() {
    setBusy(true);
    try {
      await onRemove(archive.ids);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="bar">
        {lead}
        <div className="bar__text">
          <h1 className="bar__title bar__title--lg">{t("Archive")}</h1>
        </div>
        <span className="bar__spacer" />
        {count > 0 && <ConfirmKey text={t("Delete all")} confirm={t("Delete {n} for good", { n: count })} onConfirm={removeAll} disabled={busy} />}
      </div>
      <div className="archive">
        <div className="archive__inner">
          <p className="archive__lede">
            {count
              ? tn(count, "{n} print, kept out of your history. Open one to see it, or restore it to the list.", "{n} prints, kept out of your history. Open one to see it, or restore it to the list.")
              : t("Prints you archive leave the history list and wait here. Restore them any time, or delete them for good.")}
          </p>
          {count === 0 ? (
            <div className="archive__empty">
              <Archive size={22} strokeWidth={1.4} aria-hidden />
              <p>{t("Nothing archived")}</p>
            </div>
          ) : (
            <ul className="archive__list">
              <AnimatePresence initial={false}>
                {entries.map((item) => (
                  <motion.li key={item.id} className="arow" layout="position" exit={{ opacity: 0, scale: 0.98 }} transition={tween}>
                    <button type="button" className="arow__main" onClick={() => onOpen(item)} disabled={item.missing || item.pending}>
                      {item.original_filename ? <Thumb item={item} /> : <span className="hthumb" aria-hidden />}
                      <span className="arow__text">
                        <span className="arow__name">{item.original_filename || (item.pending ? <span className="skel arow__skel" /> : t("Print #{id}", { id: item.id }))}</span>
                        <span className="arow__meta">{meta(item)}</span>
                      </span>
                    </button>
                    <span className="arow__actions">
                      {item.file_id && !item.missing && <IconKey label={t("Print again")} icon={RotateCw} size="sm" onClick={() => onReprint(item)} />}
                      {!item.missing && <IconKey label={t("Restore to history")} icon={ArchiveRestore} size="sm" onClick={() => onRestore(item)} />}
                      <ConfirmKey label={t("Delete permanently")} icon={Trash2} confirm={t("Delete")} onConfirm={() => onRemove([item.id])} className="arow__delete" />
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
