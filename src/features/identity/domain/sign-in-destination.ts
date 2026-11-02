import { PROTECTED_PATHNAMES, routing } from "@/i18n/routing";

const protectedPaths = PROTECTED_PATHNAMES.flatMap((pathname) => {
  const localized = routing.pathnames[pathname];
  return routing.locales.flatMap((locale) => {
    const path = typeof localized === "string" ? localized : localized[locale];
    return locale === routing.defaultLocale ? [path, `/${locale}${path}`] : [`/${locale}${path}`];
  });
});
const allowedPaths = protectedPaths.map((path) => new RegExp(
  `^${path.split(/(\[[^\]]+\])/).map((part) => part.startsWith("[")
    ? "[a-zA-Z0-9_-]+"
    : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("")}/?$`,
));

/** Only known local application pages can be used as a post-login destination. */
export function signInDestination(candidate: string | null, fallback: string): string {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || /[\\\s\u0000-\u001f\u007f]/.test(candidate)) return fallback;
  const pathname = candidate.split(/[?#]/, 1)[0];
  if (pathname.includes("%") || pathname.split("/").some((segment) => segment === "." || segment === "..")) return fallback;
  if (!allowedPaths.some((pattern) => pattern.test(pathname))) return fallback;
  return candidate;
}
