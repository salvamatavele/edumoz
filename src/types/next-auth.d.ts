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
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    schoolId?: string | null;
    memberships?: SessionMembership[];
  }
}

declare module "next-auth" {
  interface Profile {
    email_verified?: boolean;
  }
}
