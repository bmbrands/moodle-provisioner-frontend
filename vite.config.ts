import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  server: {
    host: "127.0.0.1",   // or "0.0.0.0" if you want to access from other devices
    port: 5173,
    strictPort: true,     // fail if 5173 is taken instead of silently choosing another
    open: true,           // auto-open in your browser
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
