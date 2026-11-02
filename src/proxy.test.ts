// @vitest-environment node
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { PROTECTED_PATHNAMES } from "@/i18n/routing";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
vi.mock("next-intl/middleware", () => ({ default: () => () => new NextResponse(null, { headers: { Vary: "RSC", "x-internationalized": "true" } }) }));
const { proxy } = await import("./proxy");
afterEach(() => vi.unstubAllEnvs());

describe("request boundaries on existing pages", () => {
  it.each(["/pessoal", "/en/staff", "/alunos", "/en/students", "/presencas/session-a", "/financas/recibo/payment-a", "/horarios/professor/teacher-a", "/en/grades/group-a/assessment-a"])("protects localized pages and nested routes: %s", (pathname) => {
    const response = proxy(new NextRequest(`http://localhost:3000${pathname}?turma=a&ano=2026`));
    expect(response.status).toBe(307);
    const destination = new URL(response.headers.get("Location")!);
    expect(destination.pathname).toBe(pathname.startsWith("/en/") ? "/en/sign-in" : "/entrar");
    expect(destination.searchParams.get("continuar")).toBe(`${pathname}?turma=a&ano=2026`);
    expect([...destination.searchParams.keys()]).toEqual(["continuar"]);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
  it("registers every dashboard page in the private response boundary", () => {
    const pages = readdirSync(join(process.cwd(), "src/app/[locale]/(dashboard)"), { recursive: true }) as string[];
    const routes = pages.filter(file => file.endsWith("page.tsx")).map(file => "/" + file.replaceAll("\\", "/").replace(/\/?page\.tsx$/, ""));
    expect(routes.filter(route => !PROTECTED_PATHNAMES.includes(route as never))).toEqual([]);
  });
  it.each(["/pessoal", "/en/staff"])("marks authenticated staff responses private: %s", path => {
    const response = proxy(new NextRequest(`http://localhost:3000${path}`, { headers: { cookie: "authjs.session-token=synthetic" } }));
    expect(response.headers.get("Cache-Control")).toContain("private");
    expect(response.headers.get("Vary")).toContain("Cookie");
  });
  it.each([null, "null", "https://outside.invalid", "http://localhost:3001", "http://localhost:3000/path"])("rejects mutations with an absent or foreign origin: %s", (origin) => {
    vi.stubEnv("AUTH_URL", "http://localhost:3000");
    const headers = new Headers({ cookie: "authjs.session-token=synthetic" });
    if (origin) headers.set("Origin", origin);
    headers.set("x-forwarded-host", "outside.invalid");
    expect(proxy(new NextRequest("http://localhost:3000/financas", { method: "POST", headers })).status).toBe(403);
  });
  it("accepts the configured browser origin and preserves i18n headers", () => {
    vi.stubEnv("AUTH_URL", "http://localhost:3000");
    const response = proxy(new NextRequest("http://localhost:3000/financas", { method: "POST", headers: { origin: "http://localhost:3000", cookie: "authjs.session-token.0=synthetic" } }));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-internationalized")).toBe("true");
    expect(response.headers.get("Vary")).toBe("RSC, Cookie");
    expect(response.headers.get("Cache-Control")).toContain("private");
  });
  it("does not mark the public homepage as private", () => {
    expect(proxy(new NextRequest("http://localhost:3000/")).headers.get("Cache-Control")).toBeNull();
  });
});
