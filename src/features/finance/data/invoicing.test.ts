// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDebtReport, getStudentAccount, listDebtReportFilters } from "./invoicing";

const { prisma } = await import("@/lib/db/client");

describe("invoicing data", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let academicYearId = "";
  let classGroupId = "";
  let enrollmentId = "";
  let invoiceId = "";

  it.each([[NaN, 3], [Infinity, 3], [2026.5, 3], [2026, NaN], [2026, 13], [2026, 0]])("rejects an invalid period (%s, %s) without a database validation failure", async (year, month) => {
    expect(await getDebtReport(schoolId, classGroupId, year, month)).toEqual([]);
  });

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `IV-${suffix}`, name: "Escola de teste (conta-corrente)", province: "Maputo", district: "KaMpfumu" },
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

    const classGroup = await prisma.classGroup.create({
      data: { schoolId, academicYearId, name: `10A-${suffix}`, shift: "MORNING" },
    });
    classGroupId = classGroup.id;

    const student = await prisma.student.create({
      data: { schoolId, code: `ST-${suffix}`, firstName: "Aluna", lastName: "Devedora", birthDate: new Date("2010-05-04"), gender: "FEMALE" },
    });

    const enrollment = await prisma.enrollment.create({
      data: { schoolId, studentId: student.id, academicYearId, studyPathId: studyPath.id, classGroupId, number: `2026/${suffix}`, status: "ACTIVE" },
    });
    enrollmentId = enrollment.id;

    const invoice = await prisma.invoice.create({
      data: {
        schoolId,
        enrollmentId,
        reference: `2026-${suffix}`,
        periodYear: 2026,
        periodMonth: 3,
        dueDate: new Date("2026-03-10"),
        subtotal: "1800.00",
        total: "1800.00",
        paidAmount: "500.00",
        status: "PARTIAL",
        lines: {
          create: [{ description: "Propina mensal", quantity: 1, unitAmount: "1800.00", amount: "1800.00" }],
        },
      },
    });
    invoiceId = invoice.id;
  });

  afterAll(async () => {
    await prisma.invoiceLine.deleteMany({ where: { invoiceId } });
    await prisma.invoice.deleteMany({ where: { schoolId } });
    await prisma.enrollment.deleteMany({ where: { schoolId } });
    await prisma.school.delete({ where: { id: schoolId } });
    await prisma.$disconnect();
  });

  it("getStudentAccount devolve as facturas e o saldo exacto (total - pago)", async () => {
    const account = await getStudentAccount(schoolId, enrollmentId);

    expect(account).not.toBeNull();
    expect(account?.studentName).toBe("Aluna Devedora");
    expect(account?.invoices).toHaveLength(1);
    expect(account?.invoices[0]?.total).toBe("1800");
    expect(account?.invoices[0]?.paidAmount).toBe("500");
    expect(account?.balance).toBe("1300.00");
  });

  it("getStudentAccount devolve null para matrícula inexistente", async () => {
    const account = await getStudentAccount(schoolId, "matricula-inexistente");
    expect(account).toBeNull();
  });

  it("getDebtReport lista a factura em dívida da turma no período", async () => {
    const report = await getDebtReport(schoolId, classGroupId, 2026, 3);

    expect(report).toHaveLength(1);
    expect(report[0]?.enrollmentId).toBe(enrollmentId);
    expect(report[0]?.studentName).toBe("Aluna Devedora");
    expect(report[0]?.status).toBe("PARTIAL");
  });

  it("getDebtReport não devolve nada fora do período pedido", async () => {
    const report = await getDebtReport(schoolId, classGroupId, 2026, 4);
    expect(report).toHaveLength(0);
  });

  it("listDebtReportFilters lista as turmas do ano lectivo activo", async () => {
    const filters = await listDebtReportFilters(schoolId);
    expect(filters.classGroups.some((group) => group.id === classGroupId)).toBe(true);
  });
});
