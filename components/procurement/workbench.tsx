"use client";

import {
  BarChart3,
  CheckCircle2,
  Clock3,
  Columns3,
  Download,
  Factory,
  Filter,
  GitCompare,
  Handshake,
  MoreHorizontal,
  Plus,
  Scale,
  Search,
  ShieldAlert,
  Table2,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";

import { ProcurementDetailDrawer } from "@/components/procurement/detail-drawer";
import { ProcurementModals } from "@/components/procurement/modals";
import { ProcurementQueueBoard } from "@/components/procurement/queue-board";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState, KpiSkeleton, TableSkeleton } from "@/components/shared/states";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { downloadCsv } from "@/lib/csv";
import { formatInrExact, formatNumber, formatRelativeTime } from "@/lib/format";
import {
  advancedFilterCount,
  applyFilters,
  computeKpis,
  EMPTY_ADVANCED_FILTERS,
  formatKpiDays,
  formatOpenPoValue,
  needsAttention,
  nextActionLabel,
  PROCUREMENT_STATUSES,
  rowAccent,
  toExportRow,
  type AdvancedFilters,
  type KpiFilter,
  type QuickFilter,
} from "@/lib/procurement";
import { cn } from "@/lib/utils";
import { useProcurementStore } from "@/store/procurement-store";
import type { ProcurementStatus } from "@/types";

const QUICK_FILTERS: { label: string; value: QuickFilter }[] = [
  { label: "All", value: "all" },
  { label: "Needs action", value: "needs-action" },
  { label: "Negotiation", value: "Negotiation" },
  { label: "Urgent", value: "Urgent Review" },
  { label: "Pending Inv.", value: "Pending Inv." },
  { label: "Approved", value: "Approved" },
];

const KPI_CHIP_LABEL: Record<Exclude<KpiFilter, null>, string> = {
  "pending-approvals": "Pending approvals",
  "avg-time": "In-flight cycle",
  negotiations: "Active negotiations",
  "open-po": "Open PO value",
};

export function ProcurementWorkbench({ initialView }: { initialView?: "table" | "queue" } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const procurements = useProcurementStore((s) => s.procurements);
  const filters = useProcurementStore((s) => s.filters);
  const viewMode = useProcurementStore((s) => s.viewMode);
  const activities = useProcurementStore((s) => s.activities);
  const selectedId = useProcurementStore((s) => s.selectedId);
  const setSearchQuery = useProcurementStore((s) => s.setSearchQuery);
  const setQuickFilter = useProcurementStore((s) => s.setQuickFilter);
  const setKpiFilter = useProcurementStore((s) => s.setKpiFilter);
  const setAdvancedFilters = useProcurementStore((s) => s.setAdvancedFilters);
  const clearFilters = useProcurementStore((s) => s.clearFilters);
  const setViewMode = useProcurementStore((s) => s.setViewMode);
  const selectProcurement = useProcurementStore((s) => s.selectProcurement);
  const openModal = useProcurementStore((s) => s.openModal);
  const hydrate = useProcurementStore((s) => s.hydrate);
  const loading = useProcurementStore((s) => s.loading);
  const loadError = useProcurementStore((s) => s.loadError);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (initialView) setViewMode(initialView);
  }, [initialView, setViewMode]);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) selectProcurement(id);
  }, [searchParams, selectProcurement]);

  const rows = useMemo(
    () =>
      applyFilters(procurements, {
        search: filters.search,
        quick: filters.quick,
        kpi: filters.kpi,
        advanced: filters.advanced,
      }),
    [procurements, filters],
  );

  const kpis = useMemo(() => computeKpis(procurements), [procurements]);
  const advCount = advancedFilterCount(filters.advanced);
  const commodities = [...new Set(procurements.map((item) => item.commodity))];
  const suppliers = [...new Set(procurements.map((item) => item.supplier))];
  const customers = [...new Set(procurements.map((item) => item.customerName))];
  const sellers = [...new Set(procurements.map((item) => item.sellerName).filter(Boolean))] as string[];

  const filterCounts = useMemo(() => {
    const counts: Record<QuickFilter, number> = {
      all: procurements.length,
      "needs-action": 0,
      Negotiation: 0,
      "Urgent Review": 0,
      "Pending Inv.": 0,
      Approved: 0,
    };
    for (const item of procurements) {
      if (needsAttention(item.status)) counts["needs-action"] += 1;
      if (item.status === "Negotiation") counts.Negotiation += 1;
      if (item.status === "Urgent Review") counts["Urgent Review"] += 1;
      if (item.status === "Pending Inv.") counts["Pending Inv."] += 1;
      if (item.status === "Approved") counts.Approved += 1;
    }
    return counts;
  }, [procurements]);

  const attentionItems = useMemo(
    () =>
      procurements
        .filter((item) => needsAttention(item.status))
        .sort((a, b) => attentionRank(a.status) - attentionRank(b.status))
        .slice(0, 4),
    [procurements],
  );

  const hasActiveFilters =
    Boolean(filters.search) || filters.quick !== "all" || Boolean(filters.kpi) || advCount > 0;

  const exportRows = () => {
    downloadCsv("petrotrade-procurement-export.csv", rows.map(toExportRow));
    toast.success("Exported petrotrade-procurement-export.csv");
  };

  const openComparison = () => {
    const currentId = useProcurementStore.getState().selectedId;
    const current = procurements.find((item) => item.id === currentId && item.quotations.length > 0);
    const fallback = procurements.find((item) => item.quotations.length > 0);
    const target = current ?? fallback;
    if (!target) {
      toast.message("No quotations are available to compare yet.");
      return;
    }
    selectProcurement(target.id);
  };

  const openCreatePo = () => {
    const currentId = useProcurementStore.getState().selectedId;
    const current =
      procurements.find((item) => item.id === currentId && item.status === "Approved") ??
      procurements.find((item) => item.status === "Approved");
    if (!current) {
      toast.message("Approve a request first, then issue the purchase order.");
      return;
    }
    selectProcurement(current.id);
    openModal({ type: "create-po", id: current.id });
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <KpiSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  if (loadError) {
    return <ErrorState title="Unable to load purchase requests." description={loadError} onRetry={() => void hydrate()} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Procurement Workbench"
        description="Review, approve and issue POs across Customer and Seller apps."
        breadcrumbs={[{ label: "Core", href: "/dashboard" }, { label: "Procurement Workbench" }]}
        actions={
          <>
            <div className="inline-flex rounded-md border bg-white p-0.5 shadow-soft">
              <Button
                size="sm"
                variant={viewMode === "table" ? "secondary" : "ghost"}
                className={cn("h-8", viewMode === "table" && "bg-slate-900 text-white hover:bg-slate-800 hover:text-white")}
                onClick={() => setViewMode("table")}
              >
                <Table2 className="size-3.5" />
                Table
              </Button>
              <Button
                size="sm"
                variant={viewMode === "queue" ? "secondary" : "ghost"}
                className={cn("h-8", viewMode === "queue" && "bg-slate-900 text-white hover:bg-slate-800 hover:text-white")}
                onClick={() => setViewMode("queue")}
              >
                <Columns3 className="size-3.5" />
                Queue
              </Button>
            </div>
            <Button size="sm" variant="outline" onClick={exportRows}>
              <Download className="size-3.5" />
              Export
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <MoreHorizontal className="size-3.5" />
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => router.push("/sellers")}>
                  <Factory className="size-3.5" />
                  Add seller
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openComparison}>
                  <GitCompare className="size-3.5" />
                  Compare quotations
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openCreatePo}>
                  <CheckCircle2 className="size-3.5" />
                  Create PO
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/analytics")}>
                  <BarChart3 className="size-3.5" />
                  Reports
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/logistics")}>
                  <Truck className="size-3.5" />
                  Shipment tracking
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={() => openModal({ type: "new-procurement" })}>
              <Plus className="size-3.5" />
              New Procurement
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Pending Approvals"
          value={String(kpis.pendingApprovals).padStart(2, "0")}
          hint="Waiting on Admin review"
          icon={ShieldAlert}
          tone="warning"
          active={filters.kpi === "pending-approvals"}
          onClick={() => setKpiFilter("pending-approvals")}
        />
        <KpiCard
          label="Avg Cycle Time"
          value={formatKpiDays(kpis.avgProcDays)}
          hint="Open requests in the pipeline"
          icon={Clock3}
          active={filters.kpi === "avg-time"}
          onClick={() => setKpiFilter("avg-time")}
        />
        <KpiCard
          label="Active Negotiations"
          value={String(kpis.activeNegotiations).padStart(2, "0")}
          hint="Quotes still in play"
          icon={Handshake}
          active={filters.kpi === "negotiations"}
          onClick={() => setKpiFilter("negotiations")}
        />
        <KpiCard
          label="Open PO Value"
          value={formatOpenPoValue(kpis.openPoValue)}
          hint="Issued, not yet completed"
          icon={Wallet}
          active={filters.kpi === "open-po"}
          onClick={() => setKpiFilter("open-po")}
        />
      </div>

      {attentionItems.length > 0 && filters.quick === "all" && !filters.kpi ? (
        <section className="overflow-hidden rounded-md border border-amber-200 bg-amber-50/70 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 px-4 py-2.5">
            <div>
              <p className="text-sm font-semibold text-amber-950">Needs your attention</p>
              <p className="text-xs text-amber-800/80">Urgent reviews, inventory holds and items waiting on Admin.</p>
            </div>
            <Button size="sm" variant="outline" className="bg-white" onClick={() => setQuickFilter("needs-action")}>
              View all {filterCounts["needs-action"]}
            </Button>
          </div>
          <ul className="divide-y divide-amber-100 bg-white/70">
            {attentionItems.map((item) => (
              <li
                key={item.id}
                className="flex w-full flex-wrap items-center gap-3 px-4 py-2.5 hover:bg-white"
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 flex-wrap items-center gap-3 text-left"
                  onClick={() => selectProcurement(item.id)}
                >
                  <span className="w-[108px] shrink-0 text-sm font-medium text-sky-800">{item.id}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{item.commodity}</span>
                  <span className="hidden min-w-0 flex-1 truncate text-sm text-muted-foreground sm:block">
                    {item.customerName}
                  </span>
                  <StatusBadge value={item.status} />
                  <span className="hidden text-xs text-muted-foreground lg:block">
                    {formatRelativeTime(item.updatedAt)}
                  </span>
                </button>
                <RowAction rowId={item.id} status={item.status} compact />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-md border bg-white p-3 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search PO, commodity, customer or supplier"
              className="pl-8"
              aria-label="Search PO, commodity, customer or supplier"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {QUICK_FILTERS.map((item) => {
              const active = filters.quick === item.value && !filters.kpi;
              const count = filterCounts[item.value];
              return (
                <Button
                  key={item.value}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  className={cn(item.value === "needs-action" && !active && "border-amber-300 text-amber-800")}
                  onClick={() => setQuickFilter(item.value)}
                >
                  {item.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] font-semibold",
                      active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {count}
                  </span>
                </Button>
              );
            })}
            <AdvancedFilterPopover
              value={filters.advanced}
              count={advCount}
              commodities={commodities}
              suppliers={suppliers}
              customers={customers}
              sellers={sellers}
              onChange={setAdvancedFilters}
              onClear={clearFilters}
            />
          </div>
        </div>
        {hasActiveFilters ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-3">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {rows.length} result{rows.length === 1 ? "" : "s"}
            </span>
            {filters.search ? <FilterChip label={`Search · ${filters.search}`} onClear={() => setSearchQuery("")} /> : null}
            {filters.quick !== "all" ? (
              <FilterChip
                label={QUICK_FILTERS.find((item) => item.value === filters.quick)?.label ?? filters.quick}
                onClear={() => setQuickFilter("all")}
              />
            ) : null}
            {filters.kpi ? <FilterChip label={KPI_CHIP_LABEL[filters.kpi]} onClear={() => setKpiFilter(filters.kpi)} /> : null}
            {advCount > 0 ? (
              <FilterChip label={`${advCount} advanced`} onClear={() => setAdvancedFilters(EMPTY_ADVANCED_FILTERS)} />
            ) : null}
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={clearFilters}>
              Clear all
            </Button>
          </div>
        ) : (
          <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
            Showing {rows.length} records. Click a KPI or chip to focus the queue.
          </p>
        )}
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        {viewMode === "table" ? (
          <DataTable
            rows={rows}
            getRowId={(row) => row.id}
            pageSize={8}
            emptyTitle="No procurement records found"
            emptyDescription="Try a different search or clear the active filters."
            emptyAction={
              hasActiveFilters ? (
                <Button size="sm" variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button size="sm" onClick={() => openModal({ type: "new-procurement" })}>
                  <Plus className="size-3.5" />
                  New Procurement
                </Button>
              )
            }
            onRowClick={(row) => selectProcurement(row.id)}
            getRowClassName={(row) =>
              cn(
                selectedId === row.id && "bg-sky-50/80",
                rowAccent(row.status) === "urgent" && "bg-red-50/50 shadow-[inset_3px_0_0_0_#ef4444]",
                rowAccent(row.status) === "wait" && "shadow-[inset_3px_0_0_0_#f59e0b]",
                rowAccent(row.status) === "ready" && "shadow-[inset_3px_0_0_0_#10b981]",
              )
            }
            columns={[
              {
                key: "id",
                header: "Order",
                sortable: true,
                accessor: (row) => row.id,
                render: (row) => (
                  <div className="min-w-[160px]">
                    <button
                      type="button"
                      className="font-medium text-sky-700 hover:underline"
                      onClick={(event) => {
                        event.stopPropagation();
                        selectProcurement(row.id);
                      }}
                    >
                      {row.id}
                    </button>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.commodity}</p>
                  </div>
                ),
              },
              {
                key: "customer",
                header: "Customer",
                sortable: true,
                accessor: (row) => row.customerName,
                render: (row) => (
                  <div className="min-w-[140px]">
                    <p className="truncate">{row.customerName}</p>
                    <SourceBadge source={row.source} className="mt-1" />
                  </div>
                ),
              },
              { key: "supplier", header: "Supplier", sortable: true, accessor: (row) => row.supplier },
              {
                key: "qty",
                header: "Qty",
                sortable: true,
                accessor: (row) => row.quantity,
                render: (row) => (
                  <span className="whitespace-nowrap tabular-nums">
                    {formatNumber(row.quantity)} {row.unit}
                  </span>
                ),
              },
              {
                key: "estCost",
                header: "Estimated Cost",
                sortable: true,
                accessor: (row) => row.estimatedCost,
                render: (row) => <span className="whitespace-nowrap tabular-nums">{formatInrExact(row.estimatedCost)}</span>,
              },
              {
                key: "status",
                header: "Status",
                sortable: true,
                accessor: (row) => row.status,
                render: (row) => <StatusBadge value={row.status} />,
              },
              {
                key: "waiting",
                header: "Updated",
                sortable: true,
                accessor: (row) => row.updatedAt,
                render: (row) => (
                  <span className="whitespace-nowrap text-xs text-muted-foreground">{formatRelativeTime(row.updatedAt)}</span>
                ),
              },
              {
                key: "action",
                header: "Action",
                className: "text-right",
                render: (row) => <RowAction rowId={row.id} status={row.status} />,
              },
            ]}
          />
        ) : (
          <ProcurementQueueBoard />
        )}

        <aside className="rounded-md border bg-white p-4 shadow-soft xl:sticky xl:top-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Live activity</h2>
              <p className="text-[11px] text-muted-foreground">Latest moves across the queue</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {activities.length}
            </span>
          </div>
          <ol className="max-h-[520px] space-y-1 overflow-y-auto pr-1">
            {activities.slice(0, 12).map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="flex w-full items-start gap-2.5 rounded-md px-1.5 py-1.5 text-left hover:bg-slate-50"
                  onClick={() => selectProcurement(item.referenceId)}
                >
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{item.action}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {item.actor} · {item.referenceId}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelativeTime(item.timestamp)}</span>
                </button>
              </li>
            ))}
          </ol>
        </aside>
      </div>

      <ProcurementDetailDrawer />
      <ProcurementModals />
    </div>
  );
}

function attentionRank(status: ProcurementStatus) {
  if (status === "Urgent Review") return 0;
  if (status === "Pending Approval") return 1;
  if (status === "Pending Inv.") return 2;
  if (status === "Negotiation") return 3;
  if (status === "Approved") return 4;
  return 5;
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-1 rounded-full border bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
    >
      {label}
      <X className="size-3" />
    </button>
  );
}

function RowAction({ rowId, status, compact }: { rowId: string; status: ProcurementStatus; compact?: boolean }) {
  const openModal = useProcurementStore((s) => s.openModal);
  const selectProcurement = useProcurementStore((s) => s.selectProcurement);
  const router = useRouter();
  const procurements = useProcurementStore((s) => s.procurements);
  const label = nextActionLabel(status);
  if (!label) return <span className="text-xs text-muted-foreground">—</span>;

  const emphasize = status === "Urgent Review" || status === "Approved";

  return (
    <Button
      size="sm"
      variant={emphasize ? "default" : "outline"}
      className={cn(compact && "h-7")}
      onClick={(event) => {
        event.stopPropagation();
        if (label === "Approve") openModal({ type: "approve", id: rowId });
        else if (label === "Create PO") openModal({ type: "create-po", id: rowId });
        else if (label === "Confirm") selectProcurement(rowId);
        else if (label === "Dispatch") openModal({ type: "dispatch", id: rowId });
        else if (label === "Track") {
          const shipment = procurements.find((item) => item.id === rowId)?.shipment;
          router.push(`/logistics?id=${shipment?.shipmentId ?? ""}`);
        }
      }}
    >
      {label === "Track" ? <Truck className="size-3.5" /> : null}
      {label === "Approve" && status === "Urgent Review" ? <Scale className="size-3.5" /> : null}
      {label}
    </Button>
  );
}

function AdvancedFilterPopover({
  value,
  count,
  commodities,
  suppliers,
  customers,
  sellers,
  onChange,
  onClear,
}: {
  value: AdvancedFilters;
  count: number;
  commodities: string[];
  suppliers: string[];
  customers: string[];
  sellers: string[];
  onChange: (value: AdvancedFilters) => void;
  onClear: () => void;
}) {
  const patch = (partial: Partial<AdvancedFilters>) => onChange({ ...value, ...partial });
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">
          <Filter className="size-3.5" />
          Advanced
          {count > 0 ? (
            <span className="ml-0.5 rounded-full bg-sky-600 px-1.5 text-[10px] font-semibold text-white">{count}</span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Advanced filters</p>
          <Button size="sm" variant="ghost" onClick={onClear}>
            Clear
          </Button>
        </div>
        <FilterSelect
          label="Status"
          value={value.status}
          onChange={(status) => patch({ status: status as AdvancedFilters["status"] })}
          options={PROCUREMENT_STATUSES}
        />
        <FilterSelect label="Commodity" value={value.commodity} onChange={(commodity) => patch({ commodity })} options={commodities} />
        <FilterSelect label="Supplier" value={value.supplier} onChange={(supplier) => patch({ supplier })} options={suppliers} />
        <FilterSelect label="Customer" value={value.customer} onChange={(customer) => patch({ customer })} options={customers} />
        <FilterSelect label="Seller" value={value.seller} onChange={(seller) => patch({ seller })} options={sellers} />
        <div className="flex flex-col gap-1.5">
          <Label>Location</Label>
          <Input value={value.location} onChange={(event) => patch({ location: event.target.value })} placeholder="Delivery location" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <Label>From</Label>
            <Input type="date" value={value.dateFrom} onChange={(event) => patch({ dateFrom: event.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>To</Label>
            <Input type="date" value={value.dateTo} onChange={(event) => patch({ dateTo: event.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <Label>Min value</Label>
            <Input type="number" value={value.valueMin} onChange={(event) => patch({ valueMin: event.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Max value</Label>
            <Input type="number" value={value.valueMax} onChange={(event) => patch({ valueMax: event.target.value })} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Select value={value || "all"} onValueChange={(next) => onChange(next === "all" ? "" : next)}>
        <SelectTrigger>
          <SelectValue placeholder="All" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
