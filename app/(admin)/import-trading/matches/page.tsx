"use client";

import Link from "next/link";
import { useState } from "react";

import { CreditPager, CreditTable } from "@/components/credit/credit-table";
import {
  IMPORT_BASE,
  ImportBadge,
  ImportTradingTabs,
  importLabel,
  useLoader,
} from "@/components/import-trading/shared";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { Input } from "@/components/ui/input";
import { listImportMatches } from "@/lib/api/import-trading";
import { formatDateTime } from "@/lib/format";

const STATUSES = ["SUGGESTED", "NEGOTIATING", "CONVERTED", "DISMISSED", "STALE"];

export default function ImportMatchesPage() {
  const [status, setStatus] = useState("");
  const [minScore, setMinScore] = useState("");
  const [page, setPage] = useState(1);
  const score = /^\d{1,3}$/.test(minScore) && Number(minScore) <= 100 ? Number(minScore) : undefined;
  const { data, error, loading, reload } = useLoader(
    () => listImportMatches({ status: status || undefined, minScore: score, page, limit: 20 }),
    [status, score, page],
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Import matches"
        description="Deterministic, rule-based matches between BUY requests and SELL offers with the criteria that did and did not match."
        breadcrumbs={[{ label: "Import Trading", href: IMPORT_BASE }, { label: "Matches" }]}
      />
      <ImportTradingTabs />
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="h-9 rounded-md border bg-white px-2 text-sm"
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value);
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {importLabel(s)}
            </option>
          ))}
        </select>
        <Input
          className="w-40"
          inputMode="numeric"
          placeholder="Min score (0–100)"
          value={minScore}
          onChange={(event) => {
            setPage(1);
            setMinScore(event.target.value.replace(/\D/g, "").slice(0, 3));
          }}
        />
      </div>
      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState title="Unable to load matches." description={error} onRetry={reload} />
      ) : (
        <>
          <CreditTable
            rows={data?.items ?? []}
            getRowId={(row) => row.id}
            emptyTitle="No matches found."
            emptyDescription="Matches are computed when listings are published or edited."
            columns={[
              {
                key: "buy",
                header: "Buy request",
                render: (r) => (
                  <Link className="text-primary hover:underline" href={`${IMPORT_BASE}/listings/${r.buyListing.id}`}>
                    {r.buyListing.referenceNumber ?? r.buyListing.id.slice(0, 8)}
                  </Link>
                ),
              },
              {
                key: "sell",
                header: "Sell offer",
                render: (r) => (
                  <Link className="text-primary hover:underline" href={`${IMPORT_BASE}/listings/${r.sellListing.id}`}>
                    {r.sellListing.referenceNumber ?? r.sellListing.id.slice(0, 8)}
                  </Link>
                ),
              },
              { key: "score", header: "Score", accessor: (r) => r.matchScore },
              {
                key: "matched",
                header: "Matched",
                render: (r) => (
                  <span className="text-xs text-emerald-700">{r.matchedCriteria.map(importLabel).join(", ") || "—"}</span>
                ),
              },
              {
                key: "unmatched",
                header: "Not matched",
                render: (r) => (
                  <span className="text-xs text-slate-500">{r.unmatchedCriteria.map(importLabel).join(", ") || "—"}</span>
                ),
              },
              { key: "status", header: "Status", render: (r) => <ImportBadge value={r.status} /> },
              { key: "computed", header: "Computed", accessor: (r) => `${formatDateTime(r.computedAt)} · ${r.algorithmVersion}` },
            ]}
          />
          <CreditPager meta={data?.meta} onPage={setPage} />
        </>
      )}
    </div>
  );
}
