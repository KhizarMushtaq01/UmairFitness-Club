import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// .mts (not .ts) so Vite loads this as real ESM. As a .ts file it is loaded
// as CommonJS, which warns under Vite's `configLoader: 'native'` and breaks
// outright once that becomes the default.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: { environment: "node" },
});
