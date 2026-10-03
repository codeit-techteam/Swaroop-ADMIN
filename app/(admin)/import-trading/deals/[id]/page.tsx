"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  AuditTimeline,
  DocumentActions,
  errorMessage,
  formatImportDate,
  formatPrice,
  formatQty,
  IMPORT_BASE,
  ImportBadge,
  ImportTradingTabs,
  importLabel,
  KeyValues,
  ReasonDialog,
  Section,
  shipmentEta,
  useLoader,
} from "@/components/import-trading/shared";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { type AdminDealDetail, getImportDeal, setImportDealStatus } from "@/lib/api/import-trading";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ImportDealStatus } from "@/types/import-trading";

type DealAction = "PARTIALLY_FULFILLED" | "FULFILLED" | "CANCELLED";

const NEXT: Record<ImportDealStatus, DealAction[]> = {
  PENDING_CONFIRMATION: ["CANCELLED"],
  CONFIRMED: ["PARTIALLY_FULFILLED", "FULFILLED", "CANCELLED"],
  PARTIALLY_FULFILLED: ["FULFILLED", "CANCELLED"],
  FULFILLED: [],
  CANCELLED: [],
};

const COPY: Record<DealAction, { label: string; description: string; destructive?: boolean }> = {
  PARTIALLY_FULFILLED: {
    label: "Mark partially fulfilled",
    description: "Both listings move to partially fulfilled. Both parties are notified.",
  },
  FULFILLED: {
    label: "Mark fulfilled",
    description: "The deal and both listings are marked fulfilled. Both parties are notified.",
  },
  CANCELLED: {
    label: "Cancel deal",
    description: "The deal is cancelled and both parties are notified. A pending deal re-opens its listings for negotiation.",
    destructive: true,
  },
};

function statusChangedAt(deal: AdminDealDetail, status: string) {
  const entry = [...deal.auditTrail]
    .reverse()
    .find(
      (a) =>
        a.entityId === deal.id &&
        (a.action === "IMPORT_DEAL_STATUS_CHANGED_BY_ADMIN" || a.action === "IMPORT_DEAL_FULFILMENT_CHANGED") &&
        (a.newData as { status?: string } | null)?.status === status,
    );
  return entry?.createdAt ?? null;
}

function DealLifecycle({ deal }: { deal: AdminDealDetail }) {
  const fulfilledStatus = deal.status === "PARTIALLY_FULFILLED" ? "PARTIALLY_FULFILLED" : "FULFILLED";
  const steps: Array<{ label: string; at: string | null | undefined }> = [
    { label: "Negotiation opened", at: deal.negotiationSummary.createdAt },
    { label: "Terms agreed", at: deal.negotiationSummary.agreedAt ?? deal.createdAt },
    { label: "Buyer confirmed", at: deal.buyerConfirmedAt },
    { label: "Seller confirmed", at: deal.sellerConfirmedAt },
    { label: "Deal confirmed", at: deal.confirmedAt },
    { label: importLabel(fulfilledStatus), at: statusChangedAt(deal, fulfilledStatus) },
  ];
  return (
    <div className="space-y-3">
      <ol className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {steps.map((s) => (
          <li
            key={s.label}
            className={cn(
              "rounded-md border px-3 py-2 text-xs",
              s.at ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 text-muted-foreground",
            )}
          >
            <p className="font-medium">{s.label}</p>
            <p>{s.at ? formatDateTime(s.at) : "Pending"}</p>
          </li>
        ))}
      </ol>
      {deal.cancelledAt ? (
        <p className="text-sm text-red-700">Cancelled {formatDateTime(deal.cancelledAt)}</p>
      ) : null}
    </div>
  );
}

/** Deal quantities have at most 3 decimals; summed in thousandths to avoid float drift. */
const MILLI = BigInt(1000);
const ZERO = BigInt(0);

const toMilli = (value: string) => {
  const [int = "0", frac = ""] = value.split(".");
  return BigInt(int || "0") * MILLI + BigInt((frac + "000").slice(0, 3));
};

const fromMilli = (value: bigint) => `${value / MILLI}.${String(value % MILLI).padStart(3, "0")}`;

function DealShipments({ deal }: { deal: AdminDealDetail }) {
  const active = deal.shipments.filter((s) => s.status !== "CANCELLED");
  const sum = (rows: AdminDealDetail["shipments"]) => rows.reduce((total, s) => total + toMilli(s.quantity), ZERO);
  const booked = sum(active);
  const delivered = sum(active.filter((s) => s.status === "DELIVERED"));
  const remaining = toMilli(deal.quantity) - booked;

  return (
    <div className="space-y-3">
      <dl className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Deal quantity", value: deal.quantity },
          { label: "On shipments", value: fromMilli(booked) },
          { label: "Delivered", value: fromMilli(delivered) },
          { label: "Remaining to ship", value: fromMilli(remaining > ZERO ? remaining : ZERO) },
        ].map((item) => (
          <div key={item.label} className="rounded-md border border-slate-200 px-3 py-2">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{item.label}</dt>
            <dd className="mt-0.5 text-sm font-medium text-slate-900">{formatQty(item.value, deal.quantityUnit)}</dd>
          </div>
        ))}
      </dl>
      {deal.shipments.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="py-1 pr-3 font-medium">Shipment</th>
                <th className="py-1 pr-3 font-medium">Status</th>
                <th className="py-1 pr-3 font-medium">Quantity</th>
                <th className="py-1 pr-3 font-medium">Carrier / tracking</th>
                <th className="py-1 pr-3 font-medium">ETA</th>
                <th className="py-1 font-medium">Last event</th>
              </tr>
            </thead>
            <tbody>
              {deal.shipments.map((s) => {
                const last = s.events[s.events.length - 1];
                return (
                  <tr key={s.id} className="border-t border-slate-100 align-top">
                    <td className="py-1.5 pr-3">
                      <Link className="text-primary hover:underline" href={`${IMPORT_BASE}/shipments/${s.id}`}>
                        {s.referenceNumber}
                      </Link>
                    </td>
                    <td className="py-1.5 pr-3">
                      <ImportBadge value={s.status} kind="shipment" />
                    </td>
                    <td className="py-1.5 pr-3">{formatQty(s.quantity, s.quantityUnit)}</td>
                    <td className="py-1.5 pr-3">
                      {[s.carrierName, s.trackingNumber].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className={cn("py-1.5 pr-3", !s.eta && "text-muted-foreground")}>{shipmentEta(s.eta)}</td>
                    <td className="py-1.5 text-xs text-muted-foreground">
                      {last
                        ? `${last.previousStatus ? importLabel(last.status) : "Tracking note"}${
                            last.location ? ` · ${last.location}` : ""
                          } · ${formatDateTime(last.occurredAt)}`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {deal.status === "CONFIRMED" || deal.status === "PARTIALLY_FULFILLED"
            ? "No shipments booked yet. The seller books shipments once the deal is confirmed."
            : "No shipments. Shipments can only be booked on confirmed deals."}
        </p>
      )}
    </div>
  );
}

export default function ImportDealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: d, error, loading, reload, setData } = useLoader(() => getImportDeal(id), [id]);
  const [action, setAction] = useState<DealAction | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={d?.referenceNumber ?? "Import deal"}
        breadcrumbs={[
          { label: "Import Trading", href: IMPORT_BASE },
          { label: "Deals", href: `${IMPORT_BASE}/deals` },
          { label: d?.referenceNumber ?? "Detail" },
        ]}
        actions={
          d
            ? NEXT[d.status].map((a) => (
                <Button
                  key={a}
                  size="sm"
                  variant={COPY[a].destructive ? "destructive" : "outline"}
                  onClick={() => setAction(a)}
                >
                  {COPY[a].label}
                </Button>
              ))
            : null
        }
      />
      <ImportTradingTabs />
      {loading && !d ? (
        <TableSkeleton />
      ) : error || !d ? (
        <ErrorState title="Unable to load this deal." description={error ?? undefined} onRetry={reload} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          <Section title="Agreed terms" className="xl:col-span-2">
            <KeyValues
              items={[
                { label: "Status", value: <ImportBadge value={d.status} /> },
                { label: "Price", value: formatPrice(d.price, d.currencyCode, d.priceUnit) },
                { label: "Quantity", value: formatQty(d.quantity, d.quantityUnit) },
                { label: "Incoterm", value: d.incotermCode },
                { label: "Price basis", value: d.priceBasisLocation },
                { label: "Payment terms", value: d.paymentTermName },
                { label: "Shipment window", value: `${formatImportDate(d.esd)} – ${formatImportDate(d.lsd)}` },
                {
                  label: "Negotiation",
                  value: (
                    <Link className="text-primary hover:underline" href={`${IMPORT_BASE}/negotiations/${d.negotiation.id}`}>
                      {d.negotiation.referenceNumber}
                    </Link>
                  ),
                },
                {
                  label: "Listings",
                  value: (
                    <span className="flex flex-wrap gap-2">
                      {[d.buyListing, d.sellListing].map((l) =>
                        l ? (
                          <Link key={l.id} className="text-primary hover:underline" href={`${IMPORT_BASE}/listings/${l.id}`}>
                            {l.referenceNumber ?? l.id.slice(0, 8)}
                          </Link>
                        ) : null,
                      )}
                    </span>
                  ),
                },
              ]}
            />
          </Section>
          <Section title="Parties">
            <KeyValues
              items={[
                { label: "Buyer", value: d.buyer?.name ?? d.buyerRef },
                { label: "Buyer confirmed", value: d.buyerConfirmedAt ? formatDateTime(d.buyerConfirmedAt) : "Pending" },
                { label: "Seller", value: d.seller?.name ?? d.sellerRef },
                { label: "Seller confirmed", value: d.sellerConfirmedAt ? formatDateTime(d.sellerConfirmedAt) : "Pending" },
                { label: "Confirmed", value: d.confirmedAt ? formatDateTime(d.confirmedAt) : null },
                { label: "Cancelled", value: d.cancelledAt ? formatDateTime(d.cancelledAt) : null },
              ]}
            />
            <p className="mt-3 text-[11px] text-muted-foreground">
              Participants see each other&apos;s names only after both confirm ({importLabel("CONFIRMED").toLowerCase()}).
            </p>
          </Section>

          <Section title="Lifecycle" className="xl:col-span-3">
            <DealLifecycle deal={d} />
          </Section>

          <Section
            title={`Negotiation history (${d.timeline.length} events · ${d.negotiationSummary.roundCount} rounds)`}
            className="xl:col-span-2"
          >
            {d.timeline.length ? (
              <ol className="space-y-3">
                {d.timeline.map((e) => (
                  <li key={e.sequence} className="relative border-l border-slate-200 pl-4 text-sm">
                    <span className="absolute -left-1 top-1.5 size-2 rounded-full bg-primary" />
                    <p className="font-medium">
                      {importLabel(e.type)} · {importLabel(e.actorParty)}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(e.createdAt)}</p>
                    {e.price || e.quantity || e.incotermCode || e.paymentTermName || e.esd ? (
                      <p className="mt-1 text-xs text-slate-700">
                        {[
                          e.price ? formatPrice(e.price, e.currencyCode, e.priceUnit) : null,
                          e.quantity ? formatQty(e.quantity, e.quantityUnit) : null,
                          e.incotermCode,
                          e.paymentTermName,
                          e.esd || e.lsd ? `${formatImportDate(e.esd)} – ${formatImportDate(e.lsd)}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                    {e.note ? <p className="mt-1 text-xs italic text-muted-foreground">“{e.note}”</p> : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">No negotiation events recorded.</p>
            )}
          </Section>

          <Section title={`Documents (${d.documents.length})`}>
            {d.documents.length ? (
              <ul className="space-y-3 text-sm">
                {d.documents.map((doc) => (
                  <li key={doc.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{doc.fileName}</span>
                      <ImportBadge value={doc.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {importLabel(doc.category)} · {doc.listing ? importLabel(doc.listing.side === "BUY" ? "BUYER" : "SELLER") : "—"} ·{" "}
                      {formatImportDate(doc.createdAt)}
                    </p>
                    <DocumentActions documentId={doc.id} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Neither listing has documents.</p>
            )}
          </Section>

          <Section title={`Audit trail (${d.auditTrail.length})`} className="xl:col-span-3">
            <AuditTimeline entries={d.auditTrail} />
          </Section>

          <Section title={`Shipments (${d.shipments.length})`} className="xl:col-span-3">
            <DealShipments deal={d} />
            <p className="mt-3 text-[11px] text-muted-foreground">
              Shipments are booked and updated by the seller (or Admin). Delivered shipments move the deal to
              partially fulfilled or fulfilled automatically. Payment records are not tracked for Import deals.
            </p>
          </Section>
        </div>
      )}

      {action && d ? (
        <ReasonDialog
          open
          onOpenChange={(open) => !open && setAction(null)}
          title={`${COPY[action].label}?`}
          description={COPY[action].description}
          confirmLabel={COPY[action].label}
          destructive={COPY[action].destructive}
          onConfirm={async (reason) => {
            try {
              setData(await setImportDealStatus(d.id, action, reason || undefined));
              toast.success(`${d.referenceNumber} updated`);
            } catch (err) {
              toast.error(errorMessage(err));
              throw err;
            }
          }}
        />
      ) : null}
    </div>
  );
}
