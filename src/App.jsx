import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Tooltip } from "radix-ui";
import { Menu, RefreshCw, WifiOff } from "lucide-react";
import { api } from "./api/client.js";
import { useAppearance } from "./hooks/appearance.js";
import { useHistory, useMedia, usePreferences, usePrinter, usePrinterOptions, useSession } from "./hooks/data.js";
import { usePrintFlow } from "./hooks/printFlow.js";
import { BASE_SETTINGS, pickDefaults, reconcile } from "./lib/settings.js";
import { AuthScreen } from "./components/AuthScreen.jsx";
import { Sidebar, Wordmark } from "./components/Sidebar.jsx";
import { DropZone } from "./components/DropZone.jsx";
import { PreviewStage } from "./components/PreviewStage.jsx";
import { Inspector } from "./components/Inspector.jsx";
import { Dock, JobStrip } from "./components/Dock.jsx";
import { HistoryDetail } from "./components/HistoryDetail.jsx";
import { SettingsView } from "./components/SettingsView.jsx";
import { Button, Dot, IconKey, ease, tween } from "./components/controls.jsx";

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.txt,.docx,.xlsx,.pptx,.odt,.ods,.odp,application/pdf,image/png,image/jpeg,text/plain";

export default function App() {
  const session = useSession();
  const printer = usePrinter();
  const [appearance, setAppearance] = useAppearance();

  let body;
  if (session.status === "loading") body = <Splash key="splash" />;
  else if (session.status === "error") body = <ServerDown key="down" onRetry={session.retry} message={session.error?.message} />;
  else if (session.status === "anon") body = <AuthScreen key="auth" session={session} printer={printer} />;
  else body = <Shell key={`shell-${session.user.id}`} session={session} printer={printer} appearance={appearance} setAppearance={setAppearance} />;

  return (
    <Tooltip.Provider delayDuration={450} skipDelayDuration={200}>
      <AnimatePresence mode="wait">
        <motion.div
          key={session.status === "authed" ? "authed" : session.status}
          className="root-fade"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          {body}
        </motion.div>
      </AnimatePresence>
    </Tooltip.Provider>
  );
}

function Splash() {
  return (
    <div className="splash" aria-busy="true" aria-label="Loading">
      <Wordmark />
    </div>
  );
}

function ServerDown({ onRetry, message }) {
  return (
    <div className="splash">
      <div className="notice-view">
        <WifiOff size={22} strokeWidth={1.5} aria-hidden />
        <h1>Can't reach the print server</h1>
        <p>{message || "Check that this device is on the home network."}</p>
        <Button onClick={onRetry}>Try again</Button>
      </div>
    </div>
  );
}

function Shell({ session, printer, appearance, setAppearance }) {
  const { capabilities, choices, error: optionsError, reload: reloadOptions } = usePrinterOptions();
  const history = useHistory(true);
  const prefs = usePreferences(true);
  const [view, setView] = useState({ kind: "compose" });
  const [drawer, setDrawer] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [tracked, setTracked] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [defaultsState, setDefaultsState] = useState("idle");
  const [notice, setNotice] = useState(null);
  const narrow = useMedia("(max-width: 860px)");
  const fileInput = useRef(null);
  const dragDepth = useRef(0);

  const defaults = prefs.prefs?.print_defaults || null;
  const hasChoices = Object.keys(choices).length > 0;

  const flash = useCallback((text, tone = "ok") => {
    setNotice({ text, tone, id: Date.now() });
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4200);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);
  useEffect(() => {
    if (!narrow) setDrawer(false);
  }, [narrow]);

  const onPrinted = useCallback(
    async (r) => {
      if (r.history_id == null) {
        // CUPS took the job but the history write failed; there is nothing to track by.
        flash(`Sent to the printer as job ${r.job_id}`);
        history.refresh();
        return;
      }
      setTracked(r.history_id);
      try {
        const entry = await api.historyEntry(r.history_id);
        history.upsert(entry);
      } catch {
        history.refresh();
      }
    },
    [history, flash],
  );

  const flow = usePrintFlow({ choices, defaults, maxBytes: capabilities?.max_upload_bytes, onPrinted });

  const canSend = !["offline", "down"].includes(printer.info.tone) && printer.raw?.accepting_jobs !== false;

  const goCompose = useCallback(() => {
    setView({ kind: "compose" });
    setDrawer(false);
  }, []);

  const newPrint = useCallback(() => {
    flow.clear();
    setTracked(null);
    goCompose();
  }, [flow, goCompose]);

  const browse = useCallback(() => fileInput.current?.click(), []);

  const attach = useCallback(
    (file) => {
      if (!file) return;
      setTracked(null);
      goCompose();
      flow.attach(file);
    },
    [flow, goCompose],
  );

  const print = useCallback(() => {
    if (flow.canPrint && canSend && flow.printing.state !== "sending") flow.print();
  }, [flow, canSend]);

  // Keyboard: Ctrl/Cmd+Enter or Ctrl/Cmd+P prints the loaded document.
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key === "Enter" || e.key.toLowerCase() === "p") {
        if (view.kind !== "compose" || flow.doc?.phase !== "ready") return;
        e.preventDefault();
        print();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [print, view.kind, flow.doc?.phase]);

  // Paste an image or file from the clipboard.
  useEffect(() => {
    const onPaste = (e) => {
      const f = e.clipboardData?.files?.[0];
      if (f) {
        e.preventDefault();
        attach(f.name && f.name !== "image.png" ? f : new File([f], `Pasted image ${new Date().toLocaleTimeString()}.png`, { type: f.type }));
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [attach]);

  const dragProps = {
    onDragEnter: (e) => {
      if (!e.dataTransfer?.types?.includes("Files")) return;
      e.preventDefault();
      dragDepth.current++;
      setDragging(true);
    },
    onDragOver: (e) => {
      if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
    },
    onDragLeave: () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (!dragDepth.current) setDragging(false);
    },
    onDrop: (e) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      attach(e.dataTransfer?.files?.[0]);
    },
  };

  async function saveDefaults() {
    setDefaultsState("saving");
    try {
      await prefs.save({ print_defaults: pickDefaults(flow.settings) });
      setDefaultsState("saved");
      setTimeout(() => setDefaultsState("idle"), 1800);
    } catch (e) {
      setDefaultsState("idle");
      flash(`Couldn't save defaults: ${e.message}`, "error");
    }
  }

  function resetToDefaults() {
    flow.setSettings((s) => reconcile({ ...BASE_SETTINGS, ...(defaults || {}), pages: s.pages }, choices));
  }

  async function cancelTracked(entry) {
    if (!entry?.cups_job_id) return;
    setCancelling(true);
    try {
      const r = await api.cancelJob(entry.cups_job_id);
      flash(r.cancelled ? "Cancel requested" : r.message || "The job had already finished", r.cancelled ? "ok" : "muted");
      await history.pollJobs();
    } catch (e) {
      flash(e.message, "error");
    } finally {
      setCancelling(false);
    }
  }

  async function reprint(entry) {
    setTracked(null);
    goCompose();
    const ok = await flow.openExisting(entry);
    if (ok) flash("Loaded with the settings you used last time");
  }

  const trackedEntry = useMemo(() => {
    if (!tracked) return null;
    return history.items.find((h) => h.id === tracked) || { id: tracked, status: "submitted", original_filename: flow.doc?.name };
  }, [tracked, history.items, flow.doc?.name]);

  const loaded = flow.doc?.phase === "ready";

  const sidebar = (
    <Sidebar
      user={session.user}
      printer={printer}
      history={history}
      view={view}
      drawer={narrow}
      onClose={() => setDrawer(false)}
      onNew={newPrint}
      onSelectHistory={(h) => {
        setView({ kind: "history", id: h.id });
        setDrawer(false);
      }}
      onSettings={() => {
        setView({ kind: "settings" });
        setDrawer(false);
      }}
      onLogout={session.logout}
      appearance={appearance}
      setAppearance={setAppearance}
    />
  );

  return (
    <div className={`app ${narrow ? "is-narrow" : ""}`} {...dragProps}>
      {narrow ? (
        <AnimatePresence>
          {drawer && (
            <>
              <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
              <motion.div
                className="drawer"
                initial={{ x: "-104%" }}
                animate={{ x: 0 }}
                exit={{ x: "-104%" }}
                transition={{ duration: 0.28, ease }}
              >
                {sidebar}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      ) : (
        sidebar
      )}

      <main className={`main ${dragging ? "is-dragging" : ""}`}>
        {narrow && (
          <header className="topbar">
            <IconKey label="Open sidebar" icon={Menu} onClick={() => setDrawer(true)} tipSide="bottom" />
            <Wordmark size={22} />
          </header>
        )}

        <div className="notices" aria-live="polite">
          <AnimatePresence>
            {notice && (
              <motion.p
                key={notice.id}
                className={`notice tone-${notice.tone}`}
                role="status"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={tween}
              >
                <Dot tone={notice.tone} />
                {notice.text}
              </motion.p>
            )}
          </AnimatePresence>
          {optionsError && (
            <button type="button" className="notice tone-warn is-action" onClick={reloadOptions}>
              <RefreshCw size={14} strokeWidth={1.5} aria-hidden />
              Printer options didn't load. Retry
            </button>
          )}
        </div>

        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          hidden
          onChange={(e) => {
            attach(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <AnimatePresence mode="wait" initial={false}>
          {view.kind === "compose" && (
            <motion.div
              key={loaded ? "compose-loaded" : "compose-empty"}
              className={`workspace ${loaded ? "workspace--split" : ""}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={tween}
            >
              <div className="canvas">
                {loaded ? (
                  <PreviewStage doc={flow.doc} settings={flow.settings} pageCount={flow.pageCount} onPagesChange={(v) => flow.set("pages", v)} />
                ) : (
                  <DropZone dragging={dragging} onBrowse={browse} doc={flow.doc} capabilities={capabilities} />
                )}
                <div className="dock-area">
                  <AnimatePresence>
                    {trackedEntry && (
                      <JobStrip
                        key={trackedEntry.id}
                        entry={trackedEntry}
                        cancelling={cancelling}
                        onCancel={() => cancelTracked(trackedEntry)}
                        onDismiss={() => setTracked(null)}
                        onOpen={() => setView({ kind: "history", id: trackedEntry.id })}
                      />
                    )}
                  </AnimatePresence>
                  <Dock flow={flow} printer={printer} canSend={canSend} onBrowse={browse} onPrint={print} />
                </div>
              </div>
              {loaded && (
                <Inspector
                  flow={flow}
                  choices={choices}
                  printerReady={canSend}
                  disabled={!hasChoices}
                  onSaveDefaults={saveDefaults}
                  onResetDefaults={resetToDefaults}
                  defaultsState={defaultsState}
                />
              )}
            </motion.div>
          )}
          {view.kind === "history" && (
            <motion.div key={`h-${view.id}`} className="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={tween}>
              <HistoryDetail id={view.id} history={history} onReprint={reprint} onOpenCompose={newPrint} onStatusLine={flash} />
            </motion.div>
          )}
          {view.kind === "settings" && (
            <motion.div key="settings" className="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={tween}>
              <SettingsView
                user={session.user}
                appearance={appearance}
                setAppearance={setAppearance}
                choices={choices}
                prefs={prefs}
                printer={printer}
                capabilities={capabilities}
                onLogout={session.logout}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
