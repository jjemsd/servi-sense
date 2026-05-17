import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development, all /api requests are proxied to the FastAPI backend
// on :8000. This makes the browser treat frontend + backend as same-origin,
// so cookies "just work" without dealing with SameSite=None+Secure locally.
//
// In production, the frontend is built statically. Set VITE_API_URL to the
// deployed backend URL (e.g. https://servisense-api.onrender.com) and
// requests will use absolute paths instead.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
