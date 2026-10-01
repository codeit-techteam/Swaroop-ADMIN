"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { RelatedList } from "@/components/admin/related-list";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, PageSkeleton } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  describeApiFailure,
  getAdminCustomer,
  type Customer360,
} from "@/lib/api/control-center";
import { formatDateTime } from "@/lib/format";

function personName(user: Customer360["user"]) {
  return user.displayName || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Customer";
}

export default function Customer360Page() {
  const params = useParams<{ id: string }>();
  const [record, setRecord] = useState<Customer360 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRecord(await getAdminCustomer(params.id));
    } catch (cause) {
      setRecord(null);
      setError(describeApiFailure(cause));
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <PageSkeleton />;
  if (error || !record) {
    return <ErrorState title="Customer unavailable" description={error ?? "Not found"} onRetry={() => void load()} />;
  }
  if (!record.related) {
    return (
      <ErrorState
        title="Customer 360 needs the updated backend"
        description="GET /admin/customers/:id must include related orders, payments, and documents."
        onRetry={() => void load()}
      />
    );
  }

  const related = record.related;
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={record.organization?.name ?? personName(record.user)}
        description={`${personName(record.user)} · ${record.user.email ?? "No email"} · ${record.user.phone ?? "No phone"}`}
        breadcrumbs={[
          { label: "Customers", href: "/customers" },
          { label: record.organization?.name ?? record.id },
        ]}
      />
      <section className="grid gap-3 rounded-md border bg-white p-4 text-sm shadow-soft sm:grid-cols-2 xl:grid-cols-4">
        <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge value={record.status} /></div>
        <div><p className="text-xs text-muted-foreground">KYC</p><StatusBadge value={record.organization?.verificationStatus ?? "—"} /></div>
        <div><p className="text-xs text-muted-foreground">Credit</p><StatusBadge value={record.creditStatus ?? "—"} /></div>
        <div><p className="text-xs text-muted-foreground">Created</p><p>{formatDateTime(record.createdAt)}</p></div>
        <div><p className="text-xs text-muted-foreground">GST</p><p>{record.organization?.gstin ?? "—"}</p></div>
        <div><p className="text-xs text-muted-foreground">PAN</p><p>{record.organization?.pan ?? "—"}</p></div>
        <div><p className="text-xs text-muted-foreground">Orders</p><p>{record._count?.orders ?? related.orders.length}</p></div>
        <div><p className="text-xs text-muted-foreground">Purchase requests</p><p>{record._count?.purchaseRequests ?? related.purchaseRequests.length}</p></div>
      </section>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link className="rounded-md border px-3 py-1.5 hover:bg-slate-50" href="/orders">Orders</Link>
        <Link className="rounded-md border px-3 py-1.5 hover:bg-slate-50" href="/procurement">Purchase requests</Link>
        <Link className="rounded-md border px-3 py-1.5 hover:bg-slate-50" href="/payments">Payments</Link>
        <Link className="rounded-md border px-3 py-1.5 hover:bg-slate-50" href="/documents">Documents</Link>
        <Link className="rounded-md border px-3 py-1.5 hover:bg-slate-50" href="/kyc">KYC</Link>
        <Link className="rounded-md border px-3 py-1.5 hover:bg-slate-50" href={`/users/${record.user.id}`}>User account</Link>
      </div>
      <RelatedList
        title="Addresses"
        empty="No addresses on this organization."
        rows={related.addresses.map((item) => ({
          id: item.id,
          title: item.formattedAddress || [item.line1, item.city, item.state].filter(Boolean).join(", "),
          subtitle: item.type,
          status: item.isDefault ? "ACTIVE" : undefined,
        }))}
      />
      <RelatedList
        title="Purchase requests"
        empty="No purchase requests."
        rows={related.purchaseRequests.map((item) => ({
          id: item.id,
          href: `/procurement/${item.id}`,
          title: item.referenceNumber ?? item.id,
          status: item.status,
          when: item.createdAt,
        }))}
      />
      <RelatedList
        title="Orders"
        empty="No orders."
        rows={related.orders.map((item) => ({
          id: item.id,
          href: `/orders?id=${item.id}`,
          title: item.referenceNumber ?? item.id,
          subtitle: item.totalAmount,
          status: item.status,
          when: item.createdAt,
        }))}
      />
      <RelatedList
        title="Payments"
        empty="No payments."
        rows={related.payments.map((item) => ({
          id: item.id,
          href: `/payments?id=${item.id}`,
          title: item.referenceNumber ?? item.id,
          subtitle: item.amount,
          status: item.status,
          when: item.createdAt,
        }))}
      />
      <RelatedList
        title="Import deals"
        empty="No import deals for this buyer."
        rows={related.importDeals.map((item) => ({
          id: item.id,
          href: `/import-trading/deals/${item.id}`,
          title: item.referenceNumber ?? item.id,
          status: item.status,
          when: item.createdAt,
        }))}
      />
      <RelatedList
        title="Documents"
        empty="No customer documents."
        rows={related.documents.map((item) => ({
          id: item.id,
          href: `/documents?id=${item.id}`,
          title: item.originalFileName || item.fileName || item.documentNumber || item.id,
          subtitle: item.category,
          status: item.status,
          when: item.createdAt,
        }))}
      />
      <RelatedList
        title="Audit"
        empty="No audit entries for this customer."
        rows={related.audit.map((item) => ({
          id: item.id,
          href: "/audit-logs",
          title: item.action ?? "Audit",
          subtitle: item.actor?.email ?? undefined,
          when: item.createdAt,
        }))}
      />
    </div>
  );
}
