import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { listAssignableStaff, listPermissionCatalog, listPermissionRoles } from "@/features/identity/data/permission-roles";
import { isSchoolAdministrator, type SessionContext } from "@/features/identity/domain/access";
import { PermissionRolesSection } from "@/features/identity/ui/permission-roles-section";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth/config";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/settings">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings" });

  return { title: t("title") };
}

/**
 * Configuração da PRÓPRIA ESCOLA. Estrutura académica, professores e avaliação têm as
 * suas próprias páginas (`/academic`, `/teachers`, `/assessment`) — não são "configuração
 * do sistema", são gestão de dados académicos do dia-a-dia. Ver feedback do utilizador
 * sobre a antiga página única.
 *
 * Papéis configuráveis (`PermissionRole`) são a primeira peça construída aqui — ver
 * openspec/changes/permissions-management/design.md. Nome, logótipo e fórmulas de
 * pagamento continuam por construir (ver openspec/changes/academic-configuration/design.md,
 * Non-Goals).
 */
export default async function SettingsPage({ params }: PageProps<"/[locale]/settings">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("settings");

  const session = await auth();

  if (!session?.schoolId) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <p className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">
          {t("errors.forbidden")}
        </p>
      </div>
    );
  }

  const context: SessionContext = {
    userId: session.user.id,
    isPlatformAdmin: session.isPlatformAdmin,
    schoolId: session.schoolId,
    role: session.role,
    memberships: session.memberships,
  };

  if (!isSchoolAdministrator(context)) {
    redirect({ href: "/students", locale });
  }

  const { schoolId } = session;

  const [roles, catalog, staff] = await Promise.all([
    listPermissionRoles(schoolId),
    listPermissionCatalog(schoolId),
    listAssignableStaff(schoolId),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <PermissionRolesSection roles={roles} catalog={catalog} staff={staff} />

      <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center text-muted-foreground">
        {t("comingSoon")}
      </div>
    </div>
  );
}
