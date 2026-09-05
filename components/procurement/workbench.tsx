"use client";

import {
  Columns3,
  Download,
  Filter,
  Search,
  Table2,
  Truck,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";

import { ProcurementDetailDrawer } from "@/components/procurement/detail-drawer";
import { ProcurementModals } from "@/components/procurement/modals";
import { ProcurementQueueBoard } from "@/components/procurement/queue-board";
import { QuickActionCard } from "@/components/shared/chart-card";
import { DataTable } from "@/components/shared/data-table";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { downloadCsv } from "@/lib/csv";
import { formatInrExact } from "@/lib/format";
import {
  advancedFilterCount,
  applyFilters,
  computeKpis,
  formatKpiDays,
  formatOpenPoValue,
  nextActionLabel,
  PROCUREMENT_STATUSES,
  toExportRow,
  type AdvancedFilters,
  type QuickFilter,
} from "@/lib/procurement";
import { useProcurementStore } from "@/store/procurement-store";
import type { ProcurementStatus } from "@/types";

const QUICK_FILTERS: { label: string; value: QuickFilter }[] = [
  { label: "All", value: "all" },
  { label: "Negotiation", value: "Negotiation" },
  { label: "Urgent", value: "Urgent Review" },
  { label: "Pending Inv.", value: "Pending Inv." },
];

export function ProcurementWorkbench({ initialView }: { initialView?: "table" | "queue" } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const procurements = useProcurementStore((s) => s.procurements);
  const filters = useProcurementStore((s) => s.filters);
  const viewMode = useProcurementStore((s) => s.viewMode);
  const activities = useProcurementStore((s) => s.activities);
  const setSearchQuery = useProcurementStore((s) => s.setSearchQuery);
  const setQuickFilter = useProcurementStore((s) => s.setQuickFilter);
  const setKpiFilter = useProcurementStore((s) => s.setKpiFilter);
  const setAdvancedFilters = useProcurementStore((s) => s.setAdvancedFilters);
  const clearFilters = useProcurementStore((s) => s.clearFilters);
  const setViewMode = useProcurementStore((s) => s.setViewMode);
  const selectProcurement = useProcurementStore((s) => s.selectProcurement);
  const openModal = useProcurementStore((s) => s.openModal);

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

  const exportRows = () => {
    downloadCsv("petrotrade-procurement-export.csv", rows.map(toExportRow));
    toast.success("Exported petrotrade-procurement-export.csv");
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Procurement Workbench"
        description="Active procurement queue across Customer and Seller applications."
        breadcrumbs={[{ label: "PetroTrade", href: "/dashboard" }, { label: "Overview" }]}
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setViewMode(viewMode === "table" ? "queue" : "table")}
            >
              {viewMode === "table" ? <Columns3 className="size-3.5" /> : <Table2 className="size-3.5" />}
              {viewMode === "table" ? "Queue View" : "Table View"}
            </Button>
            <Button size="sm" variant="outline" onClick={exportRows}>
              <Download className="size-3.5" />
              Export
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Pending Approvals"
          value={String(kpis.pendingApprovals).padStart(2, "0")}
          tone="warning"
          active={filters.kpi === "pending-approvals"}
          onClick={() => setKpiFilter("pending-approvals")}
        />
        <KpiCard
          label="Avg Proc. Time"
          value={formatKpiDays(kpis.avgProcDays)}
          active={filters.kpi === "avg-time"}
          onClick={() => setKpiFilter("avg-time")}
        />
        <KpiCard
          label="Active Negotiations"
          value={String(kpis.activeNegotiations).padStart(2, "0")}
          active={filters.kpi === "negotiations"}
          onClick={() => setKpiFilter("negotiations")}
        />
        <KpiCard
          label="Open PO Value"
          value={formatOpenPoValue(kpis.openPoValue)}
          active={filters.kpi === "open-po"}
          onClick={() => setKpiFilter("open-po")}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <QuickActionCard
          label="New Procurement"
          description="Create a draft or submitted request"
          onClick={() => openModal({ type: "new-procurement" })}
        />
        <QuickActionCard label="Add Seller" description="Open seller control records" onClick={() => router.push("/sellers")} />
        <QuickActionCard
          label="Supplier Comparison"
          description="Compare quotations for the selected record"
          onClick={() => {
            const current = useProcurementStore.getState().selectedId;
            const fallback = procurements.find((item) => item.quotations.length > 0);
            selectProcurement(current ?? fallback?.id ?? null);
            if (!current && !fallback) return;
          }}
        />
        <QuickActionCard
          label="Create PO"
          description="Issue a purchase order after approval"
          onClick={() => {
            const current =
              procurements.find((item) => item.id === useProcurementStore.getState().selectedId && item.status === "Approved") ??
              procurements.find((item) => item.status === "Approved");
            if (current) {
              selectProcurement(current.id);
              openModal({ type: "create-po", id: current.id });
            }
          }}
        />
        <QuickActionCard label="Reports" description="Open analytics and reports" onClick={() => router.push("/analytics")} />
        <QuickActionCard label="Tracking" description="Open logistics / shipment tracking" onClick={() => router.push("/logistics")} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search PO, commodity or supplier"
            className="pl-8"
            aria-label="Search PO, commodity or supplier"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {QUICK_FILTERS.map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={filters.quick === item.value && !filters.kpi ? "default" : "outline"}
              onClick={() => setQuickFilter(item.value)}
            >
              {item.label}
            </Button>
          ))}
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

      {viewMode === "table" ? (
        <DataTable
          rows={rows}
          getRowId={(row) => row.id}
          pageSize={10}
          emptyTitle="No procurement records found"
          emptyDescription="Try a different search or clear the active filters."
          onRowClick={(row) => selectProcurement(row.id)}
          columns={[
            {
              key: "id",
              header: "Order ID",
              sortable: true,
              accessor: (row) => row.id,
              render: (row) => (
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
              ),
            },
            { key: "commodity", header: "Commodity", sortable: true, accessor: (row) => row.commodity },
            { key: "supplier", header: "Supplier", sortable: true, accessor: (row) => row.supplier },
            {
              key: "estCost",
              header: "Estimated Cost",
              sortable: true,
              accessor: (row) => row.estimatedCost,
              render: (row) => formatInrExact(row.estimatedCost),
            },
            {
              key: "status",
              header: "Status",
              sortable: true,
              accessor: (row) => row.status,
              render: (row) => <StatusBadge value={row.status} />,
            },
            {
              key: "action",
              header: "Action",
              render: (row) => <RowAction rowId={row.id} status={row.status} />,
            },
          ]}
        />
      ) : (
        <ProcurementQueueBoard />
      )}

      <section className="rounded-md border bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">Activity Log</h2>
        <ol className="space-y-2">
          {activities.slice(0, 8).map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 rounded-md px-1 py-1 text-left hover:bg-slate-50"
                onClick={() => selectProcurement(item.referenceId)}
              >
                <div>
                  <p className="text-sm">{item.action}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.actor} · {item.referenceId}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {new Date(item.timestamp).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <ProcurementDetailDrawer />
      <ProcurementModals />
    </div>
  );
}

function RowAction({ rowId, status }: { rowId: string; status: ProcurementStatus }) {
  const openModal = useProcurementStore((s) => s.openModal);
  const selectProcurement = useProcurementStore((s) => s.selectProcurement);
  const router = useRouter();
  const procurements = useProcurementStore((s) => s.procurements);
  const label = nextActionLabel(status);
  if (!label) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={(event) => {
        event.stopPropagation();
        if (label === "Approve") openModal({ type: "approve", id: rowId });
        else if (label === "Create PO") openModal({ type: "create-po", id: rowId });
        else if (label === "Confirm") {
          selectProcurement(rowId);
        } else if (label === "Dispatch") openModal({ type: "dispatch", id: rowId });
        else if (label === "Track") {
          const shipment = procurements.find((item) => item.id === rowId)?.shipment;
          router.push(`/logistics?id=${shipment?.shipmentId ?? ""}`);
        }
      }}
    >
      {label === "Track" ? <Truck className="size-3.5" /> : null}
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
            <span className="ml-1 rounded-full bg-sky-600 px-1.5 text-[10px] font-semibold text-white">{count}</span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Advanced filters</p>
          <Button size="sm" variant="ghost" onClick={onClear}>
            Clear Filters
          </Button>
        </div>
        <FilterSelect label="Status" value={value.status} onChange={(status) => patch({ status: status as AdvancedFilters["status"] })} options={PROCUREMENT_STATUSES} />
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
      <select
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
