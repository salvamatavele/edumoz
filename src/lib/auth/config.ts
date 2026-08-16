import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import {
  acceptInvitations,
  authoriseSignIn,
  findUserForCredentials,
  loadSessionMemberships,
} from "@/features/identity/data/sign-in";
import { prisma } from "@/lib/db/client";
import type { Role } from "@/types";

import { verifyPassword } from "./password";

/**
 * Forma do JWT desta aplicação.
 *
 * A augmentação de módulo do `next-auth/jwt` não aplica de forma fiável na v5 beta, e um
 * token mal tipado é pior do que um cast explícito: os campos passariam a `any` sem
 * ninguém dar por isso. Este tipo é a fonte de verdade, e o cast está confinado aqui.
 */
type AppToken = {
  userId?: string;
  schoolId?: string | null;
  memberships?: Array<{ schoolId: string; schoolName: string; role: Role }>;
};

/**
 * Auth.js v5.
 *
 * Ver docs/specs/domain-foundation.md §3.6. As duas decisões estruturantes:
 *
 * 1. O `signIn` recusa quem não tem `Membership` nem convite válido, e recusa ANTES de o
 *    adaptador criar o `User` — o login Google não cria contas.
 * 2. `allowDangerousEmailAccountLinking` fica a `false`. Ligar uma conta Google a um
 *    utilizador existente só acontece com `email_verified`, verificado na política.
 */
export const authConfig = {
  adapter: PrismaAdapter(prisma),

  // JWT e não sessão em base de dados: o papel muda com a escola activa, e reler a
  // Membership a cada pedido seria uma consulta extra em todas as páginas.
  session: { strategy: "jwt" },

  pages: { signIn: "/entrar", error: "/entrar" },

  providers: [
    Google({
      allowDangerousEmailAccountLinking: false,
      authorization: {
        params: { prompt: "select_account", access_type: "offline" },
      },
    }),

    Credentials({
      // Para alunos e encarregados de educação, que em Moçambique muitas vezes não têm
      // conta Google e se identificam por número de telemóvel.
      credentials: {
        identifier: { label: "E-mail ou telemóvel", type: "text" },
        password: { label: "Palavra-passe", type: "password" },
      },
      async authorize(credentials) {
        const identifier = String(credentials?.identifier ?? "");
        const password = String(credentials?.password ?? "");

        if (!identifier || !password) return null;

        const user = await findUserForCredentials(identifier);

        // `verifyPassword` devolve false — nunca lança — quando não há hash. Uma conta só
        // com Google e uma palavra-passe errada têm de ser indistinguíveis daqui de fora.
        if (!user || !(await verifyPassword(password, user.passwordHash))) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      const provider = account?.provider === "google" ? "google" : "credentials";

      const decision = await authoriseSignIn({
        email: user.email ?? null,
        emailVerified:
          provider === "google" ? profile?.email_verified === true : true,
        provider,
      });

      if (!decision.allow) {
        // A razão vai para os registos, não para o ecrã: dizer "conta suspensa" a quem
        // tenta entrar confirma a um estranho que aquele e-mail existe nesta escola.
        console.warn(
          `[auth] início de sessão recusado (${decision.reason}) via ${provider}`,
        );
        return false;
      }

      if (user.id && decision.acceptInvitationIds.length > 0) {
        await acceptInvitations(user.id, decision.acceptInvitationIds);
      }

      return true;
    },

    async jwt({ token, user, trigger, session }) {
      const app = token as AppToken;

      if (user?.id) {
        app.userId = user.id;
        app.memberships = await loadSessionMemberships(user.id);
        app.schoolId = app.memberships[0]?.schoolId ?? null;
      }

      // Trocar de escola reemite o token com o papel dessa escola. A escola pedida é
      // validada contra as Membership do token — sem isto, bastaria pedir a troca para
      // qualquer schoolId e a sessão passaria a apontar para uma escola alheia.
      const requested = (session as { schoolId?: unknown } | undefined)?.schoolId;

      if (trigger === "update" && typeof requested === "string") {
        const allowed = app.memberships?.some((m) => m.schoolId === requested);
        if (allowed) app.schoolId = requested;
      }

      return token;
    },

    session({ session, token }) {
      const app = token as AppToken;

      session.user.id = app.userId ?? "";
      session.schoolId = app.schoolId ?? null;
      session.memberships = app.memberships ?? [];
      session.role =
        app.memberships?.find((m) => m.schoolId === app.schoolId)?.role ?? null;

      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
