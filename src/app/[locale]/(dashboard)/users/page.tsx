import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccessDenied } from "@/components/layout/access-denied";
import { listSchoolUsers } from "@/features/identity/data/school-users";
import { hasPermission, isUnrestrictedSchoolAdministrator, toSessionContext } from "@/features/identity/domain/access";
import { schoolUserQuerySchema } from "@/features/identity/domain/school-users";
import { CreateSchoolUserDialog } from "@/features/identity/ui/create-school-user-dialog";
import { SchoolUsersPanel } from "@/features/identity/ui/school-users-panel";
import { auth } from "@/lib/auth/config";

export async function generateMetadata({ params }: PageProps<"/[locale]/users">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "users" });
  return { title: t("title") };
}
export default async function UsersPage({ params, searchParams }: PageProps<"/[locale]/users">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const session = await auth();
  if (!session?.schoolId) return <AccessDenied message={t("auth.noAccess")} />;
  const context = toSessionContext(session);
  if (!hasPermission(context, "users", "view")) return <AccessDenied message={t("common.forbidden")} />;
  const parsed = schoolUserQuerySchema.safeParse(await searchParams);
  if (!parsed.success) notFound();
  const data = await listSchoolUsers(context, parsed.data);
  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6"><div className="flex flex-col gap-1"><h1 className="text-3xl font-semibold">{t("users.title")}</h1><p className="text-muted-foreground">{t("users.subtitle")}</p></div><div className="flex justify-end">{hasPermission(context, "users", "create") ? <CreateSchoolUserDialog schoolId={session.schoolId} canManageManagers={isUnrestrictedSchoolAdministrator(context)} /> : null}</div><SchoolUsersPanel currentUserId={context.userId} schoolId={session.schoolId} data={data} query={parsed.data} canManageManagers={isUnrestrictedSchoolAdministrator(context)} canEdit={hasPermission(context, "users", "edit")} canCreate={hasPermission(context, "users", "create")} /></div>;
}
