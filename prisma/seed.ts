/**
 * Seed de demonstração do EduMoz.
 *
 * O objectivo não é encher a base de dados — é materializar o caso que justifica todo o
 * modelo: DUAS TURMAS MISTAS. As turmas 10A e 10B contêm, cada uma, alunos de Ciências e
 * de Letras. Cada aluno recebe as suas disciplinas do PERCURSO (StudyPath), não da turma,
 * e os agrupamentos lectivos (TeachingGroup) atravessam as turmas quando a disciplina é
 * de Secção.
 *
 * Correr com: pnpm db:seed
 */
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import {
  ComponentType,
  DayOfWeek,
  EnrollmentStatus,
  FeeRecurrence,
  Gender,
  GuardianRelationship,
  Role,
  RoomKind,
  SchoolCycle,
  Shift,
  SubjectScope,
  TermStatus,
} from "../src/generated/prisma/enums";

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL as string),
});

const YEAR = 2026;
const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

async function main() {
  /**
   * O seed assume uma base limpa. Não faz teardown de propósito: apagar a escola em
   * cascata falharia em `Enrollment → ClassGroup`, que é RESTRICT — e essa restrição
   * está certa. Não se apaga uma turma que tem matrículas; enfraquecê-la para conveniência
   * do seed permitiria destruir matrículas silenciosamente em produção.
   *
   * Para semear de novo: `pnpm db:reset` (larga, migra e semeia).
   */
  const existing = await prisma.school.findUnique({
    where: { code: "EPC-MAPUTO" },
    select: { id: true },
  });

  if (existing) {
    throw new Error(
      "A escola de demonstração já existe. Para semear de novo, corra `pnpm db:reset`.",
    );
  }

  // -------------------------------------------------------------------------
  // Plataforma e escola
  // -------------------------------------------------------------------------
  /**
   * Palavra-passe do administrador. Vem de SEED_ADMIN_PASSWORD; a alternativa só existe
   * para o ambiente local arrancar sem configuração e é anunciada em voz alta, porque uma
   * credencial previsível que passe despercebida até produção é uma porta aberta.
   */
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminPassword && process.env.NODE_ENV === "production") {
    throw new Error(
      "SEED_ADMIN_PASSWORD é obrigatória fora de desenvolvimento. Seed abortado.",
    );
  }

  const effectiveAdminPassword = adminPassword ?? "EduMoz@2026";

  const platformAdmin = await prisma.user.create({
    data: {
      name: "Administrador da Plataforma",
      email: "admin@edumoz.co.mz",
      emailVerified: new Date(),
      isPlatformAdmin: true,
      passwordHash: await hashPassword(effectiveAdminPassword),
    },
  });

  const school = await prisma.school.create({
    data: {
      code: "EPC-MAPUTO",
      name: "Escola Secundária de Demonstração",
      shortName: "ESD Maputo",
      province: "Maputo Cidade",
      district: "KaMpfumu",
      address: "Av. 24 de Julho, n.º 1200",
      phone: "+258 21 000 000",
      email: "secretaria@esd.co.mz",
    },
  });

  await prisma.membership.create({
    data: {
      userId: platformAdmin.id,
      schoolId: school.id,
      role: Role.SCHOOL_MANAGER,
      isDefault: true,
    },
  });

  const schoolId = school.id;

  // -------------------------------------------------------------------------
  // Calendário
  // -------------------------------------------------------------------------
  const academicYear = await prisma.academicYear.create({
    data: {
      schoolId,
      year: YEAR,
      label: `Ano Lectivo ${YEAR}`,
      startDate: d(`${YEAR}-01-19`),
      endDate: d(`${YEAR}-11-27`),
      isActive: true,
    },
  });

  const terms = await Promise.all(
    [
      { sequence: 1, name: "1.º Trimestre", start: `${YEAR}-01-19`, end: `${YEAR}-04-17` },
      { sequence: 2, name: "2.º Trimestre", start: `${YEAR}-04-27`, end: `${YEAR}-08-07` },
      { sequence: 3, name: "3.º Trimestre", start: `${YEAR}-08-17`, end: `${YEAR}-11-27` },
    ].map((t) =>
      prisma.term.create({
        data: {
          schoolId,
          academicYearId: academicYear.id,
          sequence: t.sequence,
          name: t.name,
          startDate: d(t.start),
          endDate: d(t.end),
          status: TermStatus.OPEN,
        },
      }),
    ),
  );

  // -------------------------------------------------------------------------
  // Estrutura curricular
  // -------------------------------------------------------------------------
  const grade10 = await prisma.gradeLevel.create({
    data: {
      schoolId,
      code: "10",
      name: "10.ª Classe",
      order: 10,
      cycle: SchoolCycle.SECONDARY_FIRST_CYCLE,
      isExamLevel: true,
    },
  });

  const [sectionSciences, sectionLetters] = await Promise.all([
    prisma.section.create({
      data: { schoolId, code: "CIE", name: "Ciências" },
    }),
    prisma.section.create({
      data: { schoolId, code: "LET", name: "Letras" },
    }),
  ]);

  const pathSciences = await prisma.studyPath.create({
    data: {
      schoolId,
      academicYearId: academicYear.id,
      gradeLevelId: grade10.id,
      sectionId: sectionSciences.id,
      code: "10-CIE",
      name: "10.ª Classe — Ciências",
    },
  });

  const pathLetters = await prisma.studyPath.create({
    data: {
      schoolId,
      academicYearId: academicYear.id,
      gradeLevelId: grade10.id,
      sectionId: sectionLetters.id,
      code: "10-LET",
      name: "10.ª Classe — Letras",
    },
  });

  const subjectSeeds = [
    { code: "POR", name: "Português", area: "Línguas" },
    { code: "MAT", name: "Matemática", area: "Ciências Exactas" },
    { code: "ING", name: "Inglês", area: "Línguas" },
    { code: "EDF", name: "Educação Física", area: "Expressões" },
    { code: "FIS", name: "Física", area: "Ciências Exactas" },
    { code: "QUI", name: "Química", area: "Ciências Exactas" },
    { code: "BIO", name: "Biologia", area: "Ciências Naturais" },
    { code: "HIS", name: "História", area: "Ciências Sociais" },
    { code: "GEO", name: "Geografia", area: "Ciências Sociais" },
    { code: "FIL", name: "Filosofia", area: "Ciências Sociais" },
    { code: "TIC", name: "Tecnologias de Informação", area: "Currículo Interno" },
  ];

  const subjects = new Map<string, string>();
  for (const s of subjectSeeds) {
    const created = await prisma.subject.create({
      data: { schoolId, code: s.code, name: s.name, shortName: s.code, area: s.area },
    });
    subjects.set(s.code, created.id);
  }

  const subjectId = (code: string) => {
    const id = subjects.get(code);
    if (!id) throw new Error(`Disciplina ${code} não foi criada.`);
    return id;
  };

  /**
   * Tronco Comum em ambos os percursos, Secção específica de cada um, e uma disciplina
   * de Currículo Interno partilhada. É esta configuração que torna as turmas mistas
   * verificáveis: um aluno de 10A tem disciplinas diferentes do colega de carteira.
   */
  const curriculum: Array<{
    pathId: string;
    subject: string;
    scope: SubjectScope;
    hours: number;
    isExam?: boolean;
  }> = [
    // Tronco Comum — idêntico nos dois percursos
    ...[pathSciences.id, pathLetters.id].flatMap((pathId) => [
      { pathId, subject: "POR", scope: SubjectScope.CORE, hours: 5, isExam: true },
      { pathId, subject: "MAT", scope: SubjectScope.CORE, hours: 5, isExam: true },
      { pathId, subject: "ING", scope: SubjectScope.CORE, hours: 3 },
      { pathId, subject: "EDF", scope: SubjectScope.CORE, hours: 2 },
      { pathId, subject: "TIC", scope: SubjectScope.INTERNAL, hours: 2 },
    ]),
    // Secção Ciências
    { pathId: pathSciences.id, subject: "FIS", scope: SubjectScope.SECTION, hours: 4, isExam: true },
    { pathId: pathSciences.id, subject: "QUI", scope: SubjectScope.SECTION, hours: 4 },
    { pathId: pathSciences.id, subject: "BIO", scope: SubjectScope.SECTION, hours: 3 },
    // Secção Letras
    { pathId: pathLetters.id, subject: "HIS", scope: SubjectScope.SECTION, hours: 4, isExam: true },
    { pathId: pathLetters.id, subject: "GEO", scope: SubjectScope.SECTION, hours: 3 },
    { pathId: pathLetters.id, subject: "FIL", scope: SubjectScope.SECTION, hours: 3 },
  ];

  for (const [index, c] of curriculum.entries()) {
    await prisma.curriculumSubject.create({
      data: {
        schoolId,
        studyPathId: c.pathId,
        subjectId: subjectId(c.subject),
        scope: c.scope,
        weeklyHours: c.hours,
        isExamSubject: c.isExam ?? false,
        order: index,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Salas e professores
  // -------------------------------------------------------------------------
  const rooms = new Map<string, string>();
  for (const r of [
    { code: "S01", name: "Sala 1", capacity: 45, kind: RoomKind.CLASSROOM },
    { code: "S02", name: "Sala 2", capacity: 45, kind: RoomKind.CLASSROOM },
    { code: "LAB", name: "Laboratório de Ciências", capacity: 30, kind: RoomKind.LABORATORY },
    { code: "INF", name: "Sala de Informática", capacity: 25, kind: RoomKind.WORKSHOP },
  ]) {
    const created = await prisma.room.create({ data: { schoolId, ...r } });
    rooms.set(r.code, created.id);
  }
  const roomId = (code: string) => rooms.get(code)!;

  const teachers = new Map<string, string>();
  for (const t of [
    { code: "P001", firstName: "Amélia", lastName: "Chissano", qualification: "Licenciatura em Ensino de Português" },
    { code: "P002", firstName: "Bernardo", lastName: "Muianga", qualification: "Licenciatura em Ensino de Matemática" },
    { code: "P003", firstName: "Célia", lastName: "Nhaca", qualification: "Licenciatura em Ensino de Física" },
    { code: "P004", firstName: "Dinis", lastName: "Macuácua", qualification: "Licenciatura em Ensino de História" },
    { code: "P005", firstName: "Eugénia", lastName: "Sitoe", qualification: "Licenciatura em Ensino de Inglês" },
    { code: "P006", firstName: "Fernando", lastName: "Cossa", qualification: "Licenciatura em Informática" },
  ]) {
    const created = await prisma.teacher.create({
      data: { schoolId, ...t, hireDate: d("2020-02-03"), maxWeeklyHours: 24 },
    });
    teachers.set(t.code, created.id);
  }
  const teacherId = (code: string) => teachers.get(code)!;

  // -------------------------------------------------------------------------
  // Turmas — ambas MISTAS
  // -------------------------------------------------------------------------
  const class10A = await prisma.classGroup.create({
    data: {
      schoolId,
      academicYearId: academicYear.id,
      name: "10A",
      shift: Shift.MORNING,
      capacity: 45,
      homeRoomId: roomId("S01"),
      headTeacherId: teacherId("P001"),
    },
  });

  const class10B = await prisma.classGroup.create({
    data: {
      schoolId,
      academicYearId: academicYear.id,
      name: "10B",
      shift: Shift.MORNING,
      capacity: 45,
      homeRoomId: roomId("S02"),
      headTeacherId: teacherId("P002"),
    },
  });

  // -------------------------------------------------------------------------
  // Alunos e matrículas
  // -------------------------------------------------------------------------
  const studentSeeds: Array<{
    firstName: string;
    lastName: string;
    gender: Gender;
    classGroupId: string;
    pathId: string;
  }> = [
    // Turma 10A — 3 de Ciências, 3 de Letras
    { firstName: "Ana", lastName: "Matsinhe", gender: Gender.FEMALE, classGroupId: class10A.id, pathId: pathSciences.id },
    { firstName: "Bruno", lastName: "Zandamela", gender: Gender.MALE, classGroupId: class10A.id, pathId: pathSciences.id },
    { firstName: "Carla", lastName: "Tembe", gender: Gender.FEMALE, classGroupId: class10A.id, pathId: pathSciences.id },
    { firstName: "Délio", lastName: "Mabjaia", gender: Gender.MALE, classGroupId: class10A.id, pathId: pathLetters.id },
    { firstName: "Elsa", lastName: "Chirindza", gender: Gender.FEMALE, classGroupId: class10A.id, pathId: pathLetters.id },
    { firstName: "Fábio", lastName: "Novela", gender: Gender.MALE, classGroupId: class10A.id, pathId: pathLetters.id },
    // Turma 10B — 3 de Ciências, 3 de Letras
    { firstName: "Gina", lastName: "Bila", gender: Gender.FEMALE, classGroupId: class10B.id, pathId: pathSciences.id },
    { firstName: "Hélder", lastName: "Chaúque", gender: Gender.MALE, classGroupId: class10B.id, pathId: pathSciences.id },
    { firstName: "Irene", lastName: "Massingue", gender: Gender.FEMALE, classGroupId: class10B.id, pathId: pathSciences.id },
    { firstName: "Jaime", lastName: "Ubisse", gender: Gender.MALE, classGroupId: class10B.id, pathId: pathLetters.id },
    { firstName: "Katia", lastName: "Guambe", gender: Gender.FEMALE, classGroupId: class10B.id, pathId: pathLetters.id },
    { firstName: "Lúcio", lastName: "Nhantumbo", gender: Gender.MALE, classGroupId: class10B.id, pathId: pathLetters.id },
  ];

  const enrollments: Array<{ id: string; pathId: string; classGroupId: string }> = [];

  for (const [index, s] of studentSeeds.entries()) {
    const seq = String(index + 1).padStart(3, "0");

    const student = await prisma.student.create({
      data: {
        schoolId,
        code: `${YEAR}${seq}`,
        firstName: s.firstName,
        lastName: s.lastName,
        gender: s.gender,
        birthDate: d(`${YEAR - 16}-05-${String((index % 27) + 1).padStart(2, "0")}`),
        birthPlace: "Maputo",
        address: "Bairro Polana Caniço",
      },
    });

    const guardian = await prisma.guardian.create({
      data: {
        schoolId,
        firstName: index % 2 === 0 ? "Maria" : "José",
        lastName: s.lastName,
        phone: `+25884${String(1000000 + index)}`,
        occupation: index % 2 === 0 ? "Comerciante" : "Funcionário público",
      },
    });

    await prisma.studentGuardian.create({
      data: {
        studentId: student.id,
        guardianId: guardian.id,
        relationship: index % 2 === 0 ? GuardianRelationship.MOTHER : GuardianRelationship.FATHER,
        isPrimary: true,
        isFinancialResponsible: true,
      },
    });

    const enrollment = await prisma.enrollment.create({
      data: {
        schoolId,
        studentId: student.id,
        academicYearId: academicYear.id,
        studyPathId: s.pathId,
        classGroupId: s.classGroupId,
        number: `${YEAR}/${seq}`,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    enrollments.push({
      id: enrollment.id,
      pathId: s.pathId,
      classGroupId: s.classGroupId,
    });
  }

  // -------------------------------------------------------------------------
  // Agrupamentos lectivos
  //
  // CORE      → a turma inteira, percursos misturados
  // SECTION   → os alunos de um percurso, atravessando as duas turmas
  // INTERNAL  → todos os alunos das duas turmas
  // -------------------------------------------------------------------------
  async function createTeachingGroup(input: {
    name: string;
    subject: string;
    teacher: string;
    scope: SubjectScope;
    classGroupId?: string;
    members: string[];
  }) {
    const group = await prisma.teachingGroup.create({
      data: {
        schoolId,
        academicYearId: academicYear.id,
        subjectId: subjectId(input.subject),
        teacherId: teacherId(input.teacher),
        name: input.name,
        scope: input.scope,
        classGroupId: input.classGroupId,
      },
    });

    await prisma.teachingGroupMember.createMany({
      data: input.members.map((enrollmentId) => ({
        teachingGroupId: group.id,
        enrollmentId,
      })),
    });

    return group;
  }

  const inClass = (classGroupId: string) =>
    enrollments.filter((e) => e.classGroupId === classGroupId).map((e) => e.id);
  const inPath = (pathId: string) =>
    enrollments.filter((e) => e.pathId === pathId).map((e) => e.id);
  const everyone = enrollments.map((e) => e.id);

  const g10aPor = await createTeachingGroup({
    name: "10A · Português",
    subject: "POR",
    teacher: "P001",
    scope: SubjectScope.CORE,
    classGroupId: class10A.id,
    members: inClass(class10A.id),
  });
  const g10bPor = await createTeachingGroup({
    name: "10B · Português",
    subject: "POR",
    teacher: "P001",
    scope: SubjectScope.CORE,
    classGroupId: class10B.id,
    members: inClass(class10B.id),
  });
  const g10aMat = await createTeachingGroup({
    name: "10A · Matemática",
    subject: "MAT",
    teacher: "P002",
    scope: SubjectScope.CORE,
    classGroupId: class10A.id,
    members: inClass(class10A.id),
  });
  const g10bMat = await createTeachingGroup({
    name: "10B · Matemática",
    subject: "MAT",
    teacher: "P002",
    scope: SubjectScope.CORE,
    classGroupId: class10B.id,
    members: inClass(class10B.id),
  });
  const g10aIng = await createTeachingGroup({
    name: "10A · Inglês",
    subject: "ING",
    teacher: "P005",
    scope: SubjectScope.CORE,
    classGroupId: class10A.id,
    members: inClass(class10A.id),
  });
  const g10bIng = await createTeachingGroup({
    name: "10B · Inglês",
    subject: "ING",
    teacher: "P005",
    scope: SubjectScope.CORE,
    classGroupId: class10B.id,
    members: inClass(class10B.id),
  });

  // Secção: atravessam 10A e 10B
  const gCieFis = await createTeachingGroup({
    name: "Ciências · Física",
    subject: "FIS",
    teacher: "P003",
    scope: SubjectScope.SECTION,
    members: inPath(pathSciences.id),
  });
  const gCieQui = await createTeachingGroup({
    name: "Ciências · Química",
    subject: "QUI",
    teacher: "P003",
    scope: SubjectScope.SECTION,
    members: inPath(pathSciences.id),
  });
  const gCieBio = await createTeachingGroup({
    name: "Ciências · Biologia",
    subject: "BIO",
    teacher: "P003",
    scope: SubjectScope.SECTION,
    members: inPath(pathSciences.id),
  });
  const gLetHis = await createTeachingGroup({
    name: "Letras · História",
    subject: "HIS",
    teacher: "P004",
    scope: SubjectScope.SECTION,
    members: inPath(pathLetters.id),
  });
  const gLetGeo = await createTeachingGroup({
    name: "Letras · Geografia",
    subject: "GEO",
    teacher: "P004",
    scope: SubjectScope.SECTION,
    members: inPath(pathLetters.id),
  });
  /**
   * Filosofia e TIC ficam com a professora de Português (P001), e não com os professores
   * das respectivas áreas. Não é um descuido: numa escola secundária moçambicana de
   * dimensão média é comum um professor cobrir disciplinas de áreas diferentes. Aqui
   * serve também de prova viva de que um mesmo professor pode acumular Tronco Comum,
   * Secção e Currículo Interno no mesmo ano lectivo sem colisão de horário.
   */
  const gLetFil = await createTeachingGroup({
    name: "Letras · Filosofia",
    subject: "FIL",
    teacher: "P001",
    scope: SubjectScope.SECTION,
    members: inPath(pathLetters.id),
  });

  // Currículo Interno: toda a gente
  const gTic = await createTeachingGroup({
    name: "10.ª Classe · TIC",
    subject: "TIC",
    teacher: "P001",
    scope: SubjectScope.INTERNAL,
    members: everyone,
  });

  // -------------------------------------------------------------------------
  // Esquema de avaliação — a fórmula do pedido: (AC * 0.4) + (AT * 0.6)
  // -------------------------------------------------------------------------
  const scheme = await prisma.assessmentScheme.create({
    data: {
      schoolId,
      academicYearId: academicYear.id,
      name: `Esquema base ${YEAR}`,
      version: 1,
      scaleMin: "0",
      scaleMax: "20",
      passMark: "10",
      decimalPlaces: 2,
      publishedAt: new Date(),
      notes: "Média = (AC × 0.40) + (AT × 0.60). Campos de exame deixados nulos por confirmar.",
      components: {
        create: [
          {
            code: "AC",
            name: "Avaliação Contínua",
            type: ComponentType.CONTINUOUS,
            weight: "0.4000",
            order: 1,
          },
          {
            code: "AT",
            name: "Avaliação Trimestral",
            type: ComponentType.TEST,
            weight: "0.6000",
            order: 2,
          },
        ],
      },
    },
  });

  // -------------------------------------------------------------------------
  // Horário — sem conflitos de professor, sala ou aluno
  // -------------------------------------------------------------------------
  const slotTimes = [
    { start: "07:00", end: "07:45" },
    { start: "07:50", end: "08:35" },
    { start: "08:40", end: "09:25" },
    { start: "09:45", end: "10:30" },
  ];

  const slots = new Map<string, string>();
  for (const day of [DayOfWeek.MONDAY, DayOfWeek.TUESDAY] as const) {
    for (const [i, t] of slotTimes.entries()) {
      const created = await prisma.timeSlot.create({
        data: {
          schoolId,
          academicYearId: academicYear.id,
          dayOfWeek: day,
          startTime: t.start,
          endTime: t.end,
          shift: Shift.MORNING,
          order: i + 1,
        },
      });
      slots.set(`${day}-${i + 1}`, created.id);
    }
  }
  const slotId = (key: string) => slots.get(key)!;

  /**
   * Cada linha foi escolhida para não colidir em nenhuma das três dimensões.
   * Repare-se no par MONDAY-3: Física (Ciências) e História (Letras) acontecem em
   * simultâneo — é exactamente isso que as turmas mistas permitem, porque nenhum aluno
   * pertence aos dois agrupamentos.
   */
  const schedule = [
    { slot: "MONDAY-1", group: g10aPor.id, teacher: "P001", room: "S01" },
    { slot: "MONDAY-1", group: g10bMat.id, teacher: "P002", room: "S02" },
    { slot: "MONDAY-2", group: g10aMat.id, teacher: "P002", room: "S01" },
    { slot: "MONDAY-2", group: g10bPor.id, teacher: "P001", room: "S02" },
    { slot: "MONDAY-3", group: gCieFis.id, teacher: "P003", room: "LAB" },
    { slot: "MONDAY-3", group: gLetHis.id, teacher: "P004", room: "S01" },
    { slot: "MONDAY-4", group: gCieQui.id, teacher: "P003", room: "LAB" },
    { slot: "MONDAY-4", group: gLetGeo.id, teacher: "P004", room: "S01" },
    { slot: "TUESDAY-1", group: g10aIng.id, teacher: "P005", room: "S01" },
    { slot: "TUESDAY-2", group: g10bIng.id, teacher: "P005", room: "S02" },
    { slot: "TUESDAY-3", group: gCieBio.id, teacher: "P003", room: "LAB" },
    { slot: "TUESDAY-3", group: gLetFil.id, teacher: "P001", room: "S01" },
    { slot: "TUESDAY-4", group: gTic.id, teacher: "P001", room: "INF" },
  ];

  for (const entry of schedule) {
    await prisma.scheduleEntry.create({
      data: {
        schoolId,
        academicYearId: academicYear.id,
        teachingGroupId: entry.group,
        teacherId: teacherId(entry.teacher),
        roomId: roomId(entry.room),
        timeSlotId: slotId(entry.slot),
      },
    });
  }

  // -------------------------------------------------------------------------
  // Propinas
  // -------------------------------------------------------------------------
  await prisma.feeSchedule.create({
    data: {
      schoolId,
      academicYearId: academicYear.id,
      gradeLevelId: grade10.id,
      name: `Propinas 10.ª Classe — ${YEAR}`,
      items: {
        create: [
          {
            schoolId,
            code: "MATRICULA",
            name: "Taxa de matrícula",
            amount: "2500.00",
            recurrence: FeeRecurrence.ANNUAL,
          },
          {
            schoolId,
            code: "PROPINA",
            name: "Propina mensal",
            amount: "1800.00",
            recurrence: FeeRecurrence.MONTHLY,
            dueDayOfMonth: 10,
          },
          {
            schoolId,
            code: "EXAME",
            name: "Taxa de exame",
            amount: "750.00",
            recurrence: FeeRecurrence.ONE_OFF,
            isMandatory: false,
          },
        ],
      },
    },
  });

  // -------------------------------------------------------------------------
  // Resumo
  // -------------------------------------------------------------------------
  const mixedCheck = await prisma.classGroup.findMany({
    where: { academicYearId: academicYear.id },
    select: {
      name: true,
      enrollments: { select: { studyPath: { select: { name: true } } } },
    },
  });

  console.log("\nSeed concluído.\n");
  console.log(`Escola:        ${school.name} (${school.code})`);
  console.log(`Ano lectivo:   ${academicYear.label}, ${terms.length} trimestres`);
  console.log(`Esquema:       ${scheme.name} — AC 0.40 + AT 0.60`);
  console.log(`Horário:       ${schedule.length} aulas, sem conflitos`);
  console.log(`Admin:         ${platformAdmin.email}`);

  if (!adminPassword) {
    console.warn(
      `\n⚠  SEED_ADMIN_PASSWORD não definida — foi usada a predefinida "${effectiveAdminPassword}".` +
        `\n   Serve para desenvolvimento local. Defina SEED_ADMIN_PASSWORD antes de semear qualquer` +
        `\n   ambiente partilhado, e altere a palavra-passe deste utilizador no primeiro acesso.`,
    );
  }
  console.log("");

  for (const cg of mixedCheck) {
    const counts = cg.enrollments.reduce<Record<string, number>>((acc, e) => {
      acc[e.studyPath.name] = (acc[e.studyPath.name] ?? 0) + 1;
      return acc;
    }, {});
    const breakdown = Object.entries(counts)
      .map(([path, n]) => `${n} × ${path}`)
      .join("  |  ");
    console.log(`Turma ${cg.name}: ${breakdown}`);
  }
  console.log("");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
