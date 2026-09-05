"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DetailRow } from "@/components/shared/detail-drawer";
import { EntityWorkbench } from "@/components/shared/entity-workbench";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore } from "@/store/data-store";

export default function CatalogPage() {
  const rows = useDataStore((s) => s.products);
  const addProduct = useDataStore((s) => s.addProduct);
  const updateProduct = useDataStore((s) => s.updateProduct);
  const pushAudit = useDataStore((s) => s.pushAudit);
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [grade, setGrade] = useState("PP HOMO RAFFIA 3.5MFI");
  const [commodity, setCommodity] = useState("PP");
  const [manufacturer, setManufacturer] = useState("Reliance");

  return (
    <>
      <EntityWorkbench
        title="Catalog"
        description="Industrial grades identified by commodity, manufacturer, brand and specification. Images are optional and not required."
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
          <Button
            className="w-full"
            variant="outline"
            onClick={() => {
              const next = r.status === "Active" ? "Inactive" : "Active";
              updateProduct(r.id, { status: next });
              pushAudit({ admin: user?.name ?? "Admin", role: user?.role ?? "ADMIN", action: `${next} grade ${r.grade}`, module: "Catalog", entity: r.id, result: "Success" });
              toast.success(`Grade ${next.toLowerCase()}`);
            }}
          >
            {rows.find((item) => item.id === r.id)?.status === "Active" ? "Deactivate" : "Activate"}
          </Button>
        )}
        actions={<Button size="sm" onClick={() => setOpen(true)}>Create grade</Button>}
      />
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Create grade"
        description="No product image is collected. Grade identity is specification-first."
        confirmLabel="Create"
        extra={
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5"><Label>Grade</Label><Input value={grade} onChange={(e) => setGrade(e.target.value)} /></div>
            <div className="flex flex-col gap-1.5"><Label>Commodity</Label><Input value={commodity} onChange={(e) => setCommodity(e.target.value)} /></div>
            <div className="flex flex-col gap-1.5"><Label>Manufacturer</Label><Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} /></div>
          </div>
        }
        onConfirm={() => {
          const id = `GRD-${Date.now().toString().slice(-4)}`;
          addProduct({
            id,
            grade,
            commodity,
            manufacturer,
            brand: manufacturer,
            specification: grade,
            location: "Unassigned",
            availableQty: 0,
            activeSellers: 0,
            activeOffers: 0,
            inventory: 0,
            status: "Active",
          });
          toast.success("Grade created without requiring an image");
        }}
      />
    </>
  );
}
