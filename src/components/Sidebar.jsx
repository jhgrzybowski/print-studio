import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DropdownMenu } from "radix-ui";
import { LogOut, Moon, Search, Settings, SquarePen, Sun, Monitor, X, PanelLeftClose } from "lucide-react";
import { FileGlyph } from "./FileGlyph.jsx";
import { PrinterCard } from "./PrinterGauge.jsx";
import { IconKey, Key } from "./controls.jsx";
import { dayGroup, fileKind, formatTime, HISTORY_STATUS, initials, ACTIVE_STATUSES } from "../lib/format.js";

export function Wordmark() {
  return (
    <div className="wordmark">
      <svg viewBox="0 0 32 32" className="wordmark__mark" aria-hidden>
        <defs>
          <linearGradient id="wm-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--accent-text)" />
            <stop offset="1" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="26" height="26" rx="8" className="wordmark__tile" />
        <path d="M11 13.5V9.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v4" fill="none" stroke="url(#wm-g)" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="8" y="13.5" width="16" height="8" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 19.5h8v4a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1z" fill="url(#wm-g)" />
      </svg>
      <span className="wordmark__name">Print Studio</span>
    </div>
  );
}

// Live CUPS state can run ahead of the stored history status while a job is moving.
function jobLabel(job, active) {
  if (!job || !active) return null;
  return HISTORY_STATUS[job.state]?.label || null;
}

function HistoryRow({ item, job, selected, onSelect }) {
  const st = HISTORY_STATUS[item.status] || { label: item.status, tone: "muted" };
  const active = ACTIVE_STATUSES.has(item.status);
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      <button
        type="button"
        className={`hrow ${selected ? "is-selected" : ""}`}
        aria-current={selected ? "true" : undefined}
        onClick={() => onSelect(item)}
      >
        <span className={`hrow__icon kind-${fileKind(item.detected_mime, item.original_filename)}`}>
          <FileGlyph kind={fileKind(item.detected_mime, item.original_filename)} size={16} />
        </span>
        <span className="hrow__text">
          <span className="hrow__name">{item.original_filename}</span>
          <span className="hrow__meta">
            <span>{formatTime(item.created_at)}</span>
            <span className={`hrow__status tone-${st.tone}`}>
              {active && <span className="led led--pulse" aria-hidden />}
              {jobLabel(job, active) || st.label}
            </span>
          </span>
        </span>
      </button>
    </motion.li>
  );
}

function HistorySkeleton() {
  return (
    <div className="hlist__skeleton" aria-hidden>
      {[0.9, 0.65, 0.8, 0.55, 0.72].map((w, i) => (
        <div key={i} className="skel-row">
          <span className="skel skel--icon" />
          <span className="skel-row__lines">
            <span className="skel" style={{ width: `${w * 100}%` }} />
            <span className="skel skel--sm" style={{ width: "38%" }} />
          </span>
        </div>
      ))}
    </div>
  );
}

function HistoryList({ history, selectedId, onSelect, query }) {
  const { items, status, total, loadMore, loadingMore, jobs } = history;
  // A callback ref: the sentinel unmounts during search and comes back as a new node.
  const [sentinel, setSentinel] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => i.original_filename.toLowerCase().includes(q)) : items;
  }, [items, query]);

  const groups = useMemo(() => {
    const out = [];
    for (const it of filtered) {
      const g = dayGroup(it.created_at);
      if (!out.length || out[out.length - 1].label !== g) out.push({ label: g, items: [] });
      out[out.length - 1].items.push(it);
    }
    return out;
  }, [filtered]);

  useEffect(() => {
    if (!sentinel) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && loadMore(), { rootMargin: "120px" });
    io.observe(sentinel);
    return () => io.disconnect();
  }, [sentinel, loadMore, items.length]);

  if (status === "loading" || status === "idle") return <HistorySkeleton />;
  if (status === "error" && !items.length)
    return <p className="hlist__empty">History didn't load. It will retry when the server answers.</p>;
  if (!items.length)
    return (
      <div className="hlist__empty">
        <p className="hlist__empty-title">No prints yet</p>
        <p>Everything you print shows up here, so you can reprint it later.</p>
      </div>
    );
  if (!filtered.length) return <p className="hlist__empty">Nothing matches “{query}”.</p>;

  return (
    <nav className="hlist" aria-label="Print history">
      {groups.map((g) => (
        <section key={g.label} className="hgroup">
          <h2 className="hgroup__label">{g.label}</h2>
          <ul>
            <AnimatePresence initial={false}>
              {g.items.map((it) => (
                <HistoryRow key={it.id} item={it} job={jobs[it.cups_job_id]} selected={it.id === selectedId} onSelect={onSelect} />
              ))}
            </AnimatePresence>
          </ul>
        </section>
      ))}
      {items.length < total && !query && (
        <div ref={setSentinel} className="hlist__more">
          {loadingMore ? <HistorySkeleton /> : null}
        </div>
      )}
    </nav>
  );
}

function ProfileMenu({ user, appearance, setAppearance, onSettings, onLogout }) {
  const themeIcon = { light: Sun, dark: Moon, system: Monitor };
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="profile" aria-label="Account menu">
          <span className="avatar" aria-hidden>
            {initials(user)}
          </span>
          <span className="profile__text">
            <span className="profile__name">{user.display_name || user.username}</span>
            <span className="profile__user">{user.username}</span>
          </span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="menu profile-menu" side="top" align="start" sideOffset={10} collisionPadding={12}>
          <DropdownMenu.Label className="menu__label">Theme</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={appearance.theme} onValueChange={(v) => setAppearance({ theme: v })}>
            {["light", "dark", "system"].map((t) => {
              const Icon = themeIcon[t];
              return (
                <DropdownMenu.RadioItem key={t} value={t} className="menu__item">
                  <Icon size={16} strokeWidth={1.8} />
                  {t === "system" ? "Match system" : t === "light" ? "Light" : "Dark"}
                  <DropdownMenu.ItemIndicator className="menu__check">
                    <span className="menu__dot" />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>
              );
            })}
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Separator className="menu__sep" />
          <DropdownMenu.Item className="menu__item" onSelect={onSettings}>
            <Settings size={16} strokeWidth={1.8} />
            Settings
          </DropdownMenu.Item>
          <DropdownMenu.Item className="menu__item" onSelect={onLogout}>
            <LogOut size={16} strokeWidth={1.8} />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function Sidebar({ user, printer, history, view, onNew, onSelectHistory, onSettings, onPrinter, onLogout, appearance, setAppearance, onClose, drawer }) {
  const [query, setQuery] = useState("");
  const selectedId = view.kind === "history" ? view.id : null;

  return (
    <aside className="sidebar" aria-label="Sidebar">
      <div className="sidebar__top">
        <Wordmark />
        {drawer && <IconKey label="Close sidebar" icon={PanelLeftClose} onClick={onClose} />}
      </div>

      <Key variant="raised" icon={SquarePen} className="sidebar__new" onClick={onNew}>
        New print
      </Key>

      <PrinterCard printer={printer} onOpen={onPrinter} />

      <div className="sidebar__search">
        <Search size={15} strokeWidth={1.8} aria-hidden />
        <input
          type="search"
          placeholder="Search history"
          aria-label="Search history"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button type="button" aria-label="Clear search" onClick={() => setQuery("")}>
            <X size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="sidebar__scroll">
        <HistoryList history={history} selectedId={selectedId} onSelect={onSelectHistory} query={query} />
      </div>

      <div className="sidebar__foot">
        <ProfileMenu user={user} appearance={appearance} setAppearance={setAppearance} onSettings={onSettings} onLogout={onLogout} />
        <IconKey
          label="Settings"
          icon={Settings}
          variant={view.kind === "settings" ? "raised" : "ghost"}
          aria-pressed={view.kind === "settings"}
          onClick={onSettings}
        />
      </div>
    </aside>
  );
}
