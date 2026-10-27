import { getTranslations } from "next-intl/server";

import { DashboardShell, type DashboardNavItem } from "@/components/layout/dashboard-shell";
import {
  isFamilyRole,
  isSchoolAdministrator,
  type SessionContext,
} from "@/features/identity/domain/access";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth/config";
import { Role } from "@/types";

/**
 * Casca do painel — aside, cabeçalho utilitário, rodapé mínimo. Ver
 * docs/specs/role-shell.md. Todas as rotas aqui dentro já chamam `auth()` a si próprias;
 * chamar aqui também não tem custo extra de pré-renderização — ao contrário da casca de
 * marketing, este grupo nunca foi estático.
 *
 * `navItems` resolve por PAPEL concreto, não só staff/família (ver
 * openspec/changes/attendance/design.md): um professor marca presenças, um gestor vê o
 * mapa — nenhum dos dois precisa de ver a ligação do outro.
 */
export default async function DashboardLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    // `redirect` lança internamente e nunca devolve — o `return` a seguir é inatingível,
    // mas é o que o TypeScript precisa para estreitar `session` daqui para baixo.
    redirect({ href: "/sign-in", locale });
    return;
  }

  const t = await getTranslations();
  const role = session.role;

  const context: SessionContext = {
    userId: session.user.id,
    isPlatformAdmin: session.isPlatformAdmin,
    schoolId: session.schoolId,
    role,
    memberships: session.memberships,
  };

  let navItems: DashboardNavItem[];

  if (role != null && isFamilyRole(role)) {
    navItems = [
      { href: "/portal", label: t("nav.portal") },
      { href: "/my-timetable", label: t("nav.myTimetable") },
    ];
  } else if (role === Role.TEACHER) {
    navItems = [
      { href: "/attendance", label: t("nav.attendance") },
      { href: "/grades", label: t("nav.grades") },
      { href: "/report-cards", label: t("nav.reportCards") },
      { href: "/my-timetable", label: t("nav.myTimetable") },
    ];
  } else if (isSchoolAdministrator(context)) {
    navItems = [
      { href: "/students", label: t("nav.students") },
      { href: "/attendance-report", label: t("nav.attendanceReport") },
      { href: "/report-cards", label: t("nav.reportCards") },
      { href: "/academic", label: t("nav.academic") },
      { href: "/teachers", label: t("nav.teachers") },
      { href: "/assessment", label: t("nav.assessment") },
      { href: "/timetables", label: t("nav.timetables") },
      { href: "/finance", label: t("nav.finance") },
      { href: "/settings", label: t("nav.settings") },
    ];
  } else {
    navItems = [];
  }

  const activeMembership = session.memberships.find(
    (membership) => membership.schoolId === session.schoolId,
  );

  return (
    <DashboardShell
      navItems={navItems}
      userName={session.user.name ?? session.user.email ?? ""}
      schoolName={activeMembership?.schoolName ?? null}
      roleLabel={role ? t(`roles.${role}`) : null}
    >
      {children}
    </DashboardShell>
  );
}
