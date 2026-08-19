// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { Role } from "@/types";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock("@/i18n/navigation", () => ({
  getPathname: vi.fn(({ href }: { href: string }) => href),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(),
}));

const { revalidatePath } = await import("next/cache");
const { auth } = await import("@/lib/auth/config");
const { prisma } = await import("@/lib/db/client");
const { createStudyPath } = await import("./create-study-path");

const mockAuth = auth as unknown as { mockResolvedValue: (value: unknown) => void };
const mockRevalidatePath = vi.mocked(revalidatePath);

describe("createStudyPath", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let gradeLevelId = "";
  let sectionId = "";
  let schoolIdWithoutActiveYear = "";

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `SP-${suffix}`, name: "Escola de teste (percursos)", province: "Maputo", district: "KaMpfumu" },
    });
    schoolId = school.id;

    await prisma.academicYear.create({
      data: {
        schoolId,
        year: 2026,
        label: "2026",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-15"),
        isActive: true,
      },
    });

    const gradeLevel = await prisma.gradeLevel.create({
      data: { schoolId, code: `GL-${suffix}`, name: "10ª classe", order: 10, cycle: "SECONDARY_FIRST_CYCLE" },
    });
    gradeLevelId = gradeLevel.id;

    const section = await prisma.section.create({
      data: { schoolId, code: `SEC-${suffix}`, name: "Ciências" },
    });
    sectionId = section.id;

    const schoolWithoutYear = await prisma.school.create({
      data: { code: `SP-NOYEAR-${suffix}`, name: "Escola sem ano activo", province: "Maputo", district: "KaMpfumu" },
    });
    schoolIdWithoutActiveYear = schoolWithoutYear.id;
  });

  afterAll(async () => {
    const schoolIds = [schoolId, schoolIdWithoutActiveYear];
    await prisma.auditLog.deleteMany({ where: { schoolId: { in: schoolIds } } });
    await prisma.studyPath.deleteMany({ where: { schoolId: { in: schoolIds } } });
    await prisma.school.delete({ where: { id: schoolId } });
    await prisma.school.delete({ where: { id: schoolIdWithoutActiveYear } });
    await prisma.$disconnect();
  });

  afterEach(() => {
    mockRevalidatePath.mockClear();
  });

  function sessionAs(role: Role | null, forSchoolId = schoolId) {
    return {
      user: { id: "user-1", name: null, email: null, image: null },
      schoolId: forSchoolId,
      role,
      memberships: role ? [{ schoolId: forSchoolId, schoolName: "Escola de teste", role }] : [],
    } as never;
  }

  function input(overrides: Partial<Record<string, unknown>> = {}) {
    return { gradeLevelId, sectionId, name: "10ª — Ciências", ...overrides } as never;
  }

  it("recusa sem sessão", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await createStudyPath(input());
    expect(result.status).toBe("error");
  });

  it("recusa um papel sem gestão da escola", async () => {
    mockAuth.mockResolvedValue(sessionAs("TEACHER"));
    const result = await createStudyPath(input());
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.fieldErrors).toBeUndefined();
  });

  it("devolve fieldErrors quando os dados são inválidos", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const result = await createStudyPath(input({ gradeLevelId: "" }));
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.fieldErrors?.gradeLevelId).toBeDefined();
  });

  it("recusa sem ano lectivo activo", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER", schoolIdWithoutActiveYear));
    const result = await createStudyPath(input({ gradeLevelId: "dummy", sectionId: "none" }));
    expect(result.status).toBe("error");
  });

  it("cria o percurso com o código gerado a partir da classe e secção, e regista o AuditLog", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const result = await createStudyPath(input());
    expect(result.status).toBe("success");

    const created = await prisma.studyPath.findFirstOrThrow({ where: { schoolId, gradeLevelId, sectionId } });
    expect(created.code.length).toBeGreaterThan(0);

    const log = await prisma.auditLog.findFirstOrThrow({ where: { schoolId, entityId: created.id } });
    expect(log.action).toBe("studyPath.create");

    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
  });

  it("recusa um percurso duplicado para a mesma classe e secção no ano activo", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const result = await createStudyPath(input());
    expect(result.status).toBe("error");
  });

  it("aceita um percurso sem secção", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const result = await createStudyPath(input({ sectionId: "none", name: "10ª geral" }));
    expect(result.status).toBe("success");

    const created = await prisma.studyPath.findFirstOrThrow({ where: { schoolId, gradeLevelId, sectionId: null } });
    expect(created.sectionId).toBeNull();
  });
});
