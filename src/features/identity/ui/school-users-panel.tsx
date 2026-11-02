"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProfessionalLinkDialog, SchoolUserTeacherLinkDialog } from "./school-user-teacher-link-dialog";
import { RemoveSchoolUserDialog } from "./remove-school-user-dialog";
import { EditSchoolUserDialog } from "./edit-school-user-dialog";
import { CreateSchoolUserDialog } from "./create-school-user-dialog";
import { setSchoolUserStatus } from "@/features/identity/actions/set-school-user-status";
import type { SchoolUserPage, SchoolUserRow } from "@/features/identity/data/school-users";
import { SCHOOL_USER_PAGE_SIZE, type SchoolUserQuery } from "@/features/identity/domain/school-users";
import { Link, useRouter } from "@/i18n/navigation";

export function SchoolUsersPanel({ schoolId, data, query, canEdit, canCreate = false, canManageManagers = false, currentUserId }: { readonly schoolId: string; readonly currentUserId?: string; readonly canCreate?: boolean; readonly canManageManagers?: boolean; readonly data: SchoolUserPage; readonly query: SchoolUserQuery; readonly canEdit: boolean }) {
  const t = useTranslations("users");
  const all = useTranslations();
  const router = useRouter();
  const [selection, setSelection] = useState<{ schoolId: string; id: string; status: SchoolUserRow["status"] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const target = selection?.schoolId === schoolId ? data.rows.find(row => row.id === selection.id && row.status === selection.status) : undefined;
  const nextStatus = target?.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
  function confirm() {
    if (!target || !canEdit || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await setSchoolUserStatus({ userId: target.id, status: nextStatus, expectedSchoolId: selection!.schoolId });
        if (result.status === "error") { setError(result.message); return; }
        setSelection(null);
        router.refresh();
      } catch { setError(all("form.genericError")); router.refresh(); }
    });
  }
  const columns: DataTableColumn<SchoolUserRow>[] = [
    { id: "name", header: t("columns.name"), meta: { label: t("columns.name") }, enableSorting: false,
      cell: ({ row }) => <div><p className="font-medium">{row.original.name ?? t("unnamed")}</p>{row.original.loginCode ? <p className="break-all text-xs text-muted-foreground">{t("loginCodeLabel")}: {row.original.loginCode}</p> : null}<p className="text-xs text-muted-foreground">{row.original.codes.join(" · ") || t("noCode")}</p></div> },
    { id: "contact", header: t("columns.contact"), meta: { label: t("columns.contact") }, enableSorting: false,
      cell: ({ row }) => <div className="break-all"><p>{row.original.email ?? t("noEmail")}</p>{row.original.phone ? <p className="text-xs text-muted-foreground">{row.original.phone}</p> : null}</div> },
    { id: "roles", header: t("columns.roles"), meta: { label: t("columns.roles") }, enableSorting: false,
      cell: ({ row }) => <div className="flex flex-wrap justify-end gap-1 md:justify-start">{row.original.roles.map(role => <Badge key={role}>{all(`roles.${role}`)}</Badge>)}</div> },
    { id: "links", header: t("columns.links"), meta: { label: t("columns.links") }, enableSorting: false,
      cell: ({ row }) => row.original.links.map(link => t(`links.${link}`)).join(" · ") || t("links.none") },
    { id: "status", header: t("columns.status"), meta: { label: t("columns.status") }, enableSorting: false,
      cell: ({ row }) => <div><Badge tone={row.original.status === "ACTIVE" ? "success" : row.original.status === "SUSPENDED" ? "warning" : "neutral"}>{t(`states.${row.original.status}`)}</Badge>{row.original.passwordChangeRequired ? <p className="mt-1 text-xs text-muted-foreground">{t("passwordPending")}</p> : null}</div> },
  ];
  if (canEdit || canCreate) columns.push({ id: "actions", header: t("columns.actions"), meta: { label: t("columns.actions") }, enableSorting: false,
    cell: ({ row }) => {
      const protectedAccount = row.original.isPlatformAdmin || (!canManageManagers && row.original.roles.some(role => role === "SCHOOL_MANAGER" || role === "PLATFORM_ADMIN"));
      if (protectedAccount) return <span className="text-xs text-muted-foreground">{t("protected")}</span>;
      if (row.original.status === "DISABLED") return canEdit ? <RemoveSchoolUserDialog schoolId={schoolId} userId={row.original.id} accountName={row.original.name ?? t("unnamed")} /> : <span className="text-xs text-muted-foreground">{t("unavailable")}</span>;
      const canEditProfessionalLinks = canEdit && (canManageManagers || row.original.id !== currentUserId);
      return <div className="flex flex-wrap justify-end gap-2 md:justify-start">
        {canEditProfessionalLinks && (row.original.roles.includes("TEACHER") || row.original.links.includes("teacher")) ? <SchoolUserTeacherLinkDialog schoolId={schoolId} userId={row.original.id} accountName={row.original.name ?? t("unnamed")} /> : null}
        {canEditProfessionalLinks && (row.original.roles.some(role => role === "TEACHER" || role === "SCHOOL_MANAGER") || row.original.links.includes("staff")) ? <ProfessionalLinkDialog kind="staff" schoolId={schoolId} userId={row.original.id} accountName={row.original.name ?? t("unnamed")} /> : null}
        {canEdit && row.original.id !== currentUserId ? <RemoveSchoolUserDialog schoolId={schoolId} userId={row.original.id} accountName={row.original.name ?? t("unnamed")} /> : null}
        {canEdit ? <EditSchoolUserDialog schoolId={schoolId} userId={row.original.id} accountName={row.original.name ?? t("unnamed")} /> : null}
        {canEdit ? <Button type="button" size="sm" variant="secondary" disabled={pending} aria-label={t(row.original.status === "ACTIVE" ? "suspendNamed" : "activateNamed", { name: row.original.name ?? t("unnamed") })} onClick={() => { setError(null); setSelection({ schoolId, id: row.original.id, status: row.original.status }); }}>{t(row.original.status === "ACTIVE" ? "suspend" : "activate")}</Button> : null}
        {canCreate && row.original.passwordChangeRequired && row.original.status === "ACTIVE" ? <CreateSchoolUserDialog schoolId={schoolId} canManageManagers={canManageManagers} reissueUserId={row.original.id} accountName={row.original.name ?? t("unnamed")} /> : null}
      </div>;
    },
  });
  const selectClass = "h-12 w-full rounded-md border border-border-strong bg-surface px-3 text-base text-foreground";
  return <div className="flex flex-col gap-6">
    <form method="get" className="grid items-end gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-5">
      <Input label={t("filters.search")} name="q" defaultValue={query.q} maxLength={100} />
      <label className="flex flex-col gap-1.5 text-sm font-medium">{t("filters.role")}<select className={selectClass} name="role" defaultValue={query.role}><option value="">{t("anyRole")}</option>{(["SCHOOL_MANAGER", "TEACHER", "STUDENT", "GUARDIAN"] as const).map(role => <option key={role} value={role}>{all(`roles.${role}`)}</option>)}</select></label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">{t("filters.status")}<select className={selectClass} name="status" defaultValue={query.status}><option value="">{t("anyStatus")}</option>{(["ACTIVE", "SUSPENDED", "DISABLED"] as const).map(status => <option key={status} value={status}>{t(`states.${status}`)}</option>)}</select></label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">{t("filters.link")}<select className={selectClass} name="link" defaultValue={query.link}><option value="">{t("anyLink")}</option>{(["teacher", "staff", "student", "guardian", "none"] as const).map(link => <option key={link} value={link}>{t(`links.${link}`)}</option>)}</select></label>
      <Button type="submit" className="self-end">{t("search")}</Button>
    </form>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{t("count", { filtered: data.filtered, total: data.total })}</p><p className="text-sm text-muted-foreground">{t("schoolScope")}</p></div>
    {error && !target ? <p role="alert" className="rounded-md border border-destructive bg-destructive-surface p-3 text-sm text-destructive">{error}</p> : null}
    <DataTable key={JSON.stringify(query)} label={t("tableLabel")} columns={columns} data={[...data.rows]} getRowId={row => row.id} enableSearch={false} enableColumnVisibility={false} pageSize={SCHOOL_USER_PAGE_SIZE} emptyTitle={t("empty")} emptyHint={t("emptyHint")} />
    {data.pageCount > 1 ? <nav aria-label={t("pagination")} className="flex items-center justify-between gap-3"><Button asChild variant="secondary" disabled={data.page === 1}>{data.page > 1 ? <Link href={{ pathname: "/users", query: { ...query, page: data.page - 1 } }}>{t("previous")}</Link> : <span aria-disabled="true">{t("previous")}</span>}</Button><p className="text-sm text-muted-foreground">{t("page", { page: data.page, total: data.pageCount })}</p><Button asChild variant="secondary" disabled={data.page === data.pageCount}>{data.page < data.pageCount ? <Link href={{ pathname: "/users", query: { ...query, page: data.page + 1 } }}>{t("next")}</Link> : <span aria-disabled="true">{t("next")}</span>}</Button></nav> : null}
    <Dialog open={!!target} onOpenChange={open => { if (!open && !pending) { setSelection(null); router.refresh(); } }}><DialogContent><DialogHeader><DialogTitle>{t(nextStatus === "SUSPENDED" ? "confirmSuspend" : "confirmActivate")}</DialogTitle><DialogDescription>{t("confirmDescription", { name: target?.name ?? t("unnamed") })}</DialogDescription></DialogHeader>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}<DialogFooter><Button type="button" variant="secondary" disabled={pending} onClick={() => { setSelection(null); router.refresh(); }}>{all("form.cancel")}</Button><Button type="button" disabled={pending} onClick={confirm}>{pending ? all("form.saving") : t(nextStatus === "SUSPENDED" ? "suspend" : "activate")}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
