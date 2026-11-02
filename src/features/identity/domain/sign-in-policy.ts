import type { InvitationStatus, Role } from "@/types";

/**
 * Quem pode entrar na plataforma.
 *
 * Esta é a peça de segurança central do modelo de autenticação e vive aqui, como função
 * pura, precisamente para poder ser testada exaustivamente sem Auth.js, sem base de dados
 * e sem browser. Ver docs/specs/domain-foundation.md §3.6.
 *
 * A regra: **o login Google não cria contas.** Autenticar prova quem a pessoa é; não prova
 * que tem alguma coisa a fazer nesta escola. Sem esta separação, qualquer pessoa com uma
 * conta Google entraria numa plataforma multi-escola.
 */

export interface SignInCandidate {
  /** Server-authenticated identity from the credentials provider, never a form field. */
  readonly userId?: string;
  /** E-mail devolvido pelo fornecedor de identidade. */
  readonly email: string | null;
  /**
   * O fornecedor confirmou a posse deste e-mail?
   *
   * Decisivo: sem esta verificação, quem registasse uma conta Google com o e-mail de um
   * director assumiria a identidade dele ao entrar.
   */
  readonly emailVerified: boolean;
  readonly provider: "google" | "credentials";
}

export interface ExistingMembership {
  readonly schoolId: string;
  readonly role: Role;
  readonly status: "ACTIVE" | "SUSPENDED" | "REMOVED";
  /** Domínio de e-mail exigido pela escola, quando definido. */
  readonly allowedEmailDomain: string | null;
}

export interface PendingInvitation {
  readonly id: string;
  readonly schoolId: string;
  readonly role: Role;
  readonly status: InvitationStatus;
  readonly expiresAt: Date;
  readonly allowedEmailDomain: string | null;
}

export interface SignInContext {
  readonly candidate: SignInCandidate;
  readonly memberships: readonly ExistingMembership[];
  readonly invitations: readonly PendingInvitation[];
  readonly isPlatformAdmin: boolean;
  readonly now: Date;
}

export type SignInDecision =
  | { readonly allow: true; readonly acceptInvitationIds: readonly string[] }
  | { readonly allow: false; readonly reason: SignInDenialReason };

export type SignInDenialReason =
  | "NO_EMAIL"
  | "EMAIL_NOT_VERIFIED"
  | "NO_MEMBERSHIP_OR_INVITATION"
  | "ALL_MEMBERSHIPS_SUSPENDED"
  | "EMAIL_DOMAIN_NOT_ALLOWED";

function domainOf(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1).toLowerCase();
}

export function domainAllowed(email: string, allowed: string | null): boolean {
  if (!allowed) return true;
  return domainOf(email) === allowed.replace(/^@/, "").toLowerCase();
}

/**
 * Decide se um início de sessão é permitido e que convites são aceites por ele.
 *
 * Devolve os convites a aceitar em vez de os aceitar: uma função pura não escreve na base
 * de dados. Quem chama é que aplica o efeito, dentro da mesma transacção do login.
 */
export function decideSignIn(context: SignInContext): SignInDecision {
  const { candidate, memberships, invitations, isPlatformAdmin, now } = context;

  if (!candidate.email) {
    return { allow: false, reason: "NO_EMAIL" };
  }

  const email = candidate.email.toLowerCase();

  // Só o Google nos diz se verificou o e-mail. No login por credenciais, a posse do
  // e-mail foi estabelecida no momento em que a escola criou a conta e definiu a
  // palavra-passe — não há terceiro a quem confiar nem a quem enganar.
  if (candidate.provider === "google" && !candidate.emailVerified) {
    return { allow: false, reason: "EMAIL_NOT_VERIFIED" };
  }

  // O administrador da plataforma entra sem pertencer a escola nenhuma. Administrar a
  // plataforma e leccionar numa turma são coisas diferentes — ver `roleIn` em access.ts,
  // que deliberadamente NÃO lhe dá papel dentro das escolas.
  if (isPlatformAdmin) {
    return { allow: true, acceptInvitationIds: [] };
  }

  const active = memberships.filter((m) => m.status === "ACTIVE");

  if (active.length > 0) {
    const withinDomain = active.filter((m) =>
      domainAllowed(email, m.allowedEmailDomain),
    );

    if (withinDomain.length === 0) {
      return { allow: false, reason: "EMAIL_DOMAIN_NOT_ALLOWED" };
    }

    return { allow: true, acceptInvitationIds: [] };
  }

  const usable = invitations.filter(
    (invitation) =>
      invitation.status === "PENDING" &&
      invitation.expiresAt.getTime() > now.getTime() &&
      domainAllowed(email, invitation.allowedEmailDomain),
  );

  if (usable.length > 0) {
    return { allow: true, acceptInvitationIds: usable.map((i) => i.id) };
  }

  // Distinguir "suspenso" de "nunca convidado" importa para a mensagem, mas NÃO deve
  // chegar ao ecrã de login: dizer "a sua conta está suspensa" confirma a um estranho que
  // aquele e-mail existe nesta escola. A distinção serve para os registos de auditoria.
  if (memberships.length > 0) {
    return { allow: false, reason: "ALL_MEMBERSHIPS_SUSPENDED" };
  }

  if (invitations.length > 0) {
    return { allow: false, reason: "NO_MEMBERSHIP_OR_INVITATION" };
  }

  return { allow: false, reason: "NO_MEMBERSHIP_OR_INVITATION" };
}

/**
 * Só existe um convite utilizável de cada vez por escola/e-mail/papel.
 *
 * A base de dados deixou de impor isto com um índice único, para permitir reconvidar
 * alguém depois de o convite ser aceite ou revogado (ver a nota no `schema.prisma`).
 * A regra passou para aqui.
 */
export function canCreateInvitation(
  existing: readonly Pick<PendingInvitation, "status" | "expiresAt">[],
  now: Date,
): boolean {
  return !existing.some(
    (invitation) =>
      invitation.status === "PENDING" && invitation.expiresAt.getTime() > now.getTime(),
  );
}
