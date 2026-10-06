import { forwardRef, memo, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DropdownMenu } from "radix-ui";
import { Archive, Ban, Check, CircleAlert, LogOut, Monitor, Moon, PanelLeftClose, Plus, RotateCw, Search, Settings, Sun, X } from "lucide-react";
import { api } from "../api/client.js";
import { Mark } from "./glyphs.jsx";
import { FileGlyph } from "./FileGlyph.jsx";
import { PrinterLine } from "./PrinterStatus.jsx";
import { IconKey, MOD, Tip, tween } from "./controls.jsx";
import { jobTone } from "./Dock.jsx";
import { dayGroup, fileKind, formatTime, HISTORY_STATUS, initials, ACTIVE_STATUSES, paperName } from "../lib/format.js";
import { selectedPages } from "../lib/pages.js";
import { t, tn, useLocale } from "../i18n/index.js";

export function Wordmark({ size }) {
  return (
    <span className="wordmark">
      <Mark size={size} />
      <span className="wordmark__name">Print Studio</span>
    </span>
  );
}

/** Chrome ring around a dark core, initials set in the display face. */
export function Avatar({ user, size = "md" }) {
  return (
    <span className={`avatar avatar--${size}`} aria-hidden>
      <span className="avatar__core">{initials(user)}</span>
    </span>
  );
}

export function Thumb({ item }) {
  const [failed, setFailed] = useState(false);
  const kind = fileKind(item.detected_mime, item.original_filename);
  const landscape = /landscape/.test(item.requested_options?.orientation || "");
  return (
    <span className={`hthumb ${landscape ? "is-landscape" : ""}`} aria-hidden>
      {item.file_id && !failed ? (
        <img src={api.previewPageUrl(item.file_id, 1)} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)} />
      ) : (
        <FileGlyph kind={kind} size={13} />
      )}
    </span>
  );
}

function StatusMark({ status, active }) {
  if (active) return <span className="pulse" aria-hidden />;
  if (status === "completed") return <Check className="hrow__mark" size={14} strokeWidth={1.8} aria-hidden />;
  if (status === "aborted") return <CircleAlert className="hrow__mark tone-error" size={14} strokeWidth={1.6} aria-hidden />;
  if (status === "canceled") return <Ban className="hrow__mark" size={14} strokeWidth={1.6} aria-hidden />;
  return null;
}

/**
 * Memoised: polling and upload progress re-render the app often, and a long history should not
 * re-render with it. `locale` is a prop so a language switch still reaches the row. Only a print
 * that arrives while the list is open slides in; rows coming back after a search just appear.
 */
const HistoryRow = memo(function HistoryRow({ item, job, selected, onSelect, onReprint, onArchive, fresh, searching }) {
  const active = ACTIVE_STATUSES.has(item.status);
  // Live CUPS state can run ahead of the stored status while a job is moving.
  const status = active && job?.state ? job.state : item.status;
  const label = HISTORY_STATUS[status] ? t(HISTORY_STATUS[status].label) : status;
  const o = item.requested_options || {};
  const printed = selectedPages(o.pages, item.page_count).length;
  const pages = printed && `${tn(printed, "{n} page", "{n} pages")}${o.copies > 1 ? ` × ${o.copies}` : ""}`;
  const meta = [pages, o.paper_size && paperName(o.paper_size), formatTime(item.created_at)].filter(Boolean).join(" · ");
  return (
    <motion.li
      layout={searching ? false : "position"}
      className={`hrow ${selected ? "is-selected" : ""} ${active ? "is-active" : ""}`}
      initial={fresh ? { opacity: 0, y: -6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={tween}
    >
      <button type="button" className="hrow__main" aria-current={selected ? "true" : undefined} onClick={() => onSelect(item)}>
        <Thumb item={item} />
        <span className="hrow__text">
          <span className="hrow__name">{item.original_filename}</span>
          <span className={`hrow__meta ${active || status === "aborted" ? `tone-${jobTone(status)}` : ""}`}>
            {active || status === "aborted" || status === "canceled" ? `${label} · ${formatTime(item.created_at)}` : meta}
          </span>
        </span>
        <span className="sr-only">{t("Status: {label}", { label })}</span>
        <span className="hrow__status">
          <StatusMark status={status} active={active} />
        </span>
      </button>
      {!active && (
        <span className="hrow__actions">
          <IconKey label={t("Move to archive")} icon={Archive} size="sm" onClick={() => onArchive(item)} tipSide="bottom" />
          {item.file_id && <IconKey label={t("Print again")} icon={RotateCw} size="sm" onClick={() => onReprint(item)} tipSide="right" />}
        </span>
      )}
    </motion.li>
  );
});

function HistorySkeleton() {
  return (
    <div className="hlist__skeleton" aria-hidden>
      {[0.8, 0.6, 0.72, 0.5, 0.66].map((w, i) => (
        <span key={i} className="hskel">
          <span className="skel hskel__thumb" />
          <span className="skel hskel__line" style={{ width: `${w * 100}%` }} />
        </span>
      ))}
    </div>
  );
}

function HistoryList({ history, hidden, ready, selectedId, onSelect, onReprint, onArchive, query }) {
  const { items: all, status, total, loadMore, loadingMore, jobs } = history;
  const [since] = useState(() => Date.now());
  // A callback ref: the sentinel unmounts during search and comes back as a new node.
  const [sentinel, setSentinel] = useState(null);

  const items = useMemo(() => all.filter((i) => !hidden.has(i.id)), [all, hidden]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => i.original_filename.toLowerCase().includes(q)) : items;
  }, [items, query]);
  const more = all.length < total && !query;

  const locale = useLocale();
  const groups = useMemo(() => {
    const out = [];
    for (const it of filtered) {
      const g = dayGroup(it.created_at);
      if (!out.length || out[out.length - 1].label !== g) out.push({ label: g, items: [] });
      out[out.length - 1].items.push(it);
    }
    return out;
    // Day headings follow the language.
  }, [filtered, locale]);

  useEffect(() => {
    if (!sentinel) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && loadMore(), { rootMargin: "120px" });
    io.observe(sentinel);
    return () => io.disconnect();
  }, [sentinel, loadMore, all.length]);

  if (status === "loading" || status === "idle" || !ready) return <HistorySkeleton />;
  if (status === "error" && !all.length) return <p className="hlist__empty">{t("History is offline. Retrying.")}</p>;
  // Archived rows may fill the first page; keep loading until something is left to show.
  const sentinelNode = more && (
    <div ref={setSentinel} className="hlist__more">
      {loadingMore || !items.length ? <HistorySkeleton /> : null}
    </div>
  );
  if (!items.length && more) return sentinelNode;
  if (!all.length) return <p className="hlist__empty">{t("Your prints will appear here.")}</p>;
  if (!items.length) return <p className="hlist__empty">{t("Everything is in the archive.")}</p>;
  if (!filtered.length) return <p className="hlist__empty">{t("No match for “{query}”", { query })}</p>;

  return (
    <nav className="hlist" aria-label={t("History")}>
      {groups.map((g) => (
        <section key={g.label} className="hgroup">
          <h2 className="hgroup__label">{g.label}</h2>
          <ul>
            <AnimatePresence initial={false}>
              {g.items.map((it) => (
                <HistoryRow
                  key={it.id}
                  item={it}
                  job={jobs[it.cups_job_id]}
                  selected={it.id === selectedId}
                  onSelect={onSelect}
                  onReprint={onReprint}
                  onArchive={onArchive}
                  fresh={Date.parse(it.created_at) > since}
                  searching={!!query}
                  locale={locale}
                />
              ))}
            </AnimatePresence>
          </ul>
        </section>
      ))}
      {sentinelNode}
    </nav>
  );
}

// Labels are keys, translated at render.
const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

function ProfileMenu({ user, appearance, setAppearance, onSettings, onLogout, settingsOpen }) {
  const name = user.display_name || user.username;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className={`profile ${settingsOpen ? "is-on" : ""}`} aria-label={t("Account: {name}", { name })}>
          <Avatar user={user} />
          <span className="profile__text">
            <span className="profile__name">{name}</span>
            {user.display_name && <span className="profile__user">{user.username}</span>}
          </span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="menu menu--account" side="top" align="start" sideOffset={8} collisionPadding={12}>
          <div className="menu__who">
            <Avatar user={user} size="lg" />
            <span className="menu__who-text">
              <span className="menu__who-name">{name}</span>
              <span className="menu__who-user">{user.username}</span>
            </span>
          </div>
          <DropdownMenu.Separator className="menu__sep" />
          <DropdownMenu.Label className="menu__label">
            {t("Theme")} · {t(THEMES.find((th) => th.value === appearance.theme)?.label || "System")}
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={appearance.theme} onValueChange={(v) => setAppearance({ theme: v })} className="menu__themes" aria-label={t("Theme")}>
            {THEMES.map(({ value, label, icon: Icon }) => (
              <DropdownMenu.RadioItem key={value} value={value} className="menu__theme" aria-label={t(label)} title={t(label)} onSelect={(e) => e.preventDefault()}>
                <Icon size={16} strokeWidth={1.5} aria-hidden />
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Separator className="menu__sep" />
          <DropdownMenu.Item className="menu__item" onSelect={onSettings}>
            <Settings size={16} strokeWidth={1.5} aria-hidden />
            {t("Settings")}
          </DropdownMenu.Item>
          <DropdownMenu.Item className="menu__item" onSelect={onLogout}>
            <LogOut size={16} strokeWidth={1.5} aria-hidden />
            {t("Sign out")}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export const Sidebar = forwardRef(function Sidebar(
  { user, printer, history, archive, view, onHome, onNew, onSelectHistory, onReprint, onArchive, onOpenArchive, onSettings, onLogout, appearance, setAppearance, onClose, drawer },
  searchRef,
) {
  const [query, setQuery] = useState("");
  const selectedId = view.kind === "history" ? view.id : null;
  const archivedCount = archive.ids.length;

  return (
    <aside className="sidebar" aria-label={t("Sidebar")}>
      <div className="sidebar__top">
        <button type="button" className={`wordmark-link ${view.kind === "home" ? "is-on" : ""}`} onClick={onHome} aria-label={t("Print Studio home")}>
          <Wordmark />
        </button>
        <div className="sidebar__tools">
          <Tip label={archivedCount ? t("Archive ({n})", { n: archivedCount }) : t("Archive")}>
            <button
              type="button"
              className={`ikey ikey--plain ikey--md archive-key ${view.kind === "archive" ? "is-on" : ""}`}
              aria-label={archivedCount ? t("Archive ({n})", { n: archivedCount }) : t("Archive")}
              aria-current={view.kind === "archive" ? "page" : undefined}
              onClick={onOpenArchive}
            >
              <Archive size={18} strokeWidth={1.5} aria-hidden />
              {archivedCount > 0 && <span className="archive-key__count">{archivedCount > 99 ? "99+" : archivedCount}</span>}
            </button>
          </Tip>
          <Tip label={t("New print")}>
            <button type="button" className="newprint metal" aria-label={t("New print")} onClick={onNew}>
              <Plus size={16} strokeWidth={1.8} aria-hidden />
            </button>
          </Tip>
          {drawer && <IconKey label={t("Close")} icon={PanelLeftClose} onClick={onClose} />}
        </div>
      </div>

      <label className="search">
        <Search size={15} strokeWidth={1.5} aria-hidden />
        <input
          ref={searchRef}
          type="search"
          placeholder={t("Search prints")}
          aria-label={t("Search history")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && query && (e.stopPropagation(), setQuery(""))}
        />
        {query ? (
          <button type="button" className="search__clear" aria-label={t("Clear search")} onClick={() => setQuery("")}>
            <X size={13} strokeWidth={1.8} />
          </button>
        ) : (
          <kbd className="search__kbd" aria-hidden>
            {MOD}K
          </kbd>
        )}
      </label>

      <div className="sidebar__scroll">
        <HistoryList history={history} hidden={archive.hidden} ready={archive.loaded} selectedId={selectedId} onSelect={onSelectHistory} onReprint={onReprint} onArchive={onArchive} query={query} />
      </div>

      <div className="sidebar__foot">
        <PrinterLine
          printer={printer}
          as="button"
          type="button"
          className="sidebar__printer"
          onClick={onSettings}
          aria-label={t("Printer: {status}. Open settings", { status: printer.info.label })}
        />
        <ProfileMenu user={user} appearance={appearance} setAppearance={setAppearance} onSettings={onSettings} onLogout={onLogout} settingsOpen={view.kind === "settings"} />
      </div>
    </aside>
  );
});
