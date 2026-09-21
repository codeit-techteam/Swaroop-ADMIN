"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DetailRow } from "@/components/shared/detail-drawer";
import { EntityWorkbench } from "@/components/shared/entity-workbench";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { listAdminProducts, updateAdminProductStatus } from "@/lib/api/products";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore } from "@/store/data-store";
import type { ProductGrade } from "@/types";

export default function CatalogPage() {
  const rows = useDataStore((s) => s.products);
  const updateProduct = useDataStore((s) => s.updateProduct);
  const pushAudit = useDataStore((s) => s.pushAudit);
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<ProductGrade | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const products = await listAdminProducts();
      useDataStore.setState({ products });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load catalog.");
      useDataStore.setState({ products: [] });
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
        title="Catalog"
        description="Industrial grades identified by commodity, manufacturer, brand and specification. Images are optional and not required."
        loading={loading}
        loadingError={loadError}
        onRetry={() => void load()}
        kpis={[
          { label: "Active grades", value: String(rows.filter((r) => r.status === "Active").length) },
          { label: "Active sellers", value: String(rows.reduce((s, r) => s + r.activeSellers, 0)), href: "/sellers" },
          { label: "Active offers", value: String(rows.reduce((s, r) => s + r.activeOffers, 0)), href: "/offers" },
          { label: "Inventory MT", value: String(rows.reduce((s, r) => s + r.inventory, 0)) },
        ]}
        rows={rows}
        getRowId={(r) => r.id}
        columns={[
          { key: "grade", header: "Grade", sortable: true, accessor: (r) => r.grade },
          { key: "commodity", header: "Commodity", sortable: true, accessor: (r) => r.commodity },
          { key: "manufacturer", header: "Manufacturer", accessor: (r) => r.manufacturer },
          { key: "spec", header: "Specification", accessor: (r) => r.specification },
          { key: "sellers", header: "Active Sellers", sortable: true, accessor: (r) => r.activeSellers },
          { key: "offers", header: "Active Offers", sortable: true, accessor: (r) => r.activeOffers },
          { key: "inventory", header: "Inventory", sortable: true, accessor: (r) => r.inventory },
          { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
        ]}
        searchPlaceholder="Search grade, commodity, manufacturer"
        searchFn={(r, q) => `${r.grade} ${r.commodity} ${r.manufacturer} ${r.brand} ${r.specification}`.toLowerCase().includes(q)}
        emptyTitle="No grades found."
        emptyDescription="Industrial polymer and petrochemical grades will appear here. Product images are not required."
        exportName="catalog"
        exportRow={(r) => ({ grade: r.grade, commodity: r.commodity, manufacturer: r.manufacturer, status: r.status })}
        drawerTitle={(r) => r.grade}
        renderDetails={(r) => (
          <dl>
            <DetailRow label="Commodity" value={r.commodity} />
            <DetailRow label="Manufacturer" value={r.manufacturer} />
            <DetailRow label="Brand" value={r.brand} />
            <DetailRow label="Specification" value={r.specification} />
            <DetailRow label="Location" value={r.location} />
            <DetailRow label="Available qty" value={`${r.availableQty} MT`} />
            <DetailRow label="Image" value="Not required" />
          </dl>
        )}
        drawerFooter={(r) => (
          <Button className="w-full" variant="outline" onClick={() => setPending(r)}>
            {r.status === "Active" ? "Deactivate" : "Activate"}
          </Button>
        )}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
            <Button size="sm" asChild>
              <Link href="/master-data/grades">Manage Grade Master</Link>
            </Button>
          </div>
        }
      />
      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title={pending?.status === "Active" ? "Deactivate product" : "Activate product"}
        description="This updates PostgreSQL. Historical purchase requests remain valid."
        confirmLabel="Confirm"
        onConfirm={async () => {
          if (!pending) return;
          const next = pending.status === "Active" ? "INACTIVE" : "ACTIVE";
          try {
            const updated = await updateAdminProductStatus(pending.id, next);
            updateProduct(pending.id, updated);
            pushAudit({
              admin: user?.name ?? "Admin",
              role: user?.role ?? "ADMIN",
              action: `${updated.status} product ${updated.grade}`,
              module: "Catalog",
              entity: pending.id,
              result: "Success",
            });
            toast.success(`Product ${updated.status.toLowerCase()}`);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to update product.");
          } finally {
            setPending(null);
          }
        }}
      />
    </>
  );
}
