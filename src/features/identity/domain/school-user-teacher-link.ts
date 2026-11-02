import { z } from "zod";
import type { SchoolMutationScope } from "./school-users";
import { schoolUserEditTargetSchema } from "./edit-school-user";
const id = z.string().min(1).max(191);
const revision = z.iso.datetime();
const snapshot = schoolUserEditTargetSchema.extend({
  expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
  expectedTeacherId: id.nullable(), expectedTeacherRevision: revision.nullable(),
}).refine(value => (value.expectedTeacherId === null) === (value.expectedTeacherRevision === null));
export const previewSchoolUserTeacherLinkSchema = snapshot.safeExtend({ teacherCode: z.string().trim().max(64) });
export const changeSchoolUserTeacherLinkSchema = snapshot.safeExtend({ teacherId: id.nullable(), teacherRevision: revision.nullable() })
  .refine(value => (value.teacherId === null) === (value.teacherRevision === null));
export interface LinkedTeacher {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly isActive: boolean;
  readonly revision: string;
}
export interface SchoolUserTeacherLink {
  readonly userId: string;
  readonly revision: string;
  readonly teacher: LinkedTeacher | null;
  readonly canLink: boolean;
}
export interface TeacherLinkPreview extends SchoolUserTeacherLink { readonly candidate: LinkedTeacher | null }
export type TeacherLinkTarget = z.infer<typeof schoolUserEditTargetSchema> & SchoolMutationScope;
export type PreviewTeacherLinkInput = z.infer<typeof previewSchoolUserTeacherLinkSchema> & SchoolMutationScope;
export type ChangeTeacherLinkInput = z.infer<typeof changeSchoolUserTeacherLinkSchema> & SchoolMutationScope;
