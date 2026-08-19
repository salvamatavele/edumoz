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
const { createGradeLevel } = await import("./create-grade-level");

const mockAuth = auth as unknown as { mockResolvedValue: (value: unknown) => void };
const mockRevalidatePath = vi.mocked(revalidatePath);

describe("createGradeLevel", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `GL-${suffix}`, name: "Escola de teste (classes)", province: "Maputo", district: "KaMpfumu" },
    });
    schoolId = school.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { schoolId } });
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

  function input(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      code: `10C-${suffix}`,
      name: "10ª classe",
      order: 10,
      cycle: "SECONDARY_FIRST_CYCLE",
      isExamLevel: true,
      ...overrides,
    } as never;
  }

  it("recusa sem sessão", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await createGradeLevel(input());
    expect(result.status).toBe("error");
  });

  it("recusa um papel sem gestão da escola", async () => {
    mockAuth.mockResolvedValue(sessionAs("TEACHER"));
    const result = await createGradeLevel(input());
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.fieldErrors).toBeUndefined();
  });

  it("devolve fieldErrors quando os dados são inválidos", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const result = await createGradeLevel(input({ code: "", cycle: "" }));
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.fieldErrors?.code).toBeDefined();
      expect(result.fieldErrors?.cycle).toBeDefined();
    }
  });

  it("cria a classe, regista o AuditLog e revalida as duas línguas", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const result = await createGradeLevel(input());
    expect(result.status).toBe("success");

    const created = await prisma.gradeLevel.findFirstOrThrow({ where: { schoolId, code: `10C-${suffix}` } });
    expect(created.isExamLevel).toBe(true);

    const log = await prisma.auditLog.findFirstOrThrow({ where: { schoolId, entityId: created.id } });
    expect(log.action).toBe("gradeLevel.create");

    expect(mockRevalidatePath).toHaveBeenCalledWith("/academic");
    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
  });

  it("devolve fieldErrors.code para um código repetido", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const result = await createGradeLevel(input());
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.fieldErrors?.code).toBeDefined();
  });
});
