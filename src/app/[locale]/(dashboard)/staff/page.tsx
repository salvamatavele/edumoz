import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccessDenied } from "@/components/layout/access-denied";
import { listSchoolStaff } from "@/features/identity/data/school-staff";
import { hasPermission, toSessionContext } from "@/features/identity/domain/access";
import { schoolStaffQuerySchema } from "@/features/identity/domain/school-staff";
import { SchoolStaffPanel } from "@/features/identity/ui/school-staff-panel";
import { auth } from "@/lib/auth/config";
export async function generateMetadata({ params }: PageProps<"/[locale]/staff">): Promise<Metadata> {
  const { locale } = await params; const t = await getTranslations({ locale, namespace: "staff" }); return { title: t("title") };
}
export default async function StaffPage({ params, searchParams }: PageProps<"/[locale]/staff">) {
  const { locale } = await params; setRequestLocale(locale);
  const t = await getTranslations("staff"), session = await auth();
  if (!session?.schoolId || !hasPermission(toSessionContext(session), "school-staff", "view")) return <AccessDenied message={t("errors.forbidden")} />;
  const context = toSessionContext(session), parsed = schoolStaffQuerySchema.safeParse(await searchParams);
  if (!parsed.success) return <p role="alert" className="p-8 text-destructive">{t("errors.invalid")}</p>;
  const data = await listSchoolStaff(context, parsed.data);
  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6"><div><h1 className="text-3xl font-semibold">{t("title")}</h1><p className="text-muted-foreground">{t("subtitle")}</p></div><SchoolStaffPanel schoolId={session.schoolId} data={data} query={parsed.data} canCreate={hasPermission(context,"school-staff","create")} canEdit={hasPermission(context,"school-staff","edit")} /></div>;
}
