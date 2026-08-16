import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Cliente Prisma gerado — não é código nosso e vem com @ts-nocheck.
    "src/generated/**",
  ]),

  {
    // Terceira camada do isolamento entre escolas (ver docs/specs/domain-foundation.md §3.1).
    // A extensão de tenant só protege quem passa por ela; esta regra garante que ninguém
    // instancia o cliente cru por engano e escreve uma query sem filtro de escola.
    files: ["src/**/*.{ts,tsx}"],
    // `src/lib/db` é quem instancia o cliente; `src/types` é a fronteira sancionada que
    // reexporta modelos e enums para o resto da aplicação.
    //
    // A autenticação é a terceira excepção, e por uma razão estrutural: ela ACONTECE
    // ANTES DE HAVER ESCOLA. Descobrir a que escolas um e-mail pertence é precisamente a
    // pergunta que o `getTenantDb(schoolId)` já pressupõe respondida. Estes dois ficheiros
    // são o único sítio onde essa consulta sem filtro é legítima, e não fazem mais nada.
    ignores: [
      "src/lib/db/**",
      "src/generated/**",
      "src/types/**",
      "src/lib/auth/**",
      "src/features/identity/data/sign-in.ts",
    ],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/generated/prisma", "**/generated/prisma/**"],
              // Os tipos são inofensivos — o que não pode escapar é o cliente em runtime.
              allowTypeImports: true,
              message:
                "Não importe o cliente Prisma gerado em runtime. Use getTenantDb(schoolId) de @/lib/db/tenant, que força o filtro por escola. Tipos: importe-os de @/types.",
            },
            {
              group: ["**/lib/db/client"],
              allowTypeImports: true,
              message:
                "prisma de @/lib/db/client não tem filtro de escola. Use getTenantDb(schoolId) de @/lib/db/tenant.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
