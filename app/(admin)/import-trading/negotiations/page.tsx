"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { CreditPager, CreditTable, CreditToolbar } from "@/components/credit/credit-table";
import {
  formatPrice,
  formatQty,
  IMPORT_BASE,
  ImportBadge,
  ImportTradingTabs,
  importLabel,
  useLoader,
} from "@/components/import-trading/shared";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { listImportNegotiations } from "@/lib/api/import-trading";
import { formatDateTime } from "@/lib/format";

const STATUSES = ["OPEN", "AGREED", "REJECTED", "WITHDRAWN", "EXPIRED", "CANCELLED"];

function NegotiationsView() {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useLoader(
    () => listImportNegotiations({ search, status: status || undefined, page, limit: 20 }),
    [search, status, page],
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Import negotiations"
        description="Every offer thread between a buyer and a seller. Events are immutable."
        breadcrumbs={[{ label: "Import Trading", href: IMPORT_BASE }, { label: "Negotiations" }]}
      />
      <ImportTradingTabs />
      <CreditToolbar
        search={search}
        onSearch={(value) => {
          setPage(1);
          setSearch(value);
        }}
        searchPlaceholder="Search negotiation or listing reference, buyer or seller"
        status={status}
        statuses={STATUSES.map((s) => ({ value: s, label: importLabel(s) }))}
        onStatus={(value) => {
          setPage(1);
          setStatus(value);
        }}
      />
      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState title="Unable to load negotiations." description={error} onRetry={reload} />
      ) : (
        <>
          <CreditTable
            rows={data?.items ?? []}
            getRowId={(row) => row.id}
            onRowClick={(row) => router.push(`${IMPORT_BASE}/negotiations/${row.id}`)}
            emptyTitle="No negotiations found."
            emptyDescription="Offers made on Import listings appear here."
            columns={[
              { key: "ref", header: "Reference", accessor: (r) => r.referenceNumber },
              { key: "buyer", header: "Buyer", accessor: (r) => r.buyerOrg.name },
              { key: "seller", header: "Seller", accessor: (r) => r.sellerOrg.name },
              {
                key: "listings",
                header: "Listings",
                accessor: (r) =>
                  [r.buyListing?.referenceNumber, r.sellListing?.referenceNumber].filter(Boolean).join(" ↔ ") || "—",
              },
              {
                key: "latest",
                header: "Latest terms",
                accessor: (r) =>
                  r.latestPrice ? `${formatPrice(r.latestPrice, r.currencyCode)} × ${formatQty(r.latestQuantity)}` : "—",
              },
              { key: "rounds", header: "Rounds", accessor: (r) => r.roundCount },
              { key: "last", header: "Last move", accessor: (r) => importLabel(r.lastActorParty) },
              { key: "updated", header: "Updated", accessor: (r) => formatDateTime(r.updatedAt) },
              { key: "status", header: "Status", render: (r) => <ImportBadge value={r.status} /> },
            ]}
          />
          <CreditPager meta={data?.meta} onPage={setPage} />
        </>
      )}
    </div>
  );
}

export default function ImportNegotiationsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <NegotiationsView />
    </Suspense>
  );
}
