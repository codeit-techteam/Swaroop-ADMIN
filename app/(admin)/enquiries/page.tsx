"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DetailRow } from "@/components/shared/detail-drawer";
import { EntityWorkbench } from "@/components/shared/entity-workbench";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ENQUIRY_STATUS_LABELS,
  ENQUIRY_TOPIC_LABELS,
  listWebsiteEnquiries,
  updateWebsiteEnquiry,
  type WebsiteEnquiry,
  type WebsiteEnquiryStatus,
} from "@/lib/api/enquiries";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const NEXT_STATUSES: Record<WebsiteEnquiryStatus, WebsiteEnquiryStatus[]> = {
  NEW: ["IN_PROGRESS", "CLOSED"],
  IN_PROGRESS: ["CLOSED"],
  CLOSED: ["IN_PROGRESS"],
};

export default function WebsiteEnquiriesPage() {
  const [rows, setRows] = useState<WebsiteEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async (mode: "initial" | "refresh") => {
    if (mode === "initial") setLoading(true);
    else setRefreshing(true);
    try {
      setRows(await listWebsiteEnquiries());
      setLoadError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load website enquiries.";
      if (mode === "initial") setLoadError(message);
      else toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load("initial");
  }, [load]);

  const kpis = useMemo(() => {
    const count = (status: WebsiteEnquiryStatus) => String(rows.filter((r) => r.status === status).length);
    return [
      { label: "New", value: count("NEW"), tone: "warning" as const },
      { label: "In progress", value: count("IN_PROGRESS") },
      { label: "Closed", value: count("CLOSED"), tone: "success" as const },
      { label: "Total", value: String(rows.length) },
    ];
  }, [rows]);

  const save = async (row: WebsiteEnquiry, input: { status?: WebsiteEnquiryStatus; adminNotes?: string }) => {
    setSavingId(row.id);
    try {
      const updated = await updateWebsiteEnquiry(row.id, input);
      setRows((current) => current.map((r) => (r.id === updated.id ? updated : r)));
      toast.success(`Enquiry ${row.referenceNumber} updated`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <EntityWorkbench
      title="Website Enquiries"
      description="Contact-form enquiries submitted from the public Swaroop website."
      kpis={kpis}
      loading={loading}
      loadingError={loadError}
      onRetry={() => void load("initial")}
      actions={
        <Button size="sm" variant="outline" disabled={refreshing} onClick={() => void load("refresh")}>
          <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
          Refresh
        </Button>
      }
      rows={rows}
      getRowId={(r) => r.id}
      columns={[
        { key: "ref", header: "Reference", sortable: true, accessor: (r) => r.referenceNumber },
        { key: "name", header: "Name", sortable: true, accessor: (r) => r.name },
        { key: "company", header: "Company", accessor: (r) => r.company ?? "—" },
        { key: "topic", header: "Requirement", accessor: (r) => ENQUIRY_TOPIC_LABELS[r.topic] },
        {
          key: "status",
          header: "Status",
          render: (r) => <StatusBadge value={ENQUIRY_STATUS_LABELS[r.status]} />,
        },
        {
          key: "created",
          header: "Received",
          sortable: true,
          accessor: (r) => r.createdAt,
          render: (r) => formatRelativeTime(r.createdAt),
        },
      ]}
      searchPlaceholder="Search enquiries"
      searchFn={(r, q) =>
        `${r.referenceNumber} ${r.name} ${r.company ?? ""} ${r.email} ${r.phone ?? ""}`.toLowerCase().includes(q)
      }
      filters={[
        { label: "New", value: "NEW", predicate: (r) => r.status === "NEW" },
        { label: "In Progress", value: "IN_PROGRESS", predicate: (r) => r.status === "IN_PROGRESS" },
        { label: "Closed", value: "CLOSED", predicate: (r) => r.status === "CLOSED" },
        { label: "Credit", value: "CREDIT", predicate: (r) => r.topic === "CREDIT" },
        { label: "Sell", value: "SELL", predicate: (r) => r.topic === "SELL_MATERIALS" },
        { label: "Buy", value: "BUY", predicate: (r) => r.topic === "BUY_MATERIALS" },
      ]}
      emptyTitle="No website enquiries yet."
      emptyDescription="Messages sent from the website contact form will appear here."
      exportName="website-enquiries"
      exportRow={(r) => ({
        reference: r.referenceNumber,
        name: r.name,
        company: r.company,
        email: r.email,
        phone: r.phone,
        requirement: ENQUIRY_TOPIC_LABELS[r.topic],
        status: ENQUIRY_STATUS_LABELS[r.status],
        createdAt: r.createdAt,
      })}
      drawerTitle={(r) => r.referenceNumber}
      drawerDescription={(r) => `${r.name}${r.company ? ` · ${r.company}` : ""}`}
      renderDetails={(r) => {
        const draft = notes[r.id] ?? r.adminNotes ?? "";
        return (
          <div className="space-y-4">
            <dl>
              <DetailRow label="Name" value={r.name} />
              <DetailRow label="Company" value={r.company ?? "—"} />
              <DetailRow label="Email" value={<a className="text-primary" href={`mailto:${r.email}`}>{r.email}</a>} />
              <DetailRow label="Phone" value={r.phone ? <a className="text-primary" href={`tel:${r.phone}`}>{r.phone}</a> : "—"} />
              <DetailRow label="Requirement" value={ENQUIRY_TOPIC_LABELS[r.topic]} />
              <DetailRow label="Status" value={<StatusBadge value={ENQUIRY_STATUS_LABELS[r.status]} />} />
              <DetailRow label="Received" value={formatDateTime(r.createdAt)} />
              <DetailRow label="Sent from" value={r.pagePath ?? "Website"} />
              {r.handledByName ? <DetailRow label="Last handled by" value={r.handledByName} /> : null}
            </dl>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Message</p>
              <p className="whitespace-pre-wrap rounded-md border bg-slate-50 p-3 text-sm">{r.message}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`enquiry-notes-${r.id}`}>Internal notes</Label>
              <Textarea
                id={`enquiry-notes-${r.id}`}
                rows={3}
                maxLength={2000}
                value={draft}
                onChange={(e) => setNotes((current) => ({ ...current, [r.id]: e.target.value }))}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={savingId === r.id || draft === (r.adminNotes ?? "")}
                onClick={() => void save(r, { adminNotes: draft })}
              >
                Save notes
              </Button>
            </div>
          </div>
        );
      }}
      drawerFooter={(r) => (
        <div className="grid grid-cols-2 gap-2">
          {NEXT_STATUSES[r.status].map((to) => (
            <Button
              key={to}
              size="sm"
              variant={to === "CLOSED" ? "default" : "outline"}
              disabled={savingId === r.id}
              onClick={() => void save(r, { status: to })}
            >
              {to === "IN_PROGRESS" ? (r.status === "CLOSED" ? "Reopen" : "Mark In Progress") : "Close"}
            </Button>
          ))}
        </div>
      )}
    />
  );
}
