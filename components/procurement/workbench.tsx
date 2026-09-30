"use client";

import {
  Clock3,
  Columns3,
  Download,
  Filter,
  Handshake,
  MoreHorizontal,
  Plus,
  Search,
  ShieldAlert,
  Table2,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ProcurementRecordPanel } from "@/components/procurement/procurement-record-panel";
import { DataTable } from "@/components/shared/data-table";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, KpiSkeleton, TableSkeleton } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  exportProcurement,
  getProcurementActivity,
  getProcurementQueue,
  getProcurementSummary,
  listProcurementRecords,
  procurementErrorMessage,
  type ProcurementActivityItem,
  type ProcurementListQuery,
  type ProcurementQueueGroup,
  type ProcurementRecord,
  type ProcurementSummary,
  type WorkbenchBucket,
} from "@/lib/api/procurement-workbench";
import { downloadCsvText } from "@/lib/csv";
import { formatInrDecimal, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

const QUICK_FILTERS: { label: string; value: WorkbenchBucket; countKey: keyof ProcurementSummary["counts"] }[] = [
  { label: "All", value: "all", countKey: "all" },
  { label: "Needs action", value: "needs_action", countKey: "needsAction" },
  { label: "Negotiation", value: "negotiation", countKey: "negotiation" },
  { label: "Urgent", value: "urgent", countKey: "urgent" },
  { label: "Pending Inv.", value: "pending_invoice", countKey: "pendingInvoice" },
  { label: "Approved", value: "approved", countKey: "approved" },
];

const STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "SOURCING",
  "OFFER_RECEIVED",
  "NEGOTIATION",
  "PENDING_APPROVAL",
  "APPROVED",
  "CONVERTED_TO_ORDER",
  "REJECTED",
  "CANCELLED",
  "EXPIRED",
];

const PAYMENT_OPTIONS = [
  "ADVANCE",
  "BEFORE_DISPATCH",
  "ON_LOADING",
  "ON_DELIVERY",
  "CREDIT",
  "PARTIAL_PAYMENT",
  "MILESTONE_PAYMENT",
];

interface AdvancedFilters {
  status: string;
  priority: string;
  customer: string;
  seller: string;
  paymentOption: string;
  dateFrom: string;
  dateTo: string;
}

const EMPTY_ADVANCED: AdvancedFilters = {
  status: "",
  priority: "",
  customer: "",
  seller: "",
  paymentOption: "",
  dateFrom: "",
  dateTo: "",
};

export function ProcurementWorkbench({ initialView }: { initialView?: "table" | "queue" } = {}) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"table" | "queue">(initialView ?? "table");
  const [bucket, setBucket] = useState<WorkbenchBucket>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [advanced, setAdvanced] = useState<AdvancedFilters>(EMPTY_ADVANCED);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<ProcurementSummary | null>(null);
  const [rows, setRows] = useState<ProcurementRecord[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [activity, setActivity] = useState<ProcurementActivityItem[]>([]);
  const [queue, setQueue] = useState<ProcurementQueueGroup[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [explainCreate, setExplainCreate] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, bucket, advanced]);

  const query = useMemo<ProcurementListQuery>(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      bucket,
      status: advanced.status || undefined,
      priority: advanced.priority || undefined,
      customer: advanced.customer || undefined,
      seller: advanced.seller || undefined,
      paymentOption: advanced.paymentOption || undefined,
      dateFrom: advanced.dateFrom || undefined,
      dateTo: advanced.dateTo || undefined,
      sortBy: "updatedAt",
      sortOrder: "desc",
    }),
    [page, search, bucket, advanced],
  );

  const load = async (mode: "initial" | "refresh" = "refresh") => {
    if (mode === "initial") setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const [nextSummary, nextActivity, list] = await Promise.all([
        getProcurementSummary(),
        getProcurementActivity(12),
        viewMode === "table" ? listProcurementRecords(query) : Promise.resolve(null),
      ]);
      setSummary(nextSummary);
      setActivity(nextActivity);
      if (list) {
        setRows(list.items);
        setMeta(list.meta);
      }
      if (viewMode === "queue") setQueue(await getProcurementQueue());
    } catch (err) {
      setError(procurementErrorMessage(err, "Unable to load the procurement workbench."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load(summary ? "refresh" : "initial");
    // summary identity is intentionally excluded so polling and filter changes share one loader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, viewMode]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void getProcurementSummary().then(setSummary).catch(() => undefined);
      void getProcurementActivity(12).then(setActivity).catch(() => undefined);
      if (viewMode === "queue") void getProcurementQueue().then(setQueue).catch(() => undefined);
    }, 20000);
    return () => window.clearInterval(timer);
  }, [viewMode]);

  const advancedCount = Object.values(advanced).filter(Boolean).length;
  const hasFilters = Boolean(search) || bucket !== "all" || advancedCount > 0;
  const emptyCatalog = (summary?.counts.all ?? 0) === 0 && !hasFilters;

  const exportRows = async () => {
    setExporting(true);
    try {
      const file = await exportProcurement(query);
      downloadCsvText(file.filename, file.csv);
      toast.success(`Exported ${file.rowCount} procurement records`);
    } catch (err) {
      toast.error(procurementErrorMessage(err, "Export failed."));
    } finally {
      setExporting(false);
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex flex-col gap-5">
        <KpiSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  if (error && !summary) {
    return <ErrorState title="Unable to load purchase requests." description={error} onRetry={() => void load("initial")} />;
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
              <Button size="sm" variant={viewMode === "table" ? "secondary" : "ghost"} className={cn("h-8", viewMode === "table" && "bg-slate-900 text-white hover:bg-slate-800 hover:text-white")} onClick={() => setViewMode("table")}>
                <Table2 className="size-3.5" /> Table
              </Button>
              <Button size="sm" variant={viewMode === "queue" ? "secondary" : "ghost"} className={cn("h-8", viewMode === "queue" && "bg-slate-900 text-white hover:bg-slate-800 hover:text-white")} onClick={() => setViewMode("queue")}>
                <Columns3 className="size-3.5" /> Queue
              </Button>
            </div>
            <Button size="sm" variant="outline" disabled={exporting} onClick={() => void exportRows()}>
              <Download className="size-3.5" /> {exporting ? "Exporting…" : "Export"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline"><MoreHorizontal className="size-3.5" /> More</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => router.push("/orders")}>Purchase orders</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/payments")}>Payments</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/logistics")}>Dispatch and shipment</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={() => setExplainCreate(true)}>
              <Plus className="size-3.5" /> New Procurement
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Pending Approvals" value={pad(summary?.pendingApprovals)} hint="Waiting on admin review" icon={ShieldAlert} tone="warning" active={bucket === "pending_approvals"} onClick={() => setBucket(bucket === "pending_approvals" ? "all" : "pending_approvals")} />
        <KpiCard label="Pending Seller Responses" value={pad(summary?.pendingSellerResponses)} hint="Open requests awaiting a seller" icon={Clock3} active={bucket === "pending_seller"} onClick={() => setBucket(bucket === "pending_seller" ? "all" : "pending_seller")} />
        <KpiCard label="Active Negotiations" value={pad(summary?.activeNegotiations)} hint="Counter offers still in play" icon={Handshake} active={bucket === "negotiation"} onClick={() => setBucket(bucket === "negotiation" ? "all" : "negotiation")} />
        <KpiCard label="Open PO Value" value={formatInrDecimal(summary?.openPoValue)} hint="Issued, not yet completed" icon={Wallet} active={bucket === "open_po"} onClick={() => setBucket(bucket === "open_po" ? "all" : "open_po")} />
      </div>

      <section className="rounded-md border bg-white p-3 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search PO, commodity, customer or supplier" className="pl-8" aria-label="Search PO, commodity, customer or supplier" />
            {searchInput ? (
              <button type="button" className="absolute right-2 top-2.5 text-muted-foreground" aria-label="Clear search" onClick={() => setSearchInput("")}>
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {QUICK_FILTERS.map((item) => {
              const active = bucket === item.value;
              const count = summary?.counts[item.countKey] ?? 0;
              return (
                <Button key={item.value} type="button" size="sm" variant={active ? "default" : "outline"} className={cn(item.value === "needs_action" && !active && "border-amber-300 text-amber-800")} onClick={() => setBucket(item.value)}>
                  {item.label}
                  <span className={cn("rounded-full px-1.5 text-[10px] font-semibold", active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600")}>{count}</span>
                </Button>
              );
            })}
            <AdvancedFilterPopover value={advanced} count={advancedCount} onApply={setAdvanced} onClear={() => setAdvanced(EMPTY_ADVANCED)} />
          </div>
        </div>
        <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
          {refreshing ? "Refreshing records…" : hasFilters ? `${meta.total} matching records.` : `Showing ${meta.total} records. Click a KPI or chip to focus the queue.`}
        </p>
      </section>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        {viewMode === "table" ? (
          <div className="min-w-0 space-y-2">
            <DataTable
              manual
              rows={rows}
              getRowId={(row) => row.id}
              emptyTitle={emptyCatalog ? "No procurement records yet" : "No procurement records found"}
              emptyDescription={emptyCatalog ? "Once customer purchase requests enter the procurement pipeline, they will appear here." : "Try changing your search or filters."}
              emptyAction={hasFilters ? <Button size="sm" variant="outline" onClick={() => { setSearchInput(""); setSearch(""); setBucket("all"); setAdvanced(EMPTY_ADVANCED); }}>Clear filters</Button> : undefined}
              onRowClick={(row) => setSelectedId(row.id)}
              getRowClassName={(row) => cn(selectedId === row.id && "bg-sky-50/80", row.ops.urgent && "bg-red-50/40 shadow-[inset_3px_0_0_0_#ef4444]", row.ops.actionRequired && !row.ops.urgent && "shadow-[inset_3px_0_0_0_#f59e0b]")}
              columns={[
                {
                  key: "pr",
                  header: "PR",
                  render: (row) => (
                    <div className="min-w-[150px]">
                      <Link href={`/procurement/${row.id}`} className="font-medium text-sky-700 hover:underline" onClick={(event) => event.stopPropagation()}>{row.referenceNumber}</Link>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.ops.gradeName}</p>
                    </div>
                  ),
                },
                { key: "po", header: "PO", render: (row) => <span className="whitespace-nowrap text-sm">{row.ops.poNumber ?? "—"}</span> },
                { key: "customer", header: "Customer", render: (row) => <span className="block max-w-[180px] truncate" title={row.ops.customerName}>{row.ops.customerName}</span> },
                { key: "seller", header: "Seller", render: (row) => <span className="block max-w-[180px] truncate" title={row.ops.sellerName ?? "Unassigned"}>{row.ops.sellerName ?? "Unassigned"}</span> },
                { key: "qty", header: "Qty", render: (row) => <span className="whitespace-nowrap tabular-nums">{formatQty(row.ops.quantity)} {row.ops.unit}</span> },
                { key: "value", header: "Value", render: (row) => <span className="whitespace-nowrap tabular-nums">{formatInrDecimal(row.ops.totalAmount)}</span> },
                { key: "status", header: "Status", render: (row) => <StatusBadge value={row.ops.statusLabel} /> },
                { key: "action", header: "Action", render: (row) => <span className="block max-w-[200px] truncate text-xs text-muted-foreground" title={row.ops.actionReason ?? undefined}>{row.ops.actionReason ?? (row.ops.deadlineLabel || "—")}</span> },
                { key: "updated", header: "Updated", render: (row) => <span className="whitespace-nowrap text-xs text-muted-foreground" title={row.updatedAt}>{formatRelativeTime(row.updatedAt)}</span> },
              ]}
            />
            {rows.length > 0 ? (
              <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                <span>{meta.total} records · page {meta.page} of {meta.totalPages}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
                  <Button size="sm" variant="outline" disabled={page >= meta.totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <QueueView groups={queue} onOpen={setSelectedId} />
        )}

        <aside className="rounded-md border bg-white p-4 shadow-soft xl:sticky xl:top-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Live activity</h2>
              <p className="text-[11px] text-muted-foreground">Latest procurement events</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{activity.length}</span>
          </div>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Activity appears here as purchase requests move through sourcing, negotiation and purchase orders.</p>
          ) : (
            <ol className="max-h-[520px] space-y-1 overflow-y-auto pr-1">
              {activity.map((item) => (
                <li key={item.id}>
                  <button type="button" className="flex w-full items-start gap-2.5 rounded-md px-1.5 py-1.5 text-left hover:bg-slate-50" onClick={() => setSelectedId(item.purchaseRequestId)}>
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">{item.message}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{item.actorName}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground" title={item.createdAt}>{formatRelativeTime(item.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>

      <Sheet open={Boolean(selectedId)} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader className="sr-only"><SheetTitle>Procurement detail</SheetTitle></SheetHeader>
          {selectedId ? (
            <>
              <div className="mb-3 text-right">
                <Link href={`/procurement/${selectedId}`} className="text-xs font-medium text-sky-700 hover:underline">Open full record</Link>
              </div>
              <ProcurementRecordPanel id={selectedId} onChanged={() => void load("refresh")} />
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={explainCreate} onOpenChange={setExplainCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Procurement starts with the customer</DialogTitle>
            <DialogDescription>
              Purchase requests are created in the Customer app. This workbench reviews those requests, follows negotiation, and tracks the purchase order, proforma invoice, payment and dispatch that the backend creates after commercial acceptance.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setExplainCreate(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QueueView({ groups, onOpen }: { groups: ProcurementQueueGroup[]; onOpen: (id: string) => void }) {
  if (groups.length === 0) {
    return <div className="rounded-md border bg-white p-8 text-sm text-muted-foreground">The operational queue is clear.</div>;
  }
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.key} className="rounded-md border bg-white shadow-soft">
          <header className="flex items-center justify-between border-b px-4 py-2.5">
            <h2 className="text-sm font-semibold">{group.label}</h2>
            <span className="text-xs text-muted-foreground">{group.count} records</span>
          </header>
          <ul className="divide-y">
            {group.items.map((item) => (
              <li key={item.id}>
                <button type="button" className="flex w-full flex-wrap items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50" onClick={() => onOpen(item.id)}>
                  <span className="w-[150px] shrink-0 text-sm font-medium text-sky-800">{item.referenceNumber}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{item.ops.gradeName}</span>
                  <span className="hidden min-w-0 flex-1 truncate text-sm text-muted-foreground md:block">{item.ops.customerName}</span>
                  <StatusBadge value={item.ops.statusLabel} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function AdvancedFilterPopover({
  value,
  count,
  onApply,
  onClear,
}: {
  value: AdvancedFilters;
  count: number;
  onApply: (next: AdvancedFilters) => void;
  onClear: () => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const set = (key: keyof AdvancedFilters, next: string) => setDraft((current) => ({ ...current, [key]: next }));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline"><Filter className="size-3.5" /> Advanced{count > 0 ? ` (${count})` : ""}</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <div className="grid gap-2">
          <Label>Status</Label>
          <select className="h-9 rounded-md border px-2 text-sm" value={draft.status} onChange={(event) => set("status", event.target.value)}>
            <option value="">Any</option>
            {STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
          </select>
        </div>
        <div className="grid gap-2">
          <Label>Priority</Label>
          <select className="h-9 rounded-md border px-2 text-sm" value={draft.priority} onChange={(event) => set("priority", event.target.value)}>
            <option value="">Any</option>
            {["LOW", "NORMAL", "HIGH", "URGENT"].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </select>
        </div>
        <div className="grid gap-2">
          <Label>Customer</Label>
          <Input value={draft.customer} onChange={(event) => set("customer", event.target.value)} placeholder="Company name" />
        </div>
        <div className="grid gap-2">
          <Label>Seller</Label>
          <Input value={draft.seller} onChange={(event) => set("seller", event.target.value)} placeholder="Company name" />
        </div>
        <div className="grid gap-2">
          <Label>Payment terms</Label>
          <select className="h-9 rounded-md border px-2 text-sm" value={draft.paymentOption} onChange={(event) => set("paymentOption", event.target.value)}>
            <option value="">Any</option>
            {PAYMENT_OPTIONS.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-2"><Label>From</Label><Input type="date" value={draft.dateFrom} onChange={(event) => set("dateFrom", event.target.value)} /></div>
          <div className="grid gap-2"><Label>To</Label><Input type="date" value={draft.dateTo} onChange={(event) => set("dateTo", event.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onClear}>Clear</Button>
          <Button size="sm" onClick={() => onApply(draft)}>Apply filters</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function pad(value: number | undefined) {
  return String(value ?? 0).padStart(2, "0");
}

function formatQty(value: string) {
  if (!/^-?\d+(\.\d+)?$/.test(value)) return value;
  const [whole, fraction = ""] = value.split(".");
  const trimmed = fraction.replace(/0+$/, "");
  const grouped = new Intl.NumberFormat("en-IN").format(Number(whole || "0"));
  return trimmed ? `${grouped}.${trimmed}` : grouped;
}
