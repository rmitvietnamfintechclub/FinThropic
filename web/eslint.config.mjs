import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

// Medium strict (docs/adr/0004): Next.js core-web-vitals + typescript-eslint recommended.
// Type-aware "strict" rules are off on purpose; the TypeScript compiler is already strict.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],
    },
  },
  {
    // Only the config layer reads process.env (Twelve-Factor: one place that knows the config).
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message: "Read configuration through src/server/config/env.ts.",
        },
      ],
    },
  },
  {
    files: [
      "src/server/config/**",
      "src/server/utils/logger*.ts",
      "src/instrumentation.ts",
      "**/*.test.{ts,tsx}",
    ],
    rules: { "no-restricted-properties": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
