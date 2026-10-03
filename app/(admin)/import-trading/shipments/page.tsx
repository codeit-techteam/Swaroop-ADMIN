"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { CreditPager, CreditTable, CreditToolbar } from "@/components/credit/credit-table";
import {
  formatQty,
  IMPORT_BASE,
  ImportBadge,
  ImportTradingTabs,
  importLabel,
  shipmentEta,
  shipmentRoute,
  useLoader,
} from "@/components/import-trading/shared";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { IMPORT_SHIPMENT_MODES, IMPORT_SHIPMENT_STATUSES, listShipments } from "@/lib/api/import-trading";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ImportShipmentMode, ImportShipmentStatus } from "@/types/import-trading";

type FilterKey = "search" | "status" | "exceptionsOnly" | "mode" | "from" | "to" | "page";

function ShipmentsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const search = params.get("search") ?? "";
  const statusParam = params.get("status") ?? "";
  const status = (IMPORT_SHIPMENT_STATUSES as string[]).includes(statusParam)
    ? (statusParam as ImportShipmentStatus)
    : "";
  const modeParam = params.get("mode") ?? "";
  const mode = (IMPORT_SHIPMENT_MODES as string[]).includes(modeParam) ? (modeParam as ImportShipmentMode) : "";
  const exceptionsOnly = params.get("exceptionsOnly") === "true";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);

  // Filters live in the URL so dashboard links and shared links land on the same view.
  const setFilters = (patch: Partial<Record<FilterKey, string>>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("page" in patch)) next.delete("page");
    const encoded = next.toString();
    router.replace(encoded ? `${pathname}?${encoded}` : pathname, { scroll: false });
  };

  const { data, error, loading, reload } = useLoader(
    () =>
      listShipments({
        search: search || undefined,
        status: status || undefined,
        exceptionsOnly: exceptionsOnly ? "true" : undefined,
        mode: mode || undefined,
        createdFrom: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
        createdTo: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
        page,
        limit: 20,
      }),
    [search, status, exceptionsOnly, mode, from, to, page],
  );
  const counts = data?.meta?.countsByStatus;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Import shipments"
        description="Carrier and tracking records for confirmed deals, maintained by sellers and Admin. Identities are visible to Admin only."
        breadcrumbs={[{ label: "Import Trading", href: IMPORT_BASE }, { label: "Shipments" }]}
      />
      <ImportTradingTabs />

      {counts ? (
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
          {IMPORT_SHIPMENT_STATUSES.map((s) => {
            const active = status === s || (s === "EXCEPTION" && exceptionsOnly);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                onClick={() => setFilters({ status: active ? "" : s, exceptionsOnly: "" })}
                className={cn(
                  "rounded-md border border-slate-200 bg-white px-3 py-2 text-left shadow-soft transition hover:border-primary/40",
                  active && "border-primary/50 ring-1 ring-primary/20",
                )}
              >
                <ImportBadge value={s} kind="shipment" />
                <p
                  className={cn(
                    "mt-1.5 text-xl font-semibold tracking-tight",
                    s === "EXCEPTION" && (counts[s] ?? 0) > 0 ? "text-red-700" : "text-slate-900",
                  )}
                >
                  {counts[s] ?? 0}
                </p>
              </button>
            );
          })}
        </div>
      ) : null}

      <CreditToolbar
        search={search}
        onSearch={(value) => setFilters({ search: value })}
        searchPlaceholder="Search shipment reference, tracking number or deal reference"
        status={status}
        statuses={IMPORT_SHIPMENT_STATUSES.map((s) => ({ value: s, label: importLabel(s) }))}
        onStatus={(value) => setFilters({ status: value, exceptionsOnly: "" })}
        extra={
          <>
            <select
              aria-label="Mode"
              className="h-9 rounded-md border bg-white px-2 text-sm"
              value={mode}
              onChange={(event) => setFilters({ mode: event.target.value })}
            >
              <option value="">All modes</option>
              {IMPORT_SHIPMENT_MODES.map((m) => (
                <option key={m} value={m}>
                  {importLabel(m)}
                </option>
              ))}
            </select>
            <label className="flex h-9 items-center gap-2 rounded-md border bg-white px-2 text-sm">
              <input
                type="checkbox"
                checked={exceptionsOnly}
                onChange={(event) =>
                  setFilters({ exceptionsOnly: event.target.checked ? "true" : "", status: "" })
                }
              />
              Exceptions only
            </label>
            <input
              type="date"
              aria-label="Created from"
              className="h-9 rounded-md border bg-white px-2 text-sm"
              value={from}
              max={to || undefined}
              onChange={(event) => setFilters({ from: event.target.value })}
            />
            <input
              type="date"
              aria-label="Created to"
              className="h-9 rounded-md border bg-white px-2 text-sm"
              value={to}
              min={from || undefined}
              onChange={(event) => setFilters({ to: event.target.value })}
            />
          </>
        }
      />
      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState title="Unable to load Import shipments." description={error} onRetry={reload} />
      ) : (
        <>
          <CreditTable
            rows={data?.items ?? []}
            getRowId={(row) => row.id}
            onRowClick={(row) => router.push(`${IMPORT_BASE}/shipments/${row.id}`)}
            emptyTitle="No shipments found."
            emptyDescription="Sellers book shipments against confirmed deals; they appear here."
            columns={[
              { key: "ref", header: "Shipment ID", accessor: (r) => r.referenceNumber },
              {
                key: "deal",
                header: "Deal",
                render: (r) => (
                  <Link
                    className="text-primary hover:underline"
                    href={`${IMPORT_BASE}/deals/${r.deal.id}`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    {r.deal.referenceNumber}
                  </Link>
                ),
              },
              { key: "product", header: "Product", accessor: (r) => r.deal.product ?? "—" },
              { key: "buyer", header: "Buyer", accessor: (r) => r.buyer?.name ?? r.buyerRef },
              { key: "seller", header: "Seller", accessor: (r) => r.seller?.name ?? r.sellerRef },
              { key: "qty", header: "Qty", accessor: (r) => formatQty(r.quantity, r.quantityUnit) },
              { key: "mode", header: "Mode", accessor: (r) => importLabel(r.mode) },
              {
                key: "carrier",
                header: "Carrier / Tracking no.",
                render: (r) => (
                  <span className="flex flex-col">
                    <span>{r.carrierName ?? "—"}</span>
                    <span className="text-xs text-muted-foreground">{r.trackingNumber ?? "No tracking number"}</span>
                  </span>
                ),
              },
              { key: "route", header: "Route", accessor: (r) => shipmentRoute(r) },
              { key: "status", header: "Status", render: (r) => <ImportBadge value={r.status} kind="shipment" /> },
              {
                key: "eta",
                header: "ETA",
                render: (r) =>
                  r.eta ? shipmentEta(r.eta) : <span className="text-muted-foreground">{shipmentEta(null)}</span>,
              },
              { key: "updated", header: "Last update", accessor: (r) => formatDateTime(r.updatedAt) },
            ]}
          />
          <CreditPager meta={data?.meta} onPage={(next) => setFilters({ page: String(next) })} />
        </>
      )}
    </div>
  );
}

export default function ImportShipmentsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <ShipmentsView />
    </Suspense>
  );
}
