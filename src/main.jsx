import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import "@fontsource-variable/funnel-sans";
import "@fontsource-variable/funnel-display";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/controls.css";
import "./styles/shell.css";
import "./styles/work.css";
import "./styles/pages.css";
import App from "./App.jsx";

// Keyboard-driven changes happen instantly; pointer input brings the motion back.
const root = document.documentElement;
window.addEventListener("keydown", () => (root.dataset.kbd = ""), true);
window.addEventListener("pointerdown", () => delete root.dataset.kbd, true);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
);
