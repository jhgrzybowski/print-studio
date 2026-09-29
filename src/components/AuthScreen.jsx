import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Key, Segmented } from "./controls.jsx";
import { Wordmark } from "./Sidebar.jsx";
import { Gauge, queueLabel } from "./PrinterGauge.jsx";

export function AuthScreen({ session, printer }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", password: "", display_name: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const userRef = useRef(null);

  useEffect(() => {
    userRef.current?.focus();
  }, [mode]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setError(null);
  };

  const pwShort = mode === "signup" && form.password.length > 0 && form.password.length < 8;

  async function submit(e) {
    e.preventDefault();
    if (!form.username.trim() || !form.password) {
      setError("Enter a username and password.");
      return;
    }
    if (mode === "signup" && form.password.length < 8) {
      setError("Use at least 8 characters for the password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") await session.login(form.username.trim(), form.password);
      else await session.signup(form.username.trim(), form.password, form.display_name.trim());
    } catch (err) {
      if (err.status === 401) setError("That username and password don't match.");
      else if (err.status === 409) setError("That username is taken. Pick another or sign in.");
      else setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <motion.div
        className="auth__card card"
        initial={{ opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
      >
        <Wordmark />
        <div className="auth__intro">
          <h1>{mode === "login" ? "Sign in to print" : "Create your account"}</h1>
          <p>{mode === "login" ? "Your history and saved settings are waiting." : "One account per person keeps each history private."}</p>
        </div>

        <Segmented
          label="Account"
          layoutKey="auth-mode"
          value={mode}
          onChange={(m) => {
            setMode(m);
            setError(null);
          }}
          options={[
            { value: "login", label: "Sign in" },
            { value: "signup", label: "Create account" },
          ]}
        />

        <form className="auth__form" onSubmit={submit} noValidate>
          <label className="auth__field">
            <span className="field__label">Username</span>
            <input
              ref={userRef}
              className="input"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={form.username}
              onChange={set("username")}
            />
          </label>

          <AnimatePresence initial={false}>
            {mode === "signup" && (
              <motion.label
                className="auth__field collapse"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="collapse__inner auth__field">
                  <span className="field__label">
                    Display name <span className="field__hint">optional</span>
                  </span>
                  <input className="input" autoComplete="nickname" value={form.display_name} onChange={set("display_name")} />
                </span>
              </motion.label>
            )}
          </AnimatePresence>

          <label className="auth__field">
            <span className="field__label">Password</span>
            <span className="input-wrap">
              <input
                className="input"
                type={show ? "text" : "password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={form.password}
                onChange={set("password")}
                aria-invalid={pwShort || undefined}
              />
              <button type="button" className="input-wrap__btn" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((s) => !s)}>
                {show ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
              </button>
            </span>
            {mode === "signup" && <span className={`field__hint ${pwShort ? "is-error" : ""}`}>At least 8 characters</span>}
          </label>

          <AnimatePresence>
            {error && (
              <motion.p className="field-error" role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <Key type="submit" variant="accent" size="lg" className="auth__submit" busy={busy} disabled={busy}>
            {busy ? (mode === "login" ? "Signing in" : "Creating account") : mode === "login" ? "Sign in" : "Create account"}
            <ArrowRight size={17} strokeWidth={1.9} aria-hidden />
          </Key>
        </form>
      </motion.div>

      <p className={`auth__printer tone-${printer.info.tone}`}>
        <Gauge tone={printer.info.tone} size={30} />
        <span>
          {queueLabel(printer.raw)}: {printer.info.label}
        </span>
      </p>
    </div>
  );
}
