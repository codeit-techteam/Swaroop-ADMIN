"use client";

import { useRouter } from "next/navigation";
import { Suspense } from "react";

import { ProcurementWorkbench } from "@/components/procurement/workbench";
import { DetailRow } from "@/components/shared/detail-drawer";
import { EntityWorkbench } from "@/components/shared/entity-workbench";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { formatInrExact } from "@/lib/format";
import { useDataStore } from "@/store/data-store";
import { useProcurementStore } from "@/store/procurement-store";

export function ProcurementQueuePage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading queue…</div>}>
      <ProcurementWorkbench initialView="queue" />
    </Suspense>
  );
}

export function ProcurementOrdersPage() {
  const rows = useProcurementStore((s) => s.procurements);
  return (
    <EntityWorkbench
      title="Procurement Orders"
      breadcrumbs={[{ label: "Procurement", href: "/procurement" }, { label: "Orders" }]}
      rows={rows}
      getRowId={(r) => r.id}
      columns={[
        { key: "id", header: "PO", sortable: true, accessor: (r) => r.id },
        { key: "commodity", header: "Commodity", accessor: (r) => r.commodity },
        { key: "supplier", header: "Supplier", accessor: (r) => r.supplier },
        { key: "estCost", header: "Value", accessor: (r) => r.estimatedCost, render: (r) => formatInrExact(r.estimatedCost) },
        { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
      ]}
      searchPlaceholder="Search POs"
      searchFn={(r, q) => `${r.id} ${r.commodity}`.toLowerCase().includes(q)}
      emptyTitle="No procurement orders."
      emptyDescription="Approved and in-flight POs will appear here."
      exportName="procurement-orders"
      exportRow={(r) => ({ id: r.id, supplier: r.supplier, status: r.status })}
      drawerTitle={(r) => r.id}
      renderDetails={(r) => <DetailRow label="Supplier" value={r.supplier} />}
    />
  );
}

export function ProcurementSellersPage() {
  const sellers = useDataStore((s) => s.sellers);
  return (
    <EntityWorkbench
      title="Procurement Sellers"
      description="Suppliers available to the workbench. This is Admin visibility, not the Seller Portal."
      breadcrumbs={[{ label: "Procurement", href: "/procurement" }, { label: "Sellers" }]}
      rows={sellers}
      getRowId={(r) => r.id}
      columns={[
        { key: "company", header: "Supplier", sortable: true, accessor: (r) => r.company },
        { key: "location", header: "Location", accessor: (r) => r.location },
        { key: "kyc", header: "KYC", render: (r) => <StatusBadge value={r.kycStatus} /> },
        { key: "perf", header: "Performance", accessor: (r) => r.performance, render: (r) => `${r.performance}%` },
      ]}
      searchPlaceholder="Search suppliers"
      searchFn={(r, q) => `${r.company} ${r.location}`.toLowerCase().includes(q)}
      emptyTitle="No suppliers."
      emptyDescription="Verified sellers can be compared here."
      exportName="procurement-sellers"
      exportRow={(r) => ({ company: r.company, location: r.location, kyc: r.kycStatus })}
      drawerTitle={(r) => r.company}
      renderDetails={(r) => (
        <dl>
          <DetailRow label="Contact" value={r.contact} />
          <DetailRow label="Source" value={<SourceBadge source={r.source} />} />
        </dl>
      )}
    />
  );
}

export function ProcurementComparisonPage() {
  const sellers = useDataStore((s) => s.sellers);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Seller Comparison" breadcrumbs={[{ label: "Procurement", href: "/procurement" }, { label: "Comparison" }]} />
      <div className="overflow-x-auto rounded-md border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Metric</th>
              {sellers.slice(0, 3).map((seller) => (
                <th key={seller.id} className="p-3">{seller.company}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["KYC", ...sellers.slice(0, 3).map((s) => s.kycStatus)],
              ["Performance", ...sellers.slice(0, 3).map((s) => `${s.performance}%`)],
              ["Offers", ...sellers.slice(0, 3).map((s) => String(s.offers))],
              ["Location", ...sellers.slice(0, 3).map((s) => s.location)],
            ].map((row) => (
              <tr key={row[0]} className="border-t">
                {row.map((cell, index) => (
                  <td key={`${row[0]}-${index}`} className="p-3">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ProcurementNegotiationsPage() {
  const procurements = useProcurementStore((s) => s.procurements);
  const rows = procurements.filter((item) => item.status === "Negotiation");
  return (
    <EntityWorkbench
      title="Price Negotiation"
      breadcrumbs={[{ label: "Procurement", href: "/procurement" }, { label: "Negotiations" }]}
      rows={rows}
      getRowId={(r) => r.id}
      columns={[
        { key: "id", header: "PO", accessor: (r) => r.id },
        { key: "commodity", header: "Commodity", accessor: (r) => r.commodity },
        { key: "supplier", header: "Supplier", accessor: (r) => r.supplier },
        { key: "estCost", header: "Ask", render: (r) => formatInrExact(r.estimatedCost) },
      ]}
      searchPlaceholder="Search negotiations"
      searchFn={(r, q) => `${r.id} ${r.supplier}`.toLowerCase().includes(q)}
      emptyTitle="No active negotiations."
      emptyDescription="Negotiation threads will appear here."
      exportName="negotiations"
      exportRow={(r) => ({ id: r.id, supplier: r.supplier })}
      drawerTitle={(r) => r.id}
      renderDetails={(r) => <DetailRow label="Buyer" value={r.buyer} />}
    />
  );
}

export function ProcurementRequestsPage() {
  const rows = useDataStore((s) => s.requests);
  return (
    <EntityWorkbench
      title="Purchase Requests"
      breadcrumbs={[{ label: "Procurement", href: "/procurement" }, { label: "Requests" }]}
      rows={rows}
      getRowId={(r) => r.id}
      columns={[
        { key: "id", header: "PR", sortable: true, accessor: (r) => r.id },
        { key: "customer", header: "Customer", accessor: (r) => r.customer },
        { key: "grade", header: "Grade", accessor: (r) => r.grade },
        { key: "qty", header: "Qty", accessor: (r) => r.quantity },
        { key: "price", header: "Target", render: (r) => `₹${r.targetPrice}` },
        { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
        { key: "source", header: "Source", render: (r) => <SourceBadge source={r.source} /> },
      ]}
      searchPlaceholder="Search PRs"
      searchFn={(r, q) => `${r.id} ${r.customer} ${r.grade}`.toLowerCase().includes(q)}
      emptyTitle="No purchase requests."
      emptyDescription="Requests from Customer App and Customer Web App will appear here."
      exportName="purchase-requests"
      exportRow={(r) => ({ id: r.id, customer: r.customer, grade: r.grade, source: r.source })}
      drawerTitle={(r) => r.id}
      renderDetails={(r) => (
        <dl>
          <DetailRow label="Customer" value={r.customer} />
          <DetailRow label="Source" value={<SourceBadge source={r.source} />} />
        </dl>
      )}
    />
  );
}

export function ProcurementTrackingPage() {
  const rows = useDataStore((s) => s.requests);
  return (
    <EntityWorkbench
      title="PR Tracking"
      breadcrumbs={[{ label: "Procurement", href: "/procurement" }, { label: "Tracking" }]}
      rows={rows}
      getRowId={(r) => r.id}
      columns={[
        { key: "id", header: "PR", accessor: (r) => r.id },
        { key: "customer", header: "Customer", accessor: (r) => r.customer },
        { key: "status", header: "Milestone", render: (r) => <StatusBadge value={r.status} /> },
      ]}
      searchPlaceholder="Track PR"
      searchFn={(r, q) => `${r.id} ${r.customer}`.toLowerCase().includes(q)}
      emptyTitle="Nothing to track."
      emptyDescription="PR milestones will appear here."
      exportName="pr-tracking"
      exportRow={(r) => ({ id: r.id, status: r.status })}
      drawerTitle={(r) => r.id}
      renderDetails={(r) => <DetailRow label="Grade" value={r.grade} />}
    />
  );
}

export function ProcurementApprovalsPage() {
  const router = useRouter();
  const procurements = useProcurementStore((s) => s.procurements);
  const rows = procurements.filter(
    (item) => item.status === "Urgent Review" || item.status === "Pending Inv." || item.status === "Pending Approval",
  );
  return (
    <EntityWorkbench
      title="Procurement Approval"
      breadcrumbs={[{ label: "Procurement", href: "/procurement" }, { label: "Approvals" }]}
      rows={rows}
      getRowId={(r) => r.id}
      columns={[
        { key: "id", header: "PO", accessor: (r) => r.id },
        { key: "commodity", header: "Commodity", accessor: (r) => r.commodity },
        { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
      ]}
      searchPlaceholder="Search approvals"
      searchFn={(r, q) => `${r.id} ${r.commodity}`.toLowerCase().includes(q)}
      emptyTitle="No pending approvals."
      emptyDescription="Items requiring Admin approval will appear here."
      exportName="approvals"
      exportRow={(r) => ({ id: r.id, status: r.status })}
      drawerTitle={(r) => r.id}
      renderDetails={(r) => <DetailRow label="Supplier" value={r.supplier} />}
      actions={<Button size="sm" variant="outline" onClick={() => router.push("/procurement")}>Workbench</Button>}
    />
  );
}
