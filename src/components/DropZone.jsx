import { motion } from "motion/react";
import { CircleAlert, FolderOpen, Plus } from "lucide-react";
import { FileGlyph } from "./FileGlyph.jsx";
import { Button, ease } from "./controls.jsx";
import { useMedia } from "../hooks/data.js";
import { formatBytes } from "../lib/format.js";
import { t } from "../i18n/index.js";

/** The empty canvas: a blank sheet that lifts toward a dragged file and fills while it uploads. */
export function DropZone({ dragging, onBrowse, doc, capabilities, touch }) {
  const coarse = useMedia("(pointer: coarse)");
  // Phones can't drag a file in, so the copy asks them to choose one.
  const choose = touch || coarse;
  const busy = doc && doc.phase !== "error";
  const failed = doc?.phase === "error";
  const limit = capabilities?.max_upload_bytes ? formatBytes(capabilities.max_upload_bytes) : "50 MB";
  const office = capabilities?.office?.available !== false;
  const progress = doc?.phase === "uploading" ? Math.max(0.03, doc.progress || 0) : busy ? 1 : 0;

  let title = choose ? t("Choose a file to print") : t("Drop a file to print");
  let sub = office ? t("PDF, images, text, Office · up to {size}", { size: limit }) : t("PDF, images, text · up to {size}", { size: limit });
  if (dragging) {
    title = t("Release to add");
    sub = "";
  } else if (failed) {
    title = t("That file didn't make it");
    sub = doc.message;
  } else if (busy) {
    title = doc.name;
    sub =
      doc.phase === "uploading"
        ? t("Uploading {percent}%", { percent: Math.round((doc.progress || 0) * 100) })
        : doc.phase === "converting"
          ? t("Converting to PDF")
          : t("Preparing preview");
  }

  return (
    <div className={`blank ${dragging ? "is-dragging" : ""} ${failed ? "is-failed" : ""}`}>
      <motion.button
        type="button"
        className="blank__sheet"
        onClick={onBrowse}
        disabled={busy}
        aria-label={t("Choose a file")}
        animate={{ y: dragging ? -10 : 0, scale: dragging ? 1.03 : 1 }}
        transition={{ duration: 0.28, ease }}
      >
        <motion.span
          className={`blank__fill ${busy && doc.phase !== "uploading" ? "is-waiting" : ""}`}
          aria-hidden
          initial={false}
          animate={{ scaleY: progress }}
          transition={{ duration: 0.3, ease }}
        />
        <span className={`blank__icon ${failed ? "" : "metal"}`} aria-hidden>
          {failed ? <CircleAlert size={22} strokeWidth={1.5} /> : busy ? <FileGlyph kind={doc.kind} size={22} /> : <Plus size={22} strokeWidth={1.5} />}
        </span>
      </motion.button>
      <div className="blank__copy">
        <h1 className={`blank__title ${busy && !dragging ? "blank__title--file" : ""}`} title={busy ? doc.name : undefined}>
          {title}
        </h1>
        {sub && (
          <p className={`blank__sub ${failed ? "is-error" : ""}`} role={failed ? "alert" : undefined} aria-live={busy ? "polite" : undefined}>
            {sub}
          </p>
        )}
      </div>
      {!busy && !dragging && (
        <Button variant={failed ? "raised" : "metal"} className="blank__cta" onClick={onBrowse}>
          <FolderOpen size={16} strokeWidth={1.6} aria-hidden />
          {failed ? t("Choose another file") : t("Choose file")}
        </Button>
      )}
    </div>
  );
}
