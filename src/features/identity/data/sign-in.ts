import { prisma } from "@/lib/db/client";

import {
  type SignInCandidate,
  type SignInDecision,
  decideSignIn,
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

  await prisma.$transaction(async (tx) => {
    const invitations = await tx.invitation.findMany({
      where: { id: { in: [...invitationIds] }, status: "PENDING" },
      select: { id: true, schoolId: true, role: true },
    });

    for (const invitation of invitations) {
      await tx.membership.upsert({
        where: {
          userId_schoolId_role: {
            userId,
            schoolId: invitation.schoolId,
            role: invitation.role,
          },
        },
        create: { userId, schoolId: invitation.schoolId, role: invitation.role },
        update: { status: "ACTIVE" },
      });
    }

    await tx.invitation.updateMany({
      where: { id: { in: invitations.map((i) => i.id) } },
      data: { status: "ACCEPTED", acceptedAt: now, acceptedByUserId: userId },
    });
  });
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
  return prisma.user.findFirst({
    where: {
      isActive: true,
      OR: [{ email: value }, { phone: identifier.trim() }],
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      passwordHash: true,
      isPlatformAdmin: true,
    },
  });
}
