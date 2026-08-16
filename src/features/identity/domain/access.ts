import { Role } from "@/types";

/**
 * Papéis e contexto de sessão.
 *
 * O papel não vive no utilizador — vive na `Membership`, porque a mesma pessoa pode ser
 * professora numa escola e encarregada de educação noutra. A sessão carrega sempre a
 * escola activa, e trocar de escola muda o papel. Ver docs/specs/domain-foundation.md §3.6.
 */

export interface SchoolMembership {
  readonly schoolId: string;
  readonly schoolName: string;
  readonly role: Role;
}

export interface SessionContext {
  readonly userId: string;
  readonly isPlatformAdmin: boolean;
  /** Escola activa. Nula enquanto o utilizador ainda não escolheu, se tiver várias. */
  readonly schoolId: string | null;
  readonly role: Role | null;
  readonly memberships: readonly SchoolMembership[];
}

/**
 * Hierarquia de papéis dentro de uma escola. Um número maior não significa "pode tudo o
 * que o de baixo pode" — um Gestor não deve poder lançar notas como se fosse professor,
 * porque isso apagaria a autoria do lançamento. Serve apenas para ordenar e apresentar.
 */
const ROLE_RANK: Record<Role, number> = {
  [Role.PLATFORM_ADMIN]: 4,
  [Role.SCHOOL_MANAGER]: 3,
  [Role.TEACHER]: 2,
  [Role.GUARDIAN]: 1,
  [Role.STUDENT]: 0,
};

export function rankOf(role: Role): number {
  return ROLE_RANK[role];
}

/** Papéis que administram a escola: configuração, matrículas, finanças. */
export function isSchoolAdministrator(context: SessionContext): boolean {
  return context.isPlatformAdmin || context.role === Role.SCHOOL_MANAGER;
}

/** Papéis que consomem a plataforma do lado do aluno. */
export function isFamilyRole(role: Role): boolean {
  return role === Role.STUDENT || role === Role.GUARDIAN;
}

export function hasMembershipIn(context: SessionContext, schoolId: string): boolean {
  return context.memberships.some((m) => m.schoolId === schoolId);
}

/**
 * Papel do utilizador numa escola concreta.
 *
 * Um administrador da plataforma NÃO recebe automaticamente um papel dentro da escola.
 * Poder administrar a plataforma e ser professor de uma turma são coisas diferentes, e
 * confundi-las faria aparecer o admin como autor de lançamentos que não fez.
 */
export function roleIn(context: SessionContext, schoolId: string): Role | null {
  const membership = context.memberships.find((m) => m.schoolId === schoolId);
  return membership?.role ?? null;
}
