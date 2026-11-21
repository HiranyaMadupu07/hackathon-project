import React from 'react';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';

export interface TableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  className?: string;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  keyExtractor: (row: T) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  emptyTitle = 'No matching records',
  emptyDescription = 'Adjust your search criteria or filters to view results.',
  emptyActionLabel,
  onEmptyAction,
  onRowClick,
}: DataTableProps<T>) {
  if (isLoading) {
    return <LoadingState rows={6} />;
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-white dark:border-slate-800 dark:bg-[#161B22]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-stone-200 text-left dark:divide-slate-800">
          <thead className="bg-stone-50 dark:bg-[#1C222B]">
            <tr>
              {columns.map((col) => {
                const alignClass =
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                      ? 'text-center'
                      : 'text-left';
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap ${alignClass} ${col.className ?? ''}`}
                  >
                    {col.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 bg-white dark:divide-slate-800/80 dark:bg-[#161B22]">
            {data.map((row) => (
              <tr
                key={keyExtractor(row)}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          if ((e.target as HTMLElement).closest('button,a,input,select')) {
                            return;
                          }
                          e.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                className={
                  onRowClick
                    ? 'cursor-pointer hover:bg-stone-50 focus-visible:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0F294D] dark:hover:bg-slate-800/60 dark:focus-visible:bg-slate-800/60 dark:focus-visible:ring-teal-500 transition-colors'
                    : 'hover:bg-stone-50/60 dark:hover:bg-slate-800/40 transition-colors'
                }
              >
                {columns.map((col) => {
                  const alignClass =
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                        ? 'text-center'
                        : 'text-left';
                  return (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm text-slate-700 dark:text-slate-200 ${alignClass} ${col.className ?? ''}`}
                    >
                      {col.render(row)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
