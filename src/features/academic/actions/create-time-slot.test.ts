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
const { createTimeSlot } = await import("./create-time-slot");

const mockAuth = auth as unknown as { mockResolvedValue: (value: unknown) => void };
const mockRevalidatePath = vi.mocked(revalidatePath);

describe("createTimeSlot", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let academicYearId = "";
  let schoolIdWithoutActiveYear = "";

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `TS-${suffix}`, name: "Escola de teste (tempos lectivos)", province: "Maputo", district: "KaMpfumu" },
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

    const schoolWithoutYear = await prisma.school.create({
      data: { code: `TS-NOYEAR-${suffix}`, name: "Escola sem ano activo", province: "Maputo", district: "KaMpfumu" },
    });
    schoolIdWithoutActiveYear = schoolWithoutYear.id;
  });

  afterAll(async () => {
    const schoolIds = [schoolId, schoolIdWithoutActiveYear];
    await prisma.auditLog.deleteMany({ where: { schoolId: { in: schoolIds } } });
    await prisma.timeSlot.deleteMany({ where: { schoolId: { in: schoolIds } } });
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
    return {
      dayOfWeek: "MONDAY",
      startTime: "07:00",
      endTime: "07:45",
      shift: "MORNING",
      order: 1,
      ...overrides,
    } as never;
  }

  it("recusa sem sessão", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await createTimeSlot(input());
    expect(result.status).toBe("error");
  });

  it("recusa um papel sem gestão da escola", async () => {
    mockAuth.mockResolvedValue(sessionAs("TEACHER"));
    const result = await createTimeSlot(input());
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.fieldErrors).toBeUndefined();
  });

  it("devolve fieldErrors quando a hora de fim não é depois da hora de início", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const result = await createTimeSlot(input({ startTime: "08:00", endTime: "07:00" }));
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.fieldErrors?.endTime).toBeDefined();
  });

  it("recusa sem ano lectivo activo", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER", schoolIdWithoutActiveYear));
    const result = await createTimeSlot(input());
    expect(result.status).toBe("error");
  });

  it("cria o tempo lectivo associado ao ano lectivo activo e regista o AuditLog", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const result = await createTimeSlot(input());
    expect(result.status).toBe("success");

    const created = await prisma.timeSlot.findFirstOrThrow({
      where: { schoolId, dayOfWeek: "MONDAY", startTime: "07:00" },
    });
    expect(created.academicYearId).toBe(academicYearId);

    const log = await prisma.auditLog.findFirstOrThrow({ where: { schoolId, entityId: created.id } });
    expect(log.action).toBe("timeSlot.create");

    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
  });

  it("devolve fieldErrors.startTime para um tempo lectivo repetido no mesmo dia e turno", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const result = await createTimeSlot(input());
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.fieldErrors?.startTime).toBeDefined();
  });
});
