import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";

const KEY = "ps.appearance";
export const PALETTES = [
  { id: "cobalt", label: "Cobalt" },
  { id: "iris", label: "Iris" },
  { id: "jade", label: "Jade" },
  { id: "ember", label: "Ember" },
  { id: "graphite", label: "Graphite" },
];
const THEMES = ["system", "light", "dark"];

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      theme: THEMES.includes(v.theme) ? v.theme : "system",
      palette: PALETTES.some((p) => p.id === v.palette) ? v.palette : "cobalt",
    };
  } catch {
    return { theme: "system", palette: "cobalt" };
  }
}

function resolve(theme) {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function apply({ theme, palette }) {
  const root = document.documentElement;
  const resolved = resolve(theme);
  root.dataset.theme = resolved;
  root.dataset.palette = palette;
  // Both tags carry a media query, so both must follow a theme chosen against the system one;
  // otherwise the browser bar and status bar keep the system colour.
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.content = resolved === "light" ? "#e4e6e9" : "#0b0c0e";
}

// A view transition cross-fades one snapshot of the page on the compositor. The fallback
// transitions colours on every element, which costs far more on a large tree.
function crossfade(change) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (document.startViewTransition && !reduce) {
    document.startViewTransition(() => flushSync(change));
    return;
  }
  const root = document.documentElement;
  if (!reduce) root.classList.add("theme-switching");
  change();
  setTimeout(() => root.classList.remove("theme-switching"), 420);
}

/** Theme + palette. Stored locally for instant paint, mirrored to server preferences when signed in. */
export function useAppearance() {
  const [appearance, setAppearance] = useState(read);

  useEffect(() => {
    apply(appearance);
    try {
      localStorage.setItem(KEY, JSON.stringify(appearance));
    } catch {
      /* storage blocked: appearance still applies for this visit */
    }
    if (appearance.theme !== "system") return;
    const m = window.matchMedia("(prefers-color-scheme: light)");
    const on = () => apply(appearance);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [appearance]);

  const update = useCallback((patch) => {
    // Cross-fade only during an explicit switch, not on every render. The new theme is applied
    // inside the change so the view transition captures it; the effect then re-applies it harmlessly.
    crossfade(() =>
      setAppearance((a) => {
        const next = { ...a, ...patch };
        apply(next);
        return next;
      }),
    );
  }, []);

  return [appearance, update];
}
