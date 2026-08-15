import { configDefaults, defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// .mts (not .ts) so Vite loads this as real ESM. As a .ts file it is loaded
// as CommonJS, which warns under Vite's `configLoader: 'native'` and breaks
// outright once that becomes the default.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    // Agent worktrees under .claude/ are full checkouts of this repo, so a
    // bare `vitest run` collects every test twice and reports a count that
    // looks like the suite doubled. eslint.config.mjs excludes the same path
    // for the same reason. Spread the defaults — a bare `exclude` replaces
    // them, which would drag node_modules back in.
    exclude: [...configDefaults.exclude, "**/.claude/**"],
  },
});
