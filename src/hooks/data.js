import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, setUnauthorizedHandler } from "../api/client.js";
import { interpretStatus } from "../lib/printer.js";
import { supportedChoices } from "../lib/settings.js";
import { ACTIVE_STATUSES } from "../lib/format.js";

/* ---------- Session ---------- */
export function useSession() {
  const [state, setState] = useState({ status: "loading", user: null });

  useEffect(() => {
    let alive = true;
    setUnauthorizedHandler(() => setState({ status: "anon", user: null }));
    api
      .me()
      .then((r) => alive && setState({ status: "authed", user: r.user }))
      .catch((e) => alive && setState({ status: e.status === 401 ? "anon" : "error", user: null, error: e }));
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    const r = await api.login(username, password);
    setState({ status: "authed", user: r.user });
  }, []);
  const signup = useCallback(async (username, password, displayName) => {
    const r = await api.signup(username, password, displayName);
    setState({ status: "authed", user: r.user });
  }, []);
  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setState({ status: "anon", user: null });
    }
  }, []);
  const retry = useCallback(() => {
    setState({ status: "loading", user: null });
    api
      .me()
      .then((r) => setState({ status: "authed", user: r.user }))
      .catch((e) => setState({ status: e.status === 401 ? "anon" : "error", user: null, error: e }));
  }, []);

  return { ...state, login, signup, logout, retry };
}

/* ---------- Visibility-aware interval ---------- */
function useInterval(fn, ms) {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    if (!ms) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") saved.current();
    }, ms);
    return () => clearInterval(id);
  }, [ms]);
}

/* ---------- Printer status ---------- */
export function usePrinter() {
  const [raw, setRaw] = useState(null);
  const [error, setError] = useState(null);
  const [checkedAt, setCheckedAt] = useState(null);
  const inflight = useRef(false);

  const refresh = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const s = await api.status({ quiet401: true });
      setRaw(s);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      inflight.current = false;
      setCheckedAt(Date.now());
    }
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const info = useMemo(() => {
    if (error && !raw) {
      return {
        tone: "down",
        label: error.status === 0 ? "Server unreachable" : "Status unavailable",
        detail: error.message,
        ready: false,
        reasons: [],
      };
    }
    return interpretStatus(raw);
  }, [raw, error]);

  useInterval(refresh, info.ready ? 20000 : 10000);
  return { raw, info, refresh, checkedAt };
}

/* ---------- Printer options / capabilities (public, fetched once) ---------- */
export function usePrinterOptions() {
  const [options, setOptions] = useState(null);
  const [capabilities, setCapabilities] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([api.options(), api.capabilities()])
      .then(([o, c]) => {
        setOptions(o);
        setCapabilities(c);
      })
      .catch(setError);
  }, []);
  useEffect(load, [load]);

  const choices = useMemo(() => supportedChoices(options), [options]);
  return { options, capabilities, choices, error, reload: load };
}

/* ---------- History + live job state ---------- */
const PAGE = 40;

export function useHistory(enabled) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [loadingMore, setLoadingMore] = useState(false);
  const [jobs, setJobs] = useState({}); // cups job id -> JobInfo
  const countRef = useRef(PAGE);

  const refresh = useCallback(async () => {
    try {
      // The API caps limit at 100; entries beyond the first page are kept as loaded.
      const r = await api.history(Math.min(100, Math.max(PAGE, countRef.current)), 0);
      setItems((prev) => {
        const fresh = new Set(r.history.map((h) => h.id));
        return [...r.history, ...prev.filter((p) => !fresh.has(p.id))];
      });
      setTotal(r.total);
      setStatus("ready");
    } catch (e) {
      setStatus((s) => (s === "ready" ? s : "error"));
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setTotal(0);
      setStatus("idle");
      return;
    }
    setStatus("loading");
    refresh();
  }, [enabled, refresh]);

  const loadMore = useCallback(async () => {
    if (loadingMore || items.length >= total) return;
    setLoadingMore(true);
    try {
      const r = await api.history(PAGE, items.length);
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...r.history.filter((h) => !seen.has(h.id))];
      });
      setTotal(r.total);
      countRef.current = items.length + r.history.length;
    } finally {
      setLoadingMore(false);
    }
  }, [items.length, total, loadingMore]);

  const hasActive = items.some((h) => ACTIVE_STATUSES.has(h.status));

  const pollJobs = useCallback(async () => {
    try {
      const r = await api.jobs("all");
      const map = {};
      for (const j of r.jobs) map[j.job_id] = j;
      setJobs(map);
    } catch {
      /* status line covers connectivity */
    }
    refresh();
  }, [refresh]);

  // Keep trying while the first load has failed, so the list recovers on its own.
  useInterval(refresh, enabled && status === "error" ? 10000 : 0);

  useEffect(() => {
    if (enabled && hasActive) pollJobs();
  }, [enabled, hasActive, pollJobs]);
  useInterval(pollJobs, enabled && hasActive ? 5000 : 0);

  const upsert = useCallback((entry) => {
    setItems((prev) => {
      const i = prev.findIndex((p) => p.id === entry.id);
      if (i === -1) return [entry, ...prev];
      const next = prev.slice();
      next[i] = { ...prev[i], ...entry };
      return next;
    });
  }, []);

  return { items, total, status, loadingMore, loadMore, refresh, jobs, upsert, hasActive, pollJobs };
}

/* ---------- Preferences (free-form JSON on the server) ---------- */
export function usePreferences(enabled) {
  const [prefs, setPrefs] = useState(null);
  const latest = useRef({});
  const synced = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setPrefs(null);
      latest.current = {};
      synced.current = false;
      return;
    }
    api
      .preferences()
      .then((r) => {
        latest.current = r.preferences || {};
        synced.current = true;
        setPrefs(latest.current);
      })
      .catch(() => setPrefs({}));
  }, [enabled]);

  const save = useCallback(async (patch) => {
    // PUT replaces the whole object, so never save over preferences we failed to read.
    if (!synced.current) {
      const r = await api.preferences();
      latest.current = { ...(r.preferences || {}), ...latest.current };
      synced.current = true;
    }
    const next = { ...latest.current, ...patch };
    latest.current = next;
    setPrefs(next);
    const r = await api.savePreferences(next);
    latest.current = r.preferences || next;
    setPrefs(latest.current);
    return latest.current;
  }, []);

  return { prefs, save, loaded: prefs !== null };
}

/* ---------- Debounced value ---------- */
export function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/* ---------- Media query ---------- */
export function useMedia(query) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    m.addEventListener("change", on);
    on();
    return () => m.removeEventListener("change", on);
  }, [query]);
  return match;
}
