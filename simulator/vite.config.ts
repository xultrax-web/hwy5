import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Local-only dev/build tooling. No git, no remote — just a dev server + bundler.
export default defineConfig({
  plugins: [react()],
  // Built bundle is served from the /cc-engine/ subfolder (and embedded via
  // iframe), so asset URLs must be relative, not root-absolute.
  base: "./",
  server: { port: 4188, host: "127.0.0.1", open: false },
  preview: { port: 4188, host: "127.0.0.1" },
});
