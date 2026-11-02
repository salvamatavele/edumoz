// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getInvoiceForPayment, getReceipt } from "./payments";

const { prisma } = await import("@/lib/db/client");

describe("payments data", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let invoiceId = "";
  let confirmedPaymentId = "";
  let initiatedPaymentId = "";

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `PD-${suffix}`, name: "Escola de teste (dados de pagamento)", province: "Maputo", district: "KaMpfumu" },
    });
    schoolId = school.id;

    const academicYear = await prisma.academicYear.create({
      data: { schoolId, year: 2026, label: "2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-15"), isActive: true },
    });

    const gradeLevel = await prisma.gradeLevel.create({
      data: { schoolId, code: `GL-${suffix}`, name: "10ª classe", order: 10, cycle: "SECONDARY_FIRST_CYCLE" },
    });

    const studyPath = await prisma.studyPath.create({
      data: { schoolId, academicYearId: academicYear.id, gradeLevelId: gradeLevel.id, code: `SP-${suffix}`, name: "10ª — Ciências" },
    });

    const classGroup = await prisma.classGroup.create({
      data: { schoolId, academicYearId: academicYear.id, name: `10A-${suffix}`, shift: "MORNING" },
    });

    const student = await prisma.student.create({
      data: { schoolId, code: `ST-${suffix}`, firstName: "Aluna", lastName: "Recibo", birthDate: new Date("2010-05-04"), gender: "FEMALE" },
    });

    const enrollment = await prisma.enrollment.create({
      data: { schoolId, studentId: student.id, academicYearId: academicYear.id, studyPathId: studyPath.id, classGroupId: classGroup.id, number: `2026/${suffix}`, status: "ACTIVE" },
    });

    const invoice = await prisma.invoice.create({
      data: {
        schoolId,
        enrollmentId: enrollment.id,
        reference: `2026-${suffix}`,
        dueDate: new Date("2026-03-10"),
        subtotal: "1800.00",
        total: "1800.00",
        paidAmount: "1800.00",
        status: "PAID",
      },
    });
    invoiceId = invoice.id;

    const confirmedPayment = await prisma.payment.create({
      data: {
        schoolId,
        invoiceId,
        amount: "1800.00",
        method: "CASH",
        status: "CONFIRMED",
        idempotencyKey: `idem-confirmed-${suffix}`,
        confirmedAt: new Date(),
      },
    });
    confirmedPaymentId = confirmedPayment.id;

    const initiatedPayment = await prisma.payment.create({
      data: {
        schoolId,
        invoiceId,
        amount: "1800.00",
        method: "MOBILE_MONEY",
        provider: "MPESA",
        status: "INITIATED",
        idempotencyKey: `idem-initiated-${suffix}`,
      },
    });
    initiatedPaymentId = initiatedPayment.id;
  });

  afterAll(async () => {
    await prisma.payment.deleteMany({ where: { schoolId } });
    await prisma.invoice.deleteMany({ where: { schoolId } });
    await prisma.enrollment.deleteMany({ where: { schoolId } });
    await prisma.school.delete({ where: { id: schoolId } });
    await prisma.$disconnect();
  });

  it("getInvoiceForPayment devolve a factura com todos os pagamentos, do mais recente para o mais antigo", async () => {
    const invoice = await getInvoiceForPayment(schoolId, invoiceId);

    expect(invoice).not.toBeNull();
    expect(invoice?.studentName).toBe("Aluna Recibo");
    expect(invoice?.payments).toHaveLength(2);
  });

  it("getInvoiceForPayment devolve null para uma factura inexistente", async () => {
    const invoice = await getInvoiceForPayment(schoolId, "factura-inexistente");
    expect(invoice).toBeNull();
  });

  it("getReceipt devolve o recibo de um pagamento CONFIRMED", async () => {
    const receipt = await getReceipt(schoolId, confirmedPaymentId);

    expect(receipt).not.toBeNull();
    expect(receipt?.status).toBe("CONFIRMED");
    expect(receipt?.studentName).toBe("Aluna Recibo");
    expect(receipt?.verificationCode).toHaveLength(8);
  });

  it("getReceipt devolve null para um pagamento ainda não confirmado", async () => {
    const receipt = await getReceipt(schoolId, initiatedPaymentId);
    expect(receipt).toBeNull();
  });
  it("returns the persisted currency in invoice and receipt DTOs", async () => {
    const source = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    const invoice = await prisma.invoice.create({ data: { schoolId, enrollmentId: source.enrollmentId, reference: `USD-${suffix}`, currency: "USD", subtotal: 100, total: 100, paidAmount: 100, status: "PAID", dueDate: source.dueDate } });
    const payment = await prisma.payment.create({ data: { schoolId, invoiceId: invoice.id, currency: "USD", amount: 100, method: "CASH", status: "CONFIRMED", idempotencyKey: `USD-${suffix}`, confirmedAt: new Date() } });
    expect((await getInvoiceForPayment(schoolId, invoice.id))?.currency).toBe("USD");
    expect((await getReceipt(schoolId, payment.id))?.currency).toBe("USD");
  });

});
