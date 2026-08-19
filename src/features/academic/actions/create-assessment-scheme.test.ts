// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { Role } from "@/types";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key} ${JSON.stringify(values)}` : key,
  ),
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
const { createAssessmentScheme } = await import("./create-assessment-scheme");

const mockAuth = auth as unknown as { mockResolvedValue: (value: unknown) => void };
const mockRevalidatePath = vi.mocked(revalidatePath);

describe("createAssessmentScheme", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let schoolIdWithoutActiveYear = "";

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `AS-${suffix}`, name: "Escola de teste (avaliação)", province: "Maputo", district: "KaMpfumu" },
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

    const schoolWithoutYear = await prisma.school.create({
      data: { code: `AS-NOYEAR-${suffix}`, name: "Escola sem ano activo", province: "Maputo", district: "KaMpfumu" },
    });
    schoolIdWithoutActiveYear = schoolWithoutYear.id;
  });

  afterAll(async () => {
    const schoolIds = [schoolId, schoolIdWithoutActiveYear];
    await prisma.auditLog.deleteMany({ where: { schoolId: { in: schoolIds } } });
    await prisma.assessmentScheme.deleteMany({ where: { schoolId: { in: schoolIds } } });
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

  const schemeName = `Esquema geral (${suffix})`;

  function input(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      name: schemeName,
      gradeLevelId: "none",
      subjectId: "none",
      regime: "WITH_ASSESSMENT",
      scaleMin: 0,
      scaleMax: 20,
      passMark: 10,
      roundingMode: "HALF_UP",
      decimalPlaces: 2,
      hasExam: false,
      examWeight: 0,
      components: [
        { code: "AC", name: "Avaliação contínua", type: "CONTINUOUS", weight: 0.4 },
        { code: "AT", name: "Avaliação de trimestre", type: "TEST", weight: 0.6 },
      ],
      ...overrides,
    } as never;
  }

  it("recusa sem sessão", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await createAssessmentScheme(input());
    expect(result.status).toBe("error");
  });

  it("recusa um papel sem gestão da escola — mesmo o professor dono da disciplina", async () => {
    mockAuth.mockResolvedValue(sessionAs("TEACHER"));
    const result = await createAssessmentScheme(input());
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.fieldErrors).toBeUndefined();
  });

  it("devolve fieldErrors quando os dados são inválidos", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const result = await createAssessmentScheme(input({ name: "" }));
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.fieldErrors?.name).toBeDefined();
  });

  it("recusa sem ano lectivo activo", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER", schoolIdWithoutActiveYear));
    const result = await createAssessmentScheme(input());
    expect(result.status).toBe("error");
  });

  it("recusa pesos de componentes que não somam 1.0000, com um erro específico", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));

    const result = await createAssessmentScheme(
      input({
        components: [
          { code: "AC", name: "Avaliação contínua", type: "CONTINUOUS", weight: 0.4 },
          { code: "AT", name: "Avaliação de trimestre", type: "TEST", weight: 0.5 },
        ],
      }),
    );

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.fieldErrors?.components).toContain("weightsDoNotSumToOne");
    }

    const found = await prisma.assessmentScheme.findFirst({ where: { schoolId, name: schemeName } });
    expect(found).toBeNull();
  });

  it("cria o esquema com os seus componentes numa transacção e regista o AuditLog", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));

    const result = await createAssessmentScheme(input());
    expect(result.status).toBe("success");

    const created = await prisma.assessmentScheme.findFirstOrThrow({
      where: { schoolId, name: schemeName },
      include: { components: true },
    });
    expect(created.components).toHaveLength(2);

    const log = await prisma.auditLog.findFirstOrThrow({ where: { schoolId, entityId: created.id } });
    expect(log.action).toBe("assessmentScheme.create");

    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
  });
});
