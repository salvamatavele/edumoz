// @vitest-environment node
import { randomUUID } from "node:crypto";
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
const { initiateMobileMoneyPayment } = await import("./initiate-mobile-money-payment");
const { confirmPayment } = await import("./confirm-payment");

const mockAuth = auth as unknown as { mockResolvedValue: (value: unknown) => void };

describe("confirmPayment", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let invoiceId = "";

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `CP-${suffix}`, name: "Escola de teste (confirmação)", province: "Maputo", district: "KaMpfumu" },
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
      data: { schoolId, code: `ST-${suffix}`, firstName: "Aluna", lastName: "Confirmada", birthDate: new Date("2010-05-04"), gender: "FEMALE" },
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

  it("confirma só na segunda consulta, e uma terceira chamada não duplica nem soma duas vezes", async () => {
    // Número comum, sem sufixo de teste: o caminho real, PENDING → PENDING → CONFIRMED.
    await initiateMobileMoneyPayment({ idempotencyKey: randomUUID(), invoiceId, provider: "MPESA", payerPhone: "+258849876543" } as never);
    const payment = await prisma.payment.findFirstOrThrow({ where: { invoiceId, method: "MOBILE_MONEY" } });
    expect(payment.status).toBe("PENDING");

    const first = await confirmPayment({ paymentId: payment.id } as never);
    expect(first.paymentStatus).toBe("PENDING");

    const afterFirst = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    expect(afterFirst.paidAmount.toString()).toBe("0");

    const second = await confirmPayment({ paymentId: payment.id } as never);
    expect(second.paymentStatus).toBe("CONFIRMED");

    const afterSecond = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    expect(afterSecond.paidAmount.toString()).toBe("1800");
    expect(afterSecond.status).toBe("PAID");

    // Terceira chamada: o Payment já está CONFIRMED — não faz nada, nunca soma outra vez.
    const third = await confirmPayment({ paymentId: payment.id } as never);
    expect(third.paymentStatus).toBe("CONFIRMED");

    const payments = await prisma.payment.findMany({ where: { invoiceId } });
    expect(payments).toHaveLength(1);

    const afterThird = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    expect(afterThird.paidAmount.toString()).toBe("1800");
  });
});
