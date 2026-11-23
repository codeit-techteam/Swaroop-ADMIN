"use client";

import { useEffect, useMemo, useState } from "react";
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

  const kpis = useMemo(() => {
    const activeListings = rows.filter((r) => r.status === "Active").length;
    const uniqueGrades = new Set(
      rows.map((r) => r.gradeId || r.commodity).filter(Boolean),
    ).size;
    const uniqueSellers = new Set(
      rows.map((r) => r.sellerName).filter((name): name is string => Boolean(name)),
    ).size;
    const activeOffers = rows.reduce((sum, r) => sum + r.activeOffers, 0);
    const inventoryMt = rows.reduce((sum, r) => sum + r.inventory, 0);
    return [
      { label: "Seller listings", value: String(activeListings) },
      { label: "Unique grades", value: String(uniqueGrades), href: "/master-data/grades" },
      { label: "Sellers in list", value: String(uniqueSellers), href: "/sellers" },
      { label: "Active offers", value: String(activeOffers), href: "/offers" },
      { label: "Inventory MT", value: inventoryMt.toLocaleString("en-IN") },
    ];
  }, [rows]);

  return (
    <>
      <EntityWorkbench
        title="Catalog"
        description="Seller marketplace listings linked to Grade Master. One grade can have multiple seller listings — those are not duplicate Grade Master records. Manage material definitions in Grade Master."
        loading={loading}
        loadingError={loadError}
        onRetry={() => void load()}
        kpis={kpis}
        rows={rows}
        getRowId={(r) => r.id}
        columns={[
          { key: "grade", header: "Listing name", sortable: true, accessor: (r) => r.grade },
          { key: "sku", header: "SKU", sortable: true, accessor: (r) => r.productCode ?? "—" },
          { key: "commodity", header: "Grade code", sortable: true, accessor: (r) => r.commodity },
          { key: "seller", header: "Seller", sortable: true, accessor: (r) => r.sellerName ?? "—" },
          { key: "manufacturer", header: "Manufacturer", accessor: (r) => r.manufacturer },
          { key: "spec", header: "Specification", accessor: (r) => r.specification },
          { key: "offers", header: "Active Offers", sortable: true, accessor: (r) => r.activeOffers },
          { key: "inventory", header: "Inventory", sortable: true, accessor: (r) => r.inventory },
          { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
        ]}
        searchPlaceholder="Search listing, SKU, grade code, seller, manufacturer"
        searchFn={(r, q) =>
          `${r.grade} ${r.productCode ?? ""} ${r.commodity} ${r.sellerName ?? ""} ${r.manufacturer} ${r.brand} ${r.specification}`
            .toLowerCase()
            .includes(q)
        }
        emptyTitle="No seller listings found."
        emptyDescription="Seller products linked to Grade Master appear here. Create grades in Grade Master, then sellers publish listings against those grades."
        exportName="catalog"
        exportRow={(r) => ({
          id: r.id,
          sku: r.productCode,
          listing: r.grade,
          gradeCode: r.commodity,
          gradeId: r.gradeId,
          seller: r.sellerName,
          manufacturer: r.manufacturer,
          status: r.status,
          productStatus: r.productStatus,
          inventory: r.inventory,
          offers: r.activeOffers,
        })}
        drawerTitle={(r) => r.grade}
        renderDetails={(r) => (
          <dl>
            <DetailRow label="Listing ID" value={r.id} />
            <DetailRow label="SKU" value={r.productCode ?? "—"} />
            <DetailRow label="Grade Master ID" value={r.gradeId ?? "—"} />
            <DetailRow label="Grade code" value={r.commodity} />
            <DetailRow label="Seller" value={r.sellerName ?? "—"} />
            <DetailRow label="Manufacturer" value={r.manufacturer} />
            <DetailRow label="Brand" value={r.brand} />
            <DetailRow label="Specification" value={r.specification} />
            <DetailRow label="Backend status" value={r.productStatus ?? r.status} />
            <DetailRow label="Location" value={r.location} />
            <DetailRow label="Available qty" value={`${r.availableQty} MT`} />
            <DetailRow label="Active offers" value={String(r.activeOffers)} />
            <DetailRow label="Image" value="Not required" />
          </dl>
        )}
        drawerFooter={(r) => (
          <div className="flex w-full flex-col gap-2">
            {r.gradeId ? (
              <Button className="w-full" variant="outline" asChild>
                <Link href={`/master-data/grades/${r.gradeId}`}>Open Grade Master</Link>
              </Button>
            ) : null}
            <Button className="w-full" variant="outline" onClick={() => setPending(r)}>
              {r.status === "Active" ? "Pause listing" : "Activate listing"}
            </Button>
          </div>
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
        title={pending?.status === "Active" ? "Pause seller listing" : "Activate seller listing"}
        description={
          pending?.status === "Active"
            ? "Sets ProductStatus to PAUSED (not GradeStatus INACTIVE). Orders and purchase requests stay intact. The Grade Master record is unchanged."
            : "Sets ProductStatus to ACTIVE so this seller listing can appear in marketplace queries again."
        }
        confirmLabel="Confirm"
        onConfirm={async () => {
          if (!pending) return;
          // ProductStatus — never send GradeStatus.INACTIVE
          const next = pending.status === "Active" ? "PAUSED" : "ACTIVE";
          try {
            const updated = await updateAdminProductStatus(pending.id, next);
            updateProduct(pending.id, updated);
            pushAudit({
              admin: user?.name ?? "Admin",
              role: user?.role ?? "ADMIN",
              action: `${updated.productStatus ?? updated.status} product ${updated.grade}`,
              module: "Catalog",
              entity: pending.id,
              result: "Success",
            });
            toast.success(
              next === "PAUSED" ? "Listing paused" : "Listing activated",
            );
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
