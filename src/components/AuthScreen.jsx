import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Eye, EyeOff } from "lucide-react";
import { Button, ease, tween } from "./controls.jsx";
import { Mark } from "./glyphs.jsx";
import { PrinterLine } from "./PrinterStatus.jsx";

export function AuthScreen({ session, printer }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", password: "", display_name: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const userRef = useRef(null);
  const signup = mode === "signup";

  useEffect(() => {
    userRef.current?.focus();
  }, [mode]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setError(null);
  };

  async function submit(e) {
    e.preventDefault();
    if (!form.username.trim() || !form.password) {
      setError("Enter a username and password.");
      return;
    }
    if (signup && form.password.length < 8) {
      setError("Use at least 8 characters for the password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (signup) await session.signup(form.username.trim(), form.password, form.display_name.trim());
      else await session.login(form.username.trim(), form.password);
    } catch (err) {
      if (err.status === 401) setError("Wrong username or password.");
      else if (err.status === 409) setError("That username is taken.");
      else setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <motion.div className="auth__inner" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
        <Mark size={44} />
        <h1 className="auth__title">{signup ? "New account" : "Print Studio"}</h1>

        <form className="auth__form" onSubmit={submit} noValidate>
          <label className="sr-only" htmlFor="auth-user">
            Username
          </label>
          <input
            id="auth-user"
            ref={userRef}
            className="input input--lg"
            placeholder="Username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={form.username}
            onChange={set("username")}
          />

          <AnimatePresence initial={false}>
            {signup && (
              <motion.div className="collapse" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={tween}>
                <label className="sr-only" htmlFor="auth-name">
                  Display name, optional
                </label>
                <input id="auth-name" className="input input--lg" placeholder="Display name (optional)" autoComplete="nickname" value={form.display_name} onChange={set("display_name")} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="input-wrap">
            <label className="sr-only" htmlFor="auth-pass">
              Password
            </label>
            <input
              id="auth-pass"
              className="input input--lg"
              type={show ? "text" : "password"}
              placeholder={signup ? "Password, 8+ characters" : "Password"}
              autoComplete={signup ? "new-password" : "current-password"}
              value={form.password}
              onChange={set("password")}
            />
            <button type="button" className="input-wrap__btn" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((s) => !s)}>
              {show ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
            </button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p className="auth__error" role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={tween}>
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <Button type="submit" variant="accent" className="auth__submit" busy={busy} disabled={busy}>
            {busy ? (signup ? "Creating" : "Signing in") : signup ? "Create account" : "Sign in"}
          </Button>
        </form>

        <button
          type="button"
          className="auth__switch"
          onClick={() => {
            setMode(signup ? "login" : "signup");
            setError(null);
          }}
        >
          {signup ? "I have an account" : "Create an account"}
        </button>
      </motion.div>

      <PrinterLine printer={printer} className="auth__printer" />
    </div>
  );
}
