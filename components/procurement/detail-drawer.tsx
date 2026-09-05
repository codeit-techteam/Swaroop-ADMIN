"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ProcessTracker } from "@/components/procurement/process-tracker";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { DetailDrawer, DetailRow } from "@/components/shared/detail-drawer";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, formatInrExact } from "@/lib/format";
import { APPROVABLE_STATUSES, expectedSavings } from "@/lib/procurement";
import { cn } from "@/lib/utils";
import { useProcurementStore } from "@/store/procurement-store";
import type { Procurement } from "@/types";

export function ProcurementDetailDrawer() {
  const selectedId = useProcurementStore((s) => s.selectedId);
  const procurements = useProcurementStore((s) => s.procurements);
  const selectProcurement = useProcurementStore((s) => s.selectProcurement);
  const item = procurements.find((row) => row.id === selectedId) ?? null;

  return (
    <DetailDrawer
      open={Boolean(item)}
      onOpenChange={(open) => {
        if (!open) selectProcurement(null);
      }}
      title="Procurement Details"
      description={item ? `${item.commodity} · ${item.customerName}` : undefined}
      contentClassName="sm:max-w-2xl"
      footer={item ? <DrawerActions item={item} /> : null}
    >
      {item ? <DrawerBody item={item} /> : null}
    </DetailDrawer>
  );
}

function DrawerBody({ item }: { item: Procurement }) {
  return (
    <div className="flex flex-col gap-5">
      <ProcessTracker status={item.status} />
      <dl>
        <DetailRow label="Procurement ID" value={item.id} />
        <DetailRow label="Customer" value={item.customerName} />
        <DetailRow label="Seller/Supplier" value={item.sellerName ?? item.supplier} />
        <DetailRow label="Commodity" value={item.commodity} />
        <DetailRow label="Grade" value={item.grade} />
        <DetailRow label="Quantity" value={`${item.quantity} ${item.unit}`} />
        <DetailRow label="Estimated Cost" value={formatInrExact(item.estimatedCost)} />
        <DetailRow label="Requested Date" value={formatDate(item.requestedDate)} />
        <DetailRow label="Required Delivery Date" value={formatDate(item.requiredDeliveryDate)} />
        <DetailRow label="Delivery Location" value={item.deliveryLocation} />
        <DetailRow label="Payment Terms" value={item.paymentTerms} />
        <DetailRow label="Credit Terms" value={item.creditTerms} />
        <DetailRow label="Current Status" value={<StatusBadge value={item.status} />} />
      </dl>

      {item.quotations.length > 0 ? <SupplierComparison item={item} /> : null}
      {item.status === "Negotiation" || item.negotiation ? <NegotiationPanel item={item} /> : null}
      {item.approval || APPROVABLE_STATUSES.includes(item.status) || item.status === "Approved" ? (
        <ApprovalPanel item={item} />
      ) : null}
      {item.status === "PO Created" ? <SellerConfirmationPanel item={item} /> : null}
      {item.status === "Seller Confirmed" || item.status === "Processing" ? <DispatchHint item={item} /> : null}
      {item.shipment ? <ShipmentPanel item={item} /> : null}

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Procurement Timeline</h3>
        <ActivityTimeline
          items={item.timeline.map((event) => ({
            id: event.id,
            title: event.title,
            detail: `${event.actor} · ${event.description}`,
            time: event.timestamp,
            source: "Admin Portal" as const,
          }))}
        />
      </section>
    </div>
  );
}

function SupplierComparison({ item }: { item: Procurement }) {
  const selectPreferredSupplier = useProcurementStore((s) => s.selectPreferredSupplier);
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Supplier Comparison</h3>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-left text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="p-2">Supplier</th>
              <th className="p-2">Grade</th>
              <th className="p-2">Qty</th>
              <th className="p-2">Price/MT</th>
              <th className="p-2">Total</th>
              <th className="p-2">Payment Terms</th>
              <th className="p-2">Delivery</th>
              <th className="p-2">Status</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {item.quotations.map((quote) => (
              <tr key={quote.id} className={cn("border-t", quote.selected && "bg-sky-50/70")}>
                <td className="p-2 font-medium">{quote.supplier}</td>
                <td className="p-2">{quote.grade}</td>
                <td className="p-2">
                  {quote.quantity} {quote.unit}
                </td>
                <td className="p-2">{formatInrExact(quote.pricePerMt)}</td>
                <td className="p-2">{formatInrExact(quote.total)}</td>
                <td className="p-2">{quote.paymentTerms}</td>
                <td className="p-2">{quote.deliveryDays} Days</td>
                <td className="p-2">
                  <StatusBadge value={quote.status} />
                </td>
                <td className="p-2">
                  <Button
                    size="sm"
                    variant={quote.selected ? "default" : "outline"}
                    onClick={() => {
                      selectPreferredSupplier(item.id, quote.id);
                      toast.success(`${quote.supplier} marked preferred`);
                    }}
                  >
                    {quote.selected ? "Preferred" : "Select"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function NegotiationPanel({ item }: { item: Procurement }) {
  const openModal = useProcurementStore((s) => s.openModal);
  const acceptNegotiation = useProcurementStore((s) => s.acceptNegotiation);
  const rejectNegotiation = useProcurementStore((s) => s.rejectNegotiation);
  const negotiation = item.negotiation;
  if (!negotiation) return null;
  const savings = expectedSavings(negotiation);
  return (
    <section className="rounded-md border p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Price Negotiation</h3>
      <dl className="grid grid-cols-2 gap-x-3 text-sm">
        <DetailRow label="Initial Supplier Price" value={formatInrExact(negotiation.initialPrice)} />
        <DetailRow label="Latest Supplier Price" value={formatInrExact(negotiation.latestPrice)} />
        <DetailRow label="Admin Target Price" value={formatInrExact(negotiation.adminTargetPrice)} />
        <DetailRow label="Quantity" value={`${negotiation.quantity} ${item.unit}`} />
        <DetailRow label="Expected Savings" value={formatInrExact(savings)} />
        <DetailRow label="Negotiation Status" value={<StatusBadge value={negotiation.status} />} />
      </dl>
      {item.status === "Negotiation" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => openModal({ type: "counter", id: item.id })}>
            Counter Offer
          </Button>
          <Button
            size="sm"
            onClick={() => {
              acceptNegotiation(item.id);
              toast.success("Negotiated price accepted");
            }}
          >
            Accept Price
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              rejectNegotiation(item.id);
              toast.success("Negotiation rejected");
            }}
          >
            Reject
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function ApprovalPanel({ item }: { item: Procurement }) {
  const openModal = useProcurementStore((s) => s.openModal);
  const approval = item.approval;
  return (
    <section className="rounded-md border p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Approval</h3>
      <dl>
        <DetailRow label="Requested By" value={approval?.requestedBy ?? item.customerName} />
        <DetailRow label="Department" value={approval?.department ?? "Procurement"} />
        <DetailRow label="Estimated Cost" value={formatInrExact(item.estimatedCost)} />
        <DetailRow label="Budget" value={formatInrExact(approval?.budget ?? item.estimatedCost)} />
        <DetailRow label="Credit Exposure" value={formatInrExact(approval?.creditExposure ?? 0)} />
        <DetailRow label="Supplier" value={item.supplier} />
        <DetailRow label="Negotiated Price" value={formatInrExact(approval?.negotiatedPrice ?? item.estimatedCost)} />
      </dl>
      {APPROVABLE_STATUSES.includes(item.status) ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => openModal({ type: "approve", id: item.id })}>
            Approve
          </Button>
          <Button size="sm" variant="destructive" onClick={() => openModal({ type: "reject", id: item.id })}>
            Reject
          </Button>
          <Button size="sm" variant="outline" onClick={() => openModal({ type: "send-back", id: item.id })}>
            Send Back
          </Button>
        </div>
      ) : null}
      {item.status === "Approved" ? (
        <Button size="sm" className="mt-3" onClick={() => openModal({ type: "create-po", id: item.id })}>
          Create PO
        </Button>
      ) : null}
    </section>
  );
}

function SellerConfirmationPanel({ item }: { item: Procurement }) {
  const confirmSeller = useProcurementStore((s) => s.confirmSeller);
  return (
    <section className="rounded-md border border-amber-200 bg-amber-50/60 p-3">
      <h3 className="text-sm font-semibold">Awaiting Seller Confirmation</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Frontend simulation only. This does not send a message to the Seller app.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => {
            confirmSeller(item.id, "accepted");
            toast.success("Seller accepted (simulated)");
          }}
        >
          Seller Accepted
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            confirmSeller(item.id, "rejected");
            toast.success("Seller rejected (simulated)");
          }}
        >
          Seller Rejected
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            confirmSeller(item.id, "revision");
            toast.success("Revision requested (simulated)");
          }}
        >
          Seller Requested Revision
        </Button>
      </div>
    </section>
  );
}

function DispatchHint({ item }: { item: Procurement }) {
  const openModal = useProcurementStore((s) => s.openModal);
  return (
    <section className="rounded-md border p-3">
      <h3 className="text-sm font-semibold">Dispatch Handoff</h3>
      <p className="mt-1 text-xs text-muted-foreground">Seller confirmation is complete. Create dispatch to move this into Logistics.</p>
      <Button size="sm" className="mt-3" onClick={() => openModal({ type: "dispatch", id: item.id })}>
        Create Dispatch
      </Button>
    </section>
  );
}

function ShipmentPanel({ item }: { item: Procurement }) {
  const router = useRouter();
  const shipment = item.shipment;
  if (!shipment) return null;
  return (
    <section className="rounded-md border p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Shipment Tracking</h3>
      <dl>
        <DetailRow label="Shipment ID" value={shipment.shipmentId} />
        <DetailRow label="Vehicle" value={shipment.vehicle} />
        <DetailRow label="Route" value={shipment.route} />
        <DetailRow label="Dispatch Date" value={formatDate(shipment.dispatchDate)} />
        <DetailRow label="ETA" value={formatDateTime(shipment.eta)} />
        <DetailRow label="Shipment Status" value={<StatusBadge value={shipment.status} />} />
      </dl>
      <Button
        size="sm"
        className="mt-3"
        variant="outline"
        onClick={() => router.push(`/logistics?id=${shipment.shipmentId}`)}
      >
        Track Shipment
      </Button>
    </section>
  );
}

function DrawerActions({ item }: { item: Procurement }) {
  const openModal = useProcurementStore((s) => s.openModal);
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-2">
      {APPROVABLE_STATUSES.includes(item.status) ? (
        <Button className="flex-1" onClick={() => openModal({ type: "approve", id: item.id })}>
          Approve
        </Button>
      ) : null}
      {item.status === "Approved" ? (
        <Button className="flex-1" onClick={() => openModal({ type: "create-po", id: item.id })}>
          Create PO
        </Button>
      ) : null}
      {item.shipment ? (
        <Button className="flex-1" variant="outline" onClick={() => router.push(`/logistics?id=${item.shipment?.shipmentId}`)}>
          Track Shipment
        </Button>
      ) : null}
    </div>
  );
}
