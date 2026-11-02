import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import {
  findTeacherByUserId,
  listTeacherScheduleForDate,
  todayInMaputo,
} from "@/features/academic/data/attendance";
import { AttendanceDateField } from "@/features/academic/ui/attendance-date-field";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth/config";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/attendance">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "attendance" });

  return { title: t("title") };
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function AttendancePage({
  params,
  searchParams,
}: PageProps<"/[locale]/attendance">) {
  const { locale } = await params;
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
  if (!Number.isFinite(date.getTime())) notFound();
  const isoDate = toIsoDate(date);

  const teacher = await findTeacherByUserId(session.schoolId, session.user.id);
  const schedule = teacher
    ? await listTeacherScheduleForDate(session.schoolId, teacher.id, date)
    : [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">{t("attendance.title")}</h1>
        <p className="text-muted-foreground">{t("attendance.subtitle")}</p>
      </div>

      <AttendanceDateField date={isoDate} />

      {schedule.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">
          {t("attendance.emptySchedule")}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {schedule.map((entry) => (
            <li key={entry.scheduleEntryId}>
              <Link
                href={{
                  pathname: "/attendance/[scheduleEntryId]",
                  params: { scheduleEntryId: entry.scheduleEntryId },
                  query: { data: isoDate },
                }}
                className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4 transition-colors duration-200 ease-(--ease-enter) hover:border-border-strong"
              >
                <div className="flex flex-col gap-1">
                  <p className="font-medium text-foreground">
                    {entry.teachingGroupName} — {entry.subjectName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {entry.startTime}–{entry.endTime} · {entry.roomName}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!entry.isOwn ? (
                    <Badge tone="neutral">{t("attendance.headTeacherView")}</Badge>
                  ) : null}
                  {entry.sessionStatus === "SUBMITTED" ? (
                    <Badge tone="success">{t("attendance.sessionStatus.submitted")}</Badge>
                  ) : entry.sessionStatus === "DRAFT" ? (
                    <Badge tone="warning">{t("attendance.sessionStatus.draft")}</Badge>
                  ) : (
                    <Badge tone="neutral">{t("attendance.sessionStatus.pending")}</Badge>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
