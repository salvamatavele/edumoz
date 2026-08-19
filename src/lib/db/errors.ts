import { Prisma } from "@/generated/prisma/client";

export { Prisma };

/** Código do MySQL/MariaDB para violação de índice único, via Prisma. */
export const UNIQUE_CONSTRAINT_VIOLATION = "P2002";

/**
 * Nome do índice único violado num erro P2002.
 *
 * Com `@prisma/adapter-mariadb`, `error.meta.target` — a forma documentada do Prisma —
 * não existe: o nome do índice vem antes escondido em
 * `meta.driverAdapterError.cause.constraint.index`. Sem isto, qualquer código que precise
 * de distinguir DUAS restrições únicas na mesma escrita (ex.: `enroll-student.ts`, que
 * pode violar `(academicYearId, number)` ou `(studentId, academicYearId)`) trataria as
 * duas da mesma forma. Cobre também `meta.target` como string ou array, para não prender
 * chamadores a este adaptador se um dia mudar.
 */
export function uniqueConstraintTarget(
  error: InstanceType<typeof Prisma.PrismaClientKnownRequestError>,
): string {
  const meta = error.meta as Record<string, unknown> | undefined;
  if (!meta) return "";

  if (typeof meta.target === "string") return meta.target;
  if (Array.isArray(meta.target)) return meta.target.join(",");

  const driverAdapterError = meta.driverAdapterError as
    | { cause?: { constraint?: { index?: string } } }
    | undefined;

  return driverAdapterError?.cause?.constraint?.index ?? "";
}
