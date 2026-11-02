import { createHash } from "node:crypto";
import { hasPermission, type SessionContext } from "@/features/identity/domain/access";
import { SchoolStaffError, schoolStaffMutationSchema, schoolStaffQuerySchema, type SchoolStaffFields } from "@/features/identity/domain/school-staff";
import { prisma } from "@/lib/db/client";
import { Prisma } from "@/lib/db/errors";
import { authorizeSchoolIdentityMutation } from "./school-identity-authorization";
import { withTransactionRetry } from "@/lib/db/transaction-retry";
const PAGE_SIZE = 25;
function requireAccess(context: SessionContext, action: "view" | "create" | "edit") {
  if (!context.schoolId || !hasPermission(context, "school-staff", action)) throw new SchoolStaffError("forbidden");
}
export async function listSchoolStaff(context: SessionContext, input: unknown) {
  requireAccess(context, "view");
  const parsed = schoolStaffQuerySchema.safeParse(input);
  if (!parsed.success) throw new SchoolStaffError("invalid");
  const { q, status } = parsed.data;
  const where: Prisma.StaffWhereInput = { schoolId: context.schoolId!, ...(status ? { isActive: status === "ACTIVE" } : {}), ...(q ? { OR: [{ code: { contains: q } }, { name: { contains: q } }, { jobTitle: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }] } : {}) };
  const count = await prisma.staff.count({ where });
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE)), page = Math.min(parsed.data.page, pageCount);
  const rows = await prisma.staff.findMany({ where, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, code: true, name: true, jobTitle: true, email: true, phone: true, isActive: true, userId: true } });
  return { rows: rows.map(({ userId, ...row }) => ({ ...row, linked: !!userId })), count, page, pageCount };
}
export async function getSchoolStaff(context: SessionContext, id: string) {
  requireAccess(context, "edit");
  if (typeof id !== "string" || !id || id.length > 191) throw new SchoolStaffError("invalid");
  const row = await prisma.staff.findFirst({ where: { id, schoolId: context.schoolId! } });
  if (!row) throw new SchoolStaffError("unavailable");
  return { id: row.id, revision: row.updatedAt.toISOString(), code: row.code, name: row.name, jobTitle: row.jobTitle, title: row.title ?? "", email: row.email ?? "", phone: row.phone ?? "", birthDate: row.birthDate?.toISOString().slice(0, 10) ?? "", gender: row.gender ?? "", documentNumber: row.documentNumber ?? "", nuit: row.nuit ?? "", address: row.address ?? "", qualification: row.qualification ?? "", contractType: row.contractType ?? "", hireDate: row.hireDate?.toISOString().slice(0, 10) ?? "", notes: row.notes ?? "", isActive: row.isActive } satisfies SchoolStaffFields & { id: string; revision: string };
}
export async function saveSchoolStaff(context: SessionContext, input: unknown): Promise<void> {
  const parsed = schoolStaffMutationSchema.safeParse(input);
  if (!parsed.success) throw new SchoolStaffError("invalid");
  const values = parsed.data;
  const action = values.id ? "edit" : "create";
  requireAccess(context, action);
  const schoolId = context.schoolId!;
  const { requestId, id, revision, birthDate, hireDate, gender, ...fields } = values;
  const data = { ...fields, title: fields.title || null, email: fields.email || null, phone: fields.phone || null, documentNumber: fields.documentNumber || null, nuit: fields.nuit || null, address: fields.address || null, qualification: fields.qualification || null, contractType: fields.contractType || null, notes: fields.notes || null, birthDate: birthDate ? new Date(birthDate) : null, hireDate: hireDate ? new Date(hireDate) : null, gender: gender || null };
  try {
    await withTransactionRetry(() => prisma.$transaction(async tx => {
      await authorizeSchoolIdentityMutation(tx, context, action, "school-staff");
      const entityId = id ?? createHash("sha256").update(JSON.stringify(["staff-create", schoolId, context.userId, requestId])).digest("hex");
      if (!id) {
        const existing = await tx.staff.findFirst({ where: { id: entityId, schoolId } });
        if (existing) {
          const current: Record<string, unknown> = existing;
          if (!Object.entries(data).every(([key, value]) => JSON.stringify(current[key]) === JSON.stringify(value))) throw new SchoolStaffError("requestChanged");
          return;
        }
      }
      if (id) {
        const before = await tx.staff.findFirst({ where: { id, schoolId }, select: { updatedAt: true } });
        if (!before) throw new SchoolStaffError("unavailable");
        if (before.updatedAt.toISOString() !== revision) throw new SchoolStaffError("conflict");
        const updated = await tx.staff.updateMany({ where: { id, schoolId, updatedAt: before.updatedAt }, data: { ...data, updatedAt: new Date(Math.max(Date.now(), before.updatedAt.getTime() + 1)) } });
        if (updated.count !== 1) throw new SchoolStaffError("conflict");
      } else await tx.staff.create({ data: { ...data, id: entityId, schoolId } });
      await tx.auditLog.create({ data: { schoolId, actorUserId: context.userId, action: `staff.${action}`, entity: "Staff", entityId, after: { fields: Object.keys(data) } } });
    }, { isolationLevel: "ReadCommitted" }));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new SchoolStaffError("duplicateCode");
    throw error;
  }
}
export type SchoolStaffPage = Awaited<ReturnType<typeof listSchoolStaff>>;
export type SchoolStaffDetail = Awaited<ReturnType<typeof getSchoolStaff>>;
