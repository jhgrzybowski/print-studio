import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev server mirrors production: the API is proxied under /api so the
// session cookie stays same-origin. Open it via the LAN IP, not localhost.
const API_TARGET = process.env.PRINTER_API_TARGET || "http://192.168.100.99:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  build: {
    target: "es2022",
    sourcemap: false,
    chunkSizeWarningLimit: 700,
  },
});
