import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { listEnrollmentOptions, listUnenrolledStudents } from "@/features/academic/data/enrollments";
import { listEnrolledStudents } from "@/features/academic/data/students";
import { CreateStudentButton } from "@/features/academic/ui/create-student-button";
import { AccessDenied } from "@/components/layout/access-denied";
import { StudentsTable } from "@/features/academic/ui/students-table";
import { UnenrolledStudentsTable } from "@/features/academic/ui/unenrolled-students-table";
import {
  isFamilyRole,
  hasPermission,
  toSessionContext,
} from "@/features/identity/domain/access";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth/config";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/students">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "students" });

  return { title: t("title") };
}

export default async function StudentsPage({ params }: PageProps<"/[locale]/students">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations();

  /*
   * A autorização REAL acontece aqui, não no proxy. O proxy fez apenas uma verificação
   * optimista da presença do cookie; é esta chamada que valida a sessão e devolve a
   * escola activa. Um cookie forjado passa lá e morre aqui.
   */
  const session = await auth();

  if (!session?.schoolId) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <p className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">
          {t("auth.noAccess")}
        </p>
      </div>
    );
  }

  // `/alunos` é só para staff — um papel de família vê aqui a escola inteira (nomes, datas
  // de nascimento, encarregados de OUTROS alunos), não a sua própria informação. Ver
  // docs/specs/role-shell.md.
  if (session.role && isFamilyRole(session.role)) {
    redirect({ href: "/portal", locale });
  }

  const context = toSessionContext(session);

  if (!hasPermission(context, "students", "view")) {
    return <AccessDenied message={t("auth.noAccess")} />;
  }
  const canCreateStudent = hasPermission(context, "students", "create");
  const canEnroll = hasPermission(context, "enrollments", "create");

  const [{ rows, academicYear }, unenrolled, enrollmentOptions] = await Promise.all([
    listEnrolledStudents(session.schoolId),
    canEnroll ? listUnenrolledStudents(session.schoolId) : Promise.resolve({ rows: [], academicYear: null }),
    canEnroll ? listEnrollmentOptions(session.schoolId) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold">{t("students.title")}</h1>
          <p className="text-muted-foreground">
            {t("students.subtitle", { count: rows.length, year: academicYear ?? "—" })}
          </p>
        </div>

        {canCreateStudent ? <CreateStudentButton /> : null}
      </div>

      <StudentsTable rows={rows} />

      {canEnroll && enrollmentOptions && unenrolled.rows.length > 0 ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">{t("students.enroll.sectionTitle")}</h2>
            <p className="text-muted-foreground">
              {t("students.enroll.sectionSubtitle", { count: unenrolled.rows.length })}
            </p>
          </div>

          <UnenrolledStudentsTable rows={unenrolled.rows} options={enrollmentOptions} />
        </div>
      ) : null}
    </div>
  );
}
