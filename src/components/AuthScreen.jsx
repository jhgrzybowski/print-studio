import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Eye, EyeOff, IdCard, KeyRound, User } from "lucide-react";
import { ease, tween } from "./controls.jsx";
import { Mark } from "./glyphs.jsx";
import { PrinterLine } from "./PrinterStatus.jsx";

// First visit only: the pieces arrive in reading order, 50 ms apart.
const rise = (i) => ({
  initial: { opacity: 0, y: 10, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.5, delay: 0.08 + i * 0.05, ease },
});

const swap = {
  initial: { opacity: 0, y: 6, filter: "blur(3px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -6, filter: "blur(3px)" },
  transition: { duration: 0.2, ease },
};

export function AuthScreen({ session, printer }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", password: "", display_name: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const userRef = useRef(null);
  const passRef = useRef(null);
  const signup = mode === "signup";

  useEffect(() => {
    // Phones would throw the keyboard over the page before anyone asked for it.
    if (window.matchMedia("(pointer: fine)").matches) userRef.current?.focus();
  }, [mode]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setError(null);
  };

  // An error names the field it is about, so that field is marked and takes focus.
  function fail(text, field) {
    setError({ text, field });
    if (field === "password") passRef.current?.focus();
    else if (field) userRef.current?.focus();
  }
  const invalid = (f) => error?.field === f || error?.field === "both" || undefined;

  async function submit(e) {
    e.preventDefault();
    if (!form.username.trim()) return fail(form.password ? "Enter your username." : "Enter a username and password.", form.password ? "username" : "both");
    if (!form.password) return fail("Enter your password.", "password");
    if (signup && form.password.length < 8) return fail("Use at least 8 characters for the password.", "password");
    setBusy(true);
    setError(null);
    try {
      if (signup) await session.signup(form.username.trim(), form.password, form.display_name.trim());
      else await session.login(form.username.trim(), form.password);
    } catch (err) {
      if (err.status === 401) fail("Wrong username or password.", "password");
      else if (err.status === 409) fail("That username is taken.", "username");
      else fail(err.message);
      setBusy(false);
    }
  }

  const cta = busy ? (signup ? "Creating" : "Signing in") : signup ? "Create account" : "Sign in";

  return (
    <div className="auth">
      <div className="auth__inner">
        <motion.div className="auth__mark" {...rise(0)}>
          <Mark size={64} />
        </motion.div>

        <motion.div className="auth__head" {...rise(1)}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.h1 key={mode} className="auth__title" {...swap}>
              {signup ? "Make an account" : "Print Studio"}
            </motion.h1>
          </AnimatePresence>
          <p className="auth__sub">{signup ? "Pick a username and a password." : "Sign in to print on the home printer."}</p>
        </motion.div>

        <motion.form className="auth__form" onSubmit={submit} noValidate {...rise(2)}>
          <div className="auth__field">
            <User className="auth__icon" size={16} strokeWidth={1.5} aria-hidden />
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
              aria-invalid={invalid("username")}
              aria-describedby={invalid("username") ? "auth-error" : undefined}
              value={form.username}
              onChange={set("username")}
            />
          </div>

          <AnimatePresence initial={false}>
            {signup && (
              <motion.div className="collapse" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={tween}>
                <div className="auth__field auth__field--gap">
                  <IdCard className="auth__icon" size={16} strokeWidth={1.5} aria-hidden />
                  <label className="sr-only" htmlFor="auth-name">
                    Display name, optional
                  </label>
                  <input
                    id="auth-name"
                    className="input input--lg"
                    placeholder="Display name (optional)"
                    autoComplete="nickname"
                    value={form.display_name}
                    onChange={set("display_name")}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="auth__field">
            <KeyRound className="auth__icon" size={16} strokeWidth={1.5} aria-hidden />
            <label className="sr-only" htmlFor="auth-pass">
              Password
            </label>
            <input
              id="auth-pass"
              ref={passRef}
              aria-invalid={invalid("password")}
              aria-describedby={invalid("password") ? "auth-error" : undefined}
              className="input input--lg"
              type={show ? "text" : "password"}
              placeholder={signup ? "Password, 8+ characters" : "Password"}
              autoComplete={signup ? "new-password" : "current-password"}
              value={form.password}
              onChange={set("password")}
            />
            <button type="button" className="auth__reveal" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((s) => !s)}>
              {show ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
            </button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                id="auth-error"
                className="auth__error"
                role="alert"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={tween}
              >
                {error.text}
              </motion.p>
            )}
          </AnimatePresence>

          <button type="submit" className={`print metal auth__submit ${busy ? "is-sending" : ""}`} disabled={busy}>
            <span className="print__fill" aria-hidden />
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={cta} className="print__label" {...swap}>
                {cta}
                {!busy && <ArrowRight size={16} strokeWidth={1.6} aria-hidden />}
              </motion.span>
            </AnimatePresence>
          </button>
        </motion.form>

        <motion.button
          type="button"
          className="auth__switch"
          onClick={() => {
            setMode(signup ? "login" : "signup");
            setError(null);
          }}
          {...rise(3)}
        >
          {signup ? "I already have an account" : "New here? Make an account"}
        </motion.button>
      </div>

      <motion.div className="auth__foot" {...rise(4)}>
        <PrinterLine printer={printer} className="auth__printer" />
      </motion.div>
    </div>
  );
}
