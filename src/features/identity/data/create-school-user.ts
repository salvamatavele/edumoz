import { createHash, randomBytes } from "node:crypto";
import { hasPermission, type SessionContext } from "@/features/identity/domain/access";
import { createSchoolUserSchema, reissueInitialCredentialSchema, INITIAL_PASSWORD_VALIDITY_MS, type CreateSchoolUserResult } from "@/features/identity/domain/create-school-user";
import { SchoolUserError } from "@/features/identity/domain/school-users";
import { hashPassword } from "@/lib/auth/password";
import { consumeAccountMutationAttempt } from "@/lib/auth/credential-throttle";
import { prisma } from "@/lib/db/client";
import { Prisma } from "@/lib/db/errors";
import { withTransactionRetry } from "@/lib/db/transaction-retry";
import { authorizeSchoolIdentityMutation } from "./school-identity-authorization";

/** Create a new global identity only; existing identities require a separate verified invitation. */
export async function createSchoolUser(context: SessionContext, input: unknown): Promise<CreateSchoolUserResult> {
  if (!context.schoolId || !hasPermission(context, "users", "create")) throw new SchoolUserError("forbidden");
  const parsed = createSchoolUserSchema.safeParse(input);
  if (!parsed.success) throw new SchoolUserError("invalid");
  const data = parsed.data;
  const schoolId = context.schoolId;
  const creationKey = createHash("sha256").update(JSON.stringify([schoolId, context.userId, data.requestId])).digest("hex");
  if (!(await consumeAccountMutationAttempt(context.userId, "school-user-create"))) throw new SchoolUserError("rateLimited");
  const password = randomBytes(32).toString("base64url");
  const passwordHash = await hashPassword(password);
  const loginCode = `EDU-${randomBytes(12).toString("hex").toUpperCase()}`;
  try {
    return await withTransactionRetry(() => prisma.$transaction(async tx => {
      const actor = await authorizeSchoolIdentityMutation(tx, context, "create");
      const existing = await tx.user.findUnique({ where: { creationKey }, select: { id: true } });
      if (existing) return { status: "alreadyCreated", userId: existing.id };
      if (data.roles.includes("SCHOOL_MANAGER") && !actor.unrestricted) throw new SchoolUserError("protectedAccount");
      // Communication contacts never query or bind a global authentication identity.
      const teacher = data.teacherCode ? await tx.teacher.findFirst({ where: { schoolId, code: data.teacherCode, userId: null }, select: { id: true } }) : null;
      if (data.teacherCode && !teacher) throw new SchoolUserError("creationUnavailable");
      const school = await tx.school.findUniqueOrThrow({ where: { id: schoolId }, select: { name: true } });
      const expiresAt = new Date(Date.now() + INITIAL_PASSWORD_VALIDITY_MS);
      const user = await tx.user.create({ data: {
        name: data.name, contactEmail: data.email || null, contactPhone: data.phone || null, loginCode, creationKey,
        passwordHash, passwordChangeRequired: true, passwordExpiresAt: expiresAt,
        memberships: { create: data.roles.map(role => ({ schoolId, role })) },
      }, select: { id: true } });
      if (teacher) {
        const linked = await tx.teacher.updateMany({ where: { id: teacher.id, schoolId, userId: null }, data: { userId: user.id } });
        if (linked.count !== 1) throw new SchoolUserError("creationUnavailable");
      }
      await tx.auditLog.create({ data: { schoolId, actorUserId: context.userId, action: "schoolUser.create", entity: "User", entityId: user.id,
        after: { roles: data.roles, teacherId: teacher?.id ?? null, initialPasswordRequired: true } } });
      return { status: "created", credential: { userId: user.id, name: data.name, schoolName: school.name, loginCode, password, expiresAt: expiresAt.toISOString() } };
    }, { isolationLevel: "ReadCommitted" }));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new SchoolUserError("creationUnavailable");
    throw error;
  }
}

/** Reissue only an unactivated, school-exclusive account; never reset an established shared identity. */
export async function reissueInitialSchoolCredential(context: SessionContext, input: unknown): Promise<CreateSchoolUserResult> {
  if (!context.schoolId || !hasPermission(context, "users", "create")) throw new SchoolUserError("forbidden");
  const parsed = reissueInitialCredentialSchema.safeParse(input);
  if (!parsed.success) throw new SchoolUserError("invalid");
  const schoolId = context.schoolId;
  const { userId, requestId } = parsed.data;
  const requestKey = createHash("sha256").update(JSON.stringify(["initial-reissue", schoolId, context.userId, userId, requestId])).digest("hex");
  if (!(await consumeAccountMutationAttempt(context.userId, "school-user-create"))) throw new SchoolUserError("rateLimited");
  const password = randomBytes(32).toString("base64url");
  const passwordHash = await hashPassword(password);
  return withTransactionRetry(() => prisma.$transaction(async tx => {
    const actor = await authorizeSchoolIdentityMutation(tx, context, "create");
    const previous = await tx.auditLog.findFirst({ where: { schoolId, actorUserId: context.userId, entity: "User", entityId: userId, action: "schoolUser.initialCredential.reissue", after: { path: "$.requestKey", equals: requestKey } }, select: { id: true } });
    if (previous) return { status: "alreadyCreated", userId };
    const target = await tx.user.findFirst({ where: {
      id: userId, isActive: true, isPlatformAdmin: false, passwordChangeRequired: true, loginCode: { not: null },
      memberships: { some: { schoolId, status: "ACTIVE" }, every: { schoolId } },
    }, select: { id: true, name: true, loginCode: true, authVersion: true, memberships: { where: { schoolId }, select: { role: true } } } });
    if (!target || !target.loginCode) throw new SchoolUserError("creationUnavailable");
    if (!actor.unrestricted && target.memberships.some(member => member.role === "SCHOOL_MANAGER" || member.role === "PLATFORM_ADMIN")) throw new SchoolUserError("protectedAccount");
    const expiresAt = new Date(Date.now() + INITIAL_PASSWORD_VALIDITY_MS);
    const updated = await tx.user.updateMany({ where: { id: userId, isActive: true, passwordChangeRequired: true, authVersion: target.authVersion, memberships: { every: { schoolId } } }, data: { passwordHash, passwordExpiresAt: expiresAt, authVersion: { increment: 1 } } });
    if (updated.count !== 1) throw new SchoolUserError("creationUnavailable");
    await tx.session.deleteMany({ where: { userId } });
    await tx.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.auditLog.create({ data: { schoolId, actorUserId: context.userId, action: "schoolUser.initialCredential.reissue", entity: "User", entityId: userId, after: { requestKey, initialPasswordRequired: true, sessionsRevoked: true } } });
    const school = await tx.school.findUniqueOrThrow({ where: { id: schoolId }, select: { name: true } });
    return { status: "created", credential: { userId, name: target.name ?? "", schoolName: school.name, loginCode: target.loginCode, password, expiresAt: expiresAt.toISOString() } };
  }, { isolationLevel: "ReadCommitted" }));
}
