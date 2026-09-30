// Interface language. English strings are the keys; other languages map them
// in their own dictionary. A key may carry a context prefix ("job|Printing")
// when one English word needs different translations; the text after the
// last "|" is the English fallback.
import { useSyncExternalStore } from "react";
import pl from "./pl.js";

const KEY = "ps.locale";
export const LOCALES = ["en", "pl"];
const DICTS = { pl };

const hasDom = typeof window !== "undefined";

function readPref() {
  if (!hasDom) return "system";
  try {
    const v = localStorage.getItem(KEY);
    return v === "en" || v === "pl" ? v : "system";
  } catch {
    return "system";
  }
}

function resolve(pref) {
  if (pref !== "system") return pref;
  // Outside the browser (tests, tooling) the interface stays English.
  if (!hasDom) return "en";
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const l of langs) {
    const base = String(l || "")
      .toLowerCase()
      .split("-")[0];
    if (base === "en") return "en";
    if (DICTS[base]) return base;
  }
  return "en";
}

let pref = readPref();
let locale = resolve(pref);
const listeners = new Set();

function applyDocument() {
  if (hasDom) document.documentElement.lang = locale;
}
applyDocument();

function emit() {
  applyDocument();
  for (const fn of listeners) fn();
}

if (hasDom) {
  // Follow the system language when the browser's preference changes.
  window.addEventListener("languagechange", () => {
    if (pref !== "system") return;
    const next = resolve(pref);
    if (next !== locale) {
      locale = next;
      emit();
    }
  });
}

export const getLocale = () => locale;
export const getLocalePref = () => pref;

/** "system" | "en" | "pl". Stored per browser, like the theme. */
export function setLocalePref(next) {
  pref = next === "en" || next === "pl" ? next : "system";
  try {
    if (pref === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    /* storage blocked: the choice holds for this visit */
  }
  const resolved = resolve(pref);
  const changed = resolved !== locale;
  locale = resolved;
  if (changed) emit();
  else for (const fn of listeners) fn();
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const fallbackOf = (key) => key.slice(key.lastIndexOf("|") + 1);

function fill(text, vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
}

/** Translate `key`, filling {placeholders} from `vars`. */
export function t(key, vars) {
  const entry = DICTS[locale]?.[key];
  const text = typeof entry === "string" ? entry : fallbackOf(key);
  return fill(text, vars);
}

const rules = {};
const pluralRule = (loc) => (rules[loc] ||= new Intl.PluralRules(loc));

/**
 * Count-dependent text. English picks `one` or `other`; the dictionary entry
 * for `one` gives every form the language needs, e.g. Polish
 * { one: "{n} strona", few: "{n} strony", many: "{n} stron" }.
 */
export function tn(n, one, other, vars) {
  const all = { n, ...vars };
  const entry = DICTS[locale]?.[one];
  if (entry && typeof entry === "object") {
    const form = pluralRule(locale).select(n);
    return fill(entry[form] ?? entry.other ?? entry.many, all);
  }
  return fill(fallbackOf(n === 1 ? one : other), all);
}

/** Current locale; re-renders the caller when the language changes. */
export function useLocale() {
  return useSyncExternalStore(subscribe, getLocale, getLocale);
}

/** Current preference ("system" | "en" | "pl"), reactive. */
export function useLocalePref() {
  return useSyncExternalStore(subscribe, getLocalePref, getLocalePref);
}

/** Subscribe the component to language changes and hand back `t` and `tn`. */
export function useT() {
  useLocale();
  return { t, tn };
}
