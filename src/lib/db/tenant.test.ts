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

  it.each(["literal", "set"])("rejects tenant transfers through update and updateMany (%s)", async (mode) => {
    const db = getTenantDb(schoolA);
    const subject = await db.subject.create({ data: { schoolId: schoolA, code: `MOVE-${mode}-${suffix}`, name: "Original" } });
    const schoolId = mode === "literal" ? schoolB : { set: schoolB };

    await expect(db.subject.update({ where: { id: subject.id }, data: { schoolId, name: "Changed" } })).rejects.toThrow(/schoolId/);
    await expect(db.subject.updateMany({ where: { id: subject.id }, data: { schoolId, name: "Changed" } })).rejects.toThrow(/schoolId/);
    expect(await prisma.subject.findUnique({ where: { id: subject.id } })).toMatchObject({ schoolId: schoolA, name: "Original" });
  });

  it.each(["literal", "set"])("rejects an upsert update that transfers its tenant (%s)", async (mode) => {
    const db = getTenantDb(schoolA);
    const subject = await db.subject.create({ data: { schoolId: schoolA, code: `UPS-${mode}-${suffix}`, name: "Original" } });
    await expect(db.subject.upsert({
      where: { id: subject.id },
      create: { schoolId: schoolA, code: `UNUSED-${mode}-${suffix}`, name: "Unused" },
      update: { schoolId: mode === "literal" ? schoolB : { set: schoolB } },
    })).rejects.toThrow(/schoolId/);
    expect(await prisma.subject.findUnique({ where: { id: subject.id } })).toMatchObject({ schoolId: schoolA });
  });

  it("rejects a foreign tenant in the upsert create branch before any write", async () => {
    const db = getTenantDb(schoolA);
    const code = `BAD-UPS-${suffix}`;
    await expect(db.subject.upsert({
      where: { schoolId_code: { schoolId: schoolA, code } },
      create: { schoolId: schoolB, code, name: "Foreign" }, update: {},
    })).rejects.toThrow(/schoolId/);
    expect(await prisma.subject.count({ where: { code } })).toBe(0);
  });

  it("rejects relation-based tenant changes and nested school updates", async () => {
    const db = getTenantDb(schoolA);
    const subject = await db.subject.create({ data: { schoolId: schoolA, code: `REL-${suffix}`, name: "Original" } });
    await expect(db.subject.update({ where: { id: subject.id }, data: { school: { connect: { id: schoolB } } } })).rejects.toThrow(/school/);
    await expect(db.subject.update({ where: { id: subject.id }, data: { school: { update: { name: "Unauthorized rename" } } } })).rejects.toThrow(/school/);
    expect(await prisma.subject.findUnique({ where: { id: subject.id } })).toMatchObject({ schoolId: schoolA });
    expect(await prisma.school.findUnique({ where: { id: schoolA } })).toMatchObject({ name: "Escola A" });
    await expect(db.subject.create({ data: { code: `REL-BAD-${suffix}`, name: "Foreign", school: { connect: { id: schoolB } } } })).rejects.toThrow(/school/);
  });

  it("rejects malformed explicit tenant values instead of silently replacing them", async () => {
    const db = getTenantDb(schoolA);
    for (const schoolId of [null, { set: schoolB }]) {
      await expect(db.subject.create({ data: { schoolId, code: `MALFORMED-${suffix}`, name: "Invalid" } as never })).rejects.toThrow(/schoolId/);
    }
    const code = `ATOMIC-${suffix}`;
    await expect(db.subject.createMany({ data: [
      { schoolId: schoolA, code, name: "Valid" },
      { schoolId: schoolB, code: `${code}-B`, name: "Foreign" },
    ] })).rejects.toThrow(/schoolId/);
    expect(await prisma.subject.count({ where: { code } })).toBe(0);
  });

  it("preserves valid scoped updates, set operations and upserts", async () => {
    const db = getTenantDb(schoolA);
    const subject = await db.subject.create({ data: { schoolId: schoolA, code: `VALID-${suffix}`, name: "Original" } });
    await db.subject.update({ where: { id: subject.id }, data: { schoolId: { set: schoolA }, name: "Updated" } });
    await db.subject.upsert({ where: { id: subject.id }, create: { schoolId: schoolA, code: `UNUSED-${suffix}`, name: "Unused" }, update: { schoolId: schoolA, name: "Upserted" } });
    expect(await db.subject.findUnique({ where: { id: subject.id } })).toMatchObject({ schoolId: schoolA, name: "Upserted" });
  });

  it("rolls back earlier writes when a transaction tries to transfer a tenant", async () => {
    const db = getTenantDb(schoolA);
    const subject = await db.subject.create({ data: { schoolId: schoolA, code: `TX-${suffix}`, name: "Original" } });
    await expect(db.$transaction(async (tx) => {
      await tx.subject.update({ where: { id: subject.id }, data: { name: "Transient" } });
      await tx.subject.update({ where: { id: subject.id }, data: { schoolId: schoolB } });
    })).rejects.toThrow(/schoolId/);
    expect(await prisma.subject.findUnique({ where: { id: subject.id } })).toMatchObject({ schoolId: schoolA, name: "Original" });
  });

  it("deleteMany não apaga linhas da outra escola", async () => {
    const db = getTenantDb(schoolA);

    await db.student.deleteMany({});

    await expect(
      prisma.student.count({ where: { schoolId: schoolB } }),
    ).resolves.toBe(1);
  });

  it("refuses global identity operations through the school client", async () => {
    const db = getTenantDb(schoolA);
    await expect(db.user.findMany()).rejects.toThrow(/Global model User/);
    await expect(db.user.create({ data: { email: `blocked-${suffix}@example.invalid` } })).rejects.toThrow(/Global model User/);
    await expect(db.$queryRaw`SELECT 1`).rejects.toThrow(/Raw SQL/);
    expect(await prisma.user.count({ where: { email: `blocked-${suffix}@example.invalid` } })).toBe(0);
  });
});
