import { getTenantDb } from "@/lib/db/tenant";

export interface OwnGradeRow {
  readonly termId: string;
  readonly termName: string;
  readonly subjectName: string;
  readonly average: string | null;
  readonly finalScore: string | null;
  readonly passed: boolean | null;
}

export interface OwnGrades {
  readonly studentId: string;
  readonly studentName: string;
  readonly rows: readonly OwnGradeRow[];
}

async function getStudentGrades(schoolId: string, studentId: string): Promise<OwnGrades | null> {
  const db = getTenantDb(schoolId);

  const student = await db.student.findUnique({
    where: { id: studentId },
    select: { firstName: true, lastName: true },
  });

  if (!student) return null;

  // Trimestre por fechar não tem `TermResult` nenhum para mostrar — nada a filtrar aqui
  // além de seguir a relação: só existe o que o fecho já materializou.
  const results = await db.termResult.findMany({
    where: { enrollment: { studentId } },
    select: {
      average: true,
      finalScore: true,
      passed: true,
      subject: { select: { name: true } },
      term: { select: { id: true, name: true, sequence: true } },
    },
    orderBy: [{ term: { sequence: "asc" } }, { subject: { name: "asc" } }],
  });

  return {
    studentId,
    studentName: `${student.firstName} ${student.lastName}`,
    rows: results.map((result) => ({
      termId: result.term.id,
      termName: result.term.name,
      subjectName: result.subject.name,
      average: result.average?.toString() ?? null,
      finalScore: result.finalScore?.toString() ?? null,
      passed: result.passed,
    })),
  };
}

export interface GuardianChild {
  readonly studentId: string;
  readonly name: string;
}

export interface PortalGrades {
  /** Vazio para um aluno — só um encarregado com vários educandos precisa de escolher. */
  readonly children: readonly GuardianChild[];
  readonly selected: OwnGrades | null;
}

/**
 * Notas publicadas de "as minhas notas" (aluno) ou "o meu educando" (encarregado de
 * educação) — nunca de outro aluno. Um encarregado só vê um educando que tenha uma
 * `StudentGuardian` a ligá-los; pedir outro `studentId` é ignorado, não um erro que
 * confirme a um estranho que aquele aluno existe.
 */
export async function getPortalGrades(
  schoolId: string,
  role: "STUDENT" | "GUARDIAN",
  userId: string,
  requestedStudentId?: string,
): Promise<PortalGrades> {
  const db = getTenantDb(schoolId);

  if (role === "STUDENT") {
    const student = await db.student.findFirst({ where: { userId }, select: { id: true } });
    if (!student) return { children: [], selected: null };

    return { children: [], selected: await getStudentGrades(schoolId, student.id) };
  }

  const guardian = await db.guardian.findFirst({
    where: { userId },
    select: {
      students: {
        select: { student: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { student: { firstName: "asc" } },
      },
    },
  });

  const children: GuardianChild[] = (guardian?.students ?? []).map((link) => ({
    studentId: link.student.id,
    name: `${link.student.firstName} ${link.student.lastName}`,
  }));

  if (children.length === 0) return { children: [], selected: null };

  const target = children.find((child) => child.studentId === requestedStudentId) ?? children[0];

  return { children, selected: await getStudentGrades(schoolId, target.studentId) };
}
