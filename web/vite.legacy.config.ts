// Build config for the original Vite/React SPA, kept only until the Astro
// site replaces it on GitHub Pages. Builds into ../docs (the live site).
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname, "legacy"),
  publicDir: path.resolve(__dirname, "public"),
  envDir: path.resolve(__dirname, ".."),
  server: { host: "::", port: 8080 },
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./legacy") },
  },
  base: "/",
});
