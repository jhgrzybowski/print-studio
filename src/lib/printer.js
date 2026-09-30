import { reasonText } from "./format.js";
import { t } from "../i18n/index.js";

/**
 * Reduce the /status payload to what the UI shows.
 * tone: ready | busy | warn | offline | down | unknown
 */
export function interpretStatus(s) {
  if (!s) return { tone: "unknown", label: t("Checking printer"), detail: "", ready: false };
  const reasons = (s.reasons || []).map(reasonText).filter(Boolean);
  if (s.cups && s.cups.available === false) {
    return { tone: "down", label: t("Print service down"), detail: t("The print server isn't responding."), ready: false, reasons };
  }
  if (!s.exists) {
    return { tone: "down", label: t("Printer not set up"), detail: t("Queue {queue} is missing on the server.", { queue: s.queue_name }), ready: false, reasons };
  }
  if (s.network?.checked && s.network.reachable === false) {
    return {
      tone: "offline",
      label: t("Printer offline"),
      detail: t("Turn the printer on or check its Wi-Fi connection."),
      ready: false,
      reasons,
    };
  }
  if (s.state === "stopped" || s.enabled === false) {
    return { tone: "warn", label: t("Printer paused"), detail: reasons[0] || t("The queue is stopped."), ready: false, reasons };
  }
  if (s.accepting_jobs === false) {
    return { tone: "warn", label: t("Not accepting jobs"), detail: reasons[0] || "", ready: false, reasons };
  }
  if (!s.ready_for_print) {
    return { tone: "warn", label: t("Not ready"), detail: reasons[0] || s.message || "", ready: false, reasons };
  }
  if (s.state === "processing") {
    return { tone: "busy", label: t("printer|Printing"), detail: reasons[0] || "", ready: true, reasons };
  }
  return { tone: reasons.length ? "warn" : "ready", label: t("printer|Ready"), detail: reasons[0] || "", ready: true, reasons };
}
