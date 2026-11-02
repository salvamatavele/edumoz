import type { SessionContext } from "../domain/access";
import { schoolUserEditTargetSchema } from "../domain/edit-school-user";
import { professionalChangeSchema, professionalPreviewSchema } from "../domain/professional-link";
import { SchoolUserError } from "../domain/school-users";
import { changeProfessionalLink, getProfessionalLink, previewProfessionalLink, requireProfessionalLinkPermission } from "./professional-link";
export async function getSchoolUserStaffLink(context: SessionContext, input: unknown) {
  requireProfessionalLinkPermission(context); const parsed = schoolUserEditTargetSchema.safeParse(input); if (!parsed.success) throw new SchoolUserError("invalid"); return getProfessionalLink(context, parsed.data.userId, "staff");
}
export async function previewSchoolUserStaffLink(context: SessionContext, input: unknown) {
  requireProfessionalLinkPermission(context); const parsed = professionalPreviewSchema.safeParse(input); if (!parsed.success) throw new SchoolUserError("invalid"); return previewProfessionalLink(context, { ...parsed.data, expectedSchoolId: context.schoolId! }, "staff");
}
export async function changeSchoolUserStaffLink(context: SessionContext, input: unknown) {
  requireProfessionalLinkPermission(context); const parsed = professionalChangeSchema.safeParse(input); if (!parsed.success) throw new SchoolUserError("invalid"); return changeProfessionalLink(context, { ...parsed.data, expectedSchoolId: context.schoolId! }, "staff");
}
