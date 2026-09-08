import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores de eslint-config-next, pero con "**/" delante: el
    // patrón sin él solo ignora el .next/node_modules DE LA RAÍZ del repo,
    // no los anidados dentro de un worktree suelto (p.ej.
    // .claude/worktrees/*/.next) — cuando hay uno, `npm run lint` sin
    // argumentos escaneaba su código YA COMPILADO y reportaba cientos de
    // falsos positivos ajenos al proyecto.
    "**/.next/**",
    "**/node_modules/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Permitir args/vars intencionalmente sin usar si empiezan por "_"
      // (p. ej. `_prev`, `_formData` en las server actions de useActionState).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
