// @ts-check
const tseslint = require("@typescript-eslint/eslint-plugin");
const tsparser = require("@typescript-eslint/parser");
const security = require("eslint-plugin-security");

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  {
    ignores: ["dist/**", "node_modules/**", "src/.prisma/**"],
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json",
        ecmaVersion: 2022,
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      security,
    },
    rules: {
      ...tseslint.configs["recommended"].rules,
      ...security.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "security/detect-object-injection": "warn",
    },
  },
];
