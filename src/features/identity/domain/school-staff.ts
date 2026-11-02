import { z } from "zod";
import type { SchoolMutationScope } from "./school-users";
const text = (length: number) => z.string().trim().max(length).default("");
const date = z.union([z.iso.date(), z.literal("")]).default("");
export const schoolStaffFieldsSchema = z.object({
  code: z.string().trim().min(1).max(64), name: z.string().trim().min(3).max(191), jobTitle: z.string().trim().min(2).max(191),
  title: text(64), email: z.union([z.email().max(254), z.literal("")]).default("").transform(value => value.toLowerCase()), phone: text(40),
  birthDate: date.refine(value => !value || value <= new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Maputo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())), gender: z.enum(["", "MALE", "FEMALE", "UNSPECIFIED"]).default("").transform(value => value === "UNSPECIFIED" ? "" : value), documentNumber: text(64), nuit: text(32), address: text(2000),
  qualification: text(191), contractType: text(100), hireDate: date, notes: text(4000), isActive: z.boolean().default(true),
});
export const schoolStaffMutationSchema = schoolStaffFieldsSchema.extend({ requestId: z.uuid(), id: z.string().min(1).max(191).optional(), revision: z.iso.datetime().optional() })
  .refine(value => !value.id || !!value.revision);
export type SchoolStaffFields = z.output<typeof schoolStaffFieldsSchema>;
export type SchoolStaffInput = z.input<typeof schoolStaffMutationSchema> & SchoolMutationScope;
export const schoolStaffQuerySchema = z.object({ q: text(100), status: z.enum(["", "ACTIVE", "INACTIVE"]).default(""), page: z.coerce.number().int().min(1).max(1000000).default(1) });
export type SchoolStaffQuery = z.infer<typeof schoolStaffQuerySchema>;
export class SchoolStaffError extends Error {
  constructor(readonly code: "forbidden" | "invalid" | "unavailable" | "conflict" | "duplicateCode" | "requestChanged") { super(code); this.name = "SchoolStaffError"; }
}
