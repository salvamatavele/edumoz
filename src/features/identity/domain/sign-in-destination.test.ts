import { describe, expect, it } from "vitest";
import { signInDestination } from "./sign-in-destination";

describe("post-login destination", () => {
  it.each(["/pessoal?q=F001", "/en/staff?status=INACTIVE", "/utilizadores?q=Ana", "/en/users?status=ACTIVE&page=2"])("preserves the approved school users destination %s", path => {
    expect(signInDestination(path, "/alunos")).toBe(path);
  });
  it.each([
    "/alunos", "/en/students", "/pt/alunos", "/portal", "/en/portal",
    "/financas?tab=payments&factura=invoice-1", "/en/finance?tab=invoicing&periodYear=2026",
    "/presencas/session-1", "/en/grades/group-1/assessment_1", "/financas/recibo/payment-1",
    "/en/timetables/teacher/teacher-1", "/alunos/?q=Nome%20Longo#lista",
  ])("preserves an allowed destination %s", (path) => {
    expect(signInDestination(path, "/alunos")).toBe(path);
  });
  it.each([
    null, "", "https://outside.invalid", "https://localhost/alunos", "//outside.invalid/alunos",
    "/\\outside.invalid", "\\outside.invalid", "javascript:alert(1)", "data:text/html,test",
    " /alunos", "/alunos\n", "/alunos\t", "/%2f%2foutside.invalid", "/%5coutside.invalid",
    "/%252foutside.invalid", "/en/%2e%2e/alunos", "/en/../alunos", "/./alunos",
    "/api/auth/signout", "/entrar?continuar=//outside.invalid", "/en/sign-in", "/",
    "/alunos/unknown", "/en/students//outside.invalid", "/finance", "/financas.example.invalid",
    "/en/grades/<script>", "/en/finance/receipt/a%2fb", "/en/students\u0000",
  ])("uses the locale fallback for hostile or unknown destination %s", (path) => {
    expect(signInDestination(path, "/en/students")).toBe("/en/students");
  });
});
