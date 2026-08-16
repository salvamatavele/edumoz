"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Columns3,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";

export type DataTableColumn<TData> = ColumnDef<TData> & {
  /** Rótulo legível, usado no selector de colunas e nos cartões em ecrã pequeno. */
  meta?: { label?: string; hideOnMobile?: boolean };
};

export interface DataTableProps<TData> {
  columns: DataTableColumn<TData>[];
  data: TData[];
  /** Extrai um id estável; sem ele a selecção de linhas perde-se ao reordenar. */
  getRowId?: (row: TData, index: number) => string;

  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;

  enableSearch?: boolean;
  enableSelection?: boolean;
  enableColumnVisibility?: boolean;
  pageSize?: number;

  emptyTitle?: string;
  emptyHint?: string;

  /** Rótulo acessível da tabela. Obrigatório: uma tabela sem nome é ilegível a leitor de ecrã. */
  label: string;
}

const SELECT_COLUMN_ID = "__select";

/**
 * Tabela de dados do EduMoz.
 *
 * Assenta no TanStack Table (headless) e veste-o com os nossos tokens.
 *
 * A decisão que mais a distingue de uma tabela genérica está no fim do ficheiro: abaixo
 * de 768px a tabela NÃO faz scroll horizontal — transforma-se numa lista de cartões. Uma
 * pauta com 12 colunas dentro de um ecrã de 375px é ilegível de qualquer maneira, e
 * obrigar a arrastar para o lado numa ligação lenta é pior do que mudar de forma.
 */
export function DataTable<TData>({
  columns,
  data,
  getRowId,
  isLoading = false,
  error = null,
  onRetry,
  enableSearch = true,
  enableSelection = false,
  enableColumnVisibility = true,
  pageSize = 10,
  emptyTitle,
  emptyHint,
  label,
}: DataTableProps<TData>) {
  const t = useTranslations("dataTable");

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  const selectionColumn: DataTableColumn<TData> = {
    id: SELECT_COLUMN_ID,
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => (
      <Checkbox
        aria-label={t("selectAll")}
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={t("selectRow")}
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
  };

  const table = useReactTable({
    data,
    columns: enableSelection ? [selectionColumn, ...columns] : columns,
    getRowId,
    state: { sorting, columnFilters, columnVisibility, rowSelection, globalFilter, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: enableSelection,
    // O TanStack ordena colunas numéricas por ordem DECRESCENTE ao primeiro clique e as
    // de texto por ordem crescente. Essa inconsistência confunde: numa pauta, clicar em
    // "Nome" e clicar em "Média" passariam a fazer coisas opostas. Aqui o primeiro clique
    // é sempre crescente, em qualquer coluna.
    sortDescFirst: false,
  });

  const rows = table.getRowModel().rows;
  const pageCount = Math.max(table.getPageCount(), 1);
  const hasQuery = globalFilter.trim().length > 0;

  const hideableColumns = table
    .getAllColumns()
    .filter((column) => column.getCanHide() && column.id !== SELECT_COLUMN_ID);

  const columnLabel = (id: string) =>
    (table.getColumn(id)?.columnDef as DataTableColumn<TData> | undefined)?.meta?.label ?? id;

  return (
    <div className="flex flex-col gap-4">
      {/* ---------- Barra de ferramentas ---------- */}
      {(enableSearch || enableColumnVisibility) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {enableSearch && (
            <div className="relative w-full sm:max-w-xs">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                strokeWidth={1.75}
              />
              <Input
                type="search"
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder={t("searchPlaceholder")}
                label={t("search")}
                hideLabel
                className="pl-10"
              />
              {hasQuery && (
                <button
                  type="button"
                  onClick={() => setGlobalFilter("")}
                  aria-label={t("clearSearch")}
                  className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X aria-hidden="true" className="size-4" strokeWidth={1.75} />
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            {enableSelection && (
              <p aria-live="polite" className="text-sm text-muted-foreground">
                {t("selected", { count: table.getSelectedRowModel().rows.length })}
              </p>
            )}

            {enableColumnVisibility && hideableColumns.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" aria-label={t("toggleColumns")}>
                    <Columns3 aria-hidden="true" strokeWidth={1.75} />
                    <span className="hidden sm:inline">{t("columns")}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {hideableColumns.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {columnLabel(column.id)}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}

      {/* ---------- Estados ---------- */}
      {error ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive-surface p-6"
        >
          <p className="flex items-center gap-2 font-medium text-destructive">
            <TriangleAlert aria-hidden="true" className="size-5" strokeWidth={1.75} />
            {t("error")}
          </p>
          <p className="text-sm text-muted-foreground">{error}</p>
          {onRetry && (
            <Button size="sm" variant="secondary" onClick={onRetry}>
              {t("retry")}
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* ---------- Tabela (≥768px) ---------- */}
          <div className="hidden overflow-hidden rounded-lg border border-border md:block">
            <Table aria-label={label} aria-busy={isLoading}>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const canSort = header.column.getCanSort();
                      const direction = header.column.getIsSorted();

                      const content = header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext());

                      return (
                        <TableHead key={header.id} aria-sort={
                          direction === "asc"
                            ? "ascending"
                            : direction === "desc"
                              ? "descending"
                              : canSort
                                ? "none"
                                : undefined
                        }>
                          {canSort ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              aria-label={
                                direction === "asc"
                                  ? t("sortDescending")
                                  : direction === "desc"
                                    ? t("clearSort")
                                    : t("sortAscending")
                              }
                              className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-md text-left font-medium hover:text-foreground"
                            >
                              {content}
                              {direction === "asc" ? (
                                <ArrowUp aria-hidden="true" className="size-3.5" />
                              ) : direction === "desc" ? (
                                <ArrowDown aria-hidden="true" className="size-3.5" />
                              ) : (
                                <ChevronsUpDown
                                  aria-hidden="true"
                                  className="size-3.5 opacity-50"
                                />
                              )}
                            </button>
                          ) : (
                            content
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={table.getVisibleFlatColumns().length}
                      className="h-32 text-center text-muted-foreground"
                    >
                      {t("loading")}
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={table.getVisibleFlatColumns().length}
                      className="h-32 text-center"
                    >
                      <EmptyState
                        hasQuery={hasQuery}
                        query={globalFilter}
                        emptyTitle={emptyTitle}
                        emptyHint={emptyHint}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* ---------- Cartões (<768px) ----------
               Mesma fonte de dados, mesma ordenação e mesmo filtro: só a forma muda. */}
          <ul aria-label={label} aria-busy={isLoading} className="flex flex-col gap-3 md:hidden">
            {isLoading ? (
              <li className="rounded-lg border border-border p-6 text-center text-muted-foreground">
                {t("loading")}
              </li>
            ) : rows.length === 0 ? (
              <li className="rounded-lg border border-border p-6 text-center">
                <EmptyState
                  hasQuery={hasQuery}
                  query={globalFilter}
                  emptyTitle={emptyTitle}
                  emptyHint={emptyHint}
                />
              </li>
            ) : (
              rows.map((row) => (
                <li
                  key={row.id}
                  className={cn(
                    "rounded-lg border border-border bg-surface p-4",
                    row.getIsSelected() && "border-primary",
                  )}
                >
                  <dl className="flex flex-col gap-2">
                    {row
                      .getVisibleCells()
                      .filter((cell) => cell.column.id !== SELECT_COLUMN_ID)
                      .filter(
                        (cell) =>
                          !(cell.column.columnDef as DataTableColumn<TData>).meta
                            ?.hideOnMobile,
                      )
                      .map((cell) => (
                        <div
                          key={cell.id}
                          className="flex items-baseline justify-between gap-4"
                        >
                          <dt className="text-xs text-muted-foreground">
                            {columnLabel(cell.column.id)}
                          </dt>
                          <dd className="text-right text-sm font-medium">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </dd>
                        </div>
                      ))}
                  </dl>
                </li>
              ))
            )}
          </ul>

          {/* ---------- Paginação ---------- */}
          {!isLoading && rows.length > 0 && pageCount > 1 && (
            <nav
              aria-label={t("pageOf", {
                page: pagination.pageIndex + 1,
                total: pageCount,
              })}
              className="flex items-center justify-between gap-4"
            >
              <p className="text-sm text-muted-foreground" data-numeric>
                {t("pageOf", { page: pagination.pageIndex + 1, total: pageCount })}
              </p>

              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t("firstPage")}
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.setPageIndex(0)}
                >
                  <ChevronsLeft aria-hidden="true" strokeWidth={1.75} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t("previousPage")}
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                >
                  <ChevronLeft aria-hidden="true" strokeWidth={1.75} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t("nextPage")}
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.nextPage()}
                >
                  <ChevronRight aria-hidden="true" strokeWidth={1.75} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t("lastPage")}
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.setPageIndex(pageCount - 1)}
                >
                  <ChevronsRight aria-hidden="true" strokeWidth={1.75} />
                </Button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({
  hasQuery,
  query,
  emptyTitle,
  emptyHint,
}: {
  hasQuery: boolean;
  query: string;
  emptyTitle?: string;
  emptyHint?: string;
}) {
  const t = useTranslations("dataTable");

  // "Sem registos" e "nada corresponde à pesquisa" são situações diferentes e pedem
  // acções diferentes: numa cria-se o primeiro registo, na outra limpa-se o filtro.
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="font-medium">
        {hasQuery ? t("noMatches", { query }) : (emptyTitle ?? t("empty"))}
      </p>
      <p className="text-sm text-muted-foreground">
        {hasQuery ? t("noMatchesHint") : (emptyHint ?? t("emptyHint"))}
      </p>
    </div>
  );
}
