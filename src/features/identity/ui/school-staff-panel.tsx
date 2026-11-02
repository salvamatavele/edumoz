"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FormModal } from "@/components/form/form-modal";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import type { FieldDefinition } from "@/components/form/field-schema";
import { schoolStaffFieldsSchema, type SchoolStaffFields, type SchoolStaffQuery } from "../domain/school-staff";
import type { SchoolStaffDetail, SchoolStaffPage } from "../data/school-staff";
import { loadSchoolStaffAction, saveSchoolStaffAction } from "../actions/school-staff";
import { Link, useRouter } from "@/i18n/navigation";

const empty: SchoolStaffFields = { code: "", name: "", jobTitle: "", title: "", email: "", phone: "", birthDate: "", gender: "", documentNumber: "", nuit: "", address: "", qualification: "", contractType: "", hireDate: "", notes: "", isActive: true };
function StaffDialog({ schoolId, id, name }: { schoolId: string; id?: string; name?: string }) {
  const t = useTranslations("staff"), form = useTranslations("form");
  const router = useRouter();
  const [open, setOpen] = useState(false), [pending, startTransition] = useTransition();
  const [scope, setScope] = useState(schoolId), [requestId, setRequestId] = useState("");
  const [detail, setDetail] = useState<SchoolStaffDetail | null>(null), [error, setError] = useState<string | null>(null);
  function begin() {
    setScope(schoolId); setRequestId(crypto.randomUUID()); setError(null); setDetail(null);
    if (!id) { setOpen(true); return; }
    startTransition(async () => {
      try { const result = await loadSchoolStaffAction({ id, expectedSchoolId: schoolId }); if (result.status === "error") setError(result.message); else { setDetail(result.data); setOpen(true); } }
      catch { setError(form("genericError")); }
    });
  }
  const fields: FieldDefinition<keyof SchoolStaffFields>[] = (Object.keys(empty) as (keyof SchoolStaffFields)[]).map(key => ({ name: key, label: t(`fields.${key}`), kind: key === "isActive" ? "checkbox" : key === "gender" ? "select" : key.endsWith("Date") ? "date" : key === "email" ? "email" : key === "phone" ? "tel" : key === "address" || key === "notes" ? "textarea" : "text", required: ["code", "name", "jobTitle"].includes(key), fullWidth: ["address", "notes"].includes(key), ...(key === "gender" ? { options: [{ value: "UNSPECIFIED", label: t("unspecified") }, { value: "MALE", label: t("male") }, { value: "FEMALE", label: t("female") }] } : {}) }));
  return <>
    <Button type="button" variant={id ? "secondary" : "default"} size="sm" disabled={pending} onClick={begin} aria-label={id ? t("editNamed", { name: name ?? "" }) : t("create")}>{pending ? t("loading") : t(id ? "edit" : "create")}</Button>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    <FormModal key={requestId + (detail?.revision ?? "")} open={open} onOpenChange={value => { setOpen(value); if (!value) { setDetail(null); router.refresh(); } }} title={t(id ? "editTitle" : "createTitle")} description={t("formHint")} definition={{ schema: schoolStaffFieldsSchema, fields }} defaultValues={detail ?? empty} onSubmit={async values => {
      try {
        const result = await saveSchoolStaffAction({ ...values, requestId, ...(id ? { id, revision: detail?.revision } : {}), expectedSchoolId: scope });
        return result.status === "success" ? { status: "success" } : { status: "error", message: result.message };
      } catch { return { status: "error", message: t("uncertain") }; }
    }} onSuccess={() => { setOpen(false); setDetail(null); router.refresh(); }} />
  </>;
}
export function SchoolStaffPanel({ schoolId, data, query, canCreate, canEdit }: { schoolId: string; data: SchoolStaffPage; query: SchoolStaffQuery; canCreate: boolean; canEdit: boolean }) {
  const t = useTranslations("staff");
  const columns: DataTableColumn<SchoolStaffPage["rows"][number]>[] = [
    { accessorKey: "code", header: t("fields.code"), enableSorting: false }, { accessorKey: "name", header: t("fields.name"), enableSorting: false }, { accessorKey: "jobTitle", header: t("fields.jobTitle"), enableSorting: false },
    { id: "contact", header: t("contacts"), cell: ({ row }) => <div className="break-all"><p>{row.original.email ?? "—"}</p><p>{row.original.phone}</p></div> },
    { id: "status", header: t("status"), cell: ({ row }) => <Badge tone={row.original.isActive ? "success" : "neutral"}>{t(row.original.isActive ? "active" : "inactive")}</Badge> },
    { id: "linked", header: t("account"), cell: ({ row }) => t(row.original.linked ? "linked" : "notLinked") },
  ];
  if (canEdit) columns.push({ id: "actions", header: t("actions"), cell: ({ row }) => <StaffDialog schoolId={schoolId} id={row.original.id} name={row.original.name} /> });
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-muted-foreground">{t("hint")}</p>{canCreate ? <StaffDialog schoolId={schoolId} /> : null}</div>
    <form method="get" className="grid items-end gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-[1fr_12rem_auto]"><Input label={t("searchLabel")} name="q" defaultValue={query.q} maxLength={100}/><label className="flex flex-col gap-1.5 text-sm font-medium">{t("status")}<select name="status" defaultValue={query.status} className="h-12 rounded-md border border-border-strong bg-surface px-3 text-base"><option value="">{t("allStates")}</option><option value="ACTIVE">{t("active")}</option><option value="INACTIVE">{t("inactive")}</option></select></label><Button type="submit">{t("search")}</Button></form>
    <p className="text-sm text-muted-foreground">{t("count", { count: data.count })}</p>
    <DataTable label={t("title")} columns={columns} data={data.rows} getRowId={row => row.id} enableSearch={false} enableColumnVisibility={false} pageSize={25} emptyTitle={t("empty")} />
    {data.pageCount > 1 ? <nav aria-label={t("pagination")} className="flex items-center justify-between gap-3">{data.page > 1 ? <Button asChild variant="secondary"><Link href={{ pathname: "/staff", query: { ...query, page: data.page - 1 } }}>{t("previous")}</Link></Button> : <span/>}<span>{t("page", { page: data.page, total: data.pageCount })}</span>{data.page < data.pageCount ? <Button asChild variant="secondary"><Link href={{ pathname: "/staff", query: { ...query, page: data.page + 1 } }}>{t("next")}</Link></Button> : <span/>}</nav> : null}
  </div>;
}
