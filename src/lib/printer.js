import { reasonText } from "./format.js";

/**
 * Reduce the /status payload to what the UI shows.
 * tone: ready | busy | warn | offline | down | unknown
 */
export function interpretStatus(s) {
  if (!s) return { tone: "unknown", label: "Checking printer", detail: "", ready: false };
  const reasons = (s.reasons || []).map(reasonText).filter(Boolean);
  if (s.cups && s.cups.available === false) {
    return { tone: "down", label: "Print service down", detail: "The print server isn't responding.", ready: false, reasons };
  }
  if (!s.exists) {
    return { tone: "down", label: "Printer not set up", detail: `Queue ${s.queue_name} is missing on the server.`, ready: false, reasons };
  }
  if (s.network?.checked && s.network.reachable === false) {
    return {
      tone: "offline",
      label: "Printer offline",
      detail: "Turn the printer on or check its Wi-Fi connection.",
      ready: false,
      reasons,
    };
  }
  if (s.state === "stopped" || s.enabled === false) {
    return { tone: "warn", label: "Printer paused", detail: reasons[0] || "The queue is stopped.", ready: false, reasons };
  }
  if (s.accepting_jobs === false) {
    return { tone: "warn", label: "Not accepting jobs", detail: reasons[0] || "", ready: false, reasons };
  }
  if (!s.ready_for_print) {
    return { tone: "warn", label: "Not ready", detail: reasons[0] || s.message || "", ready: false, reasons };
  }
  if (s.state === "processing") {
    return { tone: "busy", label: "Printing", detail: reasons[0] || "", ready: true, reasons };
  }
  return { tone: reasons.length ? "warn" : "ready", label: "Ready", detail: reasons[0] || "", ready: true, reasons };
}
