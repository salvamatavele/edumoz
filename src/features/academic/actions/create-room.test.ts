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
const { createRoom } = await import("./create-room");

const mockAuth = auth as unknown as { mockResolvedValue: (value: unknown) => void };
const mockRevalidatePath = vi.mocked(revalidatePath);

describe("createRoom", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `RM-${suffix}`, name: "Escola de teste (salas)", province: "Maputo", district: "KaMpfumu" },
    });
    schoolId = school.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { schoolId } });
    await prisma.room.deleteMany({ where: { schoolId } });
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

  const roomCode = `SALA-01-${suffix}`;

  function input(overrides: Partial<Record<string, unknown>> = {}) {
    return { code: roomCode, name: "Sala 1", capacity: 30, kind: "CLASSROOM", ...overrides } as never;
  }

  it("recusa sem sessão", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await createRoom(input());
    expect(result.status).toBe("error");
  });

  it("recusa um papel sem gestão da escola", async () => {
    mockAuth.mockResolvedValue(sessionAs("TEACHER"));
    const result = await createRoom(input());
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.fieldErrors).toBeUndefined();
  });

  it("devolve fieldErrors quando os dados são inválidos", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const result = await createRoom(input({ code: "", name: "" }));
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.fieldErrors?.code).toBeDefined();
      expect(result.fieldErrors?.name).toBeDefined();
    }
  });

  it("cria a sala e regista o AuditLog", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const result = await createRoom(input());
    expect(result.status).toBe("success");

    const created = await prisma.room.findFirstOrThrow({ where: { schoolId, code: roomCode } });
    expect(created.capacity).toBe(30);

    const log = await prisma.auditLog.findFirstOrThrow({ where: { schoolId, entityId: created.id } });
    expect(log.action).toBe("room.create");

    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
  });

  it("devolve fieldErrors.code para um código de sala repetido", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const result = await createRoom(input());
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.fieldErrors?.code).toBeDefined();
  });
});
