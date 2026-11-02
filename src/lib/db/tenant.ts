import { prisma } from "./client";
import { prepareTenantQuery } from "./tenant-query";

/**
 * Modelos com coluna `schoolId`, ou seja, todos os que pertencem a uma escola.
 *
 * A lista é explícita de propósito — é legível e não depende de internals do Prisma —
 * mas NÃO é mantida à mão: `tenant.test.ts` lê o `schema.prisma`, extrai todos os modelos
 * que declaram `schoolId` e falha se divergir desta lista. Acrescentar um modelo com
 * `schoolId` sem o registar aqui parte os testes, em vez de abrir um buraco silencioso
 * entre escolas.
 *
 * This list covers direct columns only; generated metadata also scopes junctions and
 * School. Identity globals require their separately authorized boundary.
 *
 * Ausentes da lista directa: `School` (é o próprio tenant), `User`, `Account`, `Session` e
 * `VerificationToken` (globais — um utilizador pertence a várias escolas), `Permission`
 * (catálogo fixo, global, ver `permission-catalog.ts`), e os modelos de junção que herdam
 * o âmbito do pai (`StudentGuardian`, `TeachingGroupMember`, `AssessmentComponent`,
 * `InvoiceLine`, `AttendanceRecord`, `RolePermission`).
 */
export const TENANT_SCOPED_MODELS = [
  "AcademicYear",
  "Assessment",
  "AssessmentScheme",
  "AttendanceSession",
  "AuditLog",
  "ClassGroup",
  "CurriculumSubject",
  "Enrollment",
  "FeeItem",
  "FeeSchedule",
  "Grade",
  "GradeLevel",
  "Guardian",
  "Invitation",
  "Invoice",
  "IssuedDocument",
  "Membership",
  "Payment",
  "PermissionRole",
  "Room",
  "ScheduleEntry",
  "Section",
  "Staff",
  "Student",
  "StudentCard",
  "StudyPath",
  "Subject",
  "Teacher",
  "TeachingGroup",
  "Term",
  "TermResult",
  "TimeSlot",
] as const;

export type TenantScopedModel = (typeof TENANT_SCOPED_MODELS)[number];

/** Every model operation is normalized, including junctions and nested relations. */
export function getTenantDb(schoolId: string) {
  if (!schoolId) throw new Error("getTenantDb requires a non-empty schoolId.");
  return prisma.$extends({
    name: "tenant-isolation",
    query: {
      $allOperations({ model, operation, args, query }) {
        return query(prepareTenantQuery(model, operation, args, schoolId));
      },
    },
  });
}
export type TenantDb = ReturnType<typeof getTenantDb>;
