// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

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
const { initiateMobileMoneyPayment } = await import("./initiate-mobile-money-payment");

const mockAuth = auth as unknown as { mockResolvedValue: (value: unknown) => void };

describe("initiateMobileMoneyPayment", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let invoiceId = "";

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `IM-${suffix}`, name: "Escola de teste (dinheiro móvel)", province: "Maputo", district: "KaMpfumu" },
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
      data: { schoolId, code: `ST-${suffix}`, firstName: "Aluna", lastName: "Móvel", birthDate: new Date("2010-05-04"), gender: "FEMALE" },
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

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("grava o Payment em INITIATED antes de qualquer resposta do operador — mesmo quando o operador nunca responde (timeout)", async () => {
    const result = await initiateMobileMoneyPayment({
      invoiceId,
      provider: "MPESA",
      payerPhone: "+258842222222",
    } as never);

    expect(result.status).toBe("success");

    const payment = await prisma.payment.findFirstOrThrow({ where: { invoiceId, method: "MOBILE_MONEY" } });
    expect(payment.idempotencyKey).toBeTruthy();
    // Caminho de timeout: o operador nunca confirma, mas o registo da tentativa já existe.
    expect(payment.status).toBe("PENDING");

    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    expect(invoice.status).not.toBe("PAID");
  });

  it("termina em 0000 — o operador confirma de imediato e a factura fica paga", async () => {
    const result = await initiateMobileMoneyPayment({
      invoiceId,
      provider: "MPESA",
      payerPhone: "+258840000000",
    } as never);

    expect(result.status).toBe("success");

    const payment = await prisma.payment.findFirstOrThrow({
      where: { invoiceId, method: "MOBILE_MONEY", payerPhone: "+258840000000" },
    });
    expect(payment.status).toBe("CONFIRMED");

    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    expect(invoice.status).toBe("PAID");
  });

  it("recusa quando não há dívida (factura já totalmente paga)", async () => {
    const enrollment = await prisma.enrollment.findFirstOrThrow({ where: { schoolId } });
    const paidInvoice = await prisma.invoice.create({
      data: {
        schoolId,
        enrollmentId: enrollment.id,
        reference: `2026-PAGA-${suffix}`,
        dueDate: new Date("2026-03-10"),
        subtotal: "1800.00",
        total: "1800.00",
        paidAmount: "1800.00",
        status: "PAID",
      },
    });

    const result = await initiateMobileMoneyPayment({
      invoiceId: paidInvoice.id,
      provider: "MPESA",
      payerPhone: "+258849999999",
    } as never);

    expect(result.status).toBe("error");
  });
});
