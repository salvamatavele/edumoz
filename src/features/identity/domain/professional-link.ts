import { z } from "zod";
import { schoolUserEditTargetSchema } from "./edit-school-user";
import type { SchoolMutationScope } from "./school-users";
export type ProfessionalKind = "teacher" | "staff";
export interface ProfessionalProfile { readonly id: string; readonly code: string; readonly name: string; readonly isActive: boolean; readonly revision: string }
export interface ProfessionalLink { readonly userId: string; readonly revision: string; readonly profile: ProfessionalProfile | null; readonly canLink: boolean }
export interface ProfessionalPreview extends ProfessionalLink { readonly candidate: ProfessionalProfile | null }
const id = z.string().min(1).max(191), revision = z.iso.datetime();
const snapshot = schoolUserEditTargetSchema.extend({ expectedRevision: z.string().regex(/^[a-f0-9]{64}$/), expectedProfileId: id.nullable(), expectedProfileRevision: revision.nullable() })
  .refine(value => (value.expectedProfileId === null) === (value.expectedProfileRevision === null));
export const professionalPreviewSchema = snapshot.safeExtend({ profileCode: z.string().trim().max(64) });
export const professionalChangeSchema = snapshot.safeExtend({ profileId: id.nullable(), profileRevision: revision.nullable() }).refine(value => (value.profileId === null) === (value.profileRevision === null));
export type ProfessionalPreviewInput = z.infer<typeof professionalPreviewSchema> & SchoolMutationScope;
export type ProfessionalChangeInput = z.infer<typeof professionalChangeSchema> & SchoolMutationScope;
