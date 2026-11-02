import { z } from "zod";

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(1024),
  newPassword: z.string().min(12).max(128),
  confirmPassword: z.string().min(1).max(128),
}).refine(value => value.newPassword === value.confirmPassword, { path: ["confirmPassword"], message: "mismatch" });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type PasswordChangeErrorCode = "forbidden" | "invalid" | "currentPassword" | "samePassword" | "rateLimited" | "conflict";
export class PasswordChangeError extends Error {
  constructor(readonly code: PasswordChangeErrorCode) { super(code); }
}
