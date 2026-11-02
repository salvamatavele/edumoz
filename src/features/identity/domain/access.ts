import { isLegacyUnrestrictedAssociation } from "./functional-permissions";
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
  readonly authVersion?: number;
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
  /** Explicit restrictions remain restrictive even when their profile list is empty. */
  readonly permissionsConfigured?: boolean;
  /** Permissões do `permissionRoleId` acima, já carregadas — vazio quando não há papel. */
  readonly permissions?: readonly PermissionGrant[];
}

/** Preserve effective grants when converting the authenticated session for domain checks. */
export function toSessionContext(session: {
  readonly user: { readonly id: string; readonly authVersion?: number };
  readonly isPlatformAdmin: boolean;
  readonly schoolId: string | null;
  readonly role: Role | null;
  readonly memberships: readonly SchoolMembership[];
  readonly permissionRoleId?: string | null;
  readonly permissionsConfigured?: boolean;
  readonly permissions?: readonly PermissionGrant[];
}): SessionContext {
  return {
    userId: session.user.id,
    authVersion: session.user.authVersion ?? 0,
    isPlatformAdmin: session.isPlatformAdmin,
    schoolId: session.schoolId,
    role: session.role,
    memberships: session.memberships,
    permissionRoleId: session.permissionRoleId ?? null,
    permissionsConfigured: session.permissionsConfigured ?? Boolean(session.permissionRoleId),
    permissions: session.permissions ?? [],
  };
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

/** Coarse gate only; mutation transactions must still reread persisted authority. */
export function isUnrestrictedSchoolAdministrator(context: SessionContext): boolean {
  return !!context.userId && !!context.schoolId && (context.isPlatformAdmin || isLegacyUnrestrictedAssociation(context));
}

/**
 * Effective permission for administrative entry points. Teaching/family ownership is
 * checked separately; being an administrator never impersonates a teacher or guardian.
 *
 * A legacy unrestricted manager retains compatibility. Configured staff associations
 * need effective grants; teaching/family ownership remains a separate invariant.
 */
export function hasPermission(
  context: SessionContext,
  resource: PermissionResource,
  action: PermissionAction,
): boolean {
  if (!context.schoolId || !context.userId) return false;
  if (context.isPlatformAdmin) return true;
  if (isLegacyUnrestrictedAssociation(context)) return true;
  if (context.role !== Role.SCHOOL_MANAGER && context.role !== Role.TEACHER) return false;

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
 * Resolves a requested switch against freshly loaded memberships and platform status.
 * The server must still validate that the resulting school exists and is active through
 * loadEffectiveSessionAccess; this pure choice function does not grant access by itself.
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
