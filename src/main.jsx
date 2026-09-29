import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import "@fontsource-variable/geist";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/controls.css";
import "./styles/layout.css";
import "./styles/sidebar.css";
import "./styles/compose.css";
import "./styles/views.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
);
