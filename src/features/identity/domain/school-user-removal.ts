import { z } from "zod";
export const schoolUserRemovalTargetSchema = z.object({ userId: z.string().trim().min(1).max(191) });
export const schoolUserRemovalSchema = schoolUserRemovalTargetSchema.extend({ revision: z.string().regex(/^[a-f0-9]{64}$/) });
export interface SchoolUserRemovalPreview { userId: string; name: string; loginCode: string | null; revision: string; }
export type SchoolUserRemovalInput = z.infer<typeof schoolUserRemovalSchema> & { expectedSchoolId: string };
