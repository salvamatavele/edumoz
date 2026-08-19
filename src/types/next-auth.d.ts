import type { Role } from "@/generated/prisma/enums";

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
  interface Session {
    user: {
      id: string;
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
     * `Membership`. Lido uma vez no login (`User.isPlatformAdmin`); não muda ao trocar
     * de escola, ao contrário de `role`.
     */
    isPlatformAdmin: boolean;
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
