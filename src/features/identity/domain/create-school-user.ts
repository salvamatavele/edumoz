import type { SchoolMutationScope } from "./school-users";
import { z } from "zod";

export const SCHOOL_ACCOUNT_ROLES = ["SCHOOL_MANAGER", "TEACHER", "STUDENT", "GUARDIAN"] as const;
export const INITIAL_PASSWORD_VALIDITY_MS = 24 * 60 * 60 * 1000;
export const createSchoolUserSchema = z.object({
  requestId: z.uuid(),
  name: z.string().trim().min(3).max(191),
  email: z.string().trim().pipe(z.union([z.email().max(254), z.literal("")])).default("").transform(value => value.toLowerCase()),
  phone: z.string().trim().regex(/^(?:\+?258)?(?:8[2-7]\d{7})$|^$/).default("").transform(value => value ? `+258${value.slice(-9)}` : ""),
  roles: z.array(z.enum(SCHOOL_ACCOUNT_ROLES)).min(1).max(4).refine(roles => new Set(roles).size === roles.length),
  teacherCode: z.string().trim().max(64).default(""),
}).refine(input => !input.teacherCode || input.roles.includes("TEACHER"), { path: ["teacherCode"], message: "teacherRoleRequired" });
export type CreateSchoolUserInput = z.input<typeof createSchoolUserSchema> & SchoolMutationScope;
export type CreatedSchoolCredential = {
  readonly userId: string;
  readonly loginCode: string;
  readonly name: string;
  readonly schoolName: string;
  readonly expiresAt: string;
  readonly password: string;
};
export type CreateSchoolUserResult = { status: "created"; credential: CreatedSchoolCredential } | { status: "alreadyCreated"; userId: string };

export const reissueInitialCredentialSchema = z.object({ requestId: z.uuid(), userId: z.string().trim().min(1).max(191) });
export type ReissueInitialCredentialInput = z.infer<typeof reissueInitialCredentialSchema> & SchoolMutationScope;
