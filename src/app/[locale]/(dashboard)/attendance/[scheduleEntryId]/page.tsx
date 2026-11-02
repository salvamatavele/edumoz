import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { findTeacherByUserId, getAttendanceRoster, todayInMaputo } from "@/features/academic/data/attendance";
import { AttendanceSheet } from "@/features/academic/ui/attendance-sheet";
import { AccessDenied } from "@/components/layout/access-denied";
import { hasPermission, toSessionContext } from "@/features/identity/domain/access";
import { auth } from "@/lib/auth/config";
import type { AttendanceStatus } from "@/types";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/attendance/[scheduleEntryId]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "attendance" });

  return { title: t("title") };
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function AttendanceSheetPage({
  params,
  searchParams,
}: PageProps<"/[locale]/attendance/[scheduleEntryId]">) {
  const { locale, scheduleEntryId } = await params;
  setRequestLocale(locale);

  const t = await getTranslations();
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

  const resolvedSearchParams = await searchParams;
  const requestedDate =
    typeof resolvedSearchParams.data === "string" ? resolvedSearchParams.data : undefined;
  const date = requestedDate
    ? new Date(`${requestedDate}T00:00:00.000Z`)
    : todayInMaputo();

  const teacher = await findTeacherByUserId(session.schoolId, session.user.id);
  const context = toSessionContext(session);
  if (!teacher && !hasPermission(context, "attendance", "view")) {
    return <AccessDenied message={t("auth.noAccess")} />;
  }
  const roster = await getAttendanceRoster(session.schoolId, scheduleEntryId, date, teacher?.id ?? null);

  if (!roster) {
    notFound();
  }

  return (
    <AttendanceSheet
      scheduleEntryId={scheduleEntryId}
      date={toIsoDate(date)}
      teachingGroupName={roster.teachingGroupName}
      subjectName={roster.subjectName}
      sessionId={roster.sessionId}
      sessionStatus={roster.sessionStatus}
      initialEntries={roster.entries.map((entry) => ({
        enrollmentId: entry.enrollmentId,
        studentName: entry.studentName,
        status: entry.status as AttendanceStatus,
      }))}
      readOnly={!roster.isOwn}
      canReopen={roster.isOwn || hasPermission(context, "attendance", "edit")}
    />
  );
}
