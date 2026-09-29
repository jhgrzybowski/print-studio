import { motion } from "motion/react";
import { RefreshCw } from "lucide-react";
import { IconKey } from "./controls.jsx";

// Needle angle per state: the gauge reads like a pressure dial, resting low when the machine is cold.
const ANGLE = { unknown: -118, down: -118, offline: -118, warn: -35, ready: 58, busy: 96 };

export function queueLabel(raw) {
  return (raw?.queue_name || "Printer").replace(/_/g, " ");
}

export function Gauge({ tone, size = 46 }) {
  const angle = ANGLE[tone] ?? -118;
  return (
    <div className={`gauge gauge--${tone}`} style={{ "--g": `${size}px` }} aria-hidden>
      <div className="gauge__bezel" />
      <div className="gauge__face">
        <svg viewBox="0 0 40 40" className="gauge__ticks">
          {Array.from({ length: 9 }, (_, i) => {
            const a = ((-120 + i * 30) * Math.PI) / 180;
            const r1 = 15.5;
            const r2 = i % 2 ? 13.8 : 12.6;
            return (
              <line
                key={i}
                x1={20 + Math.sin(a) * r1}
                y1={20 - Math.cos(a) * r1}
                x2={20 + Math.sin(a) * r2}
                y2={20 - Math.cos(a) * r2}
                className={i >= 6 ? "is-hot" : ""}
              />
            );
          })}
        </svg>
        <motion.div
          className="gauge__needle"
          initial={false}
          animate={tone === "busy" ? { rotate: [80, 104, 88, 100, 80] } : { rotate: angle }}
          transition={
            tone === "busy"
              ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
              : { type: "spring", stiffness: 90, damping: 11, mass: 0.9 }
          }
        />
        <div className="gauge__hub" />
      </div>
    </div>
  );
}

export function PrinterCard({ printer, onOpen }) {
  const { info, raw, refresh } = printer;
  return (
    <div className={`printer-card tone-${info.tone}`}>
      <button type="button" className="printer-card__main" onClick={onOpen} aria-label={`${queueLabel(raw)}: ${info.label}. Open printer details`}>
        <Gauge tone={info.tone} />
        <span className="printer-card__text">
          <span className="printer-card__name">{queueLabel(raw)}</span>
          <span className="printer-card__state" aria-live="polite">
            <span className="led" aria-hidden />
            {info.label}
          </span>
          {info.detail && <span className="printer-card__detail">{info.detail}</span>}
        </span>
      </button>
      <IconKey label="Check printer now" icon={RefreshCw} size="sm" onClick={refresh} tipSide="right" />
    </div>
  );
}
