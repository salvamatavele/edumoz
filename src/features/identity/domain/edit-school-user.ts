import { z } from "zod";
import { createSchoolUserSchema } from "./create-school-user";
import type { SchoolMutationScope } from "./school-users";

export const schoolUserEditTargetSchema = z.object({ userId: z.string().trim().min(1).max(191) });
export const editSchoolUserSchema = schoolUserEditTargetSchema.extend({
  name: createSchoolUserSchema.shape.name,
  email: createSchoolUserSchema.shape.email,
  phone: createSchoolUserSchema.shape.phone,
  revision: z.iso.datetime(),
});
export interface EditableSchoolUser {
  readonly userId: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly revision: string;
}
export type SchoolUserEditTarget = z.infer<typeof schoolUserEditTargetSchema> & SchoolMutationScope;
export type EditSchoolUserInput = z.input<typeof editSchoolUserSchema> & SchoolMutationScope;
