import { prisma } from "@/lib/db/client";

/**
 * Todas as escolas activas, para um administrador da plataforma escolher uma — o único
 * sítio onde faz sentido listar escolas sem `getTenantDb`, porque ainda não há nenhuma
 * escolhida. Ver `resolveActiveSchool` (`domain/access.ts`) e o comentário em
 * `eslint.config.mjs`.
 */
export async function listAllActiveSchools(): Promise<Array<{ id: string; name: string }>> {
  const schools = await prisma.school.findMany({
    where: { isActive: true },
    select: { id: true, name: true, shortName: true },
    orderBy: { name: "asc" },
  });

  return schools.map((school) => ({ id: school.id, name: school.shortName ?? school.name }));
}
