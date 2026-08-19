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
const { createTeacher } = await import("./create-teacher");

const mockAuth = auth as unknown as { mockResolvedValue: (value: unknown) => void };
const mockRevalidatePath = vi.mocked(revalidatePath);

describe("createTeacher", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `TC-${suffix}`, name: "Escola de teste (professores)", province: "Maputo", district: "KaMpfumu" },
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
      code: `PROF-${suffix}`,
      firstName: "Ana",
      lastName: "Machel",
      phone: "",
      email: "",
      qualification: "",
      ...overrides,
    } as never;
  }

  it("recusa sem sessão", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await createTeacher(input());
    expect(result.status).toBe("error");
  });

  it("recusa um papel sem gestão da escola", async () => {
    mockAuth.mockResolvedValue(sessionAs("TEACHER"));
    const result = await createTeacher(input());
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.fieldErrors).toBeUndefined();
  });

  it("devolve fieldErrors quando os dados são inválidos", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const result = await createTeacher(input({ firstName: "" }));
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.fieldErrors?.firstName).toBeDefined();
  });

  it("cria o professor sem userId, regista o AuditLog e revalida as duas línguas", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const result = await createTeacher(input());
    expect(result.status).toBe("success");

    const created = await prisma.teacher.findFirstOrThrow({ where: { schoolId, code: `PROF-${suffix}` } });
    expect(created.userId).toBeNull();

    const log = await prisma.auditLog.findFirstOrThrow({ where: { schoolId, entityId: created.id } });
    expect(log.action).toBe("teacher.create");

    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
  });

  it("devolve fieldErrors.code para um código repetido", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const result = await createTeacher(input());
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.fieldErrors?.code).toBeDefined();
  });
});
