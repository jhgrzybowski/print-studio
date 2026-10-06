import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, LogOut, Monitor, Moon, RefreshCw, Sun } from "lucide-react";
import { api } from "../api/client.js";
import { PALETTES } from "../hooks/appearance.js";
import { BASE_SETTINGS, defaultsToSave, pickDefaults, reconcile, savedUpsideDown } from "../lib/settings.js";
import { formatBytes, formatDate } from "../lib/format.js";
import { Button, IconKey, Row, Segmented, Stepper, Tip, ease } from "./controls.jsx";
import { OptionRows } from "./Options.jsx";
import { PrinterLine } from "./PrinterStatus.jsx";
import { Avatar } from "./Sidebar.jsx";
import { setLocalePref, t, tn, useLocalePref } from "../i18n/index.js";

function Section({ title, tools, children, i = 0 }) {
  return (
    <motion.section className="section" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.025, ease }}>
      <header className="section__head">
        <h2>{title}</h2>
        {tools && <div className="section__tools">{tools}</div>}
      </header>
      {children}
    </motion.section>
  );
}

const EXT_NAMES = { "application/pdf": "PDF", "image/jpeg": "JPEG", "image/png": "PNG", "text/plain": "Text" }; // shown through t()

export function SettingsView({ user, appearance, setAppearance, choices, prefs, printer, capabilities, onLogout, lead }) {
  const saved = prefs.prefs?.print_defaults;
  const base = useMemo(() => reconcile({ ...BASE_SETTINGS, ...(saved || {}) }, choices), [saved, choices]);
  const [draft, setDraft] = useState(base);
  // An old upside-down default has no control here; it stays until the orientation is changed or reset.
  const [upsideDown, setUpsideDown] = useState(savedUpsideDown(saved));
  const [state, setState] = useState("idle");
  const [health, setHealth] = useState(null);
  const localePref = useLocalePref();

  useEffect(() => {
    setDraft(base);
    setUpsideDown(savedUpsideDown(saved));
  }, [base, saved]);

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch(() => setHealth({ status: "unreachable" }));
  }, []);

  const dirty = JSON.stringify(pickDefaults(draft)) !== JSON.stringify(pickDefaults(base)) || upsideDown !== savedUpsideDown(saved);
  const set = (k, v) => {
    if (k === "orientation") setUpsideDown(false);
    setDraft((d) => ({ ...d, [k]: v }));
  };

  async function saveDefaults() {
    setState("saving");
    try {
      await prefs.save({ print_defaults: defaultsToSave(draft, upsideDown) });
      setState("saved");
      setTimeout(() => setState("idle"), 1600);
    } catch {
      setState("error");
    }
  }

  const raw = printer.raw;
  const formats = [
    ...(capabilities?.native_mime_types || []).map((m) => (EXT_NAMES[m] ? t(EXT_NAMES[m]) : m)),
    ...(capabilities?.office?.available ? capabilities.office.formats.filter((f) => f.available).map((f) => f.extension.toUpperCase()) : []),
  ];

  const facts = [
    [t("Server"), health ? (health.status === "ok" ? t("Online") : health.status) : t("Checking")],
    [t("Address"), raw?.network?.host],
    [t("Accepts"), formats.join(", ")],
    [t("Max upload"), capabilities && formatBytes(capabilities.max_upload_bytes)],
    [t("Office"), capabilities && (capabilities.office?.available ? tn(capabilities.office.max_pages, "Up to {n} page", "Up to {n} pages") : t("Unavailable"))],
  ];

  return (
    <div className="page">
      <div className="bar">
        {lead}
        <h1 className="bar__title bar__title--lg">{t("Settings")}</h1>
      </div>
      <div className="settings">
        <div className="settings__inner">
          <Section title={t("Appearance")} i={0}>
            <Row label={t("Theme")}>
              <Segmented
                label={t("Theme")}
                layoutKey="settings-theme"
                value={appearance.theme}
                onChange={(v) => setAppearance({ theme: v })}
                options={[
                  { value: "light", label: t("Light"), icon: Sun },
                  { value: "dark", label: t("Dark"), icon: Moon },
                  { value: "system", label: t("System"), icon: Monitor },
                ]}
              />
            </Row>
            <Row label={t("Language")}>
              {/* Language names stay in their own language so anyone can find theirs. */}
              <Segmented
                label={t("Language")}
                layoutKey="settings-language"
                value={localePref}
                onChange={setLocalePref}
                options={[
                  { value: "system", label: t("System"), icon: Monitor },
                  { value: "en", label: "English" },
                  { value: "pl", label: "Polski" },
                ]}
              />
            </Row>
            <Row label={t("Accent")}>
              <div className="swatches" role="radiogroup" aria-label={t("Accent")}>
                {PALETTES.map((p) => {
                  const on = appearance.palette === p.id;
                  return (
                    <Tip key={p.id} label={t(p.label)}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-label={t(p.label)}
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
            title={t("Print defaults")}
            i={1}
            tools={
              <>
                {state === "error" && <span className="section__note is-error">{t("Not saved")}</span>}
                <Button variant="quiet" className="btn--sm" onClick={() => {
                    setDraft(reconcile(BASE_SETTINGS, choices));
                    setUpsideDown(false);
                  }}>
                  {t("Reset")}
                </Button>
                <Button
                  variant={dirty || state === "error" ? "raised" : "quiet"}
                  className="btn--sm"
                  onClick={saveDefaults}
                  disabled={(!dirty && state !== "error") || state === "saving"}
                >
                  {state === "saved" && <Check size={14} strokeWidth={2} aria-hidden />}
                  {state === "saved" ? t("Saved") : state === "saving" ? t("Saving") : t("Save")}
                </Button>
              </>
            }
          >
            <Row label={t("Copies")}>
              <Stepper label={t("Copies")} decLabel={t("Fewer copies")} incLabel={t("More copies")} value={draft.copies} onChange={(v) => set("copies", v)} />
            </Row>
            <OptionRows settings={draft} set={set} choices={choices} idPrefix="def" />
          </Section>

          <Section title={t("Printer")} i={2} tools={<IconKey label={t("Check now")} icon={RefreshCw} size="sm" onClick={printer.refresh} />}>
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

          <Section title={t("Account")} i={3}>
            <div className="account">
              <Avatar user={user} size="lg" />
              <div className="account__text">
                <p className="account__name">{user.display_name || user.username}</p>
                <p className="account__meta">{t("{username} · since {date}", { username: user.username, date: formatDate(user.created_at) })}</p>
              </div>
              <Button variant="quiet" className="btn--sm" onClick={onLogout}>
                <LogOut size={14} strokeWidth={1.6} aria-hidden />
                {t("Sign out")}
              </Button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
