import { getStudentAccount, type StudentAccount } from "@/features/finance/data/invoicing";
import { getTenantDb } from "@/lib/db/tenant";

export interface OwnFinance extends StudentAccount {
  readonly studentId: string;
}

async function getStudentFinance(schoolId: string, studentId: string): Promise<OwnFinance | null> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({ where: { isActive: true }, select: { id: true } });
  if (!academicYear) return null;

  const enrollment = await db.enrollment.findFirst({
    where: { studentId, academicYearId: academicYear.id },
    select: { id: true },
  });

  if (!enrollment) return null;

  const account = await getStudentAccount(schoolId, enrollment.id);
  if (!account) return null;

  return { studentId, ...account };
}

export interface FinanceGuardianChild {
  readonly studentId: string;
  readonly name: string;
}

export interface PortalFinance {
  /** Vazio para um aluno — só um encarregado com vários educandos precisa de escolher. */
  readonly children: readonly FinanceGuardianChild[];
  readonly selected: OwnFinance | null;
}

/**
 * Conta-corrente de "as minhas propinas" (aluno) ou "o meu educando" (encarregado de
 * educação) — nunca de outro aluno. Mesmo padrão de autorização de `getPortalGrades`
 * (`academic/data/student-grades.ts`) e `getPortalSchedule` (`academic/data/scheduling.ts`):
 * um encarregado só vê um educando que tenha uma `StudentGuardian` a ligá-los; pedir outro
 * `studentId` é ignorado, não um erro que confirme a um estranho que aquele aluno existe.
 */
export async function getPortalFinance(
  schoolId: string,
  role: "STUDENT" | "GUARDIAN",
  userId: string,
  requestedStudentId?: string,
): Promise<PortalFinance> {
  const db = getTenantDb(schoolId);

  if (role === "STUDENT") {
    const student = await db.student.findFirst({ where: { userId }, select: { id: true } });
    if (!student) return { children: [], selected: null };

    return { children: [], selected: await getStudentFinance(schoolId, student.id) };
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

  const children: FinanceGuardianChild[] = (guardian?.students ?? []).map((link) => ({
    studentId: link.student.id,
    name: `${link.student.firstName} ${link.student.lastName}`,
  }));

  if (children.length === 0) return { children: [], selected: null };

  const target = children.find((child) => child.studentId === requestedStudentId) ?? children[0];

  return { children, selected: await getStudentFinance(schoolId, target.studentId) };
}
