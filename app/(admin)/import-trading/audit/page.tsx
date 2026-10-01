"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { CreditPager, CreditTable, CreditToolbar } from "@/components/credit/credit-table";
import {
  auditActionLabel,
  IMPORT_BASE,
  ImportBadge,
  ImportTradingTabs,
  importLabel,
  useLoader,
} from "@/components/import-trading/shared";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { type AdminImportAuditRow, listImportAuditLogs } from "@/lib/api/import-trading";
import { formatDateTime } from "@/lib/format";

const ENTITY_TYPES = [
  { value: "IMPORT_LISTING", label: "Listings" },
  { value: "IMPORT_NEGOTIATION", label: "Negotiations" },
  { value: "IMPORT_DEAL", label: "Deals" },
  { value: "IMPORT_MASTER", label: "Master data & settings" },
];

const ACTIONS = [
  "IMPORT_BUY_CREATED",
  "IMPORT_BUY_UPDATED",
  "IMPORT_BUY_PUBLISHED",
  "IMPORT_BUY_CANCELLED",
  "IMPORT_BUY_EXPIRED",
  "IMPORT_BUY_DRAFT_DELETED",
  "IMPORT_SELL_CREATED",
  "IMPORT_SELL_UPDATED",
  "IMPORT_SELL_PUBLISHED",
  "IMPORT_SELL_PAUSED",
  "IMPORT_SELL_RESUMED",
  "IMPORT_SELL_CANCELLED",
  "IMPORT_SELL_EXPIRED",
  "IMPORT_SELL_DRAFT_DELETED",
  "IMPORT_LISTING_STATUS_CHANGED_BY_ADMIN",
  "IMPORT_DOCUMENT_UPLOADED",
  "IMPORT_DOCUMENT_DELETED",
  "IMPORT_DOCUMENT_ACCESSED_BY_ADMIN",
  "IMPORT_NEGOTIATION_STARTED",
  "IMPORT_COUNTEROFFER_CREATED",
  "IMPORT_COUNTEROFFER_ACCEPTED",
  "IMPORT_COUNTEROFFER_REJECTED",
  "IMPORT_NEGOTIATION_WITHDRAWN",
  "IMPORT_NEGOTIATION_EXPIRED",
  "IMPORT_DEAL_PARTY_CONFIRMED",
  "IMPORT_DEAL_CONFIRMED",
  "IMPORT_DEAL_STATUS_CHANGED_BY_ADMIN",
  "IMPORT_MATCHES_RECOMPUTED",
  "IMPORT_MASTER_CREATED",
  "IMPORT_MASTER_UPDATED",
  "IMPORT_MASTER_STATUS_CHANGED",
  "IMPORT_SETTINGS_UPDATED",
];

function entityHref(row: AdminImportAuditRow) {
  if (!row.entityId) return null;
  switch (row.entityType) {
    case "IMPORT_LISTING":
      return `${IMPORT_BASE}/listings/${row.entityId}`;
    case "IMPORT_NEGOTIATION":
      return `${IMPORT_BASE}/negotiations/${row.entityId}`;
    case "IMPORT_DEAL":
      return `${IMPORT_BASE}/deals/${row.entityId}`;
    default:
      return null;
  }
}

/** Short, human summary of what changed; raw JSON stays out of the table. */
function changeSummary(row: AdminImportAuditRow) {
  const prev = row.previousData as Record<string, unknown> | null;
  const next = row.newData as Record<string, unknown> | null;
  const meta = row.metadata ?? {};
  const parts: string[] = [];
  if (prev?.status && next?.status) parts.push(`${importLabel(String(prev.status))} → ${importLabel(String(next.status))}`);
  if (typeof next?.category === "string") parts.push(importLabel(next.category));
  if (typeof next?.fileName === "string") parts.push(next.fileName);
  if (typeof meta.category === "string" && !next?.category) parts.push(importLabel(meta.category));
  if (typeof meta.entity === "string") parts.push(importLabel(meta.entity));
  if (typeof meta.reason === "string" && meta.reason) parts.push(`“${meta.reason}”`);
  return parts.join(" · ") || "—";
}

function AuditView() {
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState(params.get("entityType") ?? "");
  const [action, setAction] = useState(params.get("action") ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const entityId = params.get("entityId") ?? undefined;
  const { data, error, loading, reload } = useLoader(
    () =>
      listImportAuditLogs({
        search,
        entityType: entityType || undefined,
        action: action || undefined,
        entityId,
        createdFrom: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
        createdTo: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
        page,
        limit: 25,
      }),
    [search, entityType, action, from, to, page, entityId],
  );

  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    setPage(1);
    set(v);
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Import audit log"
        description="Every Import event recorded by the backend: who acted, in which role, on which record and when."
        breadcrumbs={[{ label: "Import Trading", href: IMPORT_BASE }, { label: "Audit log" }]}
      />
      <ImportTradingTabs />
      {entityId ? (
        <p className="text-sm text-muted-foreground">
          Filtered to one record.{" "}
          <Link href={`${IMPORT_BASE}/audit`} className="text-primary hover:underline">
            Show the full log
          </Link>
        </p>
      ) : null}
      <CreditToolbar
        search={search}
        onSearch={reset(setSearch)}
        searchPlaceholder="Search IBR / ISO / INE / IDL reference or action"
        extra={
          <>
            <select
              aria-label="Record type"
              className="h-9 rounded-md border bg-white px-2 text-sm"
              value={entityType}
              onChange={(e) => reset(setEntityType)(e.target.value)}
            >
              <option value="">All records</option>
              {ENTITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Event"
              className="h-9 max-w-[240px] rounded-md border bg-white px-2 text-sm"
              value={action}
              onChange={(e) => reset(setAction)(e.target.value)}
            >
              <option value="">All events</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {auditActionLabel(a)}
                </option>
              ))}
            </select>
            <input
              type="date"
              aria-label="From"
              className="h-9 rounded-md border bg-white px-2 text-sm"
              value={from}
              max={to || undefined}
              onChange={(e) => reset(setFrom)(e.target.value)}
            />
            <input
              type="date"
              aria-label="To"
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
        <ErrorState title="Unable to load the Import audit log." description={error} onRetry={reload} />
      ) : (
        <>
          <CreditTable
            rows={data?.items ?? []}
            getRowId={(row) => row.id}
            emptyTitle="No audit entries found."
            emptyDescription="Try a wider date range or a different event."
            columns={[
              { key: "at", header: "When", accessor: (r) => formatDateTime(r.createdAt) },
              { key: "event", header: "Event", accessor: (r) => auditActionLabel(r.action) },
              {
                key: "record",
                header: "Record",
                render: (r) => {
                  const href = entityHref(r);
                  const label = r.entityReference ?? (r.entityType === "IMPORT_MASTER" ? "Master data" : "—");
                  return (
                    <span className="flex items-center gap-2">
                      {href ? (
                        <Link className="text-primary hover:underline" href={href}>
                          {label}
                        </Link>
                      ) : (
                        label
                      )}
                      {r.listingSide ? <ImportBadge value={r.listingSide} /> : null}
                    </span>
                  );
                },
              },
              {
                key: "actor",
                header: "Actor",
                accessor: (r) => {
                  const role = typeof r.metadata?.actorRole === "string" ? r.metadata.actorRole : null;
                  return `${r.actor?.name ?? "System"}${role ? ` (${importLabel(role)})` : ""}`;
                },
              },
              { key: "org", header: "Company", accessor: (r) => r.organization?.name ?? "—" },
              { key: "change", header: "Change", accessor: (r) => changeSummary(r) },
            ]}
          />
          <CreditPager meta={data?.meta} onPage={setPage} />
        </>
      )}
    </div>
  );
}

export default function ImportAuditPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <AuditView />
    </Suspense>
  );
}
