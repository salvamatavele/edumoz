import { describe, expect, it } from "vitest";

import { InvitationStatus, Role } from "@/types";

import {
  type ExistingMembership,
  type PendingInvitation,
  type SignInContext,
  canCreateInvitation,
  decideSignIn,
} from "./sign-in-policy";

const NOW = new Date("2026-08-16T08:00:00.000Z");
const TOMORROW = new Date("2026-08-17T08:00:00.000Z");
const YESTERDAY = new Date("2026-08-15T08:00:00.000Z");

function membership(overrides: Partial<ExistingMembership> = {}): ExistingMembership {
  return {
    schoolId: "escola-a",
    role: Role.TEACHER,
    status: "ACTIVE",
    allowedEmailDomain: null,
    ...overrides,
  };
}

function invitation(overrides: Partial<PendingInvitation> = {}): PendingInvitation {
  return {
    id: "convite-1",
    schoolId: "escola-a",
    role: Role.TEACHER,
    status: InvitationStatus.PENDING,
    expiresAt: TOMORROW,
    allowedEmailDomain: null,
    ...overrides,
  };
}

function context(overrides: Partial<SignInContext> = {}): SignInContext {
  return {
    candidate: {
      email: "amelia@escola.co.mz",
      emailVerified: true,
      provider: "google",
    },
    memberships: [],
    invitations: [],
    isPlatformAdmin: false,
    now: NOW,
    ...overrides,
  };
}

describe("decideSignIn — o Google não cria contas", () => {
  it("recusa quem não tem nem Membership nem convite", () => {
    // O caso central: alguém com conta Google válida, mas sem nada a fazer aqui.
    expect(decideSignIn(context())).toEqual({
      allow: false,
      reason: "NO_MEMBERSHIP_OR_INVITATION",
    });
  });

  it("aceita quem já tem Membership activa", () => {
    const decision = decideSignIn(context({ memberships: [membership()] }));

    expect(decision).toEqual({ allow: true, acceptInvitationIds: [] });
  });

  it("aceita um convite válido e devolve-o para ser aceite", () => {
    const decision = decideSignIn(context({ invitations: [invitation()] }));

    expect(decision).toEqual({ allow: true, acceptInvitationIds: ["convite-1"] });
  });

  it("não aceita convites — devolve-os", () => {
    // Uma função pura não escreve na base de dados. Quem chama aplica o efeito dentro da
    // transacção do login, o que torna a operação atómica.
    const invitations = [invitation()];
    decideSignIn(context({ invitations }));

    expect(invitations[0].status).toBe(InvitationStatus.PENDING);
  });
});

describe("decideSignIn — verificação de e-mail", () => {
  it("recusa um e-mail Google não verificado", () => {
    // Sem isto, registar uma conta Google com o e-mail de um director dava acesso à
    // conta dele.
    const decision = decideSignIn(
      context({
        candidate: {
          email: "director@escola.co.mz",
          emailVerified: false,
          provider: "google",
        },
        memberships: [membership({ role: Role.SCHOOL_MANAGER })],
      }),
    );

    expect(decision).toEqual({ allow: false, reason: "EMAIL_NOT_VERIFIED" });
  });

  it("não exige verificação no login por credenciais", () => {
    // Aqui não há terceiro a quem confiar: a escola criou a conta e definiu a palavra-passe.
    const decision = decideSignIn(
      context({
        candidate: {
          email: "encarregado@gmail.com",
          emailVerified: false,
          provider: "credentials",
        },
        memberships: [membership({ role: Role.GUARDIAN })],
      }),
    );

    expect(decision).toEqual({ allow: true, acceptInvitationIds: [] });
  });

  it("recusa quando não há e-mail nenhum", () => {
    expect(
      decideSignIn(
        context({
          candidate: { email: null, emailVerified: true, provider: "google" },
        }),
      ),
    ).toEqual({ allow: false, reason: "NO_EMAIL" });
  });
});

describe("decideSignIn — convites", () => {
  it("recusa um convite expirado", () => {
    const decision = decideSignIn(
      context({ invitations: [invitation({ expiresAt: YESTERDAY })] }),
    );

    expect(decision.allow).toBe(false);
  });

  it("recusa um convite já aceite", () => {
    const decision = decideSignIn(
      context({ invitations: [invitation({ status: InvitationStatus.ACCEPTED })] }),
    );

    expect(decision.allow).toBe(false);
  });

  it("recusa um convite revogado", () => {
    const decision = decideSignIn(
      context({ invitations: [invitation({ status: InvitationStatus.REVOKED })] }),
    );

    expect(decision.allow).toBe(false);
  });

  it("aceita vários convites de escolas diferentes de uma vez", () => {
    const decision = decideSignIn(
      context({
        invitations: [
          invitation({ id: "c1", schoolId: "escola-a" }),
          invitation({ id: "c2", schoolId: "escola-b" }),
        ],
      }),
    );

    expect(decision).toEqual({ allow: true, acceptInvitationIds: ["c1", "c2"] });
  });
});

describe("decideSignIn — domínio de e-mail da escola", () => {
  it("aceita um e-mail do domínio exigido", () => {
    const decision = decideSignIn(
      context({
        candidate: {
          email: "amelia@escolax.co.mz",
          emailVerified: true,
          provider: "google",
        },
        memberships: [membership({ allowedEmailDomain: "escolax.co.mz" })],
      }),
    );

    expect(decision.allow).toBe(true);
  });

  it("recusa um e-mail fora do domínio exigido", () => {
    const decision = decideSignIn(
      context({
        candidate: {
          email: "amelia@gmail.com",
          emailVerified: true,
          provider: "google",
        },
        memberships: [membership({ allowedEmailDomain: "escolax.co.mz" })],
      }),
    );

    expect(decision).toEqual({ allow: false, reason: "EMAIL_DOMAIN_NOT_ALLOWED" });
  });

  it("tolera o domínio escrito com @ à frente e maiúsculas", () => {
    const decision = decideSignIn(
      context({
        candidate: {
          email: "Amelia@EscolaX.co.MZ",
          emailVerified: true,
          provider: "google",
        },
        memberships: [membership({ allowedEmailDomain: "@EscolaX.CO.MZ" })],
      }),
    );

    expect(decision.allow).toBe(true);
  });

  it("basta uma escola compatível quando o utilizador pertence a várias", () => {
    const decision = decideSignIn(
      context({
        candidate: {
          email: "amelia@gmail.com",
          emailVerified: true,
          provider: "google",
        },
        memberships: [
          membership({ schoolId: "escola-a", allowedEmailDomain: "escolax.co.mz" }),
          membership({ schoolId: "escola-b", allowedEmailDomain: null }),
        ],
      }),
    );

    expect(decision.allow).toBe(true);
  });
});

describe("decideSignIn — contas suspensas e administrador", () => {
  it("recusa quem só tem Membership suspensa", () => {
    const decision = decideSignIn(
      context({ memberships: [membership({ status: "SUSPENDED" })] }),
    );

    expect(decision).toEqual({ allow: false, reason: "ALL_MEMBERSHIPS_SUSPENDED" });
  });

  it("aceita quem tem uma suspensa e outra activa", () => {
    const decision = decideSignIn(
      context({
        memberships: [
          membership({ schoolId: "escola-a", status: "SUSPENDED" }),
          membership({ schoolId: "escola-b", status: "ACTIVE" }),
        ],
      }),
    );

    expect(decision.allow).toBe(true);
  });

  it("deixa entrar o administrador da plataforma sem escola nenhuma", () => {
    const decision = decideSignIn(context({ isPlatformAdmin: true }));

    expect(decision).toEqual({ allow: true, acceptInvitationIds: [] });
  });
});

describe("canCreateInvitation", () => {
  it("permite convidar quando não há nenhum pendente", () => {
    expect(canCreateInvitation([], NOW)).toBe(true);
  });

  it("impede um segundo convite pendente para o mesmo papel", () => {
    expect(
      canCreateInvitation(
        [{ status: InvitationStatus.PENDING, expiresAt: TOMORROW }],
        NOW,
      ),
    ).toBe(false);
  });

  it("permite reconvidar depois de aceite — o caso que o índice único bloqueava", () => {
    // Um professor que sai e volta tem de poder ser convidado de novo.
    expect(
      canCreateInvitation(
        [{ status: InvitationStatus.ACCEPTED, expiresAt: YESTERDAY }],
        NOW,
      ),
    ).toBe(true);
  });

  it("permite reconvidar depois de revogado ou expirado", () => {
    expect(
      canCreateInvitation(
        [
          { status: InvitationStatus.REVOKED, expiresAt: TOMORROW },
          { status: InvitationStatus.PENDING, expiresAt: YESTERDAY },
        ],
        NOW,
      ),
    ).toBe(true);
  });
});
