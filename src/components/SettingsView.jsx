import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, CircleCheck, LogOut, Monitor, Moon, RefreshCw, Save, Sun } from "lucide-react";
import { api } from "../api/client.js";
import { PALETTES } from "../hooks/appearance.js";
import { BASE_SETTINGS, pickDefaults, reconcile } from "../lib/settings.js";
import { formatBytes, formatDate, initials } from "../lib/format.js";
import { Field, Key, Segmented } from "./controls.jsx";
import { OptionControls } from "./ToolPane.jsx";
import { Gauge, queueLabel } from "./PrinterGauge.jsx";

const section = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

function Section({ title, description, children, i = 0 }) {
  return (
    <motion.section className="card settings__section" {...section} transition={{ duration: 0.28, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}>
      <header className="settings__head">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </header>
      {children}
    </motion.section>
  );
}

const EXT_NAMES = { "application/pdf": "PDF", "image/jpeg": "JPEG", "image/png": "PNG", "text/plain": "Text" };

export function SettingsView({ user, appearance, setAppearance, choices, prefs, printer, capabilities, onLogout }) {
  const saved = prefs.prefs?.print_defaults;
  const [draft, setDraft] = useState(() => reconcile({ ...BASE_SETTINGS, ...(saved || {}) }, choices));
  const [state, setState] = useState("idle");
  const [health, setHealth] = useState(null);

  useEffect(() => {
    setDraft(reconcile({ ...BASE_SETTINGS, ...(saved || {}) }, choices));
  }, [saved, choices]);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth({ status: "unreachable" }));
  }, []);

  const dirty = useMemo(() => JSON.stringify(pickDefaults(draft)) !== JSON.stringify(pickDefaults(reconcile({ ...BASE_SETTINGS, ...(saved || {}) }, choices))), [draft, saved, choices]);

  async function saveDefaults() {
    setState("saving");
    try {
      await prefs.save({ print_defaults: pickDefaults(draft) });
      setState("saved");
      setTimeout(() => setState("idle"), 1800);
    } catch {
      setState("error");
    }
  }

  const raw = printer.raw;
  const formats = [
    ...(capabilities?.native_mime_types || []).map((m) => EXT_NAMES[m] || m),
    ...(capabilities?.office?.available ? capabilities.office.formats.filter((f) => f.available).map((f) => f.extension.toUpperCase()) : []),
  ];

  return (
    <div className="settings">
      <div className="settings__inner">
        <h1 className="view-title">Settings</h1>

        <Section title="Appearance" description="Saved in this browser, so each device can look its own way." i={0}>
          <Field label="Theme">
            <Segmented
              label="Theme"
              layoutKey="settings-theme"
              value={appearance.theme}
              onChange={(v) => setAppearance({ theme: v })}
              options={[
                { value: "light", label: "Light", icon: Sun },
                { value: "dark", label: "Dark", icon: Moon },
                { value: "system", label: "System", icon: Monitor },
              ]}
            />
          </Field>
          <Field label="Accent">
            <div className="swatches" role="radiogroup" aria-label="Accent color">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={appearance.palette === p.id}
                  className={`swatch ${appearance.palette === p.id ? "is-active" : ""}`}
                  data-palette={p.id}
                  onClick={() => setAppearance({ palette: p.id })}
                >
                  <span className="swatch__dot" aria-hidden>
                    {appearance.palette === p.id && <Check size={14} strokeWidth={2.6} />}
                  </span>
                  <span className="swatch__label">{p.label}</span>
                </button>
              ))}
            </div>
          </Field>
        </Section>

        <Section title="Print defaults" description="Every new print starts with these. They follow your account to any device." i={1}>
          <div className="settings__grid">
            <OptionControls settings={draft} set={(k, v) => setDraft((d) => ({ ...d, [k]: v }))} choices={choices} idPrefix="def" />
          </div>
          <div className="settings__actions">
            {state === "error" && <span className="field-error">Couldn't save. Try again.</span>}
            <Key variant="ghost" size="sm" onClick={() => setDraft(reconcile(BASE_SETTINGS, choices))}>
              Reset to factory
            </Key>
            <Key variant="accent" size="sm" icon={state === "saved" ? CircleCheck : Save} onClick={saveDefaults} disabled={(!dirty && state !== "error") || state === "saving"}>
              {state === "saved" ? "Saved" : "Save defaults"}
            </Key>
          </div>
        </Section>

        <Section title="Printer" description="Status comes straight from the print server on this network." i={2}>
          <div className="printer-panel">
            <Gauge tone={printer.info.tone} size={64} />
            <div className="printer-panel__text">
              <p className="printer-panel__name">{queueLabel(raw)}</p>
              <p className={`printer-panel__state tone-${printer.info.tone}`}>
                <span className="led" aria-hidden />
                {printer.info.label}
              </p>
              {printer.info.detail && <p className="printer-panel__detail">{printer.info.detail}</p>}
            </div>
            <Key variant="raised" size="sm" icon={RefreshCw} onClick={printer.refresh}>
              Check now
            </Key>
          </div>
          <dl className="facts facts--two">
            <div className="facts__row">
              <dt>Print server</dt>
              <dd>{health ? (health.status === "ok" ? "Online" : health.status) : "Checking"}</dd>
            </div>
            <div className="facts__row">
              <dt>Accepting jobs</dt>
              <dd>{raw ? (raw.accepting_jobs ? "Yes" : "No") : "–"}</dd>
            </div>
            <div className="facts__row">
              <dt>Address</dt>
              <dd>{raw?.network?.host || "–"}</dd>
            </div>
            <div className="facts__row">
              <dt>Queue</dt>
              <dd>{raw?.queue_name || "–"}</dd>
            </div>
            <div className="facts__row facts__row--wide">
              <dt>File types</dt>
              <dd>{formats.length ? formats.join(", ") : "–"}</dd>
            </div>
            <div className="facts__row">
              <dt>Largest upload</dt>
              <dd>{capabilities ? formatBytes(capabilities.max_upload_bytes) : "–"}</dd>
            </div>
            <div className="facts__row">
              <dt>Office conversion</dt>
              <dd>{capabilities ? (capabilities.office?.available ? `Up to ${capabilities.office.max_pages} pages` : "Unavailable") : "–"}</dd>
            </div>
          </dl>
        </Section>

        <Section title="Account" i={3}>
          <div className="account">
            <span className="avatar avatar--lg" aria-hidden>
              {initials(user)}
            </span>
            <div className="account__text">
              <p className="account__name">{user.display_name || user.username}</p>
              <p className="account__meta">
                Signed in as {user.username}, member since {formatDate(user.created_at)}
              </p>
            </div>
            <Key variant="raised" size="sm" icon={LogOut} onClick={onLogout}>
              Sign out
            </Key>
          </div>
        </Section>
      </div>
    </div>
  );
}
