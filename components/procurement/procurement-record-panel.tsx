"use client";

import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { ReasonDialog } from "@/components/documents/reason-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  cancelProcurement,
  escalateProcurement,
  getProcurementRecord,
  getProcurementTimeline,
  markProcurementReviewed,
  procurementErrorMessage,
  recordProcurementView,
  type ProcurementRecord,
  type ProcurementTimelineEvent,
} from "@/lib/api/procurement-workbench";
import { formatDateTime, formatInrDecimal, formatRelativeTime } from "@/lib/format";

const CLOSED = new Set(["REJECTED", "EXPIRED", "CANCELLED", "WITHDRAWN", "CONVERTED_TO_ORDER"]);

function formatQty(value: string | null | undefined) {
  if (!value) return "—";
  if (!/^-?\d+(\.\d+)?$/.test(value)) return value;
  const [whole, fraction = ""] = value.split(".");
  const trimmed = fraction.replace(/0+$/, "");
  const grouped = new Intl.NumberFormat("en-IN").format(Number(whole || "0"));
  return trimmed ? `${grouped}.${trimmed}` : grouped;
}

function addressText(value: Record<string, unknown> | null | undefined) {
  if (!value) return null;
  if (typeof value.formattedAddress === "string" && value.formattedAddress.trim()) {
    return value.formattedAddress;
  }
  const parts = ["line1", "line2", "city", "state", "postalCode"]
    .map((key) => value[key])
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0);
  return parts.length ? parts.join(", ") : null;
}

function personName(first?: string | null, last?: string | null, fallback?: string | null) {
  const name = [first, last].filter(Boolean).join(" ");
  return name || fallback || "—";
}

export function ProcurementRecordPanel({
  id,
  onChanged,
}: {
  id: string;
  onChanged?: () => void;
}) {
  const [record, setRecord] = useState<ProcurementRecord | null>(null);
  const [events, setEvents] = useState<ProcurementTimelineEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [next, timeline] = await Promise.all([
        getProcurementRecord(id),
        getProcurementTimeline(id),
      ]);
      setRecord(next);
      setEvents(timeline);
    } catch (err) {
      setError(procurementErrorMessage(err, "Unable to load this procurement record."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void recordProcurementView(id).catch(() => undefined);
    // Reload when the selected record changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const run = async (key: string, action: () => Promise<unknown>, success: string) => {
    setBusy(key);
    try {
      await action();
      toast.success(success);
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(procurementErrorMessage(err, "The procurement action could not be completed."));
    } finally {
      setBusy(null);
    }
  };

  if (loading && !record) {
    return <div className="space-y-3 p-1">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-md bg-slate-100" />)}</div>;
  }
  if (error || !record) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p>{error ?? "Procurement record not found."}</p>
        <Button className="mt-3" size="sm" variant="outline" onClick={() => void load()}>Retry</Button>
      </div>
    );
  }

  const ops = record.ops;
  const delivery =
    addressText(record.purchaseOrder?.shippingAddressSnapshot) ??
    addressText(record.shippingAddressSnapshot) ??
    record.deliveryLocation;
  const billing = addressText(record.billingAddressSnapshot);
  const customerUser = record.customerProfile?.user;
  const sellerUser = record.sellerOrg?.sellerProfile?.user;
  const canOperate = !CLOSED.has(record.status);

  return (
    <div className="space-y-5">
      <header className="space-y-2 pr-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Purchase request</p>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{record.referenceNumber}</h2>
          <StatusBadge value={ops.statusLabel} />
          {ops.urgent ? <StatusBadge value="Urgent Review" /> : null}
        </div>
        <p className="text-sm text-muted-foreground">
          Created {formatDateTime(record.createdAt)} · Updated {formatRelativeTime(record.updatedAt)}
        </p>
        {ops.actionRequired && ops.actionReason ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {ops.actionReason}
            {ops.deadlineLabel ? ` · ${ops.deadlineLabel}` : ""}
          </p>
        ) : null}
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <Fact label="Customer" value={ops.customerName} />
        <Fact label="Seller" value={ops.sellerName ?? "Unassigned"} />
        <Fact label="Grade" value={ops.gradeName} />
        <Fact label="Product" value={ops.productName} />
        <Fact label="Quantity" value={`${formatQty(ops.quantity)} ${ops.unit}`} />
        <Fact label="Unit price" value={formatInrDecimal(ops.unitPrice)} />
        <Fact label="Commercial value" value={formatInrDecimal(ops.totalAmount)} />
        <Fact label="Payment terms" value={ops.paymentTerms ?? "—"} />
        <Fact label="Priority" value={record.priority} />
        <Fact label="PO" value={ops.poNumber ? `${ops.poNumber} · ${ops.poStatusLabel}` : "Not created"} />
        <Fact label="Proforma" value={ops.piStatusLabel} />
        <Fact label="Payment" value={ops.paymentStatusLabel} />
      </section>

      <Section title="Customer">
        <Fact label="Company" value={record.customerOrg?.legalName ?? record.customerOrg?.name ?? "—"} />
        <Fact label="Contact" value={personName(customerUser?.firstName, customerUser?.lastName, ops.customerName)} />
        <Fact label="Phone" value={customerUser?.phone ?? record.customerOrg?.phone ?? "—"} />
        <Fact label="Email" value={customerUser?.email ?? record.customerOrg?.email ?? "—"} />
        <Fact label="Billing address" value={billing ?? "—"} />
        <Fact label="Delivery address" value={delivery ?? "—"} />
      </Section>

      <Section title="Seller">
        <Fact label="Company" value={record.sellerOrg?.legalName ?? record.sellerOrg?.name ?? "Unassigned"} />
        <Fact label="Contact" value={personName(sellerUser?.firstName, sellerUser?.lastName)} />
        <Fact label="Phone" value={sellerUser?.phone ?? record.sellerOrg?.phone ?? "—"} />
        <Fact label="Email" value={sellerUser?.email ?? record.sellerOrg?.email ?? "—"} />
        <Fact label="Seller status" value={record.sellerOrg?.sellerProfile?.status ?? "—"} />
        <Fact label="KYC" value={record.sellerOrg?.sellerProfile?.kycStatus ?? record.sellerOrg?.verificationStatus ?? "—"} />
      </Section>

      <Section title="Negotiation">
        {record.counterOffers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No counter offers have been recorded.</p>
        ) : (
          <ol className="space-y-2">
            {record.counterOffers.map((round) => (
              <li key={round.id} className="rounded-md border px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">Round {round.roundNumber} · {round.role}</span>
                  <StatusBadge value={round.status} />
                </div>
                <p className="mt-1 text-muted-foreground">
                  {formatQty(round.quantity)} {ops.unit} · {formatInrDecimal(round.unitPrice)} · {round.paymentMethod ?? "Payment terms unchanged"}
                </p>
                {round.note ? <p className="mt-1">{round.note}</p> : null}
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(round.createdAt)}</p>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="Purchase order, invoice and logistics">
        <Fact label="PO number" value={ops.poNumber ?? "Not created"} />
        <Fact label="PO status" value={ops.poStatusLabel} />
        <Fact label="PO total" value={formatInrDecimal(record.purchaseOrder?.totalAmount)} />
        <Fact label="GST" value={formatInrDecimal(record.purchaseOrder?.taxAmount)} />
        <Fact label="Proforma" value={record.finance.proforma ? `${record.finance.proforma.piNumber} · ${record.finance.proforma.statusLabel}` : "Not Generated"} />
        <Fact label="Amount paid" value={formatInrDecimal(record.finance.proforma?.paidAmount)} />
        <Fact label="Amount due" value={formatInrDecimal(record.finance.proforma?.remainingAmount)} />
        <Fact label="Dispatch" value={record.finance.dispatch ? `${record.finance.dispatch.dispatchNumber} · ${record.finance.dispatch.status}` : "Not created"} />
        <Fact label="Shipment" value={record.finance.shipment ? `${record.finance.shipment.referenceNumber} · ${record.finance.shipment.status}` : "Not created"} />
        <Fact label="E-way bill" value={record.finance.ewayBill?.ewayBillNumber ?? "Not generated"} />
      </Section>

      <Section title="Timeline">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events recorded yet.</p>
        ) : (
          <ol className="space-y-2">
            {events.map((event) => (
              <li key={event.id} className="text-sm">
                <p className="font-medium">{event.eventType.replaceAll("_", " ")}</p>
                <p className="text-xs text-muted-foreground">
                  {event.actorRole ?? "System"} · {formatDateTime(event.createdAt)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Section>

      {record.rejectionReason ? (
        <Section title="Cancellation reason">
          <p className="text-sm">{record.rejectionReason}</p>
        </Section>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button
          size="sm"
          variant="outline"
          disabled={!canOperate || busy != null}
          onClick={() => void run("review", () => markProcurementReviewed(record.id, record.updatedAt), "Marked for review")}
        >
          {busy === "review" ? "Saving…" : "Mark for review"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!canOperate || record.priority === "URGENT" || busy != null}
          onClick={() => void run("escalate", () => escalateProcurement(record.id, record.updatedAt), "Priority set to urgent")}
        >
          {busy === "escalate" ? "Saving…" : "Escalate"}
        </Button>
        <Button size="sm" variant="destructive" disabled={!canOperate || busy != null} onClick={() => setRejectOpen(true)}>
          Cancel procurement
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Purchase orders are issued by the backend when commercial terms are accepted. This workbench does not create a second order number.
      </p>

      <ReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Cancel this procurement?"
        description={`${record.referenceNumber} · ${ops.customerName} · ${ops.gradeName}. The reason is stored on the purchase request.`}
        confirmLabel="Cancel procurement"
        destructive
        placeholder="Why is this procurement being cancelled?"
        onSubmit={async (reason) => {
          setBusy("cancel");
          try {
            await cancelProcurement(record.id, reason, record.updatedAt);
            toast.success("Procurement cancelled");
            await load();
            onChanged?.();
          } catch (err) {
            toast.error(procurementErrorMessage(err, "The procurement action could not be completed."));
            throw err;
          } finally {
            setBusy(null);
          }
        }}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-sm" title={value}>{value}</p>
    </div>
  );
}
