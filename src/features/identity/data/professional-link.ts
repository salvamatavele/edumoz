import { createHash } from "node:crypto";
import { hasPermission, type SessionContext } from "../domain/access";
import { SchoolUserError } from "../domain/school-users";
import type { ProfessionalKind, ProfessionalLink, ProfessionalPreview, ProfessionalProfile, ProfessionalChangeInput, ProfessionalPreviewInput } from "../domain/professional-link";
import { prisma } from "@/lib/db/client";
import { Prisma } from "@/lib/db/errors";
import { withTransactionRetry } from "@/lib/db/transaction-retry";
import { authorizeSchoolIdentityMutation } from "./school-identity-authorization";
export function requireProfessionalLinkPermission(context: SessionContext) {
  if (!context.schoolId || !hasPermission(context, "users", "edit")) throw new SchoolUserError("forbidden");
}
async function profile(tx: Prisma.TransactionClient, kind: ProfessionalKind, args: { schoolId: string; userId: string; current?: boolean; id?: string; code?: string; revision?: string }): Promise<ProfessionalProfile | null> {
  const where = { schoolId: args.schoolId, ...(args.id ? { id: args.id } : {}), ...(args.code ? { code: args.code } : {}), ...(args.revision ? { updatedAt: new Date(args.revision) } : {}), ...(args.current ? { userId: args.userId } : { isActive: true, OR: [{ userId: null }, { userId: args.userId }] }) };
  if (kind === "teacher") {
    const row = await tx.teacher.findFirst({ where, select: { id: true, code: true, firstName: true, lastName: true, isActive: true, updatedAt: true } });
    return row ? { id: row.id, code: row.code, name: `${row.firstName} ${row.lastName}`, isActive: row.isActive, revision: row.updatedAt.toISOString() } : null;
  }
  const row = await tx.staff.findFirst({ where, select: { id: true, code: true, name: true, isActive: true, updatedAt: true } });
  return row ? { id: row.id, code: row.code, name: row.name, isActive: row.isActive, revision: row.updatedAt.toISOString() } : null;
}
async function assign(tx: Prisma.TransactionClient, kind: ProfessionalKind, schoolId: string, row: ProfessionalProfile, expectedUserId: string | null, userId: string | null) {
  const where = { id: row.id, schoolId, userId: expectedUserId, updatedAt: new Date(row.revision), ...(userId ? { isActive: true } : {}) };
  const data = { userId, updatedAt: new Date(Math.max(Date.now(), new Date(row.revision).getTime() + 1)) };
  const changed = kind === "teacher" ? await tx.teacher.updateMany({ where, data }) : await tx.staff.updateMany({ where, data });
  if (changed.count !== 1) throw new SchoolUserError("linkConflict");
}
async function localLink(tx: Prisma.TransactionClient, context: SessionContext, userId: string, kind: ProfessionalKind) {
  const actor = await authorizeSchoolIdentityMutation(tx, context, "edit");
  const target = await tx.user.findFirst({ where: { id: userId, isActive: true, isPlatformAdmin: false, memberships: { some: { schoolId: context.schoolId!, status: { not: "REMOVED" } } } }, select: { memberships: { where: { schoolId: context.schoolId!, status: { not: "REMOVED" } }, orderBy: { id: "asc" }, select: { id: true, role: true, status: true, updatedAt: true } } } });
  if (!target || (!actor.unrestricted && (userId === context.userId || target.memberships.some(m => m.role === "SCHOOL_MANAGER" || m.role === "PLATFORM_ADMIN")))) throw new SchoolUserError("linkUnavailable");
  const revision = createHash("sha256").update(JSON.stringify(target.memberships)).digest("hex");
  const value: ProfessionalLink = { userId, revision, canLink: target.memberships.some(m => m.status === "ACTIVE" && (m.role === "TEACHER" || (kind === "staff" && m.role === "SCHOOL_MANAGER"))), profile: await profile(tx, kind, { schoolId: context.schoolId!, userId, current: true }) };
  return { value, anchor: target.memberships[0] };
}
function checkSnapshot(link: ProfessionalLink, input: { expectedRevision: string; expectedProfileId: string | null; expectedProfileRevision: string | null }) {
  if (link.revision !== input.expectedRevision || (link.profile?.id ?? null) !== input.expectedProfileId || (link.profile?.revision ?? null) !== input.expectedProfileRevision) throw new SchoolUserError("linkConflict");
}
export async function getProfessionalLink(context: SessionContext, userId: string, kind: ProfessionalKind): Promise<ProfessionalLink> {
  requireProfessionalLinkPermission(context);
  return prisma.$transaction(async tx => (await localLink(tx, context, userId, kind)).value, { isolationLevel: "ReadCommitted" });
}
export async function previewProfessionalLink(context: SessionContext, input: ProfessionalPreviewInput, kind: ProfessionalKind): Promise<ProfessionalPreview> {
  requireProfessionalLinkPermission(context);
  return prisma.$transaction(async tx => {
    const { value: link } = await localLink(tx, context, input.userId, kind); checkSnapshot(link, input);
    if (!input.profileCode) return { ...link, candidate: null };
    if (!link.canLink) throw new SchoolUserError("linkUnavailable");
    const candidate = await profile(tx, kind, { schoolId: context.schoolId!, userId: link.userId, code: input.profileCode });
    if (!candidate) throw new SchoolUserError("linkUnavailable");
    return { ...link, candidate };
  }, { isolationLevel: "ReadCommitted" });
}
export async function changeProfessionalLink(context: SessionContext, input: ProfessionalChangeInput, kind: ProfessionalKind): Promise<void> {
  requireProfessionalLinkPermission(context);
  try {
    await withTransactionRetry(() => prisma.$transaction(async tx => {
      const { value: link, anchor } = await localLink(tx, context, input.userId, kind); checkSnapshot(link, input);
      let candidate: ProfessionalProfile | null = null;
      if (input.profileId) {
        if (!link.canLink) throw new SchoolUserError("linkUnavailable");
        candidate = await profile(tx, kind, { schoolId: context.schoolId!, userId: link.userId, id: input.profileId, revision: input.profileRevision! });
        if (!candidate) throw new SchoolUserError("linkUnavailable");
      }
      if ((link.profile?.id ?? null) === input.profileId) return;
      if (link.profile) await assign(tx, kind, context.schoolId!, link.profile, link.userId, null);
      if (candidate) await assign(tx, kind, context.schoolId!, candidate, null, link.userId);
      const versioned = await tx.membership.updateMany({ where: { id: anchor.id, schoolId: context.schoolId!, userId: link.userId, updatedAt: anchor.updatedAt }, data: { updatedAt: new Date(Math.max(Date.now(), anchor.updatedAt.getTime() + 1)) } });
      if (versioned.count !== 1) throw new SchoolUserError("linkConflict");
      await tx.auditLog.create({ data: { schoolId: context.schoolId!, actorUserId: context.userId, action: `schoolUser.${kind}Link.update`, entity: "User", entityId: link.userId, before: { [`${kind}Id`]: link.profile?.id ?? null }, after: { [`${kind}Id`]: input.profileId } } });
    }, { isolationLevel: "ReadCommitted" }));
  } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new SchoolUserError("linkConflict"); throw error; }
}
