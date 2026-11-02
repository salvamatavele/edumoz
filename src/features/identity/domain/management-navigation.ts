import { hasPermission, isUnrestrictedSchoolAdministrator, type SessionContext } from "./access";
import type { PermissionResource } from "./permission-catalog";

const READ_RESOURCES: Readonly<Record<string, readonly PermissionResource[]>> = {
  "/staff": ["school-staff"],
  "/users": ["users"],
  "/students": ["students"],
  "/attendance-report": ["attendance"],
  "/report-cards": ["report-cards"],
  "/academic": ["academic-structure"],
  "/teachers": ["teaching-staff"],
  "/assessment": ["assessment-schemes", "term-closing"],
  "/timetables": ["scheduling"],
  "/finance": ["finance"],
};

export function canManagePermissionRoles(context: SessionContext): boolean {
  return isUnrestrictedSchoolAdministrator(context);
}

export function canViewManagementRoute(context: SessionContext, pathname: string): boolean {
  if (!context.schoolId || !context.userId) return false;
  if (pathname === "/settings") return canManagePermissionRoles(context);
  return (READ_RESOURCES[pathname] ?? []).some((resource) => hasPermission(context, resource, "view"));
}
