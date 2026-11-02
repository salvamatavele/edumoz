// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/features/identity/data/create-school-user", () => ({ createSchoolUser: vi.fn(), reissueInitialSchoolCredential: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({ getPathname: ({ locale }: { locale: string }) => locale === "pt" ? "/utilizadores" : "/en/users" }));
const { auth } = await import("@/lib/auth/config");
const { createSchoolUser, reissueInitialSchoolCredential } = await import("@/features/identity/data/create-school-user");
const { revalidatePath } = await import("next/cache");
const { createSchoolUserAction, reissueInitialCredentialAction } = await import("./create-school-user");
const { SchoolUserError } = await import("@/features/identity/domain/school-users");
beforeEach(() => { vi.clearAllMocks(); });
it("requires an active school before reaching the DAL", async () => {
  vi.mocked(auth).mockResolvedValue({ user: { id: "holder" }, schoolId: null, passwordChangeRequired: true } as never);
  expect(await createSchoolUserAction({ expectedSchoolId: "school-a" } as never)).toMatchObject({ status: "error", message: "errors.forbidden" });
  expect(createSchoolUser).not.toHaveBeenCalled();
});
it("uses the server session scope and invalidates both localized lists", async () => {
  vi.mocked(auth).mockResolvedValue({ user: { id: "actor", authVersion: 4 }, schoolId: "school-a", role: "SCHOOL_MANAGER", isPlatformAdmin: false, memberships: [] } as never);
  vi.mocked(createSchoolUser).mockResolvedValue({ status: "alreadyCreated", userId: "new" });
  await createSchoolUserAction({ schoolId: "foreign-school", expectedSchoolId: "school-a" } as never);
  expect(createSchoolUser).toHaveBeenCalledWith(expect.objectContaining({ userId: "actor", authVersion: 4, schoolId: "school-a" }), expect.anything());
  expect(revalidatePath).toHaveBeenCalledWith("/utilizadores");
  expect(revalidatePath).toHaveBeenCalledWith("/en/users");
});
it("returns generic expected errors and never serializes database payloads", async () => {
  vi.mocked(auth).mockResolvedValue({ user: { id: "actor" }, schoolId: "school-a", role: "SCHOOL_MANAGER", isPlatformAdmin: false, memberships: [] } as never);
  vi.mocked(createSchoolUser).mockRejectedValueOnce(new SchoolUserError("creationUnavailable"));
  expect(await createSchoolUserAction({ expectedSchoolId: "school-a" } as never)).toEqual({ status: "error", message: "errors.creationUnavailable" });
  vi.mocked(createSchoolUser).mockRejectedValueOnce(Error("private-contact@example.invalid and passwordHash"));
  expect(await createSchoolUserAction({ expectedSchoolId: "school-a" } as never)).toEqual({ status: "error", message: "errors.creationUnavailable" });
});

it("rejects creation and reissue from a form opened in another school before reaching the DAL", async () => {
  vi.mocked(auth).mockResolvedValue({ user: { id: "actor" }, schoolId: "school-b", role: "SCHOOL_MANAGER", isPlatformAdmin: false, memberships: [] } as never);
  const stale = { expectedSchoolId: "school-a" };
  expect(await createSchoolUserAction(stale as never)).toMatchObject({ status: "error", message: "errors.schoolChanged" });
  expect(await reissueInitialCredentialAction(stale as never)).toMatchObject({ status: "error", message: "errors.schoolChanged" });
  expect(createSchoolUser).not.toHaveBeenCalled();
  expect(reissueInitialSchoolCredential).not.toHaveBeenCalled();
});
