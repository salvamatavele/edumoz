import type { Role } from "@/generated/prisma/enums";
import type { PermissionGrant } from "@/features/identity/domain/access";

/**
 * Extensões à sessão do Auth.js.
 *
 * O papel NÃO vive no utilizador — vive na escola activa. Um professor numa escola pode
 * ser encarregado de educação noutra, e a sessão tem de dizer qual das duas está a ver.
 */
interface SessionMembership {
  schoolId: string;
  schoolName: string;
  role: Role;
}

declare module "next-auth" {
  interface User {
    authVersion?: number;
  }
  interface Session {
    passwordChangeRequired?: boolean;
    user: {
      id: string;
      authVersion?: number;
      authSessionId?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    /** Escola activa. Nula enquanto o utilizador não escolher, se tiver várias. */
    schoolId: string | null;
    /** Papel NA escola activa. */
    role: Role | null;
    memberships: SessionMembership[];
    /**
     * Superadmin da plataforma — acesso total, a qualquer escola, sem depender de
     * `Membership`. Reloaded from persisted state on every authenticated request.
     */
    isPlatformAdmin: boolean;
    permissionRoleId?: string | null;
    permissionsConfigured?: boolean;
    permissions?: readonly PermissionGrant[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    schoolId?: string | null;
    memberships?: SessionMembership[];
    isPlatformAdmin?: boolean;
  }
}

declare module "next-auth" {
  interface Profile {
    email_verified?: boolean;
  }
}
