"use client";

import { useRouter } from "next/navigation";

import {
  formatDecimal,
  formatImportDate,
  formatPrice,
  formatQty,
  IMPORT_BASE,
  ImportBadge,
  ImportTradingTabs,
  importLabel,
  Section,
  useLoader,
} from "@/components/import-trading/shared";
import { DataTable } from "@/components/shared/data-table";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, KpiSkeleton } from "@/components/shared/states";
import { getImportDashboard } from "@/lib/api/import-trading";

const STATUS_ORDER = [
  "DRAFT",
  "PUBLISHED",
  "MATCHING",
  "OFFER_RECEIVED",
  "NEGOTIATION",
  "MATCHED",
  "DEAL_CONFIRMED",
  "PARTIALLY_FULFILLED",
  "FULFILLED",
  "PAUSED",
  "EXPIRED",
  "CANCELLED",
];

export default function ImportTradingDashboardPage() {
  const router = useRouter();
  const { data, error, loading, reload } = useLoader(getImportDashboard, []);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Import Trading"
        description="Cross-border BUY requests and SELL offers, negotiations and deals. Figures come straight from the platform database."
      />
      <ImportTradingTabs />
      {loading ? (
        <KpiSkeleton count={8} />
      ) : error || !data ? (
        <ErrorState title="Unable to load the Import dashboard." description={error ?? undefined} onRetry={reload} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Active buy requests"
              value={String(data.activeBuyRequests)}
              href={`${IMPORT_BASE}/listings?side=BUY`}
            />
            <KpiCard
              label="Active sell offers"
              value={String(data.activeSellOffers)}
              href={`${IMPORT_BASE}/listings?side=SELL`}
            />
            <KpiCard
              label="Open negotiations"
              value={String(data.openNegotiations)}
              href={`${IMPORT_BASE}/negotiations?status=OPEN`}
            />
            <KpiCard
              label="Deals awaiting confirmation"
              value={String(data.dealsPendingConfirmation)}
              tone={data.dealsPendingConfirmation ? "warning" : "default"}
              href={`${IMPORT_BASE}/deals?status=PENDING_CONFIRMATION`}
            />
            <KpiCard
              label="Matched listings"
              value={String(data.matchedListings)}
              href={`${IMPORT_BASE}/listings?status=MATCHED`}
            />
            <KpiCard
              label="Confirmed deals"
              value={String(data.dealsConfirmed)}
              tone="success"
              hint={`${data.dealsByStatus.FULFILLED ?? 0} fulfilled · ${data.dealsByStatus.PARTIALLY_FULFILLED ?? 0} partial`}
              href={`${IMPORT_BASE}/deals?status=CONFIRMED`}
            />
            <KpiCard
              label="Confirmed volume"
              value={`${formatDecimal(data.confirmedVolumeMt, 3)} MT`}
              hint="Deals quoted in MT or KG only"
            />
            <KpiCard
              label="Expired listings"
              value={String(data.expiredListings)}
              href={`${IMPORT_BASE}/listings?status=EXPIRED`}
            />
            <KpiCard
              label="Cancelled listings"
              value={String(
                (data.listingsBySideAndStatus.BUY.CANCELLED ?? 0) + (data.listingsBySideAndStatus.SELL.CANCELLED ?? 0),
              )}
              href={`${IMPORT_BASE}/listings?status=CANCELLED`}
            />
            <KpiCard
              label="Cancelled deals"
              value={String(data.dealsByStatus.CANCELLED ?? 0)}
              href={`${IMPORT_BASE}/deals?status=CANCELLED`}
            />
            <KpiCard
              label="Agreed negotiations"
              value={String(data.agreedNegotiations)}
              href={`${IMPORT_BASE}/negotiations?status=AGREED`}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Section title="Confirmed deal value by currency">
              {data.confirmedValueByCurrency.length ? (
                <ul className="space-y-2 text-sm">
                  {data.confirmedValueByCurrency.map((row) => (
                    <li key={row.currencyCode} className="flex items-center justify-between">
                      <span className="font-medium">{formatPrice(row.value, row.currencyCode)}</span>
                      <span className="text-xs text-muted-foreground">
                        {row.deals} deal{row.deals === 1 ? "" : "s"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No confirmed deals yet.</p>
              )}
              <p className="mt-3 text-[11px] text-muted-foreground">
                Currencies are reported separately and never converted or summed.
              </p>
            </Section>
            <Section title="Top products (live listings)">
              {data.topProducts.length ? (
                <ul className="space-y-2 text-sm">
                  {data.topProducts.map((row) => (
                    <li key={row.categoryId ?? "none"} className="flex items-center justify-between">
                      <span>{row.name ?? "Unnamed product"}</span>
                      <span className="text-xs text-muted-foreground">{row.activeListings} live</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No live listings.</p>
              )}
            </Section>
            <Section title="Listings by status">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-1 font-medium">Status</th>
                    <th className="py-1 text-right font-medium">Buy</th>
                    <th className="py-1 text-right font-medium">Sell</th>
                  </tr>
                </thead>
                <tbody>
                  {STATUS_ORDER.filter(
                    (s) => data.listingsBySideAndStatus.BUY[s] || data.listingsBySideAndStatus.SELL[s],
                  ).map((status) => (
                    <tr key={status} className="border-t border-slate-100">
                      <td className="py-1.5">{importLabel(status)}</td>
                      <td className="py-1.5 text-right">{data.listingsBySideAndStatus.BUY[status] ?? 0}</td>
                      <td className="py-1.5 text-right">{data.listingsBySideAndStatus.SELL[status] ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          </div>

          <Section title="Recently published">
            <DataTable
              rows={data.recentListings}
              getRowId={(row) => row.id}
              onRowClick={(row) => router.push(`${IMPORT_BASE}/listings/${row.id}`)}
              pageSize={Math.max(data.recentListings.length, 1)}
              emptyTitle="Nothing published yet"
              emptyDescription="Published Import listings appear here."
              columns={[
                { key: "ref", header: "Reference", accessor: (r) => r.referenceNumber ?? "—" },
                { key: "side", header: "Type", render: (r) => <ImportBadge value={r.side} /> },
                {
                  key: "product",
                  header: "Product",
                  accessor: (r) =>
                    [r.product.category?.name, r.product.grade?.name ?? r.product.customGradeName]
                      .filter(Boolean)
                      .join(" · ") || "—",
                },
                { key: "qty", header: "Quantity", accessor: (r) => formatQty(r.product.quantity, r.product.quantityUnit) },
                {
                  key: "price",
                  header: "Price",
                  accessor: (r) =>
                    `${formatPrice(r.commercial.price, r.commercial.currencyCode, r.commercial.priceUnit)} ${r.commercial.incoterm?.code ?? ""}`.trim(),
                },
                { key: "published", header: "Published", accessor: (r) => formatImportDate(r.publishedAt) },
                { key: "status", header: "Status", render: (r) => <ImportBadge value={r.status} /> },
              ]}
            />
          </Section>
        </>
      )}
    </div>
  );
}
