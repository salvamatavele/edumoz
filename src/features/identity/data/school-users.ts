import { hasPermission, type SessionContext } from "@/features/identity/domain/access";
import { SCHOOL_USER_PAGE_SIZE, SchoolUserError, schoolUserQuerySchema } from "@/features/identity/domain/school-users";
import { prisma } from "@/lib/db/client";
import type { Prisma } from "@/lib/db/errors";
import type { Role } from "@/types";

export interface SchoolUserRow {
  readonly id: string;
  readonly name: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly roles: readonly Role[];
  readonly status: "ACTIVE" | "SUSPENDED" | "DISABLED";
  readonly isPlatformAdmin: boolean;
  readonly codes: readonly string[];
  readonly loginCode?: string | null;
  readonly passwordChangeRequired?: boolean;
  readonly links: readonly ("teacher" | "staff" | "student" | "guardian")[];
}
export interface SchoolUserPage {
  readonly rows: readonly SchoolUserRow[];
  readonly total: number;
  readonly filtered: number;
  readonly page: number;
  readonly pageCount: number;
}

/** Authorized global identity boundary: every user must have a membership in this school.
 * Global User is intentionally unavailable through getTenantDb. Never return raw users.
 */
export async function listSchoolUsers(context: SessionContext, input: unknown): Promise<SchoolUserPage> {
  if (!hasPermission(context, "users", "view") || !context.schoolId) throw new SchoolUserError("forbidden");
  const parsed = schoolUserQuerySchema.safeParse(input);
  if (!parsed.success) throw new SchoolUserError("invalid");
  const query = parsed.data;
  const schoolId = context.schoolId;
  const membership = { schoolId, status: { not: "REMOVED" as const } };
  const base: Prisma.UserWhereInput = { memberships: { some: membership } };
  const conditions: Prisma.UserWhereInput[] = [base];
  if (query.role) conditions.push({ memberships: { some: { ...membership, role: query.role } } });
  if (query.status === "DISABLED") conditions.push({ isActive: false });
  if (query.status === "ACTIVE") conditions.push({ isActive: true, memberships: { some: { schoolId, status: "ACTIVE" } } });
  if (query.status === "SUSPENDED") conditions.push({ isActive: true, memberships: { none: { schoolId, status: "ACTIVE" } } });
  const profileWhere = { schoolId };
  if (query.link === "staff") conditions.push({ staffProfiles: { some: profileWhere } });
  if (query.link === "teacher") conditions.push({ teacherProfiles: { some: profileWhere } });
  if (query.link === "student") conditions.push({ studentProfiles: { some: profileWhere } });
  if (query.link === "guardian") conditions.push({ guardianProfiles: { some: profileWhere } });
  if (query.link === "none") conditions.push({ staffProfiles: { none: profileWhere }, teacherProfiles: { none: profileWhere }, studentProfiles: { none: profileWhere }, guardianProfiles: { none: profileWhere } });
  if (query.q) conditions.push({ OR: [
    { name: { contains: query.q } }, { email: { contains: query.q } }, { contactEmail: { contains: query.q } }, { phone: { contains: query.q } }, { contactPhone: { contains: query.q } }, { loginCode: { contains: query.q } },
    { staffProfiles: { some: { schoolId, code: { contains: query.q } } } },
    { teacherProfiles: { some: { schoolId, code: { contains: query.q } } } },
    { studentProfiles: { some: { schoolId, code: { contains: query.q } } } },
  ] });
  const where = { AND: conditions };
  const [total, filtered] = await Promise.all([prisma.user.count({ where: base }), prisma.user.count({ where })]);
  const pageCount = Math.max(1, Math.ceil(filtered / SCHOOL_USER_PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  const users = await prisma.user.findMany({
    where, skip: (page - 1) * SCHOOL_USER_PAGE_SIZE, take: SCHOOL_USER_PAGE_SIZE,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: {
      id: true, name: true, email: true, phone: true, contactEmail: true, contactPhone: true, loginCode: true, passwordChangeRequired: true, isActive: true, isPlatformAdmin: true,
      memberships: { where: membership, orderBy: { role: "asc" }, select: { role: true, status: true } },
      staffProfiles: { where: profileWhere, select: { code: true } },
      teacherProfiles: { where: profileWhere, select: { code: true } },
      studentProfiles: { where: profileWhere, select: { code: true } },
      guardianProfiles: { where: profileWhere, select: { id: true } },
    },
  });
  return { total, filtered, page, pageCount, rows: users.map(user => ({
    id: user.id, name: user.name, email: user.contactEmail ?? user.email, phone: user.contactPhone ?? user.phone, loginCode: user.loginCode, passwordChangeRequired: user.passwordChangeRequired, isPlatformAdmin: user.isPlatformAdmin,
    roles: [...new Set(user.memberships.map(item => item.role))],
    status: !user.isActive ? "DISABLED" : user.memberships.some(item => item.status === "ACTIVE") ? "ACTIVE" : "SUSPENDED",
    codes: [...user.staffProfiles, ...user.teacherProfiles, ...user.studentProfiles].map(profile => profile.code),
    links: [...(user.staffProfiles.length ? ["staff" as const] : []), ...(user.teacherProfiles.length ? ["teacher" as const] : []), ...(user.studentProfiles.length ? ["student" as const] : []), ...(user.guardianProfiles.length ? ["guardian" as const] : [])],
  })) };
}
