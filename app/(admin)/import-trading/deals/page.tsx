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
import { listImportDeals } from "@/lib/api/import-trading";
import { formatDateTime } from "@/lib/format";

const STATUSES = ["PENDING_CONFIRMATION", "CONFIRMED", "PARTIALLY_FULFILLED", "FULFILLED", "CANCELLED"];

function DealsView() {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useLoader(
    () => listImportDeals({ search, status: status || undefined, page, limit: 20 }),
    [search, status, page],
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Import deals"
        description="Agreed negotiations. Both parties must confirm before identities are shared."
        breadcrumbs={[{ label: "Import Trading", href: IMPORT_BASE }, { label: "Deals" }]}
      />
      <ImportTradingTabs />
      <CreditToolbar
        search={search}
        onSearch={(value) => {
          setPage(1);
          setSearch(value);
        }}
        searchPlaceholder="Search deal, negotiation or listing reference, buyer or seller"
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
        <ErrorState title="Unable to load deals." description={error} onRetry={reload} />
      ) : (
        <>
          <CreditTable
            rows={data?.items ?? []}
            getRowId={(row) => row.id}
            onRowClick={(row) => router.push(`${IMPORT_BASE}/deals/${row.id}`)}
            emptyTitle="No deals found."
            emptyDescription="Accepted negotiations create deals here."
            columns={[
              { key: "ref", header: "Reference", accessor: (r) => r.referenceNumber },
              { key: "buyer", header: "Buyer", accessor: (r) => r.buyer?.name ?? r.buyerRef },
              { key: "seller", header: "Seller", accessor: (r) => r.seller?.name ?? r.sellerRef },
              { key: "price", header: "Price", accessor: (r) => formatPrice(r.price, r.currencyCode, r.priceUnit) },
              { key: "qty", header: "Quantity", accessor: (r) => formatQty(r.quantity, r.quantityUnit) },
              { key: "incoterm", header: "Incoterm", accessor: (r) => r.incotermCode ?? "—" },
              { key: "created", header: "Created", accessor: (r) => formatDateTime(r.createdAt) },
              { key: "status", header: "Status", render: (r) => <ImportBadge value={r.status} /> },
            ]}
          />
          <CreditPager meta={data?.meta} onPage={setPage} />
        </>
      )}
    </div>
  );
}

export default function ImportDealsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <DealsView />
    </Suspense>
  );
}
