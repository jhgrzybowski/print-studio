import { motion } from "motion/react";
import { FileUp } from "lucide-react";
import { FileGlyph } from "./FileGlyph.jsx";
import { Key } from "./controls.jsx";
import { formatBytes } from "../lib/format.js";

const ease = [0.22, 1, 0.36, 1];

/** The folder instrument: closed at rest, the front flap tips open while a file hovers over the page. */
export function DropZone({ dragging, onBrowse, doc, capabilities, onRetry }) {
  const busy = doc && doc.phase !== "error";
  const open = dragging || busy;
  const chipName = doc?.name || (dragging ? "Release to upload" : "Quarterly report.pdf");
  const limit = capabilities?.max_upload_bytes ? formatBytes(capabilities.max_upload_bytes) : "50 MB";
  const office = capabilities?.office?.available !== false;

  let caption;
  if (doc?.phase === "uploading") caption = `Uploading ${Math.round((doc.progress || 0) * 100)}%`;
  else if (doc?.phase === "converting") caption = doc.retry ? "Converter busy, retrying" : "Converting to PDF";
  else if (doc?.phase === "loading") caption = "Preparing preview";

  return (
    <div className={`dropzone ${open ? "is-open" : ""} ${dragging ? "is-dragging" : ""}`}>
      <button type="button" className="folder" onClick={onBrowse} disabled={busy} aria-label="Choose a file to print">
        <span className="folder__back" aria-hidden />
        <motion.span
          className="folder__sheet folder__sheet--b"
          aria-hidden
          animate={{ y: open ? -26 : -8, rotate: open ? -6 : -3 }}
          transition={{ duration: 0.36, ease }}
        />
        <motion.span
          className="folder__sheet"
          aria-hidden
          animate={{ y: open ? -38 : -14, rotate: open ? 4 : 2 }}
          transition={{ duration: 0.36, ease }}
        />
        <motion.span
          className="folder__front"
          aria-hidden
          animate={{ rotateX: open ? -28 : 0, y: open ? 6 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
        >
          <FileUp size={22} strokeWidth={1.6} />
        </motion.span>
        <motion.span
          className={`glass-chip ${doc ? "is-real" : ""}`}
          aria-hidden
          initial={false}
          animate={{
            x: open ? 0 : 44,
            y: open ? -8 : 34,
            rotate: open ? -2 : 6,
            scale: dragging ? 1.04 : 1,
          }}
          transition={{ type: "spring", stiffness: 240, damping: 24 }}
        >
          <span className="glass-chip__icon">
            <FileGlyph kind={doc?.kind || "pdf"} size={15} />
          </span>
          <span className="glass-chip__name">{chipName}</span>
          {busy && (
            <span className="glass-chip__bar">
              <motion.span
                className={`glass-chip__fill ${doc.phase !== "uploading" ? "is-indeterminate" : ""}`}
                animate={{ scaleX: doc.phase === "uploading" ? Math.max(0.04, doc.progress || 0) : 1 }}
                transition={{ duration: 0.2 }}
              />
            </span>
          )}
        </motion.span>
      </button>

      <div className="dropzone__copy">
        {doc?.phase === "error" ? (
          <>
            <h1 className="dropzone__title">That file didn't make it</h1>
            <p className="dropzone__text dropzone__text--error" role="alert">
              {doc.message}
            </p>
            <div className="dropzone__actions">
              <Key variant="accent" icon={FileUp} onClick={onBrowse}>
                Choose another file
              </Key>
              {onRetry && (
                <Key variant="ghost" onClick={onRetry}>
                  Dismiss
                </Key>
              )}
            </div>
          </>
        ) : caption ? (
          <>
            <h1 className="dropzone__title">{doc.name}</h1>
            <p className="dropzone__text" aria-live="polite">
              {caption}
            </p>
          </>
        ) : (
          <>
            <h1 className="dropzone__title">{dragging ? "Drop it in" : "Drop a file to print"}</h1>
            <p className="dropzone__text">
              PDF, photos and text{office ? ", plus Word, Excel and PowerPoint" : ""}. <span className="nowrap">Up to {limit}.</span>
            </p>
            <div className="dropzone__actions">
              <Key variant="raised" icon={FileUp} onClick={onBrowse}>
                Choose file
              </Key>
              <span className="dropzone__hint">or paste an image</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
