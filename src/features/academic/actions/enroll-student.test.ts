// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { Role } from "@/types";

/**
 * Mesma razão que em create-student.test.ts: `getTranslations`, `getPathname` e
 * `revalidatePath` não correm fora do runtime do Next.
 */
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
const { enrollStudent } = await import("./enroll-student");

// Mesma nota que em create-student.test.ts sobre a sobrecarga de `auth()`.
const mockAuth = auth as unknown as {
  mockResolvedValue: (value: unknown) => void;
};
const mockRevalidatePath = vi.mocked(revalidatePath);

describe("enrollStudent", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let academicYearId = "";
  let classGroupId = "";
  let studyPathId = "";
  let studentId = "";
  let schoolIdWithoutActiveYear = "";

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: {
        code: `EN-${suffix}`,
        name: "Escola de teste (matrículas)",
        province: "Maputo",
        district: "KaMpfumu",
      },
    });
    schoolId = school.id;

    const academicYear = await prisma.academicYear.create({
      data: {
        schoolId,
        year: 2026,
        label: "2026",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-15"),
        isActive: true,
      },
    });
    academicYearId = academicYear.id;

    const gradeLevel = await prisma.gradeLevel.create({
      data: {
        schoolId,
        code: `GL-${suffix}`,
        name: "10ª classe",
        order: 10,
        cycle: "SECONDARY_FIRST_CYCLE",
      },
    });

    const studyPath = await prisma.studyPath.create({
      data: {
        schoolId,
        academicYearId,
        gradeLevelId: gradeLevel.id,
        code: `SP-${suffix}`,
        name: "10ª — Ciências",
      },
    });
    studyPathId = studyPath.id;

    const classGroup = await prisma.classGroup.create({
      data: { schoolId, academicYearId, name: `10A-${suffix}`, shift: "MORNING" },
    });
    classGroupId = classGroup.id;

    const student = await prisma.student.create({
      data: {
        schoolId,
        code: `ST-${suffix}`,
        firstName: "Aluna",
        lastName: "PorMatricular",
        birthDate: new Date("2010-05-04"),
        gender: "FEMALE",
      },
    });
    studentId = student.id;

    const schoolWithoutYear = await prisma.school.create({
      data: {
        code: `EN-NOYEAR-${suffix}`,
        name: "Escola sem ano activo",
        province: "Maputo",
        district: "KaMpfumu",
      },
    });
    schoolIdWithoutActiveYear = schoolWithoutYear.id;
  });

  afterAll(async () => {
    const schoolIds = [schoolId, schoolIdWithoutActiveYear];
    await prisma.auditLog.deleteMany({ where: { schoolId: { in: schoolIds } } });
    // `Enrollment` tem de sair antes de `School` cascatear para `ClassGroup`/`StudyPath` —
    // a mesma restrição que `prisma/seed.ts` documenta (Enrollment → ClassGroup).
    await prisma.enrollment.deleteMany({ where: { schoolId: { in: schoolIds } } });
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
      memberships: role
        ? [{ schoolId: forSchoolId, schoolName: "Escola de teste", role }]
        : [],
    } as never;
  }

  function input(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      studentId,
      classGroupId,
      studyPathId,
      number: `2026/${suffix}`,
      ...overrides,
    } as never;
  }

  it("recusa sem sessão", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await enrollStudent(input());

    expect(result.status).toBe("error");
  });

  it("recusa um papel sem gestão da escola", async () => {
    mockAuth.mockResolvedValue(sessionAs("TEACHER"));

    const result = await enrollStudent(input());

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.fieldErrors).toBeUndefined();
    }
  });

  it("devolve fieldErrors quando os dados são inválidos", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));

    const result = await enrollStudent(input({ classGroupId: "", number: "" }));

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.fieldErrors?.classGroupId).toBeDefined();
      expect(result.fieldErrors?.number).toBeDefined();
    }
  });

  it("recusa sem ano lectivo activo", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER", schoolIdWithoutActiveYear));

    const result = await enrollStudent(
      input({ studentId: "dummy", classGroupId: "dummy", studyPathId: "dummy" }),
    );

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.fieldErrors).toBeUndefined();
    }
  });

  it("matricula o aluno, regista o AuditLog na mesma transacção e revalida as duas línguas", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));

    const result = await enrollStudent(input());

    expect(result.status).toBe("success");

    const created = await prisma.enrollment.findFirstOrThrow({
      where: { schoolId, studentId },
    });
    expect(created.status).toBe("ACTIVE");
    expect(created.academicYearId).toBe(academicYearId);

    const log = await prisma.auditLog.findFirstOrThrow({
      where: { schoolId, entityId: created.id },
    });
    expect(log.action).toBe("enrollment.create");
    expect(log.entity).toBe("Enrollment");
    expect(log.actorUserId).toBe("user-1");

    expect(mockRevalidatePath).toHaveBeenCalledWith("/students");
    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
  });

  it("recusa matricular o mesmo aluno duas vezes no mesmo ano lectivo", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));

    // Mesmo `studentId` do teste anterior, já matriculado no mesmo ano.
    const result = await enrollStudent(input({ number: `2026/OUTRO-${suffix}` }));

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.fieldErrors).toBeUndefined();
      expect(result.message).toBeDefined();
    }
  });

  it("devolve fieldErrors.number para um número de matrícula repetido no mesmo ano", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));

    const other = await prisma.student.create({
      data: {
        schoolId,
        code: `ST2-${suffix}`,
        firstName: "Outro",
        lastName: "Aluno",
        birthDate: new Date("2010-06-01"),
        gender: "MALE",
      },
    });

    // Mesmo `number` do teste de sucesso, aluno diferente.
    const result = await enrollStudent(input({ studentId: other.id }));

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.fieldErrors?.number).toBeDefined();
    }
  });
});
