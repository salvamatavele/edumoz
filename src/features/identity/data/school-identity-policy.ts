import type { Prisma } from "@/lib/db/errors";
import { SchoolUserError } from "../domain/school-users";

/** Shared meaning of a usable legacy administrator across assignment, suspension and retirement. */
export function usableUnrestrictedManagers(schoolId: string): Prisma.MembershipWhereInput {
  return { schoolId, role: "SCHOOL_MANAGER", status: "ACTIVE", permissionsConfigured: false, permissionRoleId: null, assignedRoles: { none: {} }, user: { isActive: true, passwordChangeRequired: false, memberships: { none: { schoolId, status: "ACTIVE", role: { in: ["SCHOOL_MANAGER", "TEACHER"] }, permissionOverrides: { some: {} } } } } };
}

/** Called under the shared school lock before restricting or retiring these associations. */
export async function assertPreservesUnrestrictedManager(tx: Prisma.TransactionClient, schoolId: string, membershipIds: readonly string[]): Promise<void> {
  const usable = usableUnrestrictedManagers(schoolId);
  const affected = await tx.membership.count({ where: { AND: [usable, { id: { in: [...membershipIds] } }] } });
  if (!affected) return;
  const remaining = await tx.membership.count({ where: { AND: [usable, { id: { notIn: [...membershipIds] } }] } });
  if (!remaining) throw new SchoolUserError("lastManager");
}
