import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  build: {
    target: "es2020",
    cssCodeSplit: false,
    assetsInlineLimit: 0,
  },
  preview: { host: "0.0.0.0", port: 4173, strictPort: true },
});
