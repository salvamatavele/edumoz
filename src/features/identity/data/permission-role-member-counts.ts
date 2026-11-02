import { prisma } from "@/lib/db/client";

/** Scoped aggregate for the authorized roles page; deduplicates legacy and new links. */
export async function countSchoolRoleMembers(schoolId: string): Promise<Map<string, number>> {
  if (!schoolId) throw new Error("A school scope is required.");
  const rows = await prisma.$queryRaw<Array<{ roleId: string; memberCount: bigint }>>`
    SELECT links.permissionRoleId AS roleId, COUNT(DISTINCT links.membershipId) AS memberCount
    FROM (
      SELECT m.permissionRoleId, m.id AS membershipId
      FROM Membership m JOIN PermissionRole r ON r.id=m.permissionRoleId
      WHERE m.schoolId=${schoolId} AND r.schoolId=${schoolId}
      UNION ALL
      SELECT a.permissionRoleId, a.membershipId
      FROM MembershipPermissionRole a JOIN Membership m ON m.id=a.membershipId
      JOIN PermissionRole r ON r.id=a.permissionRoleId
      WHERE m.schoolId=${schoolId} AND r.schoolId=${schoolId}
    ) links GROUP BY links.permissionRoleId`;
  return new Map(rows.map(row => [row.roleId, Number(row.memberCount)]));
}
