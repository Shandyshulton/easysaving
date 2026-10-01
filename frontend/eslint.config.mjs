import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// eslint-config-next 15.x is still published in the legacy (eslintrc) format, so
// FlatCompat bridges it into flat config. This is the pattern documented by
// Next.js. FlatCompat ships with ESLint itself (@eslint/eslintrc), so no extra
// dependency is added beyond eslint and eslint-config-next.
const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  {
    // Build output, dependencies and generated files are not ours to lint.
    ignores: [
      ".next/**",
      ".next-build/**",
      "node_modules/**",
      "next-env.d.ts",
      "public/**"
    ]
  },
  ...compat.extends("next/core-web-vitals", "next/typescript")
];

export default config;
