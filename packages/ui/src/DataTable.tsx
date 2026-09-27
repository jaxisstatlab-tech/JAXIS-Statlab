"use client";

import React from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./Table";
import { LoadingState } from "./LoadingState";
import { Pagination } from "./Pagination";
import { cn } from "./utils";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
  pageSize?: number;
  showPagination?: boolean;
}

export function DataTable<T extends object = Record<string, unknown>>({
  columns,
  rows,
  loading = false,
  emptyState,
  onRowClick,
  className = "",
  pageSize: initialPageSize = 10,
  showPagination = false,
}: DataTableProps<T>): React.ReactElement {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);

  const displayedRows = React.useMemo(() => {
    if (!showPagination) return rows;
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, showPagination, currentPage, pageSize]);
  return (
    <div
      className={cn(
        "w-full overflow-hidden border border-white/10 rounded-[2px] bg-[#050513]",
        className
      )}
    >
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-transparent">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                style={{ width: col.width }}
                className={cn(
                  col.align === "center"
                    ? "text-center"
                    : col.align === "right"
                    ? "text-right"
                    : "text-left"
                )}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="py-14 px-6 text-center">
                <LoadingState variant="table" label="Loading data..." />
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columns.length}
                className="py-16 px-6 text-center text-white/40 font-mono text-xs"
              >
                {emptyState ?? (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-sm font-medium text-white/70">No records found</p>
                    <p className="text-xs text-white/40 font-sans">
                      There is no data to display at this time.
                    </p>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ) : (
            displayedRows.map((row, rIdx) => (
              <TableRow
                key={((row as { id?: string }).id) ?? rIdx}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "transition-colors hover:bg-white/[0.03] group",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((col) => {
                  const content = col.render
                    ? col.render(row)
                    : ((row as Record<string, unknown>)[col.key] as React.ReactNode);
                  return (
                    <TableCell
                      key={col.key}
                      className={cn(
                        col.align === "center"
                          ? "text-center"
                          : col.align === "right"
                          ? "text-right"
                          : "text-left"
                      )}
                    >
                      {content}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {showPagination && rows.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={rows.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
}
