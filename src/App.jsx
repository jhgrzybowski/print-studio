import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useIsPresent, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { Tooltip } from "radix-ui";
import { Menu, RefreshCw, WifiOff, X } from "lucide-react";
import { api } from "./api/client.js";
import { useAppearance } from "./hooks/appearance.js";
import { useArchive, useHistory, useMedia, usePreferences, usePrinter, usePrinterOptions, useSession } from "./hooks/data.js";
import { usePrintFlow } from "./hooks/printFlow.js";
import { defaultsToSave, savedUpsideDown } from "./lib/settings.js";
import { formatTime } from "./lib/format.js";
import { hasRotation } from "./lib/rotate.js";
import { t, tn, useLocale } from "./i18n/index.js";
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
import { ArchiveView } from "./components/ArchiveView.jsx";
import { HomeView } from "./components/HomeView.jsx";
import { Button, Dot, IconKey, ease, glide, tween, useLiquidMetal } from "./components/controls.jsx";

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.txt,.docx,.xlsx,.pptx,.odt,.ods,.odp,application/pdf,image/png,image/jpeg,text/plain";

// Views swap like a native sidebar app: the new one arrives with a short fade and never waits on an exit.
const fadeIn = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.14, ease } };

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
      {/* The next screen fades in at once; waiting for the old one to fade out first only adds latency. */}
      <motion.div key={session.status === "authed" ? "authed" : session.status} className="root-fade" {...fadeIn}>
        {body}
      </motion.div>
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

/**
 * The phone sidebar. It tracks the finger when swiped left and closes on a short flick. The
 * scrim is driven by the same value, so it dims with the drawer's position rather than on a timer.
 */
// Matches `.drawer { width: min(320px, 86vw) }`.
const drawerWidth = () => Math.min(320, window.innerWidth * 0.86);

function Drawer({ onClose, children }) {
  const [width, setWidth] = useState(drawerWidth);
  const size = useRef(width);
  const x = useMotionValue(-width);
  const scrim = useTransform(x, (v) => Math.min(1, Math.max(0, 1 + v / size.current)));
  // A rotation changes the drawer's width, and with it how far the drawer travels to close.
  useEffect(() => {
    const fit = () => setWidth((size.current = drawerWidth()));
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const dragged = useRef(false);
  const reduce = useReducedMotion();
  // The spring's last pixels settle well after the drawer looks gone; taps meanwhile go to the app.
  const taps = useIsPresent() ? undefined : "none";
  return (
    <>
      <motion.div className="scrim" style={{ opacity: scrim, pointerEvents: taps }} onClick={onClose} />
      <motion.div
        className="drawer"
        style={{ x, pointerEvents: taps }}
        animate={{ x: 0 }}
        exit={{ x: -width }}
        // MotionConfig already skips transforms under reduced motion; saying so here keeps the drawer
        // correct on its own, as the sheet is.
        transition={reduce ? { duration: 0 } : glide}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 1, right: 0.04 }}
        onPointerDownCapture={() => (dragged.current = false)}
        onDragStart={() => (dragged.current = true)}
        onDragEnd={(_, info) => {
          const close = info.offset.x < -width * 0.3 || info.velocity.x < -400;
          // Replace the constraint's snap-back in the same frame, so a flick keeps its speed instead
          // of bouncing back for the few frames React takes to start the exit.
          const to = close ? -width : 0;
          if (reduce) x.jump(to);
          else animate(x, to, { ...glide, velocity: info.velocity.x });
          if (close) onClose();
        }}
        // A swipe that ends over a history row must not also open it.
        onClickCapture={(e) => {
          if (!dragged.current) return;
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {children}
      </motion.div>
    </>
  );
}

function Shell({ session, printer, appearance, setAppearance }) {
  const { capabilities, choices, error: optionsError, reload: reloadOptions } = usePrinterOptions();
  const history = useHistory(true);
  const prefs = usePreferences(true);
  const [view, setView] = useState({ kind: "home" });
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
      // A turnable document shows upside down as a half turn of every page; with nothing loaded,
      // an upside-down default stays as long as its orientation does.
      const upsideDown = flow.canRotate ? flow.flip : !flow.doc && savedUpsideDown(defaults) && flow.settings.orientation === defaults.orientation.slice(8);
      await prefs.save({ print_defaults: defaultsToSave(flow.settings, upsideDown) });
      setDefaultsState("saved");
      flash(t("Saved as your defaults"));
      setTimeout(() => setDefaultsState("idle"), 1800);
    } catch (e) {
      setDefaultsState("idle");
      flash(t("Couldn't save defaults: {error}", { error: e.message }), "error");
    }
  }

  function resetToDefaults() {
    flow.applyDefaults();
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

  // Stable handlers keep the memoised history rows from re-rendering on every upload tick.
  const { openExisting } = flow;
  const reprint = useCallback(
    async (entry) => {
      setTracked(null);
      goCompose();
      const ok = await openExisting(entry);
      if (ok) flash(t("Loaded with the settings you used last time"));
    },
    [goCompose, openExisting, flash],
  );
  const selectHistory = useCallback((h) => {
    setView({ kind: "history", id: h.id });
    setDrawer(false);
  }, []);
  const openSettings = useCallback(() => {
    setView({ kind: "settings" });
    setDrawer(false);
  }, []);
  const closeDrawer = useCallback(() => setDrawer(false), []);
  const openArchive = useCallback(() => {
    setView({ kind: "archive" });
    setDrawer(false);
  }, []);
  const goHome = useCallback(() => {
    setView({ kind: "home" });
    setDrawer(false);
  }, []);

  const archive = useArchive(prefs);
  const { archive: archiveId, restore: restoreId, remove: removeIds } = archive;
  // A print deleted for good doesn't stay open, whether it was just deleted or was opened before
  // preferences arrived. Its place is the archive it was deleted from.
  useEffect(() => {
    if (view.kind === "history" && archive.deleted.has(view.id)) setView({ kind: "archive" });
  }, [view, archive.deleted]);
  const archiveEntry = useCallback(
    async (entry) => {
      try {
        await archiveId(entry.id);
        flash(t("Moved to the archive"));
      } catch (e) {
        flash(t("Couldn't archive: {error}", { error: e.message }), "error");
      }
    },
    [archiveId, flash],
  );
  const restoreEntry = useCallback(
    async (entry) => {
      try {
        await restoreId(entry.id);
        flash(t("Back in your history"));
      } catch (e) {
        flash(t("Couldn't restore: {error}", { error: e.message }), "error");
      }
    },
    [restoreId, flash],
  );
  const removeEntries = useCallback(
    async (ids) => {
      try {
        await removeIds(ids);
        flash(tn(ids.length, "Deleted {n} print", "Deleted {n} prints"));
        setView((v) => (v.kind === "history" && ids.includes(v.id) ? { kind: "archive" } : v));
      } catch (e) {
        flash(t("Couldn't delete: {error}", { error: e.message }), "error");
      }
    },
    [removeIds, flash],
  );

  const trackedEntry = useMemo(() => {
    if (!tracked) return null;
    return history.items.find((h) => h.id === tracked) || { id: tracked, status: "submitted", original_filename: flow.doc?.name };
  }, [tracked, history.items, flow.doc?.name]);

  const { canRotate, rotate, rotations, unrotate, pageCount } = flow;
  const rotation = useMemo(
    () => ({
      canRotate,
      turned: hasRotation(rotations),
      rotateAll: (delta) => rotate(Array.from({ length: pageCount || 1 }, (_, i) => i + 1), delta),
      reset: unrotate,
    }),
    [canRotate, rotate, rotations, unrotate, pageCount],
  );

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
      archive={archive}
      view={view}
      drawer={narrow}
      onClose={closeDrawer}
      onHome={goHome}
      onNew={newPrint}
      onSelectHistory={selectHistory}
      onReprint={reprint}
      onArchive={archiveEntry}
      onOpenArchive={openArchive}
      onSettings={openSettings}
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
      {narrow ? <AnimatePresence>{drawer && <Drawer onClose={closeDrawer}>{sidebar}</Drawer>}</AnimatePresence> : sidebar}

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

        {view.kind === "home" && (
          <motion.div key="home" className="view" {...fadeIn}>
            <HomeView
              narrow={narrow}
              lead={drawerKey}
              printer={printer}
              onPrinter={openSettings}
              history={history}
              archive={archive}
              capabilities={capabilities}
              dragging={dragging}
              current={flow.doc?.phase === "ready" ? flow.doc : null}
              onResume={goCompose}
              onBrowse={browse}
              onOpen={selectHistory}
              onReprint={reprint}
              onOpenArchive={openArchive}
            />
          </motion.div>
        )}
        {view.kind === "compose" && (
          <motion.div key="compose" className="page" {...fadeIn}>
            <Toolbar
              lead={drawerKey}
              narrow={narrow}
              printer={printer}
              onPrinter={openSettings}
              onHome={goHome}
              flow={flow}
              choices={choices}
              disabled={!hasChoices}
              printDisabled={printDisabled}
              onPrint={print}
              onSaveDefaults={saveDefaults}
              onResetDefaults={resetToDefaults}
              defaultsState={defaultsState}
              rotation={rotation}
            />
            <div className="compose">
              <motion.div key={loaded ? "loaded" : "empty"} className="compose__body" {...fadeIn}>
                {loaded ? (
                  <PreviewStage
                    doc={flow.doc}
                    settings={flow.settings}
                    pageCount={flow.pageCount}
                    onPagesChange={(v) => flow.set("pages", v)}
                    head={docHead}
                    feedKey={flow.printing.state === "sent" ? flow.printing.result?.job_id || "sent" : null}
                    status={narrow ? null : verdict}
                    rotations={flow.rotations}
                    onRotate={canRotate ? rotate : undefined}
                  />
                ) : (
                  <DropZone dragging={dragging} onBrowse={browse} doc={flow.doc} capabilities={capabilities} touch={narrow} />
                )}
              </motion.div>
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
                rotation={rotation}
              />
            )}
          </motion.div>
        )}
        {view.kind === "history" && (
          <div key={`h-${view.id}`} className="view">
            <HistoryDetail
              id={view.id}
              history={history}
              onReprint={reprint}
              onOpenCompose={newPrint}
              onStatusLine={flash}
              lead={drawerKey}
              archived={archive.archived.has(view.id)}
              onArchive={archiveEntry}
              onRestore={restoreEntry}
              onDelete={(entry) => removeEntries([entry.id])}
            />
          </div>
        )}
        {view.kind === "archive" && (
          <motion.div key="archive" className="view" {...fadeIn}>
            <ArchiveView
              lead={drawerKey}
              archive={archive}
              history={history}
              onOpen={selectHistory}
              onReprint={reprint}
              onRestore={restoreEntry}
              onRemove={removeEntries}
            />
          </motion.div>
        )}
        {view.kind === "settings" && (
          <motion.div key="settings" className="view" {...fadeIn}>
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
      </main>
    </div>
  );
}
