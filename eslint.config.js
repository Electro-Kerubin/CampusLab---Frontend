// @ts-check
const eslint = require("@eslint/js");
const { defineConfig } = require("eslint/config");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

module.exports = defineConfig([
  {
    ignores: ["dist/**", "coverage/**", ".angular/**"],
  },
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "app",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "app",
          style: "kebab-case",
        },
      ],
      // DEUDA TÉCNICA (warning, no error): los modales emiten un @Output llamado "close".
      // Renombrarlo cambia la API pública de los componentes; queda pendiente.
      "@angular-eslint/no-output-native": "warn",
    },
  },
  {
    // En las pruebas se permiten stubs vacíos (p. ej. un logout simulado que no hace nada).
    files: ["**/*.spec.ts", "src/testing/**/*.ts"],
    rules: {
      "@typescript-eslint/no-empty-function": "off",
    },
  },
  {
    // Plantillas (incluye las inline de los componentes, vía processInlineTemplates).
    files: ["**/*.html"],
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility,
    ],
    rules: {
      // DEUDA DE ACCESIBILIDAD (warning, no error): los <label> de los formularios no están
      // asociados a su <input> (falta for/id). Corregirlo toca la UI; queda pendiente.
      "@angular-eslint/template/label-has-associated-control": "warn",
    },
  },
]);
