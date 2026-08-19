// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { Role } from "@/types";

/**
 * `getTranslations` (next-intl/server), `getPathname` (@/i18n/navigation, que arrasta
 * next/navigation) e `revalidatePath` (next/cache) resolvem para o build de cliente ou
 * exigem um pedido HTTP real fora do runtime do Next — nenhum dos três corre sob Vitest.
 * Mockam-se aqui para poder testar a lógica que interessa: autorização, validação e a
 * escrita transaccional. A tradução das mensagens já tem cobertura própria em
 * `src/i18n/messages.test.ts`.
 */
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
const { createStudent } = await import("./create-student");

// `auth()` do Auth.js v5 é sobrecarregado (também envolve `NextMiddleware`); o TypeScript
// escolhe essa sobrecarga ao inferir o tipo do mock. Aqui só interessa a forma
// `() => Promise<Session | null>`, daí o cast confinado.
const mockAuth = auth as unknown as {
  mockResolvedValue: (value: unknown) => void;
};
const mockRevalidatePath = vi.mocked(revalidatePath);

describe("createStudent", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: {
        code: `CS-${suffix}`,
        name: "Escola de teste",
        province: "Maputo",
        district: "KaMpfumu",
      },
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
      memberships: role
        ? [{ schoolId, schoolName: "Escola de teste", role }]
        : [],
    } as never;
  }

  function input(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      code: `AL-${suffix}`,
      firstName: "Aluna",
      lastName: "Teste",
      birthDate: new Date("2010-05-04"),
      gender: "FEMALE",
      phone: "",
      ...overrides,
    } as never;
  }

  it("recusa sem sessão", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await createStudent(input());

    expect(result.status).toBe("error");
  });

  it("recusa um papel sem gestão da escola", async () => {
    mockAuth.mockResolvedValue(sessionAs("TEACHER"));

    const result = await createStudent(input());

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.fieldErrors).toBeUndefined();
    }
  });

  it("devolve fieldErrors quando os dados são inválidos", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));

    const result = await createStudent(input({ code: "" }));

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.fieldErrors?.code).toBeDefined();
    }
  });

  it("cria o aluno, regista o AuditLog na mesma transacção e revalida as duas línguas", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));

    const result = await createStudent(input());

    expect(result.status).toBe("success");

    const created = await prisma.student.findFirstOrThrow({
      where: { schoolId, code: `AL-${suffix}` },
    });
    expect(created.firstName).toBe("Aluna");

    const log = await prisma.auditLog.findFirstOrThrow({
      where: { schoolId, entityId: created.id },
    });
    expect(log.action).toBe("student.create");
    expect(log.actorUserId).toBe("user-1");

    expect(mockRevalidatePath).toHaveBeenCalledWith("/students");
    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
  });

  it("devolve fieldErrors.code para um número de aluno repetido", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));

    // Mesmo `code` do teste anterior — o índice único (schoolId, code) tem de recusar.
    const result = await createStudent(input());

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.fieldErrors?.code).toBeDefined();
    }
  });
});
