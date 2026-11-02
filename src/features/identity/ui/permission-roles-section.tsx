"use client";

import { Plus, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState, useTransition } from "react";

import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PermissionRoleManagementDialog } from "./permission-role-management-dialog";
import { InstallSystemRolesDialog } from "./install-system-roles-dialog";
import { MembershipRoleDialog } from "./membership-role-dialog";
import { MembershipPermissionOverridesDialog } from "./membership-permission-overrides-dialog";
import { PermissionGrid } from "./permission-grid";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createPermissionRole } from "@/features/identity/actions/create-permission-role";
import type {
  AssignableStaffPage,
  AssignableStaffRow,
  PermissionCatalogEntryRow,
  PermissionRoleRow,
} from "@/features/identity/data/permission-roles";
import { Link, useRouter } from "@/i18n/navigation";

interface PermissionRolesSectionProps {
  readonly schoolId: string;
  readonly roles: readonly PermissionRoleRow[];
  readonly catalog: readonly PermissionCatalogEntryRow[];
  readonly staff: readonly AssignableStaffRow[];
  readonly staffPagination?: AssignableStaffPage;
}


/**
 * Gestão de papéis configuráveis — a única secção desta escala que o `FormModal` genérico
 * não cobre (grelha de checkboxes recurso×acção), mesmo caso de `AssessmentSchemeSection`.
 * Duas partes: a tabela de papéis com o formulário de criação, e a lista de gestores da
 * escola com um selector para atribuir (ou remover) o papel de cada um.
 */
export function PermissionRolesSection({ roles, catalog, staff, staffPagination, schoolId }: PermissionRolesSectionProps) {
  const t = useTranslations("permissionRoles");
  const [open, setOpen] = useState(false);
  const [openedSchoolId, setOpenedSchoolId] = useState(schoolId);

  const columns = useMemo<DataTableColumn<PermissionRoleRow>[]>(
    () => [
      { accessorKey: "name", header: t("columns.name"), meta: { label: t("columns.name") }, cell: ({ row }) => <div className="flex flex-wrap items-center gap-2"><span>{row.original.name}</span>{row.original.isSystem ? <Badge tone="neutral">{t("manage.system")}</Badge> : null}</div> },
      {
        accessorKey: "description",
        header: t("columns.description"),
        meta: { label: t("columns.description") },
        cell: ({ row }) => row.original.description ?? "—",
      },
      {
        accessorKey: "permissionIds",
        header: t("columns.permissionCount"),
        meta: { label: t("columns.permissionCount") },
        cell: ({ row }) => row.original.permissionIds.length,
      },
      {
        accessorKey: "memberCount",
        header: t("columns.memberCount"),
        meta: { label: t("columns.memberCount") },
      },
      { id: "actions", header: t("manage.actions"), meta: { label: t("manage.actions") }, enableSorting: false, cell: ({ row }) => <div className="flex flex-wrap gap-2"><PermissionRoleManagementDialog mode="edit" schoolId={schoolId} roleId={row.original.id} roleName={row.original.name} catalog={catalog} /><PermissionRoleManagementDialog mode="delete" schoolId={schoolId} roleId={row.original.id} roleName={row.original.name} catalog={catalog} /></div> },
    ],
    [t, schoolId, catalog],
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:p-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold">{t("rolesTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("rolesSubtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-4">
          <InstallSystemRolesDialog schoolId={schoolId} />
          <Button size="sm" onClick={() => { setOpenedSchoolId(schoolId); setOpen(true); }}>
            <Plus aria-hidden="true" strokeWidth={1.75} />
            {t("create.trigger")}
          </Button>
        </div>

        <DataTable
          label={t("rolesTableLabel")}
          columns={columns}
          data={roles as PermissionRoleRow[]}
          getRowId={(row) => row.id}
          emptyTitle={t("rolesEmpty")}
          emptyHint={t("rolesEmptyHint")}
          pageSize={10}
        />
      </section>

      <StaffAssignmentSection schoolId={schoolId} staff={staff} pagination={staffPagination} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="min-w-0 max-h-[90dvh] overflow-x-hidden overflow-y-auto sm:max-w-2xl">
          {open ? <CreatePermissionRoleForm schoolId={openedSchoolId} catalog={catalog} onOpenChange={setOpen} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreatePermissionRoleForm({
  schoolId,
  catalog,
  onOpenChange,
}: {
  readonly schoolId: string;
  readonly catalog: readonly PermissionCatalogEntryRow[];
  readonly onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("permissionRoles");
  const tForm = useTranslations("form");
  const formId = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [requestId] = useState(() => crypto.randomUUID());
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [nameError, setNameError] = useState<string | null>(null);



  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setNameError(null);

    if (name.trim().length < 3 || name.trim().length > 120 || !/[\p{L}\p{N}]/u.test(name)) {
      setNameError(t("errors.name"));
      return;
    }

    startTransition(async () => {
      try {
        const result = await createPermissionRole({
          expectedSchoolId: schoolId, requestId,
          name: name.trim(),
          description,
          permissionIds: [...selected],
        });

        if (result.status === "success") {
          onOpenChange(false);
          router.refresh();
          return;
        }

        if (result.fieldErrors?.name) setNameError(result.fieldErrors.name);
        else setFormError(result.message ?? tForm("genericError"));
      } catch { setFormError(t("errors.createFailed")); }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("create.title")}</DialogTitle>
        <DialogDescription>{t("create.description")}</DialogDescription>
      </DialogHeader>

      {formError ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive bg-destructive-surface p-3 text-sm text-destructive"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
          {formError}
        </p>
      ) : null}

      <form id={formId} noValidate onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-6">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <Input
            label={t("create.fields.name")}
            minLength={3}
            maxLength={120}
            required
            disabled={isPending}
            error={nameError ?? undefined}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            label={t("create.fields.description")}
            maxLength={500}
            disabled={isPending}
            helperText={tForm("optional")}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <PermissionGrid catalog={catalog} selected={selected} onChange={setSelected} disabled={isPending} />
      </form>

      <DialogFooter>
        <Button type="button" variant="ghost" disabled={isPending} onClick={() => onOpenChange(false)}>
          {tForm("cancel")}
        </Button>
        <Button type="submit" form={formId} disabled={isPending}>
          {isPending ? tForm("saving") : tForm("save")}
        </Button>
      </DialogFooter>
    </>
  );
}

function StaffAssignmentSection({ schoolId, staff, pagination }: { readonly schoolId: string; readonly staff: readonly AssignableStaffRow[]; readonly pagination?: AssignableStaffPage }) {
  const t = useTranslations("permissionRoles");
  const allRoles = useTranslations("roles");
  return <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:p-6">
    <div className="flex flex-col gap-1"><h3 className="text-lg font-semibold">{t("staffTitle")}</h3><p className="text-sm text-muted-foreground">{t("staffSubtitle")}</p></div>
    {pagination ? <form method="get" className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end"><Input name="staffQuery" label={t("assignment.staffSearch")} defaultValue={pagination.query} maxLength={120} /><Button type="submit" variant="secondary">{t("assignment.searchButton")}</Button></form> : null}
    {staff.length ? <ul className="flex flex-col gap-2">{staff.map(member => <li key={member.membershipId} className="flex min-w-0 flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 flex-col gap-2"><span className="break-words font-medium">{member.userName || t("assignment.unnamed", { code: member.membershipId.slice(-8) })}</span><div className="flex flex-wrap items-center gap-2"><Badge tone="neutral">{allRoles(member.baseRole)}</Badge>{member.status === "SUSPENDED" ? <Badge tone="warning">{t("assignment.suspendedBadge")}</Badge> : null}<Badge tone={member.mode === "legacy" && !member.activeOverrideCount ? "success" : "neutral"}>{member.mode === "legacy" ? t(member.activeOverrideCount ? "overrides.legacyRestricted" : "unrestrictedBadge") : t("assignment.roleCount", { count: member.assignedRoleCount })}</Badge>{member.overrideCount ? <Badge tone="neutral">{t("overrides.badge", { count: member.overrideCount })}</Badge> : null}{member.isCurrentUser ? <span className="text-sm text-muted-foreground">{t("assignment.currentUser")}</span> : null}</div></div><div className="flex flex-wrap gap-2"><MembershipRoleDialog schoolId={schoolId} membershipId={member.membershipId} accountName={member.userName || t("assignment.unnamed", { code: member.membershipId.slice(-8) })} disabled={member.isCurrentUser} /><MembershipPermissionOverridesDialog schoolId={schoolId} membershipId={member.membershipId} accountName={member.userName || t("assignment.unnamed", { code: member.membershipId.slice(-8) })} disabled={member.isCurrentUser} /></div></li>)}</ul> : <p className="text-sm text-muted-foreground">{t("staffEmpty")}</p>}
    {pagination && pagination.pageCount > 1 ? <nav aria-label={t("assignment.staffPagination")} className="flex flex-wrap items-center justify-between gap-2"><Button asChild variant="secondary" size="sm" disabled={pagination.page === 1}>{pagination.page > 1 ? <Link href={{ pathname: "/settings", query: { staffQuery: pagination.query, staffPage: pagination.page - 1 } }}>{t("assignment.previous")}</Link> : <span aria-disabled="true">{t("assignment.previous")}</span>}</Button><p className="text-sm text-muted-foreground">{t("assignment.page", { page: pagination.page, total: pagination.pageCount })}</p><Button asChild variant="secondary" size="sm" disabled={pagination.page >= pagination.pageCount}>{pagination.page < pagination.pageCount ? <Link href={{ pathname: "/settings", query: { staffQuery: pagination.query, staffPage: pagination.page + 1 } }}>{t("assignment.next")}</Link> : <span aria-disabled="true">{t("assignment.next")}</span>}</Button></nav> : null}
  </section>;
}
