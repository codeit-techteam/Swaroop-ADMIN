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
  getAdminSeller,
  type Seller360,
} from "@/lib/api/control-center";
import { formatDateTime } from "@/lib/format";

function personName(user: Seller360["user"]) {
  return user.displayName || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Seller";
}

export default function Seller360Page() {
  const params = useParams<{ id: string }>();
  const [record, setRecord] = useState<Seller360 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRecord(await getAdminSeller(params.id));
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
    return <ErrorState title="Seller unavailable" description={error ?? "Not found"} onRetry={() => void load()} />;
  }
  if (!record.related) {
    return (
      <ErrorState
        title="Seller 360 needs the updated backend"
        description="GET /admin/sellers/:id must include related offers, orders, dispatch, and managers."
        onRetry={() => void load()}
      />
    );
  }

  const related = record.related;
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={record.organization?.legalName || record.organization?.name || personName(record.user)}
        description={`${personName(record.user)} · ${record.user.email ?? "No email"} · ${record.user.phone ?? "No phone"}`}
        breadcrumbs={[
          { label: "Sellers", href: "/sellers" },
          { label: record.organization?.name ?? record.id },
        ]}
      />
      <section className="grid gap-3 rounded-md border bg-white p-4 text-sm shadow-soft sm:grid-cols-2 xl:grid-cols-4">
        <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge value={record.status} /></div>
        <div><p className="text-xs text-muted-foreground">Verification</p><StatusBadge value={record.organization?.verificationStatus ?? "—"} /></div>
        <div><p className="text-xs text-muted-foreground">Onboarding</p><StatusBadge value={record.onboarding?.status ?? "—"} /></div>
        <div><p className="text-xs text-muted-foreground">Created</p><p>{formatDateTime(record.createdAt)}</p></div>
        <div><p className="text-xs text-muted-foreground">GST</p><p>{record.organization?.gstin ?? "—"}</p></div>
        <div><p className="text-xs text-muted-foreground">PAN</p><p>{record.organization?.pan ?? "—"}</p></div>
        <div><p className="text-xs text-muted-foreground">Products</p><p>{record._count?.products ?? 0}</p></div>
        <div><p className="text-xs text-muted-foreground">Inventory rows</p><p>{record._count?.inventory ?? 0}</p></div>
      </section>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link className="rounded-md border px-3 py-1.5 hover:bg-slate-50" href="/catalog">Products</Link>
        <Link className="rounded-md border px-3 py-1.5 hover:bg-slate-50" href="/offers">Offers</Link>
        <Link className="rounded-md border px-3 py-1.5 hover:bg-slate-50" href="/orders">Orders</Link>
        <Link className="rounded-md border px-3 py-1.5 hover:bg-slate-50" href="/logistics">Dispatch</Link>
        <Link className="rounded-md border px-3 py-1.5 hover:bg-slate-50" href="/payments">Payments</Link>
        <Link className="rounded-md border px-3 py-1.5 hover:bg-slate-50" href="/documents">Documents</Link>
        <Link className="rounded-md border px-3 py-1.5 hover:bg-slate-50" href={`/users/${record.user.id}`}>User account</Link>
      </div>
      <RelatedList
        title="Managers"
        empty="No seller managers assigned."
        rows={related.managers.map((item) => ({
          id: item.id,
          href: item.user ? `/users/${item.user.id}` : undefined,
          title: item.user
            ? [item.user.firstName, item.user.lastName].filter(Boolean).join(" ") || item.user.email || item.user.id
            : item.id,
          subtitle: item.title ?? item.user?.email ?? undefined,
          status: item.status,
          when: item.assignedAt,
        }))}
      />
      <RelatedList
        title="Offers"
        empty="No offers."
        rows={related.offers.map((item) => ({
          id: item.id,
          href: `/offers?id=${item.id}`,
          title: item.referenceNumber ?? item.id,
          subtitle: item.basePrice,
          status: item.status,
        }))}
      />
      <RelatedList
        title="Orders"
        empty="No seller orders."
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
        title="Dispatch"
        empty="No dispatches."
        rows={related.dispatches.map((item) => ({
          id: item.id,
          href: "/logistics",
          title: item.id.slice(0, 8),
          subtitle: item.quantity ? `${item.quantity} MT` : undefined,
          status: item.status,
          when: item.createdAt,
        }))}
      />
      <RelatedList
        title="Import deals"
        empty="No import deals for this seller."
        rows={related.importDeals.map((item) => ({
          id: item.id,
          href: `/import-trading/deals/${item.id}`,
          title: item.referenceNumber ?? item.id,
          status: item.status,
          when: item.createdAt,
        }))}
      />
      <RelatedList
        title="Onboarding documents"
        empty="No confirmed onboarding documents."
        rows={(record.onboardingDocuments ?? []).map((item) => ({
          id: item.id,
          href: `/documents?id=${item.id}`,
          title: item.fileName,
          subtitle: item.slot ?? item.category,
          status: item.status,
        }))}
      />
      <RelatedList
        title="Audit"
        empty="No audit entries for this seller."
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
