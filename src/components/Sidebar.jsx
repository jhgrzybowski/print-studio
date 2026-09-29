import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DropdownMenu } from "radix-ui";
import { LogOut, Monitor, Moon, PanelLeftClose, Search, Settings, SquarePen, Sun, X } from "lucide-react";
import { Mark } from "./glyphs.jsx";
import { PrinterLine } from "./PrinterStatus.jsx";
import { Dot, IconKey, tween } from "./controls.jsx";
import { jobTone } from "./Dock.jsx";
import { dayGroup, formatTime, HISTORY_STATUS, initials, ACTIVE_STATUSES } from "../lib/format.js";

export function Wordmark({ size }) {
  return (
    <span className="wordmark">
      <Mark size={size} />
      <span className="wordmark__name">Print Studio</span>
    </span>
  );
}

function HistoryRow({ item, job, selected, onSelect }) {
  const active = ACTIVE_STATUSES.has(item.status);
  // Live CUPS state can run ahead of the stored status while a job is moving.
  const status = active && job?.state ? job.state : item.status;
  const label = HISTORY_STATUS[status]?.label || status;
  return (
    <motion.li layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={tween}>
      <button type="button" className={`hrow ${selected ? "is-selected" : ""}`} aria-current={selected ? "true" : undefined} onClick={() => onSelect(item)}>
        <Dot tone={status === "completed" ? "quiet" : jobTone(status)} pulse={active} />
        <span className="hrow__name">{item.original_filename}</span>
        <span className="sr-only">, {label},</span>
        <span className="hrow__time">{formatTime(item.created_at)}</span>
      </button>
    </motion.li>
  );
}

function HistorySkeleton() {
  return (
    <div className="hlist__skeleton" aria-hidden>
      {[0.8, 0.6, 0.72, 0.5, 0.66].map((w, i) => (
        <span key={i} className="skel" style={{ width: `${w * 100}%` }} />
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
  if (status === "error" && !items.length) return <p className="hlist__empty">History is offline. Retrying.</p>;
  if (!items.length) return <p className="hlist__empty">Your prints will appear here.</p>;
  if (!filtered.length) return <p className="hlist__empty">No match for “{query}”</p>;

  return (
    <nav className="hlist" aria-label="History">
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

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

function ProfileMenu({ user, appearance, setAppearance, onSettings, onLogout }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="profile" aria-label="Account">
          <span className="avatar" aria-hidden>
            {initials(user)}
          </span>
          <span className="profile__name">{user.display_name || user.username}</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="menu" side="top" align="start" sideOffset={8} collisionPadding={12}>
          <DropdownMenu.Label className="menu__label">{user.username}</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={appearance.theme} onValueChange={(v) => setAppearance({ theme: v })} className="menu__themes" aria-label="Theme">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <DropdownMenu.RadioItem key={value} value={value} className="menu__theme" aria-label={label} title={label} onSelect={(e) => e.preventDefault()}>
                <Icon size={16} strokeWidth={1.5} aria-hidden />
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Separator className="menu__sep" />
          <DropdownMenu.Item className="menu__item" onSelect={onSettings}>
            <Settings size={16} strokeWidth={1.5} aria-hidden />
            Settings
          </DropdownMenu.Item>
          <DropdownMenu.Item className="menu__item" onSelect={onLogout}>
            <LogOut size={16} strokeWidth={1.5} aria-hidden />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function Sidebar({ user, printer, history, view, onNew, onSelectHistory, onSettings, onLogout, appearance, setAppearance, onClose, drawer }) {
  const [query, setQuery] = useState("");
  const selectedId = view.kind === "history" ? view.id : null;

  return (
    <aside className="sidebar" aria-label="Sidebar">
      <div className="sidebar__top">
        <Wordmark />
        <div className="sidebar__tools">
          <IconKey label="New print" icon={SquarePen} onClick={onNew} tipSide="bottom" />
          {drawer && <IconKey label="Close" icon={PanelLeftClose} onClick={onClose} tipSide="bottom" />}
        </div>
      </div>

      <label className="search">
        <Search size={15} strokeWidth={1.5} aria-hidden />
        <input type="search" placeholder="Search" aria-label="Search history" value={query} onChange={(e) => setQuery(e.target.value)} />
        {query && (
          <button type="button" className="search__clear" aria-label="Clear search" onClick={() => setQuery("")}>
            <X size={13} strokeWidth={1.8} />
          </button>
        )}
      </label>

      <div className="sidebar__scroll">
        <HistoryList history={history} selectedId={selectedId} onSelect={onSelectHistory} query={query} />
      </div>

      <div className="sidebar__foot">
        <PrinterLine printer={printer} as="button" type="button" className="sidebar__printer" onClick={onSettings} aria-label={`Printer: ${printer.info.label}. Open settings`} />
        <div className="sidebar__me">
          <ProfileMenu user={user} appearance={appearance} setAppearance={setAppearance} onSettings={onSettings} onLogout={onLogout} />
          <IconKey label="Settings" icon={Settings} pressed={view.kind === "settings"} onClick={onSettings} />
        </div>
      </div>
    </aside>
  );
}
