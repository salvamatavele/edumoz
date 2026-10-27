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

const { auth } = await import("@/lib/auth/config");
const { prisma } = await import("@/lib/db/client");
const { generateInvoices } = await import("./generate-invoices");

const mockAuth = auth as unknown as { mockResolvedValue: (value: unknown) => void };

describe("generateInvoices", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let academicYearId = "";
  let studyPathId = "";
  let classGroupId = "";
  let feeScheduleId = "";
  let enrollmentAId = "";
  let enrollmentBId = "";

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `GI-${suffix}`, name: "Escola de teste (facturação)", province: "Maputo", district: "KaMpfumu" },
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
      data: { schoolId, code: `GL-${suffix}`, name: "10ª classe", order: 10, cycle: "SECONDARY_FIRST_CYCLE" },
    });

    const studyPath = await prisma.studyPath.create({
      data: { schoolId, academicYearId, gradeLevelId: gradeLevel.id, code: `SP-${suffix}`, name: "10ª — Ciências" },
    });
    studyPathId = studyPath.id;

    const classGroup = await prisma.classGroup.create({
      data: { schoolId, academicYearId, name: `10A-${suffix}`, shift: "MORNING" },
    });
    classGroupId = classGroup.id;

    const studentA = await prisma.student.create({
      data: { schoolId, code: `ST-A-${suffix}`, firstName: "Aluna", lastName: "Um", birthDate: new Date("2010-05-04"), gender: "FEMALE" },
    });
    const studentB = await prisma.student.create({
      data: { schoolId, code: `ST-B-${suffix}`, firstName: "Aluno", lastName: "Dois", birthDate: new Date("2010-06-01"), gender: "MALE" },
    });

    const enrollmentA = await prisma.enrollment.create({
      data: { schoolId, studentId: studentA.id, academicYearId, studyPathId, classGroupId, number: `2026/A-${suffix}`, status: "ACTIVE" },
    });
    enrollmentAId = enrollmentA.id;

    const enrollmentB = await prisma.enrollment.create({
      data: { schoolId, studentId: studentB.id, academicYearId, studyPathId, classGroupId, number: `2026/B-${suffix}`, status: "ACTIVE" },
    });
    enrollmentBId = enrollmentB.id;

    const feeSchedule = await prisma.feeSchedule.create({
      data: { schoolId, academicYearId, studyPathId, name: `Propinas (${suffix})` },
    });
    feeScheduleId = feeSchedule.id;

    // Doze rubricas mensais de 1800,00 — a soma exacta tem de dar 21600,00, nunca um
    // resto de vírgula flutuante (ver `sum()` em generate-invoices.ts).
    await prisma.feeItem.createMany({
      data: Array.from({ length: 12 }, (_, index) => ({
        schoolId,
        feeScheduleId,
        code: `MENSAL-${index + 1}-${suffix}`,
        name: `Rubrica mensal ${index + 1}`,
        amount: 1800,
        recurrence: "MONTHLY" as const,
        isMandatory: true,
      })),
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { schoolId } });
    await prisma.invoiceLine.deleteMany({ where: { invoice: { schoolId } } });
    await prisma.invoice.deleteMany({ where: { schoolId } });
    await prisma.feeItem.deleteMany({ where: { schoolId } });
    await prisma.feeSchedule.deleteMany({ where: { schoolId } });
    await prisma.enrollment.deleteMany({ where: { schoolId } });
    await prisma.school.delete({ where: { id: schoolId } });
    await prisma.$disconnect();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function sessionAs(role: Role | null) {
    return {
      user: { id: "user-1", name: null, email: null, image: null },
      schoolId,
      role,
      memberships: role ? [{ schoolId, schoolName: "Escola de teste", role }] : [],
    } as never;
  }

  it("recusa um papel sem gestão da escola", async () => {
    mockAuth.mockResolvedValue(sessionAs("TEACHER"));
    const result = await generateInvoices({ feeScheduleId, periodYear: 2026, periodMonth: 3 } as never);
    expect(result.status).toBe("error");
  });

  it("gera uma factura por matrícula, com o total exacto da soma das rubricas", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const result = await generateInvoices({ feeScheduleId, periodYear: 2026, periodMonth: 3 } as never);

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.created).toBe(2);
    expect(result.skipped).toBe(0);

    const invoices = await prisma.invoice.findMany({ where: { schoolId, periodYear: 2026, periodMonth: 3 } });
    expect(invoices).toHaveLength(2);

    for (const invoice of invoices) {
      expect(invoice.total.toString()).toBe("21600");
      expect(invoice.subtotal.toString()).toBe("21600");
    }

    const enrollmentIds = invoices.map((invoice) => invoice.enrollmentId).sort();
    expect(enrollmentIds).toEqual([enrollmentAId, enrollmentBId].sort());
  });

  it("não duplica facturas ao gerar novamente o mesmo período", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const result = await generateInvoices({ feeScheduleId, periodYear: 2026, periodMonth: 3 } as never);

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.created).toBe(0);
    expect(result.skipped).toBe(2);

    const invoices = await prisma.invoice.findMany({ where: { schoolId, periodYear: 2026, periodMonth: 3 } });
    expect(invoices).toHaveLength(2);
  });
});
