"use client";

import { useCallback, useEffect, useState } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  describeApiFailure,
  listAuditLogs,
  type AuditLogRow,
} from "@/lib/api/control-center";
import { formatDateTime } from "@/lib/format";

const ENTITY_TYPES = [
  "",
  "USER",
  "CUSTOMER",
  "SELLER",
  "ORDER",
  "PURCHASE_REQUEST",
  "PAYMENT",
  "DOCUMENT",
  "IMPORT_DEAL",
  "IMPORT_NEGOTIATION",
  "IMPORT_SHIPMENT",
  "SHIPMENT",
];

export default function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listAuditLogs({
        page,
        limit: 25,
        search,
        entityType: entityType || undefined,
      });
      setRows(result.items);
      setTotalPages(result.meta?.totalPages ?? 1);
    } catch (cause) {
      setRows([]);
      setError(describeApiFailure(cause));
    } finally {
      setLoading(false);
    }
  }, [page, search, entityType]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load();
    }, 300);
    return () => window.clearTimeout(handle);
  }, [load]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Audit logs"
        description="Immutable admin and business actions. Records are read-only."
        breadcrumbs={[{ label: "System" }, { label: "Audit logs" }]}
      />
      <div className="flex flex-wrap gap-2">
        <Input
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
          placeholder="Search action"
          className="max-w-xs"
        />
        <select
          className="h-9 rounded-md border bg-white px-2 text-sm"
          value={entityType}
          onChange={(event) => {
            setPage(1);
            setEntityType(event.target.value);
          }}
        >
          {ENTITY_TYPES.map((type) => (
            <option key={type || "all"} value={type}>
              {type || "All entities"}
            </option>
          ))}
        </select>
      </div>
      {loading ? <TableSkeleton /> : null}
      {!loading && error ? <ErrorState title="Audit logs unavailable" description={error} onRetry={() => void load()} /> : null}
      {!loading && !error ? (
        <div className="overflow-x-auto rounded-md border bg-white shadow-soft">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No audit records match this filter.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Actor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                    <td className="font-medium">{row.action}</td>
                    <td>{row.entityType}{row.entityId ? ` · ${row.entityId.slice(0, 8)}` : ""}</td>
                    <td>{row.actor?.email ?? "System"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="flex items-center justify-between border-t px-3 py-2">
            <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
                Previous
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>
                Next
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
