"use client";

// DataTable transversal (Princípio IV — speckit T003, research D1):
// implementação genérica sobre TanStack Table **v9** — a API é feature-based
// (recursos habilitados estaticamente via `tableFeatures` com
// `rowSortingFeature` + `sortedRowModel: createSortedRowModel()` e
// `columnVisibilityFeature`; hook `useTable({ features, data, columns })`;
// render via `<FlexRender>` ligado ao instance). DIVERGE da v8
// (`useReactTable`/`getSortedRowModel`/`getVisibleCells` sem feature) —
// docs lidos em node_modules/@tanstack/react-table/dist (Constraint 2).
// Colunas declarativas, conteúdo de célula customizável, ordenação
// client-side estável (SPE-02 FR-003/D7: `Intl.Collator("pt-BR")` no
// consumidor). Primeiro consumidor: listagem de funcionários (SPE-02);
// SPE-03/04/05 o reusam.

import { useState } from "react";
import {
  FlexRender,
  columnVisibilityFeature,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
  type SortingState,
  type Table,
} from "@tanstack/react-table";
import { cn } from "@/shared/lib/cn";

/** Recursos habilitados para todo consumidor do DataTable (estático:
 * fora do componente, como recomendado pelos docs da v9, D7). */
const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
});

/** Tipo de features efetivas do DataTable (para tipagem das colunas). */
export type DataTableFeatures = typeof dataTableFeatures;

/** Definição de coluna tipada contra os recursos do DataTable. */
export type DataTableColumnDef<TData extends RowData> = ColumnDef<DataTableFeatures, TData, unknown>;

/** Estado de ordenação (mesma forma da v8: [{ id, desc }]). */
export type DataTableSorting = SortingState;

/** Instância da tabela exposta ao consumidor (uso avançado, se necessário). */
export type DataTableInstance<TData extends RowData> = Table<DataTableFeatures, TData>;

interface DataTableProps<TData extends RowData> {
  data: TData[];
  columns: DataTableColumnDef<TData>[];
  /** Ordenação inicial (D7: [{ id: "name", desc: false }]). */
  initialSorting?: DataTableSorting;
  /** Identidade estável da linha (default: índice). */
  getRowKey?: (row: TData, index: number) => string;
  className?: string;
}

const SORT_ARIA = { ascending: "ascending", descending: "descending" } as const;

export default function DataTable<TData extends RowData>({
  data,
  columns,
  initialSorting,
  getRowKey,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<DataTableSorting>(initialSorting ?? []);

  // A constraint de dados da v9 é RowData (Record | array) — consumers
  // passam aliases tipados implicitamente indexáveis (ver types da
  // feature employees: EmployeeView é type alias por isso).
  const table = useTable({
    features: dataTableFeatures,
    data,
    columns,
    getRowId: (row, index) => (getRowKey ? getRowKey(row, index) : String(index)),
    state: { sorting },
    onSortingChange: setSorting,
  });

  return (
    <div className={cn("overflow-hidden rounded-md border border-border bg-surface", className)}>
      <table className="w-full border-collapse">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="bg-surface-muted">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    aria-sort={
                      sorted === false
                        ? "none"
                        : sorted === "asc"
                          ? SORT_ARIA.ascending
                          : sorted === "desc"
                            ? SORT_ARIA.descending
                            : "none"
                    }
                    className="px-3 py-2 text-left align-bottom"
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="text-title-4 inline-flex cursor-pointer items-center gap-1 rounded-sm hover:text-foreground"
                      >
                        <FlexRender header={header} />
                        <span aria-hidden="true" className="text-foreground-muted">
                          {sorted === "asc" ? "▲" : sorted === "desc" ? "▼" : "↕"}
                        </span>
                      </button>
                    ) : (
                      <span className="text-title-4">
                        <FlexRender header={header} />
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-t border-border">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="text-body px-3 py-2 align-middle">
                  <FlexRender cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
