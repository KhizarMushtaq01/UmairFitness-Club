import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Vendored design-prototype artifacts kept at the repo root for
      // reference. They are not part of the Next app (nothing imports them)
      // and they are pre-React-18 bundled output, so linting them only
      // produces noise about code we do not own or ship.
      "support.js",
      "image-slot.js",
    ],
  },
];

export default eslintConfig;
