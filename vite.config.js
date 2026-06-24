import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.GITHUB_PAGES_BASE || "./",
  build: {
    chunkSizeWarningLimit: 900,
  },
});
