// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "./client";
import { TENANT_SCOPED_MODELS, getTenantDb } from "./tenant";

/**
 * Guarda contra deriva: se alguém acrescentar um modelo com `schoolId` ao schema e se
 * esquecer de o registar em TENANT_SCOPED_MODELS, esse modelo passaria a ser legível e
 * escrevível por qualquer escola. Este teste torna esse esquecimento num erro imediato,
 * em vez de numa fuga silenciosa descoberta em produção.
 */
describe("TENANT_SCOPED_MODELS", () => {
  it("cobre exactamente os modelos que declaram schoolId no schema", () => {
    const schema = readFileSync(
      join(process.cwd(), "prisma", "schema.prisma"),
      "utf8",
    );

    const withSchoolId: string[] = [];
    let currentModel: string | null = null;

    for (const line of schema.split("\n")) {
      const modelStart = /^model\s+(\w+)\s*\{/.exec(line);
      if (modelStart) {
        currentModel = modelStart[1];
        continue;
      }

      if (line.startsWith("}")) {
        currentModel = null;
        continue;
      }

      if (currentModel && /^\s+schoolId\s/.test(line)) {
        withSchoolId.push(currentModel);
      }
    }

    expect(withSchoolId.length).toBeGreaterThan(0);
    expect([...withSchoolId].sort()).toEqual([...TENANT_SCOPED_MODELS].sort());
  });
});

describe("getTenantDb", () => {
  const suffix = `T${Date.now()}`;
  const codeA = `ISOL-A-${suffix}`;
  const codeB = `ISOL-B-${suffix}`;

  let schoolA = "";
  let schoolB = "";

  beforeAll(async () => {
    const [a, b] = await Promise.all([
      prisma.school.create({
        data: { code: codeA, name: "Escola A", province: "Maputo", district: "KaMpfumu" },
      }),
      prisma.school.create({
        data: { code: codeB, name: "Escola B", province: "Sofala", district: "Beira" },
      }),
    ]);

    schoolA = a.id;
    schoolB = b.id;

    await prisma.student.createMany({
      data: [
        {
          schoolId: schoolA,
          code: "A001",
          firstName: "Aluna",
          lastName: "DaEscolaA",
          birthDate: new Date("2010-03-04T00:00:00.000Z"),
          gender: "FEMALE",
        },
        {
          schoolId: schoolB,
          code: "B001",
          firstName: "Aluno",
          lastName: "DaEscolaB",
          birthDate: new Date("2010-06-07T00:00:00.000Z"),
          gender: "MALE",
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.school.deleteMany({ where: { code: { in: [codeA, codeB] } } });
    await prisma.$disconnect();
  });

  it("exige um schoolId não vazio", () => {
    expect(() => getTenantDb("")).toThrow();
  });

  it("findMany não devolve nenhuma linha da outra escola", async () => {
    const db = getTenantDb(schoolA);
    const students = await db.student.findMany();

    expect(students).toHaveLength(1);
    expect(students[0]?.lastName).toBe("DaEscolaA");
    expect(students.every((s) => s.schoolId === schoolA)).toBe(true);
  });

  it("ignora um where que tente apontar para a outra escola", async () => {
    const db = getTenantDb(schoolA);

    // O `schoolId` injectado sobrepõe-se ao pedido — a chamada não consegue escapar.
    const students = await db.student.findMany({ where: { schoolId: schoolB } });

    expect(students).toHaveLength(1);
    expect(students[0]?.schoolId).toBe(schoolA);
  });

  it("count e findFirst respeitam o âmbito", async () => {
    const db = getTenantDb(schoolB);

    await expect(db.student.count()).resolves.toBe(1);
    await expect(
      db.student.findFirst({ where: { lastName: "DaEscolaA" } }),
    ).resolves.toBeNull();
  });

  it("findUnique não alcança um registo da outra escola", async () => {
    const outsider = await prisma.student.findFirstOrThrow({
      where: { schoolId: schoolB },
    });

    const db = getTenantDb(schoolA);

    await expect(
      db.student.findUnique({ where: { id: outsider.id } }),
    ).resolves.toBeNull();
  });

  it("aceita uma escrita que declara o schoolId correcto", async () => {
    const db = getTenantDb(schoolA);

    const created = await db.subject.create({
      data: { schoolId: schoolA, code: `OK-${suffix}`, name: "Disciplina válida" },
    });

    expect(created.schoolId).toBe(schoolA);
  });

  it("preenche schoolId quando os dados o omitem", async () => {
    const db = getTenantDb(schoolA);

    // O TypeScript exige `schoolId` nas escritas — a extensão é de runtime e o sistema de
    // tipos não a vê. O cast serve para exercitar o caminho de runtime, que continua a ser
    // real para chamadas dinâmicas e para dados vindos de formulários.
    const data = { code: `X-${suffix}`, name: "Disciplina de teste" } as unknown as {
      schoolId: string;
      code: string;
      name: string;
    };

    const created = await db.subject.create({ data });

    expect(created.schoolId).toBe(schoolA);
  });

  it("create rejeita um schoolId contraditório em vez de o reescrever em silêncio", async () => {
    const db = getTenantDb(schoolA);

    await expect(
      db.subject.create({
        data: { schoolId: schoolB, code: `Y-${suffix}`, name: "Contrabando" },
      }),
    ).rejects.toThrow(/schoolId/);
  });

  it("updateMany não toca em linhas da outra escola", async () => {
    const db = getTenantDb(schoolA);

    const result = await db.student.updateMany({ data: { address: "Alterado" } });
    expect(result.count).toBe(1);

    const untouched = await prisma.student.findFirstOrThrow({
      where: { schoolId: schoolB },
    });
    expect(untouched.address).toBeNull();
  });

  it("deleteMany não apaga linhas da outra escola", async () => {
    const db = getTenantDb(schoolA);

    await db.student.deleteMany({});

    await expect(
      prisma.student.count({ where: { schoolId: schoolB } }),
    ).resolves.toBe(1);
  });

  it("não interfere com modelos globais como User", async () => {
    const db = getTenantDb(schoolA);
    const email = `isolamento-${suffix}@edumoz.co.mz`;

    const user = await db.user.create({ data: { email, name: "Global" } });
    expect(user.email).toBe(email);

    await prisma.user.delete({ where: { id: user.id } });
  });
});
