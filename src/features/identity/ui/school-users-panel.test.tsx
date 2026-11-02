import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { messages, renderWithIntl } from "@/test/intl";
import { setSchoolUserStatus } from "@/features/identity/actions/set-school-user-status";
import { schoolUserQuerySchema } from "@/features/identity/domain/school-users";
import { SchoolUsersPanel } from "./school-users-panel";

vi.mock("@/features/identity/actions/school-user-removal", () => ({ previewSchoolUserRemovalAction: vi.fn(), removeSchoolUserAction: vi.fn() }));
vi.mock("@/features/identity/actions/school-user-staff-link", () => ({ loadStaffLinkAction: vi.fn(), previewStaffLinkAction: vi.fn(), changeStaffLinkAction: vi.fn() }));
vi.mock("@/features/identity/actions/school-user-teacher-link", () => ({ loadTeacherLinkAction: vi.fn(), previewTeacherLinkAction: vi.fn(), changeTeacherLinkAction: vi.fn() }));
vi.mock("@/features/identity/actions/edit-school-user", () => ({ editSchoolUserAction: vi.fn(), loadSchoolUserEditAction: vi.fn() }));
vi.mock("@/features/identity/actions/create-school-user", () => ({ createSchoolUserAction: vi.fn(), reissueInitialCredentialAction: vi.fn() }));
vi.mock("@/features/identity/actions/set-school-user-status", () => ({ setSchoolUserStatus: vi.fn() }));
const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh }), Link: ({ children, href }: { children: ReactNode; href: { pathname: string; query: Record<string,string> } }) => <a href={href.pathname+"?"+new URLSearchParams(href.query)}>{children}</a> }));
const query = schoolUserQuerySchema.parse({ q: "Alice", role: "TEACHER", status: "ACTIVE" });
const row = { id: "user-a", name: "Alice", email: "alice@example.invalid", phone: null, roles: ["TEACHER" as const], status: "ACTIVE" as const, isPlatformAdmin: false, codes: ["T001"], links: ["teacher" as const] };
const data = { rows: [row], total: 40, filtered: 30, page: 1, pageCount: 2 };
beforeEach(() => { vi.mocked(setSchoolUserStatus).mockReset(); refresh.mockClear(); });
it("shows local roles and server filters with contextual page links", () => {
  renderWithIntl(<SchoolUsersPanel schoolId="school-a" data={data} query={query} canEdit={false} />);
  expect(screen.getByLabelText("Nome, contacto ou código")).toHaveValue("Alice");
  expect(screen.queryByRole("button", { name: "Suspender Alice" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Retirar associação de Alice" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Editar conta de Alice" })).not.toBeInTheDocument();
  const href = screen.getByRole("link", { name: "Seguinte" }).getAttribute("href")!;
  expect(href).toContain("q=Alice"); expect(href).toContain("page=2"); expect(href).toContain("status=ACTIVE");
});
it("requires confirmation and refreshes after a successful suspension", async () => {
  vi.mocked(setSchoolUserStatus).mockResolvedValue({ status: "success" });
  renderWithIntl(<SchoolUsersPanel schoolId="school-a" data={data} query={query} canEdit />);
  await userEvent.click(screen.getAllByRole("button", { name: "Suspender Alice" })[0]);
  expect(setSchoolUserStatus).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog")).toHaveTextContent("Os dados e o acesso a outras escolas são preservados");
  await userEvent.click(screen.getByRole("button", { name: "Suspender" }));
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  expect(setSchoolUserStatus).toHaveBeenCalledWith({ userId: "user-a", status: "SUSPENDED", expectedSchoolId: "school-a" });
});
it("keeps protected accounts without an activation or suspension control", () => {
  renderWithIntl(<SchoolUsersPanel schoolId="school-a" data={{ ...data, rows: [{ ...row, isPlatformAdmin: true }] }} query={query} canEdit />);
  expect(screen.queryByRole("button", { name: "Suspender Alice" })).not.toBeInTheDocument();
  expect(screen.getAllByText("Conta protegida").length).toBeGreaterThan(0);
});
it("reports transport failure and refreshes to reconcile a possibly committed change", async () => {
  vi.mocked(setSchoolUserStatus).mockRejectedValue(new Error("network"));
  renderWithIntl(<SchoolUsersPanel schoolId="school-a" data={data} query={query} canEdit />);
  await userEvent.click(screen.getAllByRole("button", { name: "Suspender Alice" })[0]);
  await userEvent.click(screen.getByRole("button", { name: "Suspender" }));
  await waitFor(() => expect(refresh).toHaveBeenCalled());
  expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
});
it("renders the approved flow in English", () => {
  renderWithIntl(<SchoolUsersPanel schoolId="school-a" data={data} query={query} canEdit />, "en");
  expect(screen.getAllByRole("button", { name: "Suspend Alice" })[0]).toBeVisible();
  expect(screen.getByLabelText("Name, contact or code")).toHaveValue("Alice");
});

it("uses the Portuguese zero-result wording and the expanded account-code search label", () => {
  renderWithIntl(<SchoolUsersPanel schoolId="school-a" data={{ ...data, rows: [], filtered: 0, total: 0, pageCount: 1 }} query={query} canEdit={false} />);
  expect(screen.getByText("0 resultados · 0 contas da escola")).toBeVisible();
  expect(screen.getByLabelText("Nome, contacto ou código")).toBeVisible();
});

it("closes an old status confirmation when the rendered school changes, including a shared user ID", async () => {
  const view = renderWithIntl(<SchoolUsersPanel schoolId="school-a" data={data} query={query} canEdit />);
  await userEvent.click(screen.getAllByRole("button", { name: "Suspender Alice" })[0]);
  expect(screen.getByRole("dialog")).toBeVisible();
  view.rerender(<NextIntlClientProvider locale="pt" messages={messages.pt} timeZone="Africa/Maputo"><SchoolUsersPanel schoolId="school-b" data={data} query={query} canEdit /></NextIntlClientProvider>);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(setSchoolUserStatus).not.toHaveBeenCalled();
});

it("does not offer self-removal in the account list", () => {
  renderWithIntl(<SchoolUsersPanel schoolId="school-a" currentUserId="user-a" data={data} query={query} canEdit />);
  expect(screen.queryByRole("button", { name: "Retirar associação de Alice" })).not.toBeInTheDocument();
});

it("keeps delegated account managers from relinking their own professional identity", () => {
  const view = renderWithIntl(<SchoolUsersPanel schoolId="school-a" currentUserId="user-a" data={data} query={query} canEdit canManageManagers={false} />);
  expect(screen.queryAllByRole("button", { name: "Gerir ficha docente de Alice" })).toHaveLength(0);
  expect(screen.queryAllByRole("button", { name: "Gerir ficha de funcionário de Alice" })).toHaveLength(0);
  view.rerender(<NextIntlClientProvider locale="pt" messages={messages.pt} timeZone="Africa/Maputo"><SchoolUsersPanel schoolId="school-a" currentUserId="user-a" data={data} query={query} canEdit canManageManagers /></NextIntlClientProvider>);
  expect(screen.getAllByRole("button", { name: "Gerir ficha docente de Alice" }).length).toBeGreaterThan(0);
});
