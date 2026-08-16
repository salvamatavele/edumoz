import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { listEnrolledStudents } from "@/features/academic/data/students";
import { StudentsTable } from "@/features/academic/ui/students-table";
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

  const { rows, academicYear } = await listEnrolledStudents(session.schoolId);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">{t("students.title")}</h1>
        <p className="text-muted-foreground">
          {t("students.subtitle", { count: rows.length, year: academicYear ?? "—" })}
        </p>
      </div>

      <StudentsTable rows={rows} />
    </div>
  );
}
