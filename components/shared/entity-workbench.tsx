"use client";

import { Download, Search } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { DataTable, type SimpleColumn } from "@/components/shared/data-table";
import { DetailDrawer } from "@/components/shared/detail-drawer";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadCsv } from "@/lib/csv";

interface FilterDef<T> {
  label: string;
  value: string;
  predicate: (row: T) => boolean;
}

interface EntityWorkbenchProps<T> {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  kpis?: { label: string; value: string; href?: string; tone?: "default" | "warning" | "danger" | "success" }[];
  rows: T[];
  columns: SimpleColumn<T>[];
  getRowId: (row: T) => string;
  searchPlaceholder?: string;
  searchFn: (row: T, query: string) => boolean;
  filters?: FilterDef<T>[];
  renderDetails: (row: T) => ReactNode;
  drawerTitle?: (row: T) => string;
  drawerDescription?: (row: T) => string;
  drawerFooter?: (row: T, close: () => void) => ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  exportName: string;
  exportRow: (row: T) => Record<string, string | number | boolean | null | undefined>;
  initialSelectedId?: string | null;
  actions?: ReactNode;
}

export function EntityWorkbench<T>({
  title,
  description,
  breadcrumbs,
  kpis,
  rows,
  columns,
  getRowId,
  searchPlaceholder = "Search...",
  searchFn,
  filters,
  renderDetails,
  drawerTitle,
  drawerDescription,
  drawerFooter,
  emptyTitle,
  emptyDescription,
  exportName,
  exportRow,
  initialSelectedId,
  actions,
}: EntityWorkbenchProps<T>) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) setSelectedId(id);
  }, []);

  const filtered = useMemo(() => {
    const active = filters?.find((item) => item.value === filter);
    return rows.filter((row) => {
      const matchesSearch = query.trim() ? searchFn(row, query.trim().toLowerCase()) : true;
      const matchesFilter = !active ? true : active.predicate(row);
      return matchesSearch && matchesFilter;
    });
  }, [rows, query, filter, filters, searchFn]);

  const selected = rows.find((row) => getRowId(row) === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
        actions={
          <>
            {actions}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => downloadCsv(`${exportName}.csv`, filtered.map(exportRow))}
            >
              <Download className="size-3.5" />
              Export
            </Button>
          </>
        }
      />
      {kpis && kpis.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>
      ) : null}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8"
            aria-label={searchPlaceholder}
          />
        </div>
        {filters ? (
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            {filters.map((item) => (
              <Button
                key={item.value}
                type="button"
                size="sm"
                variant={filter === item.value ? "default" : "outline"}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
      <DataTable
        rows={filtered}
        columns={columns}
        getRowId={getRowId}
        onRowClick={(row) => setSelectedId(getRowId(row))}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />
      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        title={selected ? drawerTitle?.(selected) ?? title : title}
        description={selected ? drawerDescription?.(selected) : undefined}
        footer={selected && drawerFooter ? drawerFooter(selected, () => setSelectedId(null)) : undefined}
      >
        {selected ? renderDetails(selected) : null}
      </DetailDrawer>
    </div>
  );
}
