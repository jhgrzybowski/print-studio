import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../api/client.js";
import { BASE_SETTINGS, fromRequested, meaningfulWarnings, reconcile, toPrintOptions } from "../lib/settings.js";
import { parseRange } from "../lib/pages.js";
import { hasRotation, rotateImage, rotatePdf, turn, withFlip } from "../lib/rotate.js";
import { fileKind, formatBytes } from "../lib/format.js";
import { useDebounced } from "./data.js";
import { t, useLocale } from "../i18n/index.js";

const OFFICE_EXT = ["docx", "xlsx", "pptx", "odt", "ods", "odp"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The document being composed: upload -> preview -> settings -> validate -> print.
 * doc.phase: uploading | converting | loading | ready | error
 */
export function usePrintFlow({ choices, defaults, maxBytes, onPrinted }) {
  const [doc, setDoc] = useState(null);
  const [settings, setSettings] = useState(BASE_SETTINGS);
  const [validation, setValidation] = useState({ state: "idle" });
  const [printing, setPrinting] = useState({ state: "idle" });
  // Clockwise turns by page number, baked into a fresh upload when printing.
  const [manual, setManual] = useState({});
  // An upside-down default or history job turns every page half way on top of the manual turns,
  // so applying a normal default later can take it back off without losing them.
  const [flip, setFlip] = useState(false);
  const uploadCtl = useRef(null);
  const turnedCtl = useRef(null);
  const seq = useRef(0);

  const hasChoices = Object.keys(choices).length > 0;

  // Leaving (signing out included) calls off whatever is still on its way to the printer.
  useEffect(
    () => () => {
      seq.current++;
      uploadCtl.current?.abort();
      turnedCtl.current?.abort();
    },
    [],
  );

  // Apply saved defaults whenever nothing is loaded yet.
  useEffect(() => {
    if (!doc && hasChoices) setSettings(reconcile({ ...BASE_SETTINGS, ...(defaults || {}) }, choices));
  }, [defaults, choices, hasChoices, doc]);

  const loadPreview = useCallback(async (file, token, text, source) => {
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
    setDoc({ phase: "ready", file, pages, text, source, name: file.original_filename, kind: fileKind(file.detected_mime, file.original_filename) });
    return pages;
  }, []);

  // Upside-down prints used to be a reverse orientation, in saved defaults and in history. A
  // document whose pages can be turned here gets them all turned half way; one whose pages can't
  // (an image from history, a PDF without a preview) keeps the reverse orientation, so it still
  // prints the way it did.
  const keepUpsideDown = useCallback(
    (orientation, file, pages, source) => {
      if (!/^reverse-/.test(orientation || "")) return;
      const count = file.page_count || pages?.length || 0;
      const turnable = !!pages?.length && count > 0 && (!!file.pdf_url || (!!source && /^image\/(png|jpeg)$/.test(file.detected_mime)));
      if (turnable) setFlip(true);
      else if (!choices.orientation?.length || choices.orientation.includes(orientation)) setSettings((s) => ({ ...s, orientation }));
    },
    [choices],
  );

  const attach = useCallback(
    async (f) => {
      if (!f) return;
      uploadCtl.current?.abort();
      const token = ++seq.current;
      const kind = fileKind(f.type, f.name);
      setPrinting({ state: "idle" });
      setValidation({ state: "idle" });
      setManual({});
      setFlip(false);
      setSettings((s) => ({ ...s, pages: "" }));

      if (maxBytes && f.size > maxBytes) {
        setDoc({
          phase: "error",
          name: f.name,
          kind,
          size: f.size,
          message: t("{name} is {size}. The limit is {limit}.", { name: f.name, size: formatBytes(f.size), limit: formatBytes(maxBytes) }),
        });
        return;
      }
      const ext = f.name.split(".").pop()?.toLowerCase();
      const isOffice = OFFICE_EXT.includes(ext);
      setDoc({ phase: "uploading", name: f.name, size: f.size, kind, progress: 0, office: isOffice });
      // The server has no preview for plain text, so the page shows the start of the file itself.
      const text =
        f.type === "text/plain" || ext === "txt"
          ? await f
              .slice(0, 24000)
              .text()
              .catch(() => undefined)
          : undefined;
      if (token !== seq.current) return;

      const ctl = new AbortController();
      uploadCtl.current = ctl;
      for (let attempt = 0; ; attempt++) {
        try {
          const file = await api.upload(f, {
            signal: ctl.signal,
            onProgress: (p) => {
              if (token !== seq.current) return;
              setDoc((d) => (d && d.phase !== "ready" ? { ...d, progress: p, phase: p >= 1 && isOffice ? "converting" : "uploading" } : d));
            },
          });
          if (token !== seq.current) return;
          setDoc((d) => ({ ...d, phase: "loading", progress: 1 }));
          const pages = await loadPreview(file, token, text, f);
          if (token === seq.current) keepUpsideDown(defaults?.orientation, file, pages, f);
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
    [loadPreview, maxBytes, keepUpsideDown, defaults],
  );

  /** Load a file that is already on the server (reprint from history). */
  const openExisting = useCallback(
    async (entry) => {
      uploadCtl.current?.abort();
      const token = ++seq.current;
      setPrinting({ state: "idle" });
      setValidation({ state: "idle" });
      setManual({});
      setFlip(false);
      setDoc({ phase: "loading", name: entry.original_filename, kind: fileKind(entry.detected_mime, entry.original_filename) });
      setSettings(reconcile({ ...BASE_SETTINGS, ...(defaults || {}), ...fromRequested(entry.requested_options) }, choices));
      try {
        const file = await api.file(entry.file_id);
        const pages = await loadPreview(file, token);
        if (token === seq.current) keepUpsideDown(entry.requested_options?.orientation || defaults?.orientation, file, pages);
        return true;
      } catch (e) {
        if (token !== seq.current) return false;
        setDoc({
          phase: "error",
          name: entry.original_filename,
          kind: fileKind(entry.detected_mime, entry.original_filename),
          message: e.status === 404 ? t("This upload has expired. Files are kept for 7 days, so attach it again to reprint.") : e.message,
        });
        return false;
      }
    },
    [choices, defaults, loadPreview, keepUpsideDown],
  );

  const clear = useCallback(() => {
    uploadCtl.current?.abort();
    seq.current++;
    setDoc(null);
    setPrinting({ state: "idle" });
    setValidation({ state: "idle" });
    setManual({});
    setFlip(false);
    setSettings(reconcile({ ...BASE_SETTINGS, ...(defaults || {}) }, choices));
  }, [choices, defaults]);

  const set = useCallback((key, value) => {
    setSettings((s) => ({ ...s, [key]: value }));
    setPrinting((p) => (p.state === "error" ? { state: "idle" } : p));
  }, []);

  const pageCount = doc?.file?.page_count || doc?.pages?.length || null;

  // PDFs (and Office files, printed as PDF) turn with pdf-lib. Images turn on a canvas, which
  // needs the original file, so an image reopened from history can't be turned.
  const canRotate = doc?.phase === "ready" && !!doc.pages?.length && (!!doc.file.pdf_url || (!!doc.source && /^image\/(png|jpeg)$/.test(doc.file.detected_mime)));
  const rotate = useCallback(
    (pages, delta) =>
      setManual((r) => {
        const next = { ...r };
        for (const p of pages) next[p] = turn((next[p] || 0) + delta);
        return next;
      }),
    [],
  );
  const unrotate = useCallback(() => {
    setManual({});
    setFlip(false);
  }, []);
  const rotations = useMemo(() => withFlip(manual, flip, pageCount), [manual, flip, pageCount]);

  const locale = useLocale();
  const rangeError = useMemo(() => {
    if (!settings.pages) return null;
    try {
      parseRange(settings.pages, pageCount);
      return null;
    } catch (e) {
      return e.message;
    }
    // locale is a dependency so the message follows the language.
  }, [settings.pages, pageCount, locale]);

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
    // Turning and uploading can take a while; if the document changes meanwhile, this print is off.
    const token = seq.current;
    let body = payload;
    if (canRotate && hasRotation(rotations)) {
      try {
        const file = await rotatedFile(doc, rotations);
        if (token !== seq.current) return;
        turnedCtl.current = new AbortController();
        const turned = await api.upload(file, { signal: turnedCtl.current.signal });
        if (token !== seq.current) return;
        body = { ...payload, file_id: turned.file_id };
      } catch (e) {
        if (token !== seq.current) return;
        setPrinting({ state: "error", error: e instanceof ApiError ? printMessage(e) : e?.code === "encrypted" ? t("This PDF is protected, so its pages can't be turned. Print it unturned.") : t("Couldn't turn the pages. Try again, or print them unturned.") });
        return;
      }
    }
    try {
      const r = await api.print(body);
      setPrinting({ state: "sent", result: r, warnings: meaningfulWarnings(r.warnings) });
      onPrinted?.(r);
    } catch (e) {
      setPrinting({ state: "error", error: printMessage(e) });
    }
  }, [payload, printing.state, onPrinted, canRotate, rotations, doc]);

  /** Put the saved defaults back, keeping the page range and manual turns; only an upside-down default turns the pages. */
  const applyDefaults = useCallback(() => {
    setSettings((s) => reconcile({ ...BASE_SETTINGS, ...(defaults || {}), pages: s.pages }, choices));
    setFlip(false);
    if (doc?.phase === "ready") keepUpsideDown(defaults?.orientation, doc.file, doc.pages, doc.source);
  }, [defaults, choices, doc, keepUpsideDown]);

  return {
    applyDefaults,
    doc,
    settings,
    set,
    setSettings,
    attach,
    openExisting,
    clear,
    pageCount,
    rangeError,
    validation,
    printing,
    setPrinting,
    print,
    canPrint: !!payload,
    rotations: canRotate ? rotations : NO_TURNS,
    flip: canRotate && flip,
    canRotate,
    rotate,
    unrotate,
  };
}

const NO_TURNS = {};

/** The file to print, with the turns baked in. */
async function rotatedFile(doc, rotations) {
  if (!doc.file.pdf_url) return rotateImage(doc.source, rotations[1] || 0);
  const res = await fetch(api.pdfUrl(doc.file.file_id), { credentials: "include" });
  if (!res.ok) throw new ApiError(res.status, null);
  const bytes = await rotatePdf(await res.arrayBuffer(), rotations);
  // An Office file prints as its PDF, and the name says so.
  const name = /\.pdf$/i.test(doc.name) ? doc.name : `${doc.name.replace(/\.[^.]+$/, "")}.pdf`;
  return new File([bytes], name, { type: "application/pdf" });
}

function uploadMessage(e, name) {
  if (e.status === 413) return t("{name} is too large to upload.", { name });
  if (e.status === 415) return t("{name} isn't a type the printer can take. Use PDF, JPEG, PNG, text, or an Office document.", { name });
  if (e.status === 503) return t("The converter is busy. Try again in a moment.");
  if (e.status === 504) return t("Converting this document took too long. Try exporting it as PDF first.");
  return e.message || t("Upload failed.");
}

function printMessage(e) {
  if (e.status === 503) return t("The printer isn't reachable. Turn it on, then print again.");
  if (e.status === 409) return e.message || t("The printer isn't ready.");
  if (e.status === 404) return t("This upload has expired. Attach the file again.");
  return e.message || t("Printing failed.");
}
