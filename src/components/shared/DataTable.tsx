import type { ReactNode } from "react";

export type Column<T> = { header: string; render: (row: T) => ReactNode };

export function DataTable<T extends { id: string }>({
  columns,
  rows,
}: {
  columns: Column<T>[];
  rows: T[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr className="border-b border-[var(--line)]">
            {columns.map((c) => (
              <th
                key={c.header}
                className="text-left text-[10.5px] font-semibold tracking-[.16em] uppercase text-[var(--dim)] p-3"
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-[var(--line)]">
              {columns.map((c) => (
                <td key={c.header} className="p-3 text-sm">
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
