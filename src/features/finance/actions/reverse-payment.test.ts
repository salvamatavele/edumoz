// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

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
const { recordManualPayment } = await import("./record-manual-payment");
const { reversePayment } = await import("./reverse-payment");

const mockAuth = auth as unknown as { mockResolvedValue: (value: unknown) => void };

describe("reversePayment", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let invoiceId = "";

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `RP-${suffix}`, name: "Escola de teste (reversão)", province: "Maputo", district: "KaMpfumu" },
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
      data: { schoolId, code: `ST-${suffix}`, firstName: "Aluna", lastName: "Revertida", birthDate: new Date("2010-05-04"), gender: "FEMALE" },
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
      },
    });
    invoiceId = invoice.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { schoolId } });
    await prisma.payment.deleteMany({ where: { schoolId } });
    await prisma.invoice.deleteMany({ where: { schoolId } });
    await prisma.enrollment.deleteMany({ where: { schoolId } });
    await prisma.school.delete({ where: { id: schoolId } });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: null, email: null, image: null },
      schoolId,
      role: "SCHOOL_MANAGER" as Role,
      memberships: [{ schoolId, schoolName: "Escola de teste", role: "SCHOOL_MANAGER" }],
    } as never);
  });

  it("recusa reverter sem motivo", async () => {
    await recordManualPayment({ invoiceId, amount: 1800, method: "CASH" } as never);
    const payment = await prisma.payment.findFirstOrThrow({ where: { invoiceId } });

    const result = await reversePayment({ paymentId: payment.id, reason: "" } as never);

    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.fieldErrors?.reason).toBeDefined();

    const stillConfirmed = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(stillConfirmed.status).toBe("CONFIRMED");
  });

  it("com motivo: reverte, recalcula a factura, e regista o motivo no AuditLog", async () => {
    const payment = await prisma.payment.findFirstOrThrow({ where: { invoiceId, status: "CONFIRMED" } });

    const result = await reversePayment({ paymentId: payment.id, reason: "Cheque devolvido pelo banco" } as never);

    expect(result.status).toBe("success");

    const reversed = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(reversed.status).toBe("REVERSED");
    expect(reversed.reversedAt).not.toBeNull();

    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    expect(invoice.paidAmount.toString()).toBe("0");
    // dueDate já passou (fixture com data fixa no passado) e nada ficou pago — OVERDUE.
    expect(invoice.status).toBe("OVERDUE");

    const log = await prisma.auditLog.findFirstOrThrow({ where: { schoolId, entityId: payment.id, action: "payment.reverse" } });
    expect((log.after as { reason: string }).reason).toBe("Cheque devolvido pelo banco");
  });

  it("recusa reverter um pagamento que já não está CONFIRMED", async () => {
    const payment = await prisma.payment.findFirstOrThrow({ where: { invoiceId, status: "REVERSED" } });

    const result = await reversePayment({ paymentId: payment.id, reason: "Segunda tentativa" } as never);
    expect(result.status).toBe("error");
  });

  it("paidAmount da factura é sempre a soma exacta dos pagamentos CONFIRMED, mesmo depois de uma reversão", async () => {
    const confirmedPayments = await prisma.payment.findMany({ where: { invoiceId, status: "CONFIRMED" } });
    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });

    const sum = confirmedPayments.reduce((total, payment) => total + Number(payment.amount), 0);
    expect(Number(invoice.paidAmount)).toBe(sum);
  });
});
