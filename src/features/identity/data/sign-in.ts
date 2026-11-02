import { prisma } from "@/lib/db/client";
import { withTransactionRetry } from "@/lib/db/transaction-retry";

import {
  type SignInCandidate,
  type SignInDecision,
  decideSignIn,
  domainAllowed,
} from "../domain/sign-in-policy";

/**
 * Carrega o contexto de um início de sessão e aplica a política.
 *
 * A decisão é da função pura em `domain/sign-in-policy.ts`; aqui só se lê a base de dados
 * e se escreve o efeito. Esta camada é deliberadamente fina — quanto menos regra houver
 * aqui, mais regra fica testável sem base de dados.
 */
export async function authoriseSignIn(
  candidate: SignInCandidate,
  now = new Date(),
): Promise<SignInDecision> {
  if (candidate.provider === "credentials") {
    if (!candidate.userId) return { allow: false, reason: "NO_MEMBERSHIP_OR_INVITATION" };
    const user = await prisma.user.findUnique({
      where: { id: candidate.userId },
      select: { isActive: true, isPlatformAdmin: true, memberships: { select: { status: true, school: { select: { isActive: true } } } } },
    });
    if (!user) return { allow: false, reason: "NO_MEMBERSHIP_OR_INVITATION" };
    if (!user.isActive) return { allow: false, reason: "ALL_MEMBERSHIPS_SUSPENDED" };
    if (user.isPlatformAdmin || user.memberships.some((membership) => membership.status === "ACTIVE" && membership.school.isActive)) {
      return { allow: true, acceptInvitationIds: [] };
    }
    return { allow: false, reason: user.memberships.length ? "ALL_MEMBERSHIPS_SUSPENDED" : "NO_MEMBERSHIP_OR_INVITATION" };
  }

  if (!candidate.email) {
    return decideSignIn({
      candidate,
      memberships: [],
      invitations: [],
      isPlatformAdmin: false,
      now,
    });
  }

  const email = candidate.email.toLowerCase();

  const [user, invitations] = await Promise.all([
    prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        isActive: true,
        isPlatformAdmin: true,
        memberships: {
          select: {
            schoolId: true,
            role: true,
            status: true,
            school: { select: { allowedEmailDomain: true, isActive: true } },
          },
        },
      },
    }),
    prisma.invitation.findMany({
      where: { email },
      select: {
        id: true,
        schoolId: true,
        role: true,
        status: true,
        expiresAt: true,
        school: { select: { allowedEmailDomain: true, isActive: true } },
      },
    }),
  ]);

  // Uma escola desactivada não deixa ninguém entrar por ela. Filtra-se aqui, e não na
  // política, porque é um facto sobre o estado da base de dados e não uma regra de acesso.
  const memberships = (user?.memberships ?? [])
    .filter((m) => m.school.isActive)
    .map((m) => ({
      schoolId: m.schoolId,
      role: m.role,
      status: m.status,
      allowedEmailDomain: m.school.allowedEmailDomain,
    }));

  const usableInvitations = invitations
    .filter((invitation) => invitation.school.isActive)
    .map((invitation) => ({
      id: invitation.id,
      schoolId: invitation.schoolId,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      allowedEmailDomain: invitation.school.allowedEmailDomain,
    }));

  if (user && !user.isActive) {
    return { allow: false, reason: "ALL_MEMBERSHIPS_SUSPENDED" };
  }

  return decideSignIn({
    candidate,
    memberships,
    invitations: usableInvitations,
    isPlatformAdmin: user?.isPlatformAdmin ?? false,
    now,
  });
}

/**
 * Converte convites em `Membership`, numa transacção.
 *
 * Atómico de propósito: um convite marcado como aceite sem a Membership correspondente
 * deixaria o utilizador para sempre sem acesso E sem possibilidade de ser reconvidado.
 */
export async function acceptInvitations(
  userId: string,
  invitationIds: readonly string[],
  now = new Date(),
): Promise<void> {
  if (invitationIds.length === 0) return;

  const candidates = await prisma.invitation.findMany({ where: { id: { in: [...invitationIds] }, status: "PENDING" }, select: { schoolId: true } });
  await withTransactionRetry(() => prisma.$transaction(async (tx) => {
    // Same school-first lock order as retirement; reread invitations after the lock.
    const schools: string[] = [];
    for (const schoolId of [...new Set(candidates.map(row => row.schoolId))].sort()) {
      const locked = await tx.school.updateMany({ where: { id: schoolId, isActive: true }, data: { isActive: true } });
      if (locked.count === 1) schools.push(schoolId);
    }
    const holder = await tx.user.findUnique({ where: { id: userId }, select: { email: true, isActive: true, passwordChangeRequired: true } });
    if (!holder?.isActive || holder.passwordChangeRequired || !holder.email) return;
    const invitations = await tx.invitation.findMany({
      where: { id: { in: [...invitationIds] }, schoolId: { in: schools }, email: holder.email, status: "PENDING", expiresAt: { gt: now } },
      select: { id: true, schoolId: true, role: true, school: { select: { allowedEmailDomain: true } } },
    });
    const accepted = invitations.filter(invitation => domainAllowed(holder.email!, invitation.school.allowedEmailDomain));
    for (const invitation of accepted) {
      await tx.membership.upsert({
        where: { userId_schoolId_role: { userId, schoolId: invitation.schoolId, role: invitation.role } },
        create: { userId, schoolId: invitation.schoolId, role: invitation.role },
        update: { status: "ACTIVE" },
      });
    }
    await tx.invitation.updateMany({
      where: { id: { in: accepted.map(row => row.id) }, status: "PENDING" },
      data: { status: "ACCEPTED", acceptedAt: now, acceptedByUserId: userId },
    });
  }, { isolationLevel: "ReadCommitted" }));
}

/** Papéis e escolas do utilizador, para a sessão. */
export async function loadSessionMemberships(userId: string) {
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
  }));
}

/**
 * `User.isPlatformAdmin`, para o `jwt` callback carregar no login. Separado de
 * `loadSessionMemberships` porque um superadmin nem sempre tem `Membership` nenhuma —
 * o seu acesso não depende de uma.
 */
export async function loadIsPlatformAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPlatformAdmin: true },
  });

  return user?.isPlatformAdmin ?? false;
}

export async function findUserForCredentials(identifier: string) {
  const value = identifier.trim().toLowerCase();

  // Alunos e encarregados identificam-se muitas vezes por telemóvel e não por e-mail.
  const phone = /^(?:\+?258)?8[2-7]\d{7}$/.test(value) ? value.slice(-9) : null;
  const candidates = await prisma.user.findMany({
    take: 2,
    where: {
      isActive: true,
      OR: [{ email: value }, { phone: { in: phone ? [phone, `258${phone}`, `+258${phone}`] : [identifier.trim()] } }, { loginCode: value.toUpperCase() }],
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      passwordHash: true,
      authVersion: true,
      passwordChangeRequired: true,
      passwordExpiresAt: true,
      isPlatformAdmin: true,
    },
  });
  return candidates.length === 1 ? candidates[0] : null;
}
