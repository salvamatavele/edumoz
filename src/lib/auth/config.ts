import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import {
  acceptInvitations,
  authoriseSignIn,
} from "@/features/identity/data/sign-in";
import { resolveActiveSchool, type PermissionGrant } from "@/features/identity/domain/access";
import { prisma } from "@/lib/db/client";
import type { Role } from "@/types";

import { authenticateCredentials } from "./credential-authentication";
import { revokeSignedSession, validateRegisteredSession } from "./session-registry";
import { safeAuthLogger } from "./safe-logger";
import { loadEffectiveSessionAccess } from "./session-access";

/**
 * Forma do JWT desta aplicação.
 *
 * A augmentação de módulo do `next-auth/jwt` não aplica de forma fiável na v5 beta, e um
 * token mal tipado é pior do que um cast explícito: os campos passariam a `any` sem
 * ninguém dar por isso. Este tipo é a fonte de verdade, e o cast está confinado aqui.
 */
type AppToken = {
  userId?: string;
  sessionNonce?: string;
  authSessionId?: string;
  authVersion?: number;
  passwordChangeRequired?: boolean;
  schoolId?: string | null;
  memberships?: Array<{ schoolId: string; schoolName: string; role: Role }>;
  isPlatformAdmin?: boolean;
  role?: Role | null;
  permissionRoleId?: string | null;
  permissionsConfigured?: boolean;
  permissions?: PermissionGrant[];
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
  logger: safeAuthLogger,
  debug: false,

  // JWT identifies the account; current privileges are reloaded on every session request.
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },

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
      authorize: authenticateCredentials,
    }),
  ],

  events: {
    async signOut(message) {
      if ("token" in message && message.token) await revokeSignedSession(message.token);
    },
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      const provider = account?.provider === "google" ? "google" : "credentials";

      const decision = await authoriseSignIn({
        userId: provider === "credentials" ? user.id : undefined,
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
      }

      let access = await loadEffectiveSessionAccess(app.userId ?? "", user?.id ? undefined : app.schoolId ?? null);
      if (!access) return null;
      if (user?.id) {
        // A credential check made before a concurrent password change cannot mint a new session.
        if (user.authVersion !== undefined && user.authVersion !== access.authVersion) return null;
        app.authVersion = access.authVersion;
      } else if ((app.authVersion ?? 0) !== access.authVersion) {
        // Legacy tokens are valid only until the first credential change.
        return null;
      }
      app.authVersion = access.authVersion;
      const requested = (session as { schoolId?: unknown } | undefined)?.schoolId;

      if (trigger === "update" && typeof requested === "string") {
        const selected = resolveActiveSchool(
          access.memberships, requested, access.schoolId, access.isPlatformAdmin,
        );
        if (selected !== access.schoolId) {
          const updated = await loadEffectiveSessionAccess(access.userId, selected);
          if (!updated || updated.authVersion !== app.authVersion) return null;
          if (updated.schoolId) access = updated;
        }
      }

      const registered = await validateRegisteredSession({ ...token, userId: access.userId, authVersion: access.authVersion }, Boolean(user?.id));
      if (!registered) return null;
      app.sessionNonce = registered.sessionNonce;
      app.authSessionId = registered.authSessionId;

      app.passwordChangeRequired = access.passwordChangeRequired;
      app.memberships = access.memberships;
      app.schoolId = access.schoolId;
      app.role = access.role;
      app.isPlatformAdmin = access.isPlatformAdmin;
      app.permissionRoleId = access.permissionRoleId;
      app.permissionsConfigured = access.permissionsConfigured ?? Boolean(access.permissionRoleId);
      app.permissions = access.permissions;
      token.name = access.user.name;
      token.email = access.user.email;
      token.picture = access.user.image;
      return token;
    },

    session({ session, token }) {
      const app = token as AppToken;

      session.user.id = app.userId ?? "";
      session.user.authVersion = app.authVersion ?? 0;
      session.user.authSessionId = app.authSessionId;
      session.passwordChangeRequired = app.passwordChangeRequired ?? false;
      session.schoolId = app.schoolId ?? null;
      session.memberships = app.memberships ?? [];
      session.role = app.role ?? null;
      session.isPlatformAdmin = app.isPlatformAdmin ?? false;
      session.permissionRoleId = app.permissionRoleId ?? null;
      session.permissionsConfigured = app.permissionsConfigured ?? Boolean(app.permissionRoleId);
      session.permissions = app.permissions ?? [];

      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
