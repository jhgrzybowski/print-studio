import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../api/client.js";
import { BASE_SETTINGS, fromRequested, reconcile, toPrintOptions } from "../lib/settings.js";
import { parseRange } from "../lib/pages.js";
import { fileKind, formatBytes } from "../lib/format.js";
import { useDebounced } from "./data.js";

const OFFICE_EXT = ["docx", "xlsx", "pptx", "odt", "ods", "odp"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Warnings the backend emits for every mapped option; they add noise, not information.
const NOISE = [/^Mapped .* through detected PPD/i, /^Ignored fit_to_page/i, /collate/i, /preserve the user-specified page order/i];
export const meaningfulWarnings = (list = []) => list.filter((w) => !NOISE.some((re) => re.test(w)));

/**
 * The document being composed: upload -> preview -> settings -> validate -> print.
 * doc.phase: uploading | converting | loading | ready | error
 */
export function usePrintFlow({ choices, defaults, maxBytes, onPrinted }) {
  const [doc, setDoc] = useState(null);
  const [settings, setSettings] = useState(BASE_SETTINGS);
  const [validation, setValidation] = useState({ state: "idle" });
  const [printing, setPrinting] = useState({ state: "idle" });
  const uploadCtl = useRef(null);
  const seq = useRef(0);

  const hasChoices = Object.keys(choices).length > 0;

  // Apply saved defaults whenever nothing is loaded yet.
  useEffect(() => {
    if (!doc && hasChoices) setSettings(reconcile({ ...BASE_SETTINGS, ...(defaults || {}) }, choices));
  }, [defaults, choices, hasChoices, doc]);

  const loadPreview = useCallback(async (file, token) => {
    let pages = [];
    if (file.preview_available !== false) {
      try {
        const p = await api.preview(file.file_id);
        pages = p.pages || [];
      } catch {
        pages = [];
      }
    }
    if (token !== seq.current) return;
    setDoc({ phase: "ready", file, pages, name: file.original_filename, kind: fileKind(file.detected_mime, file.original_filename) });
  }, []);

  const attach = useCallback(
    async (f) => {
      if (!f) return;
      uploadCtl.current?.abort();
      const token = ++seq.current;
      const kind = fileKind(f.type, f.name);
      setPrinting({ state: "idle" });
      setValidation({ state: "idle" });
      setSettings((s) => ({ ...s, pages: "" }));

      if (maxBytes && f.size > maxBytes) {
        setDoc({ phase: "error", name: f.name, kind, size: f.size, message: `${f.name} is ${formatBytes(f.size)}. The limit is ${formatBytes(maxBytes)}.` });
        return;
      }
      const ext = f.name.split(".").pop()?.toLowerCase();
      const isOffice = OFFICE_EXT.includes(ext);
      setDoc({ phase: "uploading", name: f.name, size: f.size, kind, progress: 0, office: isOffice });

      const ctl = new AbortController();
      uploadCtl.current = ctl;
      for (let attempt = 0; ; attempt++) {
        try {
          const file = await api.upload(f, {
            signal: ctl.signal,
            onProgress: (p) => {
              if (token !== seq.current) return;
              setDoc((d) =>
                d && d.phase !== "ready"
                  ? { ...d, progress: p, phase: p >= 1 && isOffice ? "converting" : "uploading" }
                  : d,
              );
            },
          });
          if (token !== seq.current) return;
          setDoc((d) => ({ ...d, phase: "loading", progress: 1 }));
          await loadPreview(file, token);
          return;
        } catch (e) {
          if (token !== seq.current || e.name === "AbortError") return;
          if (e instanceof ApiError && e.status === 503 && attempt < 3) {
            setDoc((d) => ({ ...d, phase: "converting", retry: attempt + 1 }));
            await sleep(1500 * (attempt + 1));
            if (token !== seq.current) return;
            continue;
          }
          setDoc({ phase: "error", name: f.name, kind, size: f.size, message: uploadMessage(e, f.name) });
          return;
        }
      }
    },
    [loadPreview, maxBytes],
  );

  /** Load a file that is already on the server (reprint from history). */
  const openExisting = useCallback(
    async (entry) => {
      uploadCtl.current?.abort();
      const token = ++seq.current;
      setPrinting({ state: "idle" });
      setValidation({ state: "idle" });
      setDoc({ phase: "loading", name: entry.original_filename, kind: fileKind(entry.detected_mime, entry.original_filename) });
      setSettings(reconcile({ ...BASE_SETTINGS, ...(defaults || {}), ...fromRequested(entry.requested_options) }, choices));
      try {
        const file = await api.file(entry.file_id);
        await loadPreview(file, token);
        return true;
      } catch (e) {
        if (token !== seq.current) return false;
        setDoc({
          phase: "error",
          name: entry.original_filename,
          kind: fileKind(entry.detected_mime, entry.original_filename),
          message:
            e.status === 404
              ? "This upload has expired. Files are kept for 7 days, so attach it again to reprint."
              : e.message,
        });
        return false;
      }
    },
    [choices, defaults, loadPreview],
  );

  const clear = useCallback(() => {
    uploadCtl.current?.abort();
    seq.current++;
    setDoc(null);
    setPrinting({ state: "idle" });
    setValidation({ state: "idle" });
    setSettings(reconcile({ ...BASE_SETTINGS, ...(defaults || {}) }, choices));
  }, [choices, defaults]);

  const set = useCallback((key, value) => {
    setSettings((s) => ({ ...s, [key]: value }));
    setPrinting((p) => (p.state === "error" ? { state: "idle" } : p));
  }, []);

  const pageCount = doc?.file?.page_count || doc?.pages?.length || null;

  const rangeError = useMemo(() => {
    if (!settings.pages) return null;
    try {
      parseRange(settings.pages, pageCount);
      return null;
    } catch (e) {
      return e.message;
    }
  }, [settings.pages, pageCount]);

  const payload = useMemo(() => {
    if (doc?.phase !== "ready" || rangeError) return null;
    return { file_id: doc.file.file_id, options: toPrintOptions(settings, choices), strict_options: false };
  }, [doc, settings, choices, rangeError]);

  // Dry-run every settled change so the pane can say exactly what will print.
  const debounced = useDebounced(payload, 380);
  useEffect(() => {
    if (!debounced) {
      setValidation({ state: "idle" });
      return;
    }
    const ctl = new AbortController();
    setValidation((v) => ({ ...v, state: "checking" }));
    api
      .validate(debounced, { signal: ctl.signal })
      .then((r) => setValidation({ state: "done", result: r, warnings: meaningfulWarnings(r.warnings) }))
      .catch((e) => {
        if (e.name !== "AbortError") setValidation({ state: "error", error: e.message });
      });
    return () => ctl.abort();
  }, [debounced]);

  const print = useCallback(async () => {
    if (!payload || printing.state === "sending") return;
    setPrinting({ state: "sending" });
    try {
      const r = await api.print(payload);
      setPrinting({ state: "sent", result: r, warnings: meaningfulWarnings(r.warnings) });
      onPrinted?.(r);
    } catch (e) {
      setPrinting({ state: "error", error: printMessage(e) });
    }
  }, [payload, printing.state, onPrinted]);

  return { doc, settings, set, setSettings, attach, openExisting, clear, pageCount, rangeError, validation, printing, setPrinting, print, canPrint: !!payload };
}

function uploadMessage(e, name) {
  if (e.status === 413) return `${name} is too large to upload.`;
  if (e.status === 415) return `${name} isn't a type the printer can take. Use PDF, JPEG, PNG, text, or an Office document.`;
  if (e.status === 503) return "The converter is busy. Try again in a moment.";
  if (e.status === 504) return "Converting this document took too long. Try exporting it as PDF first.";
  return e.message || "Upload failed.";
}

function printMessage(e) {
  if (e.status === 503) return "The printer isn't reachable. Turn it on, then print again.";
  if (e.status === 409) return e.message || "The printer isn't ready.";
  if (e.status === 404) return "This upload has expired. Attach the file again.";
  return e.message || "Printing failed.";
}
