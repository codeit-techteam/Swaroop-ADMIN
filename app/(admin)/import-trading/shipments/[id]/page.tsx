"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { AddTrackingUpdateDialog, EditShipmentDialog } from "@/components/import-trading/shipment-dialogs";
import {
  AuditTimeline,
  formatQty,
  IMPORT_BASE,
  ImportBadge,
  ImportTradingTabs,
  importLabel,
  KeyValues,
  Section,
  SHIPMENT_TERMINAL,
  shipmentEta,
  shipmentRoute,
  useImportWriteAccess,
  useLoader,
} from "@/components/import-trading/shared";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { getShipment } from "@/lib/api/import-trading";
import { formatDateTime } from "@/lib/format";
import type { AdminImportShipmentDetail } from "@/types/import-trading";

function at(value: string | null) {
  return value ? formatDateTime(value) : null;
}

/** Shipment rows only carry user ids; names come from the matching audit entries. */
function actorName(s: AdminImportShipmentDetail, userId: string | null | undefined, action?: string) {
  if (!userId) return null;
  const entry = [...s.auditTrail]
    .reverse()
    .find((a) => a.actor?.id === userId && (!action || a.action === action));
  return entry?.actor?.name ?? `User ${userId.slice(0, 8)}`;
}

function ShipmentEvents({ shipment }: { shipment: AdminImportShipmentDetail }) {
  if (!shipment.events.length) return <p className="text-sm text-muted-foreground">No tracking updates yet.</p>;
  return (
    <ol className="space-y-3">
      {shipment.events.map((e) => (
        <li key={e.id} className="relative border-l border-slate-200 pl-4 text-sm">
          <span
            className={
              e.status === "EXCEPTION" && e.previousStatus
                ? "absolute -left-1 top-1.5 size-2 rounded-full bg-red-600"
                : "absolute -left-1 top-1.5 size-2 rounded-full bg-primary"
            }
          />
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {e.previousStatus ? (
              <>
                <ImportBadge value={e.status} kind="shipment" />
                <span className="text-xs font-normal text-muted-foreground">from {importLabel(e.previousStatus)}</span>
              </>
            ) : (
              "Tracking note"
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(e.occurredAt)} · {importLabel(e.actorParty)}
            {e.location ? ` · ${e.location}` : ""}
            {e.source && e.source !== "MANUAL" ? ` · ${importLabel(e.source)}` : ""}
          </p>
          {e.description ? <p className="mt-1 text-xs text-slate-700">{e.description}</p> : null}
        </li>
      ))}
    </ol>
  );
}

export default function ImportShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: s, error, loading, reload, setData } = useLoader(() => getShipment(id), [id]);
  const canWrite = useImportWriteAccess();
  const [dialog, setDialog] = useState<"event" | "edit" | null>(null);

  const terminal = s ? SHIPMENT_TERMINAL.includes(s.status) : true;
  const writable = Boolean(s && canWrite && s.canManage && !terminal);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={s?.referenceNumber ?? "Import shipment"}
        description={s ? `${s.deal.product ?? "Import deal"} · ${formatQty(s.quantity, s.quantityUnit)}` : undefined}
        breadcrumbs={[
          { label: "Import Trading", href: IMPORT_BASE },
          { label: "Shipments", href: `${IMPORT_BASE}/shipments` },
          { label: s?.referenceNumber ?? "Detail" },
        ]}
        actions={
          s ? (
            <>
              <ImportBadge value={s.status} kind="shipment" className="text-xs" />
              {writable ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setDialog("edit")}>
                    Edit details
                  </Button>
                  <Button size="sm" onClick={() => setDialog("event")}>
                    Add tracking update
                  </Button>
                </>
              ) : null}
            </>
          ) : null
        }
      />
      <ImportTradingTabs />
      {loading && !s ? (
        <TableSkeleton />
      ) : error || !s ? (
        <ErrorState title="Unable to load this shipment." description={error ?? undefined} onRetry={reload} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          {s.status === "EXCEPTION" ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 xl:col-span-3">
              <p className="font-medium">Shipment exception</p>
              <p className="mt-0.5">{s.exceptionReason ?? "No reason recorded."}</p>
            </div>
          ) : null}
          {terminal ? (
            <p className="text-xs text-muted-foreground xl:col-span-3">
              {importLabel(s.status)} shipments are closed and can no longer be edited or updated.
            </p>
          ) : null}

          <Section title="Shipment" className="xl:col-span-2">
            <KeyValues
              items={[
                { label: "Status", value: <ImportBadge value={s.status} kind="shipment" /> },
                { label: "Mode", value: importLabel(s.mode) },
                {
                  label: "Quantity",
                  value: `${formatQty(s.quantity, s.quantityUnit)} of ${formatQty(s.deal.quantity, s.deal.quantityUnit)}`,
                },
                { label: "Carrier", value: s.carrierName },
                { label: "Tracking no.", value: s.trackingNumber },
                {
                  label: "Vessel / voyage",
                  value: s.vesselName || s.voyageNumber ? [s.vesselName, s.voyageNumber].filter(Boolean).join(" / ") : null,
                },
                {
                  label: `Containers (${s.containerNumbers.length})`,
                  value: s.containerNumbers.length ? s.containerNumbers.join(", ") : null,
                },
                { label: "Route", value: shipmentRoute(s) },
                {
                  label: s.status === "EXCEPTION" ? "Exception reason" : "Last exception",
                  value: s.exceptionReason,
                },
              ]}
            />
            {s.remarks ? (
              <div className="mt-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Remarks</p>
                <p className="mt-0.5 whitespace-pre-line text-sm text-slate-900">{s.remarks}</p>
              </div>
            ) : null}
          </Section>

          <Section title="Deal & parties">
            <KeyValues
              items={[
                {
                  label: "Deal",
                  value: (
                    <span className="flex flex-wrap items-center gap-2">
                      <Link className="text-primary hover:underline" href={`${IMPORT_BASE}/deals/${s.deal.id}`}>
                        {s.deal.referenceNumber}
                      </Link>
                      <ImportBadge value={s.deal.status} />
                    </span>
                  ),
                },
                { label: "Product", value: s.deal.product },
                { label: "Deal quantity", value: formatQty(s.deal.quantity, s.deal.quantityUnit) },
                { label: "Buyer", value: s.buyer ? `${s.buyer.name} (${s.buyerRef})` : s.buyerRef },
                { label: "Seller", value: s.seller ? `${s.seller.name} (${s.sellerRef})` : s.sellerRef },
              ]}
            />
          </Section>

          <Section title="Schedule & milestones" className="xl:col-span-3">
            <KeyValues
              items={[
                { label: "ETD", value: at(s.etd) },
                {
                  label: "ETA",
                  value: s.eta ? shipmentEta(s.eta) : <span className="text-muted-foreground">{shipmentEta(null)}</span>,
                },
                { label: "Departed", value: at(s.departedAt) },
                { label: "Arrived", value: at(s.arrivedAt) },
                { label: "Delivered", value: at(s.deliveredAt) },
                { label: "Cancelled", value: at(s.cancelledAt) },
                {
                  label: "Created",
                  value: `${formatDateTime(s.createdAt)}${
                    s.createdById ? ` · ${actorName(s, s.createdById, "IMPORT_SHIPMENT_CREATED")}` : ""
                  }`,
                },
                {
                  label: "Last updated",
                  value: `${formatDateTime(s.updatedAt)}${s.updatedById ? ` · ${actorName(s, s.updatedById)}` : ""}`,
                },
              ]}
            />
          </Section>

          <Section title={`Tracking timeline (${s.events.length})`} className="xl:col-span-2">
            <ShipmentEvents shipment={s} />
          </Section>

          <Section title={`Audit trail (${s.auditTrail.length})`}>
            <AuditTimeline entries={s.auditTrail} />
          </Section>
        </div>
      )}

      {dialog === "event" && s ? (
        <AddTrackingUpdateDialog
          shipment={s}
          onClose={() => setDialog(null)}
          onSaved={setData}
          onConflict={reload}
        />
      ) : null}
      {dialog === "edit" && s ? (
        <EditShipmentDialog shipment={s} onClose={() => setDialog(null)} onSaved={setData} onConflict={reload} />
      ) : null}
    </div>
  );
}
