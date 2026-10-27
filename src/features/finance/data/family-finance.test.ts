// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const { prisma } = await import("@/lib/db/client");
const { getPortalFinance } = await import("./family-finance");

describe("getPortalFinance", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let studentUserId = "";
  let guardianUserId = "";
  let otherGuardianUserId = "";

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `FF-${suffix}`, name: "Escola de teste (portal financeiro)", province: "Maputo", district: "KaMpfumu" },
    });
    schoolId = school.id;

    const academicYear = await prisma.academicYear.create({
      data: { schoolId, year: 2026, label: "2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-15"), isActive: true },
    });

    const gradeLevel = await prisma.gradeLevel.create({
      data: { schoolId, code: `GL-${suffix}`, name: "10ª classe", order: 10, cycle: "SECONDARY_FIRST_CYCLE" },
    });

    const studyPath = await prisma.studyPath.create({
      data: { schoolId, academicYearId: academicYear.id, gradeLevelId: gradeLevel.id, code: `SP-${suffix}`, name: "10ª geral" },
    });

    const classGroup = await prisma.classGroup.create({
      data: { schoolId, academicYearId: academicYear.id, name: `10A-${suffix}`, shift: "MORNING" },
    });

    const studentUser = await prisma.user.create({
      data: { name: "Aluna Financeira", email: `aluna.financas.${suffix}@edumoz.co.mz` },
    });
    studentUserId = studentUser.id;

    const student = await prisma.student.create({
      data: {
        schoolId,
        userId: studentUser.id,
        code: `ST-${suffix}`,
        firstName: "Aluna",
        lastName: "Financeira",
        birthDate: new Date("2010-01-01"),
        gender: "FEMALE",
      },
    });

    const enrollment = await prisma.enrollment.create({
      data: { schoolId, studentId: student.id, academicYearId: academicYear.id, studyPathId: studyPath.id, classGroupId: classGroup.id, number: `2026/${suffix}`, status: "ACTIVE" },
    });

    await prisma.invoice.create({
      data: {
        schoolId,
        enrollmentId: enrollment.id,
        reference: `2026-${suffix}`,
        dueDate: new Date("2026-03-10"),
        subtotal: "1800.00",
        total: "1800.00",
        paidAmount: "500.00",
        status: "PARTIAL",
      },
    });

    // Encarregada ligada à aluna — vê as facturas dela.
    const guardianUser = await prisma.user.create({
      data: { name: "Encarregada Financeira", email: `encarregada.financas.${suffix}@edumoz.co.mz` },
    });
    guardianUserId = guardianUser.id;

    const guardian = await prisma.guardian.create({
      data: { schoolId, userId: guardianUser.id, firstName: "Encarregada", lastName: "Financeira", phone: "+258840000010" },
    });

    await prisma.studentGuardian.create({
      data: { studentId: student.id, guardianId: guardian.id, relationship: "MOTHER", isPrimary: true },
    });

    // Outra encarregada, sem nenhuma relação com esta aluna.
    const otherGuardianUser = await prisma.user.create({
      data: { name: "Sem Relação Financeira", email: `semrelacao.financas.${suffix}@edumoz.co.mz` },
    });
    otherGuardianUserId = otherGuardianUser.id;

    await prisma.guardian.create({
      data: { schoolId, userId: otherGuardianUser.id, firstName: "Sem", lastName: "Relação", phone: "+258840000011" },
    });
  });

  afterAll(async () => {
    await prisma.invoice.deleteMany({ where: { schoolId } });
    await prisma.studentGuardian.deleteMany({ where: { student: { schoolId } } });
    await prisma.guardian.deleteMany({ where: { schoolId } });
    await prisma.enrollment.deleteMany({ where: { schoolId } });
    await prisma.school.delete({ where: { id: schoolId } });
    await prisma.user.deleteMany({ where: { id: { in: [studentUserId, guardianUserId, otherGuardianUserId] } } });
    await prisma.$disconnect();
  });

  it("aluno vê a sua própria conta-corrente", async () => {
    const result = await getPortalFinance(schoolId, "STUDENT", studentUserId);

    expect(result.children).toHaveLength(0);
    expect(result.selected?.studentName).toBe("Aluna Financeira");
    expect(result.selected?.invoices).toHaveLength(1);
    expect(result.selected?.balance).toBe("1300.00");
  });

  it("encarregada vê a conta-corrente da sua educanda", async () => {
    const result = await getPortalFinance(schoolId, "GUARDIAN", guardianUserId);

    expect(result.children).toHaveLength(1);
    expect(result.selected?.studentName).toBe("Aluna Financeira");
    expect(result.selected?.invoices).toHaveLength(1);
  });

  it("encarregada sem relação nenhuma não vê nenhuma factura", async () => {
    const result = await getPortalFinance(schoolId, "GUARDIAN", otherGuardianUserId);

    expect(result.children).toHaveLength(0);
    expect(result.selected).toBeNull();
  });

  it("ignora um studentId pedido que não é educando da encarregada", async () => {
    const result = await getPortalFinance(schoolId, "GUARDIAN", guardianUserId, "aluno-alheio");

    // Cai para o único educando real, em vez de expor o pedido inválido.
    expect(result.selected?.studentName).toBe("Aluna Financeira");
  });

  it("um utilizador sem Student/Guardian ligado não vê nada", async () => {
    const result = await getPortalFinance(schoolId, "STUDENT", "utilizador-sem-perfil");
    expect(result.selected).toBeNull();
  });
});
