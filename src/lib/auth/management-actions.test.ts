// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db/client", () => ({ prisma: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ getPathname: ({ href }: { href: string }) => href }));
vi.mock("@/lib/db/tenant", () => ({ getTenantDb: vi.fn(() => { throw new Error("Unauthorized action accessed data"); }) }));
const { auth } = await import("./config");
const { getTenantDb } = await import("@/lib/db/tenant");
const actions = [
  ["membership exception preview", (await import("@/features/identity/actions/membership-permission-overrides")).loadMembershipPermissionOverridesAction],
  ["membership exception change", (await import("@/features/identity/actions/membership-permission-overrides")).saveMembershipPermissionOverridesAction],
  ["membership role preview", (await import("@/features/identity/actions/membership-permission-roles")).loadMembershipRolesAction],
  ["membership role options", (await import("@/features/identity/actions/membership-permission-roles")).searchMembershipRoleOptionsAction],
  ["membership role change", (await import("@/features/identity/actions/membership-permission-roles")).saveMembershipRolesAction],
  ["system role installation", (await import("@/features/identity/actions/install-system-roles")).installSystemRolesAction],
  ["permission role load", (await import("@/features/identity/actions/permission-role-management")).loadPermissionRoleAction],
  ["permission role edit", (await import("@/features/identity/actions/permission-role-management")).savePermissionRoleAction],
  ["permission role delete", (await import("@/features/identity/actions/permission-role-management")).deletePermissionRoleAction],
  ["permission role creation", (await import("@/features/identity/actions/create-permission-role")).createPermissionRole],
  ["permission role assignment", (await import("@/features/identity/actions/assign-permission-role")).assignPermissionRole],
  ["school association preview", (await import("@/features/identity/actions/school-user-removal")).previewSchoolUserRemovalAction],
  ["school association removal", (await import("@/features/identity/actions/school-user-removal")).removeSchoolUserAction],
  ["staff profile create", (await import("@/features/identity/actions/school-staff")).saveSchoolStaffAction],
  ["staff profile load", (await import("@/features/identity/actions/school-staff")).loadSchoolStaffAction],
  ["staff link load", (await import("@/features/identity/actions/school-user-staff-link")).loadStaffLinkAction],
  ["staff link preview", (await import("@/features/identity/actions/school-user-staff-link")).previewStaffLinkAction],
  ["staff link change", (await import("@/features/identity/actions/school-user-staff-link")).changeStaffLinkAction],
  ["teacher link load", (await import("@/features/identity/actions/school-user-teacher-link")).loadTeacherLinkAction],
  ["teacher link preview", (await import("@/features/identity/actions/school-user-teacher-link")).previewTeacherLinkAction],
  ["teacher link change", (await import("@/features/identity/actions/school-user-teacher-link")).changeTeacherLinkAction],
  ["school user edit load", (await import("@/features/identity/actions/edit-school-user")).loadSchoolUserEditAction],
  ["school user edit save", (await import("@/features/identity/actions/edit-school-user")).editSchoolUserAction],
  ["initial credential reissue", (await import("@/features/identity/actions/create-school-user")).reissueInitialCredentialAction],
  ["school user creation", (await import("@/features/identity/actions/create-school-user")).createSchoolUserAction],
  ["school user status", (await import("@/features/identity/actions/set-school-user-status")).setSchoolUserStatus],
  ["enroll-student", (await import("@/features/academic/actions/enroll-student")).enrollStudent],
  ["create-student", (await import("@/features/academic/actions/create-student")).createStudent],
  ["close-term", (await import("@/features/academic/actions/close-term")).closeTerm],
  ["create-assessment-scheme", (await import("@/features/academic/actions/create-assessment-scheme")).createAssessmentScheme],
  ["create-curriculum-subject", (await import("@/features/academic/actions/create-curriculum-subject")).createCurriculumSubject],
  ["create-grade-level", (await import("@/features/academic/actions/create-grade-level")).createGradeLevel],
  ["create-section", (await import("@/features/academic/actions/create-section")).createSection],
  ["create-study-path", (await import("@/features/academic/actions/create-study-path")).createStudyPath],
  ["create-subject", (await import("@/features/academic/actions/create-subject")).createSubject],
  ["create-teacher", (await import("@/features/academic/actions/create-teacher")).createTeacher],
  ["create-teaching-group", (await import("@/features/academic/actions/create-teaching-group")).createTeachingGroup],
  ["create-class-group", (await import("@/features/academic/actions/create-class-group")).createClassGroup],
  ["create-room", (await import("@/features/academic/actions/create-room")).createRoom],
  ["create-time-slot", (await import("@/features/academic/actions/create-time-slot")).createTimeSlot],
  ["place-schedule-entry", (await import("@/features/academic/actions/place-schedule-entry")).placeScheduleEntry],
  ["create-fee-schedule", (await import("@/features/finance/actions/create-fee-schedule")).createFeeSchedule],
  ["create-fee-item", (await import("@/features/finance/actions/create-fee-item")).createFeeItem],
  ["generate-invoices", (await import("@/features/finance/actions/generate-invoices")).generateInvoices],
  ["record-manual-payment", (await import("@/features/finance/actions/record-manual-payment")).recordManualPayment],
  ["reverse-payment", (await import("@/features/finance/actions/reverse-payment")).reversePayment],
  ["confirm-payment", (await import("@/features/finance/actions/confirm-payment")).confirmPayment],
  ["initiate-mobile-money-payment", (await import("@/features/finance/actions/initiate-mobile-money-payment")).initiateMobileMoneyPayment],
] as const;
describe("direct management actions", () => {
  beforeEach(() => {
    vi.mocked(getTenantDb).mockClear();
    vi.mocked(auth).mockResolvedValue({
      user: { id: "reader" }, schoolId: "school-a", role: "SCHOOL_MANAGER", isPlatformAdmin: false,
      permissionRoleId: "reader-role", memberships: [], permissions: [
        { resource: "students", action: "view" }, { resource: "academic-structure", action: "view" },
        { resource: "teaching-staff", action: "view" }, { resource: "assessment-schemes", action: "view" },
        { resource: "term-closing", action: "view" }, { resource: "scheduling", action: "view" },
        { resource: "finance", action: "view" },
      ],
    } as never);
  });
  it.each(actions)("refuses %s for a read-only manager before accessing data", async (_name, action) => {
    const result = await action({} as never);
    expect(result).toMatchObject({ status: "error", message: expect.stringMatching(/forbidden/) });
    expect(getTenantDb).not.toHaveBeenCalled();
  });
  it.each(actions)("refuses %s for an initial-password session", async (_name, action) => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "new-holder" }, schoolId: null, role: null, isPlatformAdmin: false, permissions: [], memberships: [], passwordChangeRequired: true } as never);
    const result = await action({} as never);
    expect(result).toMatchObject({ status: "error" });
    expect(getTenantDb).not.toHaveBeenCalled();
  });

});
