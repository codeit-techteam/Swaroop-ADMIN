"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DetailRow } from "@/components/shared/detail-drawer";
import { EntityWorkbench } from "@/components/shared/entity-workbench";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatInr } from "@/lib/format";
import { listAdminSellers, suspendAdminSeller } from "@/lib/api/ops";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore } from "@/store/data-store";

export default function SellersPage() {
  const router = useRouter();
  const rows = useDataStore((s) => s.sellers);
  const updateSeller = useDataStore((s) => s.updateSeller);
  const pushAudit = useDataStore((s) => s.pushAudit);
  const user = useAuthStore((s) => s.user);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      useDataStore.setState({ sellers: await listAdminSellers() });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load sellers.");
      useDataStore.setState({ sellers: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <>
      <EntityWorkbench
        title="Sellers"
        description="Admin tracking of Seller Mobile App and Seller Web App — this is not the Seller Portal."
        loading={loading}
        loadingError={loadError}
        onRetry={() => void load()}
        breadcrumbs={[{ label: "Ecosystem" }, { label: "Sellers" }]}
        kpis={[
          { label: "Active sellers", value: String(rows.filter((r) => r.status === "Active").length) },
          { label: "Pending KYC", value: String(rows.filter((r) => r.kycStatus !== "Approved").length), href: "/kyc", tone: "warning" },
          { label: "Live offers", value: String(rows.reduce((sum, r) => sum + r.offers, 0)), href: "/offers" },
          { label: "Revenue", value: formatInr(rows.reduce((sum, r) => sum + r.revenue, 0)) },
        ]}
        rows={rows}
        getRowId={(r) => r.id}
        columns={[
          { key: "id", header: "Seller ID", sortable: true, accessor: (r) => r.id },
          { key: "company", header: "Company", sortable: true, accessor: (r) => r.company },
          { key: "contact", header: "Contact", accessor: (r) => r.contact },
          { key: "location", header: "Location", accessor: (r) => r.location },
          { key: "kyc", header: "KYC", render: (r) => <StatusBadge value={r.kycStatus} /> },
          { key: "products", header: "Products", sortable: true, accessor: (r) => r.products },
          { key: "offers", header: "Offers", sortable: true, accessor: (r) => r.offers },
          { key: "orders", header: "Orders", sortable: true, accessor: (r) => r.orders },
          { key: "revenue", header: "Revenue", sortable: true, accessor: (r) => r.revenue, render: (r) => formatInr(r.revenue) },
          { key: "perf", header: "Performance", sortable: true, accessor: (r) => r.performance, render: (r) => `${r.performance}%` },
          { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
          { key: "source", header: "Source", render: (r) => <SourceBadge source={r.source} /> },
        ]}
        searchPlaceholder="Search sellers"
        searchFn={(r, q) => `${r.id} ${r.company} ${r.contact} ${r.location}`.toLowerCase().includes(q)}
        emptyTitle="No sellers found."
        emptyDescription="Sellers from Seller App and Seller Web App will appear here."
        exportName="sellers"
        exportRow={(r) => ({ id: r.id, company: r.company, kyc: r.kycStatus, revenue: r.revenue, source: r.source })}
        drawerTitle={(r) => r.company}
        drawerDescription={() => "Admin seller record — not a seller session"}
        renderDetails={(r) => (
          <dl>
            <DetailRow label="Contact" value={`${r.contact} · ${r.email}`} />
            <DetailRow label="Phone" value={r.phone} />
            <DetailRow label="GST / PAN" value={`${r.gst} · ${r.pan}`} />
            <DetailRow label="Verification" value={<StatusBadge value={r.kycStatus} />} />
            <DetailRow label="Products" value={r.products} />
            <DetailRow label="Offers" value={r.offers} />
            <DetailRow label="Orders" value={r.orders} />
            <DetailRow label="Settlements" value={formatInr(r.revenue)} />
            <DetailRow label="Source" value={<SourceBadge source={r.source} />} />
          </dl>
        )}
        drawerFooter={(r) => (
          <div className="flex gap-2">
            <Button className="flex-1" variant="outline" onClick={() => router.push(`/sellers/${r.id}`)}>
              Seller 360
            </Button>
            <Button className="flex-1" variant="destructive" onClick={() => setDeactivateId(r.id)}>
              Deactivate
            </Button>
          </div>
        )}
      />
      <ConfirmDialog
        open={Boolean(deactivateId)}
        onOpenChange={(open) => !open && setDeactivateId(null)}
        title="Deactivate seller"
        description="The seller will lose marketplace access until reactivated. This does not log you into the Seller Portal."
        confirmLabel="Deactivate"
        destructive
        onConfirm={async () => {
          if (!deactivateId) return;
          try {
            await suspendAdminSeller(deactivateId);
            updateSeller(deactivateId, { status: "Suspended" });
            pushAudit({ admin: user?.name ?? "Admin", role: user?.role ?? "ADMIN", action: `Deactivated seller ${deactivateId}`, module: "Sellers", entity: deactivateId, result: "Success" });
            toast.success("Seller deactivated");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to deactivate seller.");
          }
          setDeactivateId(null);
        }}
      />
    </>
  );
}
