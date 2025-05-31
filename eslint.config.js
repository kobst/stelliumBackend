import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";
import pluginTs from "@typescript-eslint/eslint-plugin";
import { defineConfig } from "eslint/config";


export default defineConfig([
  {
    ignores: ["scripts/**", "utilities/**", ".serverless/**"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: "@typescript-eslint/parser",
      parserOptions: { project: "./tsconfig.json", sourceType: "module" },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { "@typescript-eslint": pluginTs },
    extends: ["plugin:@typescript-eslint/recommended"],
    rules: {},
  },
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      "no-unused-vars": "warn",
    },
  },
  pluginReact.configs.flat.recommended,
]);
