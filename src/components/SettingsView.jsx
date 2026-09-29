import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, LogOut, Monitor, Moon, RefreshCw, RotateCcw, Sun } from "lucide-react";
import { api } from "../api/client.js";
import { PALETTES } from "../hooks/appearance.js";
import { BASE_SETTINGS, pickDefaults, reconcile } from "../lib/settings.js";
import { formatBytes, formatDate, initials } from "../lib/format.js";
import { IconKey, Row, Segmented, Stepper, Tip, ease } from "./controls.jsx";
import { OptionRows } from "./Inspector.jsx";
import { PrinterLine } from "./PrinterStatus.jsx";

function Section({ title, tools, children, i = 0 }) {
  return (
    <motion.section className="section" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.26, delay: i * 0.04, ease }}>
      <header className="section__head">
        <h2>{title}</h2>
        {tools && <div className="section__tools">{tools}</div>}
      </header>
      {children}
    </motion.section>
  );
}

const EXT_NAMES = { "application/pdf": "PDF", "image/jpeg": "JPEG", "image/png": "PNG", "text/plain": "Text" };

export function SettingsView({ user, appearance, setAppearance, choices, prefs, printer, capabilities, onLogout }) {
  const saved = prefs.prefs?.print_defaults;
  const base = useMemo(() => reconcile({ ...BASE_SETTINGS, ...(saved || {}) }, choices), [saved, choices]);
  const [draft, setDraft] = useState(base);
  const [state, setState] = useState("idle");
  const [health, setHealth] = useState(null);

  useEffect(() => setDraft(base), [base]);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth({ status: "unreachable" }));
  }, []);

  const dirty = JSON.stringify(pickDefaults(draft)) !== JSON.stringify(pickDefaults(base));
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  async function saveDefaults() {
    setState("saving");
    try {
      await prefs.save({ print_defaults: pickDefaults(draft) });
      setState("saved");
      setTimeout(() => setState("idle"), 1600);
    } catch {
      setState("error");
    }
  }

  const raw = printer.raw;
  const formats = [
    ...(capabilities?.native_mime_types || []).map((m) => EXT_NAMES[m] || m),
    ...(capabilities?.office?.available ? capabilities.office.formats.filter((f) => f.available).map((f) => f.extension.toUpperCase()) : []),
  ];

  const facts = [
    ["Server", health ? (health.status === "ok" ? "Online" : health.status) : "Checking"],
    ["Address", raw?.network?.host],
    ["Accepts", formats.join(", ")],
    ["Max upload", capabilities && formatBytes(capabilities.max_upload_bytes)],
    ["Office", capabilities && (capabilities.office?.available ? `Up to ${capabilities.office.max_pages} pages` : "Unavailable")],
  ];

  return (
    <div className="settings">
      <div className="settings__inner">
        <h1 className="settings__title">Settings</h1>

        <Section title="Appearance" i={0}>
          <Row label="Theme">
            <Segmented
              label="Theme"
              layoutKey="settings-theme"
              iconOnly
              value={appearance.theme}
              onChange={(v) => setAppearance({ theme: v })}
              options={[
                { value: "light", label: "Light", icon: Sun },
                { value: "dark", label: "Dark", icon: Moon },
                { value: "system", label: "System", icon: Monitor },
              ]}
            />
          </Row>
          <Row label="Accent">
            <div className="swatches" role="radiogroup" aria-label="Accent">
              {PALETTES.map((p) => {
                const on = appearance.palette === p.id;
                return (
                  <Tip key={p.id} label={p.label}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={p.label}
                      className={`swatch ${on ? "is-on" : ""}`}
                      data-palette={p.id}
                      onClick={() => setAppearance({ palette: p.id })}
                    >
                      {on && <Check size={12} strokeWidth={2.2} aria-hidden />}
                    </button>
                  </Tip>
                );
              })}
            </div>
          </Row>
        </Section>

        <Section
          title="Print defaults"
          i={1}
          tools={
            <>
              {state === "error" && <span className="section__note is-error">Not saved</span>}
              <IconKey label="Factory settings" icon={RotateCcw} size="sm" onClick={() => setDraft(reconcile(BASE_SETTINGS, choices))} />
              <IconKey
                label={state === "saved" ? "Saved" : "Save defaults"}
                icon={Check}
                size="sm"
                variant="accent"
                onClick={saveDefaults}
                disabled={(!dirty && state !== "error") || state === "saving"}
              />
            </>
          }
        >
          <Row label="Copies">
            <Stepper value={draft.copies} onChange={(v) => set("copies", v)} />
          </Row>
          <OptionRows settings={draft} set={set} choices={choices} idPrefix="def" />
        </Section>

        <Section title="Printer" i={2} tools={<IconKey label="Check now" icon={RefreshCw} size="sm" onClick={printer.refresh} />}>
          <PrinterLine printer={printer} className="settings__printer" />
          {printer.info.detail && <p className="settings__detail">{printer.info.detail}</p>}
          <dl className="facts">
            {facts.map(([k, v]) => (
              <div key={k} className="facts__row">
                <dt>{k}</dt>
                <dd>{v || "–"}</dd>
              </div>
            ))}
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
                {user.username} · since {formatDate(user.created_at)}
              </p>
            </div>
            <IconKey label="Sign out" icon={LogOut} size="sm" onClick={onLogout} />
          </div>
        </Section>
      </div>
    </div>
  );
}
