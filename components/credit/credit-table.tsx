"use client";

import { useEffect, useMemo, useState } from "react";

import { DataTable, type SimpleColumn } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CreditListMeta } from "@/types/credit";

export function CreditToolbar({
  search,
  onSearch,
  searchPlaceholder,
  status,
  statuses,
  onStatus,
  extra,
}: {
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder: string;
  status?: string;
  statuses?: Array<{ value: string; label: string }>;
  onStatus?: (value: string) => void;
  extra?: React.ReactNode;
}) {
  const [draft, setDraft] = useState(search);
  useEffect(() => setDraft(search), [search]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        className="flex min-w-[240px] flex-1 gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch(draft.trim());
        }}
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={searchPlaceholder}
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>
      {statuses && onStatus ? (
        <select
          className="h-9 rounded-md border bg-white px-2 text-sm"
          value={status ?? ""}
          onChange={(event) => onStatus(event.target.value)}
        >
          <option value="">All statuses</option>
          {statuses.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      ) : null}
      {extra}
    </div>
  );
}

export function CreditPager({
  meta,
  onPage,
}: {
  meta?: CreditListMeta;
  onPage: (page: number) => void;
}) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        Page {meta.page} of {meta.totalPages} · {meta.total} records
      </span>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
          Previous
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPage(meta.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function CreditTable<T>({
  rows,
  columns,
  getRowId,
  onRowClick,
  emptyTitle,
  emptyDescription,
}: {
  rows: T[];
  columns: SimpleColumn<T>[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const pageSize = useMemo(() => Math.max(rows.length, 1), [rows.length]);
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={getRowId}
      onRowClick={onRowClick}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      pageSize={pageSize}
    />
  );
}
