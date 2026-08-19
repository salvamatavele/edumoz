"use client";

import { Plus, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState, useTransition } from "react";

import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignPermissionRole } from "@/features/identity/actions/assign-permission-role";
import { createPermissionRole } from "@/features/identity/actions/create-permission-role";
import type {
  AssignableStaffRow,
  PermissionCatalogEntryRow,
  PermissionRoleRow,
} from "@/features/identity/data/permission-roles";
import { PERMISSION_ACTIONS, PERMISSION_RESOURCES } from "@/features/identity/domain/permission-catalog";
import { useRouter } from "@/i18n/navigation";

interface PermissionRolesSectionProps {
  readonly roles: readonly PermissionRoleRow[];
  readonly catalog: readonly PermissionCatalogEntryRow[];
  readonly staff: readonly AssignableStaffRow[];
}

const UNRESTRICTED = "unrestricted";

/**
 * Gestão de papéis configuráveis — a única secção desta escala que o `FormModal` genérico
 * não cobre (grelha de checkboxes recurso×acção), mesmo caso de `AssessmentSchemeSection`.
 * Duas partes: a tabela de papéis com o formulário de criação, e a lista de gestores da
 * escola com um selector para atribuir (ou remover) o papel de cada um.
 */
export function PermissionRolesSection({ roles, catalog, staff }: PermissionRolesSectionProps) {
  const t = useTranslations("permissionRoles");
  const [open, setOpen] = useState(false);

  const columns = useMemo<DataTableColumn<PermissionRoleRow>[]>(
    () => [
      { accessorKey: "name", header: t("columns.name"), meta: { label: t("columns.name") } },
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
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:p-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold">{t("rolesTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("rolesSubtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-4">
          <Button size="sm" onClick={() => setOpen(true)}>
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

      <StaffAssignmentSection staff={staff} roles={roles} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          {open ? <CreatePermissionRoleForm catalog={catalog} onOpenChange={setOpen} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreatePermissionRoleForm({
  catalog,
  onOpenChange,
}: {
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
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [nameError, setNameError] = useState<string | null>(null);

  const byResource = useMemo(() => {
    const map = new Map<string, PermissionCatalogEntryRow[]>();

    for (const entry of catalog) {
      const existing = map.get(entry.resource) ?? [];
      existing.push(entry);
      map.set(entry.resource, existing);
    }

    return map;
  }, [catalog]);

  function toggle(permissionId: string) {
    setSelected((current) => {
      const next = new Set(current);

      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);

      return next;
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setNameError(null);

    if (!name.trim()) {
      setNameError(t("errors.name"));
      return;
    }

    startTransition(async () => {
      const result = await createPermissionRole({
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

      <form id={formId} noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t("create.fields.name")}
            required
            disabled={isPending}
            error={nameError ?? undefined}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            label={t("create.fields.description")}
            disabled={isPending}
            helperText={tForm("optional")}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold">{t("create.permissionsTitle")}</h4>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-2 text-left font-medium">{t("create.resourceColumn")}</th>
                  {PERMISSION_ACTIONS.map((action) => (
                    <th key={action} className="px-3 py-2 text-center font-medium">
                      {t(`actions.${action}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSION_RESOURCES.map((resource) => (
                  <tr key={resource} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2 font-medium">{t(`resources.${resource}`)}</td>
                    {PERMISSION_ACTIONS.map((action) => {
                      const entry = (byResource.get(resource) ?? []).find((item) => item.action === action);

                      return (
                        <td key={action} className="px-3 py-2 text-center">
                          {entry ? (
                            <Checkbox
                              disabled={isPending}
                              checked={selected.has(entry.id)}
                              onCheckedChange={() => toggle(entry.id)}
                              aria-label={`${t(`resources.${resource}`)} — ${t(`actions.${action}`)}`}
                            />
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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

function StaffAssignmentSection({
  staff,
  roles,
}: {
  readonly staff: readonly AssignableStaffRow[];
  readonly roles: readonly PermissionRoleRow[];
}) {
  const t = useTranslations("permissionRoles");

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold">{t("staffTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("staffSubtitle")}</p>
      </div>

      {staff.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("staffEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {staff.map((member) => (
            <StaffRow key={member.membershipId} member={member} roles={roles} />
          ))}
        </ul>
      )}
    </section>
  );
}

function StaffRow({
  member,
  roles,
}: {
  readonly member: AssignableStaffRow;
  readonly roles: readonly PermissionRoleRow[];
}) {
  const t = useTranslations("permissionRoles");
  const router = useRouter();
  const id = useId();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(value: string) {
    setError(null);

    startTransition(async () => {
      const result = await assignPermissionRole({
        membershipId: member.membershipId,
        permissionRoleId: value === UNRESTRICTED ? null : value,
      });

      if (result.status === "error") {
        setError(result.message ?? t("errors.assignFailed"));
        return;
      }

      router.refresh();
    });
  }

  return (
    <li className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="font-medium text-foreground">{member.userName}</span>
        {member.permissionRoleId ? (
          <Badge tone="neutral">{t("restricted")}</Badge>
        ) : (
          <Badge tone="success">{t("unrestrictedBadge")}</Badge>
        )}
      </div>

      <div className="flex flex-col items-end gap-1">
        <Select
          disabled={isPending}
          value={member.permissionRoleId ?? UNRESTRICTED}
          onValueChange={handleChange}
        >
          <SelectTrigger id={`${id}-role`} className="h-9 w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNRESTRICTED}>{t("unrestrictedOption")}</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </li>
  );
}
