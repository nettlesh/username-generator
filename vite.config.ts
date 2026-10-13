import { defineConfig } from "vite";

// A Workers route serves this site under /username-generator/, and static assets map request
// paths straight to files, so the build is nested under the same prefix.
export default defineConfig({
  base: "/username-generator/",
  build: { outDir: "dist/username-generator" },
});
