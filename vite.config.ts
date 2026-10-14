import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";

// A Workers route serves this site under /username-generator/, and static assets map request
// paths straight to files, so the build is nested under the same prefix.
export default defineConfig({
  base: "/username-generator/",
  build: { outDir: "dist/username-generator" },
  // Claude Code checks out other sessions' worktrees here, each with its own copy of the tests.
  test: { exclude: [...configDefaults.exclude, ".claude/worktrees/**"] },
});
