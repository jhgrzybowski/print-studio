import { useCallback, useEffect, useState } from "react";

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
  const meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (meta) meta.content = resolved === "light" ? "#e4e6e9" : "#0b0c0e";
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
    // Cross-fade colours only during an explicit switch, not on every render.
    document.documentElement.classList.add("theme-switching");
    setAppearance((a) => ({ ...a, ...patch }));
    setTimeout(() => document.documentElement.classList.remove("theme-switching"), 420);
  }, []);

  return [appearance, update];
}
