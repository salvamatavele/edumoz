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
const { createFeeItem } = await import("./create-fee-item");

const mockAuth = auth as unknown as { mockResolvedValue: (value: unknown) => void };
const mockRevalidatePath = vi.mocked(revalidatePath);

describe("createFeeItem", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let feeScheduleId = "";

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `FI-${suffix}`, name: "Escola de teste (rubricas)", province: "Maputo", district: "KaMpfumu" },
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

    const feeSchedule = await prisma.feeSchedule.create({
      data: { schoolId, academicYearId: academicYear.id, name: `Propinas (${suffix})` },
    });
    feeScheduleId = feeSchedule.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { schoolId } });
    await prisma.feeItem.deleteMany({ where: { schoolId } });
    await prisma.feeSchedule.deleteMany({ where: { schoolId } });
    await prisma.school.delete({ where: { id: schoolId } });
    await prisma.$disconnect();
  });

  afterEach(() => {
    mockRevalidatePath.mockClear();
  });

  function sessionAs(role: Role | null) {
    return {
      user: { id: "user-1", name: null, email: null, image: null },
      schoolId,
      role,
      memberships: role ? [{ schoolId, schoolName: "Escola de teste", role }] : [],
    } as never;
  }

  const itemCode = `MENSAL-${suffix}`;

  function input(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      feeScheduleId,
      code: itemCode,
      name: "Propina mensal",
      amount: 1800,
      recurrence: "MONTHLY",
      isMandatory: true,
      ...overrides,
    } as never;
  }

  it("recusa sem sessão", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await createFeeItem(input());
    expect(result.status).toBe("error");
  });

  it("recusa um papel sem gestão da escola", async () => {
    mockAuth.mockResolvedValue(sessionAs("TEACHER"));
    const result = await createFeeItem(input());
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.fieldErrors).toBeUndefined();
  });

  it("devolve fieldErrors quando o valor não é positivo", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const result = await createFeeItem(input({ amount: 0 }));
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.fieldErrors?.amount).toBeDefined();
  });

  it("cria a rubrica com o valor exacto e regista o AuditLog", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const result = await createFeeItem(input());
    expect(result.status).toBe("success");

    const created = await prisma.feeItem.findFirstOrThrow({ where: { schoolId, code: itemCode } });
    expect(created.amount.toString()).toBe("1800");

    const log = await prisma.auditLog.findFirstOrThrow({ where: { schoolId, entityId: created.id } });
    expect(log.action).toBe("feeItem.create");

    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
  });

  it("devolve fieldErrors.code para um código repetido na mesma tabela", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const result = await createFeeItem(input());
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.fieldErrors?.code).toBeDefined();
  });
});
