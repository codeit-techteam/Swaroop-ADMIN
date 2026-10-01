"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import {
  formatImportDate,
  formatPrice,
  formatQty,
  IMPORT_BASE,
  ImportBadge,
  ImportTradingTabs,
  importLabel,
  KeyValues,
  Section,
  useLoader,
} from "@/components/import-trading/shared";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { getImportNegotiation } from "@/lib/api/import-trading";
import { formatDateTime } from "@/lib/format";

export default function ImportNegotiationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: n, error, loading, reload } = useLoader(() => getImportNegotiation(id), [id]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={n?.referenceNumber ?? "Import negotiation"}
        description="Read-only audit view. Negotiation events cannot be edited."
        breadcrumbs={[
          { label: "Import Trading", href: IMPORT_BASE },
          { label: "Negotiations", href: `${IMPORT_BASE}/negotiations` },
          { label: n?.referenceNumber ?? "Detail" },
        ]}
      />
      <ImportTradingTabs />
      {loading ? (
        <TableSkeleton />
      ) : error || !n ? (
        <ErrorState title="Unable to load this negotiation." description={error ?? undefined} onRetry={reload} />
      ) : (
        <>
          <Section title="Summary">
            <KeyValues
              items={[
                { label: "Status", value: <ImportBadge value={n.status} /> },
                { label: "Buyer", value: n.buyerOrg.name },
                { label: "Seller", value: n.sellerOrg.name },
                {
                  label: "Buy listing",
                  value: n.buyListing ? (
                    <Link className="text-primary hover:underline" href={`${IMPORT_BASE}/listings/${n.buyListing.id}`}>
                      {n.buyListing.referenceNumber ?? n.buyListing.id.slice(0, 8)}
                    </Link>
                  ) : null,
                },
                {
                  label: "Sell listing",
                  value: n.sellListing ? (
                    <Link className="text-primary hover:underline" href={`${IMPORT_BASE}/listings/${n.sellListing.id}`}>
                      {n.sellListing.referenceNumber ?? n.sellListing.id.slice(0, 8)}
                    </Link>
                  ) : null,
                },
                { label: "Initiated by", value: importLabel(n.initiatedBy) },
                { label: "Rounds", value: n.roundCount },
                { label: "Expires", value: n.expiresAt ? formatDateTime(n.expiresAt) : null },
                { label: "Agreed", value: n.agreedAt ? formatDateTime(n.agreedAt) : null },
                { label: "Closed", value: n.closedAt ? formatDateTime(n.closedAt) : null },
                {
                  label: "Deal",
                  value: n.deal ? (
                    <Link className="text-primary hover:underline" href={`${IMPORT_BASE}/deals/${n.deal.id}`}>
                      {n.deal.referenceNumber}
                    </Link>
                  ) : null,
                },
              ]}
            />
          </Section>
          <Section title={`Timeline (${n.events.length} events)`}>
            <ol className="space-y-3">
              {n.events.map((e) => (
                <li key={e.sequence} className="relative border-l border-slate-200 pl-4">
                  <span className="absolute -left-1 top-1.5 size-2 rounded-full bg-primary" />
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">
                      #{e.sequence} {importLabel(e.type)}
                    </p>
                    <span className="text-xs text-muted-foreground">by {importLabel(e.actorParty)}</span>
                  </div>
                  {e.price ? (
                    <p className="mt-0.5 text-sm text-slate-700">
                      {formatPrice(e.price, e.currencyCode, e.priceUnit)} × {formatQty(e.quantity, e.quantityUnit)}
                      {e.incotermCode ? ` · ${e.incotermCode}` : ""}
                      {e.paymentTermName ? ` · ${e.paymentTermName}` : ""}
                      {e.esd || e.lsd ? ` · ships ${formatImportDate(e.esd)} – ${formatImportDate(e.lsd)}` : ""}
                    </p>
                  ) : null}
                  {e.note ? <p className="mt-0.5 text-xs italic text-slate-600">“{e.note}”</p> : null}
                  <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(e.createdAt)}</p>
                </li>
              ))}
            </ol>
          </Section>
        </>
      )}
    </div>
  );
}
