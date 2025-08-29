import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.GITHUB_PAGES ? "/csv-visualizer/" : "./",
  build: {
    outDir: "dist",
  },
});
