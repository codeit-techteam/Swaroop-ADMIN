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
  portLabel,
  ReasonDialog,
  Section,
  useLoader,
} from "@/components/import-trading/shared";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import {
  getImportListing,
  rematchImportListing,
  setImportListingStatus,
} from "@/lib/api/import-trading";
import { formatDateTime } from "@/lib/format";

type AdminAction = "PAUSED" | "PUBLISHED" | "CANCELLED" | "EXPIRED";

const ACTION_COPY: Record<AdminAction, { label: string; title: string; description: string; destructive?: boolean }> = {
  PAUSED: {
    label: "Pause",
    title: "Pause this listing?",
    description: "It disappears from the marketplace until resumed. Open negotiations are not closed.",
  },
  PUBLISHED: {
    label: "Resume",
    title: "Resume this listing?",
    description: "It becomes visible in the marketplace again and matching is recomputed.",
  },
  EXPIRED: {
    label: "Close (expire)",
    title: "Close this listing now?",
    description: "The listing expires immediately and every open negotiation on it is closed.",
    destructive: true,
  },
  CANCELLED: {
    label: "Cancel",
    title: "Cancel this listing?",
    description: "The listing is cancelled and every open negotiation on it is closed. This cannot be undone.",
    destructive: true,
  },
};

export default function ImportListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: l, error, loading, reload, setData } = useLoader(() => getImportListing(id), [id]);
  const [action, setAction] = useState<AdminAction | null>(null);
  const [rematching, setRematching] = useState(false);

  const allowed = (l?.allowedTransitions ?? []) as string[];
  const actions = (["PAUSED", "PUBLISHED", "EXPIRED", "CANCELLED"] as AdminAction[]).filter((a) =>
    a === "PUBLISHED" ? l?.status === "PAUSED" && allowed.includes(a) : allowed.includes(a),
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={l?.referenceNumber ?? (l ? "Draft listing" : "Import listing")}
        description={
          l
            ? `${l.side === "BUY" ? "Buy request" : "Sell offer"} · ${importLabel(l.source)} · created ${formatDateTime(l.createdAt)}`
            : undefined
        }
        breadcrumbs={[
          { label: "Import Trading", href: IMPORT_BASE },
          { label: "Listings", href: `${IMPORT_BASE}/listings` },
          { label: l?.referenceNumber ?? "Detail" },
        ]}
        actions={
          l ? (
            <>
              {l.status !== "DRAFT" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={rematching}
                  onClick={async () => {
                    setRematching(true);
                    try {
                      const res = await rematchImportListing(l.id);
                      toast.success(`Matching recomputed: ${res.matched} match${res.matched === 1 ? "" : "es"}, ${res.newMatches} new`);
                      reload();
                    } catch (err) {
                      toast.error(errorMessage(err));
                    } finally {
                      setRematching(false);
                    }
                  }}
                >
                  Recompute matches
                </Button>
              ) : null}
              {actions.map((a) => (
                <Button
                  key={a}
                  size="sm"
                  variant={ACTION_COPY[a].destructive ? "destructive" : "outline"}
                  onClick={() => setAction(a)}
                >
                  {ACTION_COPY[a].label}
                </Button>
              ))}
            </>
          ) : null
        }
      />
      <ImportTradingTabs />
      {loading && !l ? (
        <TableSkeleton />
      ) : error || !l ? (
        <ErrorState title="Unable to load this listing." description={error ?? undefined} onRetry={reload} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <ImportBadge value={l.side} />
            <ImportBadge value={l.status} />
            <span className="text-xs text-muted-foreground">
              Version {l.version} · Valid until {l.validity.validUntil ? formatDateTime(l.validity.validUntil) : "—"}
              {l.validity.isExpired ? " (past)" : ""}
            </span>
          </div>
          {l.cancelReason ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Cancellation reason: {l.cancelReason}
            </p>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-3">
            <Section title="Owner (Admin only)">
              <KeyValues
                items={[
                  { label: "Company", value: l.ownerOrg?.legalName ?? l.ownerOrg?.name },
                  { label: "Org type", value: importLabel(l.ownerOrg?.type) },
                  { label: "Company email", value: l.ownerOrg?.email },
                  {
                    label: "Created by",
                    value: l.createdBy
                      ? [l.createdBy.firstName, l.createdBy.lastName].filter(Boolean).join(" ") || l.createdBy.email
                      : null,
                  },
                  { label: "User email", value: l.createdBy?.email },
                  { label: "User phone", value: l.createdBy?.phone },
                  { label: "Marketplace alias", value: l.counterpartyRef },
                ]}
              />
            </Section>
            <Section title="Product" className="xl:col-span-2">
              <KeyValues
                items={[
                  { label: "Product", value: l.product.category?.name },
                  { label: "Grade", value: l.product.grade?.name ?? l.product.customGradeName },
                  { label: "Brand", value: l.product.brand?.name },
                  { label: "Origin", value: l.product.originCountry?.name },
                  { label: "Quantity", value: formatQty(l.product.quantity, l.product.quantityUnit) },
                  { label: "Packaging", value: l.product.packaging?.name },
                  { label: "Application", value: l.product.application },
                  { label: "HS code", value: l.product.hsCode },
                  { label: "CAS number", value: l.product.casNumber },
                ]}
              />
            </Section>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Section title="Commercial">
              <KeyValues
                items={[
                  { label: "Price", value: formatPrice(l.commercial.price, l.commercial.currencyCode, l.commercial.priceUnit) },
                  { label: "Price type", value: importLabel(l.commercial.priceType) },
                  { label: "Incoterm", value: l.commercial.incoterm?.code },
                  {
                    label: "Price basis",
                    value: l.commercial.priceBasisPort ? portLabel(l.commercial.priceBasisPort) : l.commercial.priceBasisLocation,
                  },
                  { label: "Payment terms", value: l.commercial.paymentTerm?.displayName ?? l.commercial.paymentTerm?.name },
                  { label: "GST", value: l.commercial.gstTreatment ? importLabel(l.commercial.gstTreatment) : null },
                  ...(l.buyTerms
                    ? [
                        {
                          label: "Acceptable quantity",
                          value:
                            l.buyTerms.acceptableQuantityMin || l.buyTerms.acceptableQuantityMax
                              ? `${formatQty(l.buyTerms.acceptableQuantityMin, l.product.quantityUnit)} – ${formatQty(l.buyTerms.acceptableQuantityMax, l.product.quantityUnit)}`
                              : null,
                        },
                        { label: "Required delivery", value: formatImportDate(l.buyTerms.requiredDeliveryDate) },
                      ]
                    : []),
                  ...(l.sellTerms
                    ? [
                        { label: "MOQ", value: formatQty(l.sellTerms.moq, l.product.quantityUnit) },
                        { label: "Max per buyer", value: formatQty(l.sellTerms.maximumQuantity, l.product.quantityUnit) },
                        { label: "Stock", value: importLabel(l.sellTerms.readyStockType) },
                      ]
                    : []),
                ]}
              />
            </Section>
            <Section title="Shipping & quality">
              <KeyValues
                items={[
                  { label: "Port of loading", value: portLabel(l.shipping.pol) },
                  { label: "Port of discharge", value: portLabel(l.shipping.pod) },
                  {
                    label: "Shipment window",
                    value: `${formatImportDate(l.shipping.esd)} – ${formatImportDate(l.shipping.lsd)}`,
                  },
                  {
                    label: "Estimated arrival",
                    value: l.shipping.estimatedEta
                      ? `${formatImportDate(l.shipping.estimatedEta.from)} – ${formatImportDate(l.shipping.estimatedEta.to)} (estimate)`
                      : null,
                  },
                  { label: "Partial shipment", value: importLabel(l.shipping.partialShipment) },
                  { label: "Transshipment", value: importLabel(l.shipping.transshipment) },
                  { label: "Shipment type", value: importLabel(l.shipping.shipmentType) },
                  { label: "Inspection", value: importLabel(l.quality.inspectionType) },
                  {
                    label: "Documents required",
                    value: l.quality.documentRequirements.map((d) => d.name).join(", ") || null,
                  },
                ]}
              />
            </Section>
          </div>

          <Section title={`Matches (${l.matches.length})`}>
            {l.matches.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="py-1 pr-3 font-medium">Counter listing</th>
                      <th className="py-1 pr-3 font-medium">Score</th>
                      <th className="py-1 pr-3 font-medium">Matched</th>
                      <th className="py-1 pr-3 font-medium">Not matched</th>
                      <th className="py-1 pr-3 font-medium">Status</th>
                      <th className="py-1 font-medium">Computed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {l.matches.map((m) => {
                      const other = l.side === "BUY" ? m.sellListing : m.buyListing;
                      return (
                        <tr key={m.id} className="border-t border-slate-100 align-top">
                          <td className="py-2 pr-3">
                            <Link className="text-primary hover:underline" href={`${IMPORT_BASE}/listings/${other.id}`}>
                              {other.referenceNumber ?? other.id.slice(0, 8)}
                            </Link>
                          </td>
                          <td className="py-2 pr-3 font-semibold">{m.matchScore}</td>
                          <td className="py-2 pr-3 text-xs text-emerald-700">
                            {m.matchedCriteria.map(importLabel).join(", ") || "—"}
                          </td>
                          <td className="py-2 pr-3 text-xs text-slate-500">
                            {m.unmatchedCriteria.map(importLabel).join(", ") || "—"}
                          </td>
                          <td className="py-2 pr-3">
                            <ImportBadge value={m.status} />
                          </td>
                          <td className="py-2 text-xs text-muted-foreground">
                            {formatDateTime(m.computedAt)} · {m.algorithmVersion}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No matches above the configured minimum score.</p>
            )}
          </Section>

          <Section title={`Negotiations (${l.negotiations.length})`}>
            {l.negotiations.length ? (
              <div className="space-y-4">
                {l.negotiations.map((n) => (
                  <div key={n.id} className="rounded-md border border-slate-100 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link className="font-medium text-primary hover:underline" href={`${IMPORT_BASE}/negotiations/${n.id}`}>
                        {n.referenceNumber}
                      </Link>
                      <ImportBadge value={n.status} />
                      <span className="text-xs text-muted-foreground">
                        {n.buyerOrg.name} (buyer) ↔ {n.sellerOrg.name} (seller) · {n.roundCount} round
                        {n.roundCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <ol className="mt-2 space-y-1 text-xs text-slate-600">
                      {n.events.map((e) => (
                        <li key={e.sequence}>
                          <span className="font-medium text-slate-800">
                            #{e.sequence} {importLabel(e.type)}
                          </span>{" "}
                          by {importLabel(e.actorParty)} ·{" "}
                          {e.price ? `${formatPrice(e.price, e.currencyCode, e.priceUnit)} × ${formatQty(e.quantity, e.quantityUnit)} · ` : ""}
                          {formatDateTime(e.createdAt)}
                          {e.note ? ` — “${e.note}”` : ""}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No negotiations yet.</p>
            )}
          </Section>

          <div className="grid gap-4 xl:grid-cols-2">
            <Section title={`Deals (${l.deals.length})`}>
              {l.deals.length ? (
                <ul className="space-y-2 text-sm">
                  {l.deals.map((d) => (
                    <li key={d.id} className="flex flex-wrap items-center justify-between gap-2">
                      <Link className="text-primary hover:underline" href={`${IMPORT_BASE}/deals/${d.id}`}>
                        {d.referenceNumber}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {formatPrice(d.price, d.currencyCode, d.priceUnit)} × {formatQty(d.quantity, d.quantityUnit)}
                      </span>
                      <ImportBadge value={d.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No deals.</p>
              )}
            </Section>
            <Section title={`Documents (${l.documents.length})`}>
              {l.documents.length ? (
                <ul className="space-y-2 text-sm">
                  {l.documents.map((d) => (
                    <li key={d.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span className="truncate">{d.fileName}</span>
                      <span className="text-xs text-muted-foreground">
                        {importLabel(d.category)} · {formatImportDate(d.createdAt)}
                      </span>
                      <ImportBadge value={d.status} />
                      <DocumentActions documentId={d.id} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No documents uploaded.</p>
              )}
            </Section>
          </div>

          <Section title={`Audit trail (${l.auditTrail.length})`}>
            <AuditTimeline entries={l.auditTrail} />
          </Section>
        </>
      )}

      {action && l ? (
        <ReasonDialog
          open
          onOpenChange={(open) => !open && setAction(null)}
          title={ACTION_COPY[action].title}
          description={ACTION_COPY[action].description}
          confirmLabel={ACTION_COPY[action].label}
          destructive={ACTION_COPY[action].destructive}
          onConfirm={async (reason) => {
            try {
              const next = await setImportListingStatus(l.id, action, reason || undefined);
              setData(next);
              toast.success(`${l.referenceNumber ?? "Listing"} is now ${importLabel(action).toLowerCase()}`);
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
