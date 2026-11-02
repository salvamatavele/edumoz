import { z } from "zod";

export const SCHOOL_USER_PAGE_SIZE = 25;
export const schoolUserQuerySchema = z.object({
  q: z.string().trim().max(100).default(""),
  role: z.enum(["", "SCHOOL_MANAGER", "TEACHER", "STUDENT", "GUARDIAN"]).default(""),
  status: z.enum(["", "ACTIVE", "SUSPENDED", "DISABLED"]).default(""),
  link: z.enum(["", "teacher", "staff", "student", "guardian", "none"]).default(""),
  page: z.coerce.number().int().min(1).max(1000000).default(1),
});
export type SchoolUserQuery = z.infer<typeof schoolUserQuerySchema>;
export const schoolUserStatusSchema = z.object({
  userId: z.string().trim().min(1).max(191),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});
export interface SchoolMutationScope { readonly expectedSchoolId: string }
export function matchesSchoolMutationScope(schoolId: string | null, expectedSchoolId: unknown): boolean {
  return typeof expectedSchoolId === "string" && !!schoolId && expectedSchoolId === schoolId;
}
export type SchoolUserStatusInput = z.infer<typeof schoolUserStatusSchema> & SchoolMutationScope;
export type SchoolUserErrorCode = "forbidden" | "invalid" | "notFound" | "protectedAccount" | "lastManager" | "disabledAccount" | "creationUnavailable" | "rateLimited" | "schoolChanged" | "editUnavailable" | "editConflict" | "linkUnavailable" | "linkConflict" | "staffLinkUnavailable" | "removalConflict";
export class SchoolUserError extends Error {
  constructor(readonly code: SchoolUserErrorCode) { super(code); this.name = "SchoolUserError"; }
}
