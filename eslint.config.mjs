import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  eslintConfigPrettier,
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "public/**"],
  },
  {
    rules: {
      // Temporarily disable no-explicit-any to address other errors first
      "@typescript-eslint/no-explicit-any": "off",
      // Temporarily disable react/no-unescaped-entities for .tsx files
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];

export default eslintConfig;
