"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { CreditPager, CreditTable, CreditToolbar } from "@/components/credit/credit-table";
import {
  formatImportDate,
  formatPrice,
  formatQty,
  IMPORT_BASE,
  ImportBadge,
  ImportTradingTabs,
  importLabel,
  portLabel,
  useLoader,
} from "@/components/import-trading/shared";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { listImportListings, listImportMaster } from "@/lib/api/import-trading";

const STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "MATCHING",
  "OFFER_RECEIVED",
  "NEGOTIATION",
  "MATCHED",
  "DEAL_CONFIRMED",
  "PARTIALLY_FULFILLED",
  "FULFILLED",
  "PAUSED",
  "EXPIRED",
  "CANCELLED",
];

function ListingsView() {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [side, setSide] = useState(params.get("side") ?? "");
  const [currency, setCurrency] = useState("");
  const [incoterm, setIncoterm] = useState("");
  const [origin, setOrigin] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("createdAt:desc");
  const [page, setPage] = useState(1);
  const [sortBy, sortOrder] = sort.split(":");
  const { data, error, loading, reload } = useLoader(
    () =>
      listImportListings({
        search,
        status: status || undefined,
        side: side || undefined,
        currencyCode: currency || undefined,
        incotermId: incoterm || undefined,
        originCountryId: origin || undefined,
        createdFrom: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
        createdTo: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
        sortBy,
        sortOrder,
        page,
        limit: 20,
      }),
    [search, status, side, currency, incoterm, origin, from, to, sort, page],
  );
  const currencies = useLoader(() => listImportMaster("currencies", { limit: 100 }), []);
  const incoterms = useLoader(() => listImportMaster("incoterms", { limit: 100, status: "ACTIVE" }), []);
  const countries = useLoader(() => listImportMaster("countries", { limit: 100, status: "ACTIVE" }), []);

  const select = (value: string, onChange: (v: string) => void, options: Array<[string, string]>, all: string) => (
    <select
      className="h-9 rounded-md border bg-white px-2 text-sm"
      value={value}
      onChange={(event) => {
        setPage(1);
        onChange(event.target.value);
      }}
    >
      <option value="">{all}</option>
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Import listings"
        description="Every BUY request and SELL offer, including drafts. Identities are visible to Admin only."
        breadcrumbs={[{ label: "Import Trading", href: IMPORT_BASE }, { label: "Listings" }]}
      />
      <ImportTradingTabs />
      <CreditToolbar
        search={search}
        onSearch={(value) => {
          setPage(1);
          setSearch(value);
        }}
        searchPlaceholder="Search reference, product, grade, brand or company"
        status={status}
        statuses={STATUSES.map((s) => ({ value: s, label: importLabel(s) }))}
        onStatus={(value) => {
          setPage(1);
          setStatus(value);
        }}
        extra={
          <>
            {select(side, setSide, [["BUY", "Buy requests"], ["SELL", "Sell offers"]], "All types")}
            {select(
              currency,
              setCurrency,
              (currencies.data?.items ?? []).map((c): [string, string] => [c.code, c.code]),
              "All currencies",
            )}
            {select(
              incoterm,
              setIncoterm,
              (incoterms.data?.items ?? []).map((c): [string, string] => [c.id, c.code]),
              "All Incoterms",
            )}
            {select(
              origin,
              setOrigin,
              (countries.data?.items ?? []).map((c): [string, string] => [c.id, c.name]),
              "All origins",
            )}
            <input
              type="date"
              aria-label="Created from"
              className="h-9 rounded-md border bg-white px-2 text-sm"
              value={from}
              max={to || undefined}
              onChange={(event) => {
                setPage(1);
                setFrom(event.target.value);
              }}
            />
            <input
              type="date"
              aria-label="Created to"
              className="h-9 rounded-md border bg-white px-2 text-sm"
              value={to}
              min={from || undefined}
              onChange={(event) => {
                setPage(1);
                setTo(event.target.value);
              }}
            />
            <select
              aria-label="Sort"
              className="h-9 rounded-md border bg-white px-2 text-sm"
              value={sort}
              onChange={(event) => {
                setPage(1);
                setSort(event.target.value);
              }}
            >
              <option value="createdAt:desc">Newest first</option>
              <option value="createdAt:asc">Oldest first</option>
              <option value="validUntil:asc">Expiring soonest</option>
              <option value="publishedAt:desc">Recently published</option>
              <option value="quantity:desc">Largest quantity</option>
            </select>
          </>
        }
      />
      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState title="Unable to load Import listings." description={error} onRetry={reload} />
      ) : (
        <>
          <CreditTable
            rows={data?.items ?? []}
            getRowId={(row) => row.id}
            onRowClick={(row) => router.push(`${IMPORT_BASE}/listings/${row.id}`)}
            emptyTitle="No listings found."
            emptyDescription="Try a different filter."
            columns={[
              { key: "ref", header: "Reference", accessor: (r) => r.referenceNumber ?? "Draft" },
              { key: "side", header: "Type", render: (r) => <ImportBadge value={r.side} /> },
              { key: "company", header: "Company", accessor: (r) => r.ownerOrg?.name ?? "—" },
              {
                key: "product",
                header: "Product",
                accessor: (r) =>
                  [r.product.category?.name, r.product.grade?.name ?? r.product.customGradeName]
                    .filter(Boolean)
                    .join(" · ") || "—",
              },
              { key: "qty", header: "Quantity", accessor: (r) => formatQty(r.product.quantity, r.product.quantityUnit) },
              {
                key: "price",
                header: "Price / Incoterm",
                accessor: (r) =>
                  `${formatPrice(r.commercial.price, r.commercial.currencyCode, r.commercial.priceUnit)} ${r.commercial.incoterm?.code ?? ""}`.trim(),
              },
              {
                key: "route",
                header: "Route",
                accessor: (r) => `${portLabel(r.shipping.pol)} → ${portLabel(r.shipping.pod)}`,
              },
              { key: "valid", header: "Valid until", accessor: (r) => formatImportDate(r.validity.validUntil) },
              { key: "status", header: "Status", render: (r) => <ImportBadge value={r.status} /> },
            ]}
          />
          <CreditPager meta={data?.meta} onPage={setPage} />
        </>
      )}
    </div>
  );
}

export default function ImportListingsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <ListingsView />
    </Suspense>
  );
}
