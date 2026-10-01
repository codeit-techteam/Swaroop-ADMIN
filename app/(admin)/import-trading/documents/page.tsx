"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { CreditPager, CreditTable, CreditToolbar } from "@/components/credit/credit-table";
import {
  DocumentActions,
  IMPORT_BASE,
  ImportBadge,
  ImportTradingTabs,
  importLabel,
  useLoader,
} from "@/components/import-trading/shared";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { listImportDocuments } from "@/lib/api/import-trading";
import { formatDateTime } from "@/lib/format";

const STATUSES = ["UPLOADED", "UNDER_REVIEW", "VERIFIED", "REJECTED", "EXPIRED", "REPLACED", "ARCHIVED"];

const CATEGORIES = [
  "COA",
  "TDS",
  "SDS",
  "MSDS",
  "CERTIFICATE_OF_ORIGIN",
  "COMMERCIAL_INVOICE",
  "PACKING_LIST",
  "BILL_OF_LADING",
  "INSPECTION_CERTIFICATE",
  "INSURANCE_CERTIFICATE",
  "PRODUCT_SPECIFICATION",
  "OTHER",
];

function formatSize(bytes: string | null) {
  const n = bytes ? Number(bytes) : NaN;
  if (!Number.isFinite(n)) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function DocumentsView() {
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [side, setSide] = useState(params.get("side") ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const listingId = params.get("listingId") ?? undefined;
  const dealId = params.get("dealId") ?? undefined;
  const { data, error, loading, reload } = useLoader(
    () =>
      listImportDocuments({
        search,
        status: status || undefined,
        category: category || undefined,
        side: side || undefined,
        listingId,
        dealId,
        createdFrom: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
        createdTo: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
        page,
        limit: 20,
      }),
    [search, status, category, side, from, to, page, listingId, dealId],
  );

  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    setPage(1);
    set(v);
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Import documents"
        description="Every COA, TDS, certificate and shipping document attached to Import listings. Each preview or download is written to the audit log."
        breadcrumbs={[{ label: "Import Trading", href: IMPORT_BASE }, { label: "Documents" }]}
      />
      <ImportTradingTabs />
      {listingId || dealId ? (
        <p className="text-sm text-muted-foreground">
          Filtered to one {dealId ? "deal" : "listing"}.{" "}
          <Link href={`${IMPORT_BASE}/documents`} className="text-primary hover:underline">
            Show all documents
          </Link>
        </p>
      ) : null}
      <CreditToolbar
        search={search}
        onSearch={reset(setSearch)}
        searchPlaceholder="Search file name, document number or listing reference"
        status={status}
        statuses={STATUSES.map((s) => ({ value: s, label: importLabel(s) }))}
        onStatus={reset(setStatus)}
        extra={
          <>
            <select
              aria-label="Document type"
              className="h-9 rounded-md border bg-white px-2 text-sm"
              value={category}
              onChange={(e) => reset(setCategory)(e.target.value)}
            >
              <option value="">All document types</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {importLabel(c)}
                </option>
              ))}
            </select>
            <select
              aria-label="Listing type"
              className="h-9 rounded-md border bg-white px-2 text-sm"
              value={side}
              onChange={(e) => reset(setSide)(e.target.value)}
            >
              <option value="">Buy requests &amp; sell offers</option>
              <option value="BUY">Buy requests (customers)</option>
              <option value="SELL">Sell offers (sellers)</option>
            </select>
            <input
              type="date"
              aria-label="Uploaded from"
              className="h-9 rounded-md border bg-white px-2 text-sm"
              value={from}
              max={to || undefined}
              onChange={(e) => reset(setFrom)(e.target.value)}
            />
            <input
              type="date"
              aria-label="Uploaded to"
              className="h-9 rounded-md border bg-white px-2 text-sm"
              value={to}
              min={from || undefined}
              onChange={(e) => reset(setTo)(e.target.value)}
            />
          </>
        }
      />
      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState title="Unable to load Import documents." description={error} onRetry={reload} />
      ) : (
        <>
          <CreditTable
            rows={data?.items ?? []}
            getRowId={(row) => row.id}
            emptyTitle="No documents found."
            emptyDescription="Documents uploaded on buy requests and sell offers appear here."
            columns={[
              {
                key: "file",
                header: "Document",
                render: (r) => (
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {importLabel(r.category)} · {formatSize(r.fileSizeBytes)}
                      {r.version > 1 ? ` · v${r.version}` : ""}
                    </p>
                  </div>
                ),
              },
              {
                key: "listing",
                header: "Listing",
                render: (r) =>
                  r.listing ? (
                    <span className="flex items-center gap-2">
                      <Link
                        className="text-primary hover:underline"
                        href={`${IMPORT_BASE}/listings/${r.listing.id}`}
                      >
                        {r.listing.referenceNumber ?? "Draft"}
                      </Link>
                      <ImportBadge value={r.listing.side} />
                    </span>
                  ) : (
                    "—"
                  ),
              },
              { key: "company", header: "Company", accessor: (r) => r.organization?.name ?? "—" },
              { key: "by", header: "Uploaded by", accessor: (r) => r.uploadedBy?.name ?? "—" },
              { key: "at", header: "Uploaded", accessor: (r) => formatDateTime(r.createdAt) },
              { key: "status", header: "Status", render: (r) => <ImportBadge value={r.status} /> },
              { key: "open", header: "", render: (r) => <DocumentActions documentId={r.id} /> },
            ]}
          />
          <CreditPager meta={data?.meta} onPage={setPage} />
        </>
      )}
    </div>
  );
}

export default function ImportDocumentsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <DocumentsView />
    </Suspense>
  );
}
