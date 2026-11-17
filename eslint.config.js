// Lint config for every workspace package except web/, which keeps the config
// it came with until the Astro migration replaces it.
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "web/**",
      "docs/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.astro/**",
      "**/.wrangler/**",
      "**/next-env.d.ts",
      "**/database.types.ts",
      "**/__fixtures__/**",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx,mts}"],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    files: ["**/*.{js,mjs}"],
    extends: [js.configs.recommended],
    languageOptions: { globals: { ...globals.node } },
  },
);
