import type { SessionContext } from "../domain/access";
import { schoolUserEditTargetSchema } from "../domain/edit-school-user";
import { changeSchoolUserTeacherLinkSchema, previewSchoolUserTeacherLinkSchema, type SchoolUserTeacherLink, type TeacherLinkPreview } from "../domain/school-user-teacher-link";
import { SchoolUserError } from "../domain/school-users";
import { changeProfessionalLink, getProfessionalLink, previewProfessionalLink, requireProfessionalLinkPermission } from "./professional-link";
export async function getSchoolUserTeacherLink(context: SessionContext, input: unknown): Promise<SchoolUserTeacherLink> {
  requireProfessionalLinkPermission(context); const parsed = schoolUserEditTargetSchema.safeParse(input); if (!parsed.success) throw new SchoolUserError("invalid");
  const { profile: teacher, ...link } = await getProfessionalLink(context, parsed.data.userId, "teacher"); return { ...link, teacher };
}
export async function previewSchoolUserTeacherLink(context: SessionContext, input: unknown): Promise<TeacherLinkPreview> {
  requireProfessionalLinkPermission(context); const parsed = previewSchoolUserTeacherLinkSchema.safeParse(input); if (!parsed.success) throw new SchoolUserError("invalid");
  const d = parsed.data;
  const { profile: teacher, ...link } = await previewProfessionalLink(context, { userId: d.userId, expectedRevision: d.expectedRevision, expectedProfileId: d.expectedTeacherId, expectedProfileRevision: d.expectedTeacherRevision, profileCode: d.teacherCode, expectedSchoolId: context.schoolId! }, "teacher");
  return { ...link, teacher };
}
export async function changeSchoolUserTeacherLink(context: SessionContext, input: unknown): Promise<void> {
  requireProfessionalLinkPermission(context); const parsed = changeSchoolUserTeacherLinkSchema.safeParse(input); if (!parsed.success) throw new SchoolUserError("invalid");
  const d = parsed.data;
  await changeProfessionalLink(context, { userId: d.userId, expectedRevision: d.expectedRevision, expectedProfileId: d.expectedTeacherId, expectedProfileRevision: d.expectedTeacherRevision, profileId: d.teacherId, profileRevision: d.teacherRevision, expectedSchoolId: context.schoolId! }, "teacher");
}
