"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useBulkLogisticsQuery } from "@/components/logistics/use-bulk-logistics-query";
import { DetailRow } from "@/components/shared/detail-drawer";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  closeBulkLogisticsQuote,
  getBulkLogisticsQuote,
  markBulkLogisticsQuoted,
  startBulkLogisticsReview,
} from "@/lib/api/bulk-logistics-quotes";
import { ApiError } from "@/lib/api/client";
import { formatDate, formatDateTime } from "@/lib/format";

export default function BulkLogisticsQuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data, error, loading, reload } = useBulkLogisticsQuery(
    () => getBulkLogisticsQuote(id),
    [id],
  );
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      reload();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unable to update the quote request.";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={data?.requestNumber ?? "Bulk logistics quote"}
        description="Review customer bulk logistics request details"
        breadcrumbs={[
          { label: "Logistics", href: "/logistics" },
          { label: "Bulk Quotes", href: "/logistics/bulk-quotes" },
          { label: data?.requestNumber ?? "Detail" },
        ]}
        actions={
          data ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => run(() => startBulkLogisticsReview(id), "Review started")}
              >
                Start Review
              </Button>
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  run(() => markBulkLogisticsQuoted(id, notes || undefined), "Marked as quoted")
                }
              >
                Mark Quoted
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={() =>
                  run(() => closeBulkLogisticsQuote(id, notes || undefined), "Request closed")
                }
              >
                Close
              </Button>
            </div>
          ) : null
        }
      />
      {loading ? (
        <>
          <p className="text-sm text-muted-foreground">Loading bulk logistics quote…</p>
          <TableSkeleton />
        </>
      ) : error ? (
        <ErrorState
          title="Unable to load this quote request. Please try again."
          description={error}
          onRetry={reload}
        />
      ) : data ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <section className="rounded-md border bg-white p-4 xl:col-span-2">
            <p className="section-label mb-3">Customer information</p>
            <dl>
              <DetailRow label="Company" value={data.companyName} />
              <DetailRow label="Contact" value={data.contactName} />
              <DetailRow label="Email" value={data.email} />
              <DetailRow label="Phone" value={data.phone} />
              <DetailRow label="Customer org" value={data.customer.name} />
              <DetailRow label="GSTIN" value={data.customer.gstin ?? "—"} />
            </dl>
            <p className="section-label mb-3 mt-6">Shipment details</p>
            <dl>
              <DetailRow label="Material" value={data.materialName} />
              <DetailRow label="Quantity" value={`${data.quantityMt} MT`} />
              <DetailRow label="Pickup" value={data.pickupLocation} />
              <DetailRow label="Delivery" value={data.deliveryLocation} />
              <DetailRow
                label="Preferred date"
                value={data.preferredDate ? formatDate(data.preferredDate) : "—"}
              />
              <DetailRow label="Message" value={data.message ?? "—"} />
              <DetailRow label="Status" value={<StatusBadge value={data.status} />} />
              <DetailRow label="Assigned admin" value={data.assignedAdminName ?? "Unassigned"} />
            </dl>
          </section>
          <section className="rounded-md border bg-white p-4">
            <p className="section-label mb-3">Admin actions</p>
            <dl>
              <DetailRow label="Submitted" value={formatDateTime(data.createdAt)} />
              <DetailRow
                label="Reviewed"
                value={data.reviewedAt ? formatDateTime(data.reviewedAt) : "—"}
              />
              <DetailRow
                label="Closed"
                value={data.closedAt ? formatDateTime(data.closedAt) : "—"}
              />
              <DetailRow label="Admin notes" value={data.adminNotes ?? "—"} />
            </dl>
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Notes for quote / close
              </p>
              <Input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional admin notes"
              />
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
