import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Tooltip } from "radix-ui";
import { Menu, RefreshCw, WifiOff, X } from "lucide-react";
import { api } from "./api/client.js";
import { useAppearance } from "./hooks/appearance.js";
import { useHistory, useMedia, usePreferences, usePrinter, usePrinterOptions, useSession } from "./hooks/data.js";
import { usePrintFlow } from "./hooks/printFlow.js";
import { BASE_SETTINGS, pickDefaults, reconcile } from "./lib/settings.js";
import { formatTime } from "./lib/format.js";
import { t, useLocale } from "./i18n/index.js";
import { AuthScreen } from "./components/AuthScreen.jsx";
import { Sidebar, Wordmark } from "./components/Sidebar.jsx";
import { DropZone } from "./components/DropZone.jsx";
import { PreviewStage } from "./components/PreviewStage.jsx";
import { Toolbar, Verdict } from "./components/Toolbar.jsx";
import { PrintDock } from "./components/PrintSheet.jsx";
import { docLine, JobStrip } from "./components/Dock.jsx";
import { FileGlyph } from "./components/FileGlyph.jsx";
import { HistoryDetail } from "./components/HistoryDetail.jsx";
import { SettingsView } from "./components/SettingsView.jsx";
import { Button, Dot, IconKey, drawerEase, tween, useLiquidMetal } from "./components/controls.jsx";

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.txt,.docx,.xlsx,.pptx,.odt,.ods,.odp,application/pdf,image/png,image/jpeg,text/plain";

export default function App() {
  const session = useSession();
  const printer = usePrinter();
  const [appearance, setAppearance] = useAppearance();
  // Subscribing here re-renders the whole tree when the language changes.
  useLocale();
  useLiquidMetal();

  let body;
  if (session.status === "loading") body = <Splash key="splash" />;
  else if (session.status === "error") body = <ServerDown key="down" onRetry={session.retry} message={session.error?.message} />;
  else if (session.status === "anon") body = <AuthScreen key="auth" session={session} printer={printer} />;
  else body = <Shell key={`shell-${session.user.id}`} session={session} printer={printer} appearance={appearance} setAppearance={setAppearance} />;

  return (
    <Tooltip.Provider delayDuration={450} skipDelayDuration={300}>
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
    <div className="splash" aria-busy="true" aria-label={t("Loading")}>
      <Wordmark size={30} />
    </div>
  );
}

function ServerDown({ onRetry, message }) {
  return (
    <div className="splash">
      <div className="notice-view">
        <WifiOff size={22} strokeWidth={1.5} aria-hidden />
        <h1>{t("Can't reach the print server")}</h1>
        <p>{message || t("Check that this device is on the home network.")}</p>
        <Button onClick={onRetry}>{t("Try again")}</Button>
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
  const searchRef = useRef(null);
  const dragDepth = useRef(0);

  const defaults = prefs.prefs?.print_defaults || null;
  const hasChoices = Object.keys(choices).length > 0;

  const flash = useCallback((text, tone = "ok") => {
    setNotice({ text, tone, id: Date.now() });
  }, []);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 4200);
    return () => clearTimeout(id);
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
        flash(t("Sent to the printer as job {id}", { id: r.job_id }));
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

  // Keyboard: Ctrl/Cmd+Enter or Ctrl/Cmd+P prints the loaded document; Ctrl/Cmd+K searches history.
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (narrow) setDrawer(true);
        // The drawer mounts its sidebar on open; focus once it exists.
        requestAnimationFrame(() => searchRef.current?.focus());
        return;
      }
      if (e.key === "Enter" || e.key.toLowerCase() === "p") {
        if (view.kind !== "compose" || flow.doc?.phase !== "ready") return;
        e.preventDefault();
        print();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [print, view.kind, flow.doc?.phase, narrow]);

  // Paste an image or file from the clipboard.
  useEffect(() => {
    const onPaste = (e) => {
      const f = e.clipboardData?.files?.[0];
      if (f) {
        e.preventDefault();
        attach(f.name && f.name !== "image.png" ? f : new File([f], `${t("Pasted image {time}", { time: formatTime(Date.now()) })}.png`, { type: f.type }));
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
      flash(t("Saved as your defaults"));
      setTimeout(() => setDefaultsState("idle"), 1800);
    } catch (e) {
      setDefaultsState("idle");
      flash(t("Couldn't save defaults: {error}", { error: e.message }), "error");
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
      flash(r.cancelled ? t("Cancel requested") : r.message || t("The job had already finished"), r.cancelled ? "ok" : "muted");
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
    if (ok) flash(t("Loaded with the settings you used last time"));
  }

  const trackedEntry = useMemo(() => {
    if (!tracked) return null;
    return history.items.find((h) => h.id === tracked) || { id: tracked, status: "submitted", original_filename: flow.doc?.name };
  }, [tracked, history.items, flow.doc?.name]);

  const loaded = flow.doc?.phase === "ready";
  const printDisabled = !loaded || !flow.canPrint || !canSend || flow.printing.state === "sending" || (flow.validation.result && !flow.validation.result.valid);
  const line = docLine({ flow, printer, canSend });
  const verdict = <Verdict validation={flow.validation} settings={flow.settings} rangeError={flow.rangeError} printerReady={canSend} />;

  const drawerKey = narrow ? <IconKey label={t("Open sidebar")} icon={Menu} onClick={() => setDrawer(true)} className="bar__menu" /> : null;

  const sidebar = (
    <Sidebar
      ref={searchRef}
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
      onReprint={reprint}
      onSettings={() => {
        setView({ kind: "settings" });
        setDrawer(false);
      }}
      onLogout={session.logout}
      appearance={appearance}
      setAppearance={setAppearance}
    />
  );

  const docHead = flow.doc && (
    <div className="docmeta">
      <span className={`docmeta__glyph kind-${flow.doc.kind}`}>
        <FileGlyph kind={flow.doc.kind} size={16} />
      </span>
      <div className="docmeta__text">
        <p className="docmeta__name">{flow.doc.name}</p>
        {line && (
          <p className={`docmeta__sub ${line.quiet ? "" : `tone-${line.tone}`}`} aria-live="polite">
            {!line.quiet && <Dot tone={line.tone} pulse={line.pulse} />}
            <span>{line.sub}</span>
          </p>
        )}
      </div>
      <Button variant="quiet" className="btn--sm" onClick={browse} aria-label={t("Change file")}>
        {t("Change")}
      </Button>
      <IconKey label={t("Remove file")} icon={X} size="sm" onClick={flow.clear} />
    </div>
  );

  return (
    <div className={`app ${narrow ? "is-narrow" : ""}`} {...dragProps}>
      {narrow ? (
        <AnimatePresence>
          {drawer && (
            <>
              <motion.div
                className="scrim"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: drawerEase }}
                onClick={() => setDrawer(false)}
              />
              <motion.div
                className="drawer"
                initial={{ transform: "translateX(-100%)" }}
                animate={{ transform: "translateX(0%)" }}
                exit={{ transform: "translateX(-100%)" }}
                transition={{ duration: 0.3, ease: drawerEase }}
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
        <div className="notices" aria-live="polite">
          <AnimatePresence>
            {notice && (
              <motion.p
                key={notice.id}
                className={`notice tone-${notice.tone}`}
                role="status"
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
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
              {t("Printer options didn't load. Retry")}
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
            <motion.div key="compose" className="page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={tween}>
              <Toolbar
                lead={drawerKey}
                narrow={narrow}
                printer={printer}
                onPrinter={() => setView({ kind: "settings" })}
                flow={flow}
                choices={choices}
                disabled={!hasChoices}
                printDisabled={printDisabled}
                onPrint={print}
                onSaveDefaults={saveDefaults}
                onResetDefaults={resetToDefaults}
                defaultsState={defaultsState}
              />
              <div className="compose">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={loaded ? "loaded" : "empty"}
                    className="compose__body"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {loaded ? (
                      <PreviewStage
                        doc={flow.doc}
                        settings={flow.settings}
                        pageCount={flow.pageCount}
                        onPagesChange={(v) => flow.set("pages", v)}
                        head={docHead}
                        feedKey={flow.printing.state === "sent" ? flow.printing.result?.job_id || "sent" : null}
                        status={narrow ? null : verdict}
                      />
                    ) : (
                      <DropZone dragging={dragging} onBrowse={browse} doc={flow.doc} capabilities={capabilities} touch={narrow} />
                    )}
                  </motion.div>
                </AnimatePresence>
                <div className="compose__corner">
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
                </div>
              </div>
              {narrow && loaded && (
                <PrintDock
                  flow={flow}
                  choices={choices}
                  disabled={!hasChoices}
                  printDisabled={printDisabled}
                  onPrint={print}
                  onSaveDefaults={saveDefaults}
                  onResetDefaults={resetToDefaults}
                  defaultsState={defaultsState}
                  status={verdict}
                />
              )}
            </motion.div>
          )}
          {view.kind === "history" && (
            <motion.div key={`h-${view.id}`} className="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={tween}>
              <HistoryDetail id={view.id} history={history} onReprint={reprint} onOpenCompose={newPrint} onStatusLine={flash} lead={drawerKey} />
            </motion.div>
          )}
          {view.kind === "settings" && (
            <motion.div key="settings" className="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={tween}>
              <SettingsView
                lead={drawerKey}
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
