import { prisma } from "./client";

/**
 * Consultas sobre `School`.
 *
 * A escola é o próprio tenant, não uma linha dentro de um: descobrir QUAL é a escola tem
 * de acontecer antes de existir um contexto de escola, e portanto sem filtro. Este módulo
 * é o único sítio onde isso é legítimo, e é por isso que vive em `src/lib/db` — a regra
 * do ESLint que proíbe importar o cliente cru não se aplica aqui.
 *
 * Em produção, quem chama isto é a camada de autenticação: a sessão traz a escola activa,
 * validada contra as `Membership` do utilizador. Nunca um parâmetro de URL directamente.
 */

export function findSchoolById(id: string) {
  return prisma.school.findUnique({ where: { id } });
}

export function findSchoolByCode(code: string) {
  return prisma.school.findUnique({ where: { code } });
}

export function listActiveSchools() {
  return prisma.school.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, code: true, name: true, shortName: true, province: true },
  });
}

/**
 * Escolas a que um utilizador pertence, com o papel em cada uma.
 *
 * É daqui que sai o selector de escola. Devolve vazio para quem não tem `Membership`
 * activa — incluindo um administrador da plataforma, que administra a plataforma mas não
 * é automaticamente membro de escola nenhuma.
 */
export async function listSchoolsForUser(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId, status: "ACTIVE", school: { isActive: true } },
    select: {
      role: true,
      isDefault: true,
      school: { select: { id: true, name: true, shortName: true } },
    },
    orderBy: [{ isDefault: "desc" }, { school: { name: "asc" } }],
  });

  return memberships.map((membership) => ({
    schoolId: membership.school.id,
    schoolName: membership.school.shortName ?? membership.school.name,
    role: membership.role,
    isDefault: membership.isDefault,
  }));
}
