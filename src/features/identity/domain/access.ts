import type { PermissionAction, PermissionResource } from "@/features/identity/domain/permission-catalog";
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

export interface PermissionGrant {
  readonly resource: PermissionResource;
  readonly action: PermissionAction;
}

export interface SessionContext {
  readonly userId: string;
  readonly isPlatformAdmin: boolean;
  /** Escola activa. Nula enquanto o utilizador ainda não escolheu, se tiver várias. */
  readonly schoolId: string | null;
  readonly role: Role | null;
  readonly memberships: readonly SchoolMembership[];
  /**
   * `PermissionRole` atribuído à `Membership` activa, se houver. Nulo é o caso comum — um
   * `SCHOOL_MANAGER` sem papel restrito continua com acesso total, exactamente como hoje.
   */
  readonly permissionRoleId?: string | null;
  /** Permissões do `permissionRoleId` acima, já carregadas — vazio quando não há papel. */
  readonly permissions?: readonly PermissionGrant[];
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

/**
 * Permissão configurável, para o que é NOVO a partir daqui — não substitui
 * `isSchoolAdministrator` nem a posse escrita à mão já usadas pelas Server Actions
 * existentes (ver design.md, "Migração sem quebrar").
 *
 * Só gestores têm papéis configuráveis: sem `permissionRoleId` atribuído, um
 * `SCHOOL_MANAGER` mantém acesso total (comportamento actual). Com um papel atribuído,
 * só as combinações marcadas em `RolePermission` concedem acesso — um papel recém-criado
 * sem nenhuma permissão marcada nega tudo, de propósito (ver design.md, "Risks").
 */
export function hasPermission(
  context: SessionContext,
  resource: PermissionResource,
  action: PermissionAction,
): boolean {
  if (context.isPlatformAdmin) return true;
  if (context.role !== Role.SCHOOL_MANAGER) return false;
  if (!context.permissionRoleId) return true;

  return (context.permissions ?? []).some(
    (grant) => grant.resource === resource && grant.action === action,
  );
}

/** Papéis que consomem a plataforma do lado do aluno. */
export function isFamilyRole(role: Role): boolean {
  return role === Role.STUDENT || role === Role.GUARDIAN;
}

/**
 * Papéis que trabalham na escola: gestor, professor, admin da plataforma.
 *
 * O complemento exacto de `isFamilyRole` com os cinco papéis actuais — usado para
 * restringir LEITURA (ex.: `/alunos`), ao contrário de `isSchoolAdministrator`, que só
 * protege ESCRITA. Ver docs/specs/role-shell.md.
 */
export function isStaffRole(role: Role): boolean {
  return !isFamilyRole(role);
}

export function hasMembershipIn(context: SessionContext, schoolId: string): boolean {
  return context.memberships.some((m) => m.schoolId === schoolId);
}

/**
 * Escola activa depois de um pedido de troca.
 *
 * Pura de propósito: o `jwt` callback do Auth.js (`src/lib/auth/config.ts`) não pode ser
 * importado em teste sem arrastar `next/server`, que o Vitest não resolve fora do runtime
 * do Next.js. Isolar a validação aqui é o que a torna testável — o callback só chama esta
 * função e atribui o resultado.
 *
 * Um administrador da plataforma pode pedir QUALQUER escola — não está limitado às suas
 * `Membership`s, porque pode não ter nenhuma (ver design.md, "acesso a qualquer escola,
 * sem depender de Membership"). A existência/actividade da escola pedida não se valida
 * aqui: `getTenantDb` já isola por `schoolId`, e uma escola inexistente ou apagada
 * devolveria sempre listas vazias, nunca dados de outra escola.
 */
export function resolveActiveSchool(
  memberships: readonly SchoolMembership[],
  requestedSchoolId: string,
  currentSchoolId: string | null,
  isPlatformAdmin = false,
): string | null {
  if (isPlatformAdmin) return requestedSchoolId || currentSchoolId;

  const allowed = memberships.some((m) => m.schoolId === requestedSchoolId);
  return allowed ? requestedSchoolId : currentSchoolId;
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
