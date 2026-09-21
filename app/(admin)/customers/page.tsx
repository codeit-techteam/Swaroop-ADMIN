"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DetailRow } from "@/components/shared/detail-drawer";
import { EntityWorkbench } from "@/components/shared/entity-workbench";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { CustomerCreditPanel } from "@/components/credit/customer-credit-panel";
import { formatInr, formatNumber } from "@/lib/format";
import { listAdminCustomers, suspendAdminCustomer } from "@/lib/api/ops";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore } from "@/store/data-store";

export default function CustomersPage() {
  const router = useRouter();
  const rows = useDataStore((s) => s.customers);
  const updateCustomer = useDataStore((s) => s.updateCustomer);
  const pushAudit = useDataStore((s) => s.pushAudit);
  const user = useAuthStore((s) => s.user);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      useDataStore.setState({ customers: await listAdminCustomers() });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load customers.");
      useDataStore.setState({ customers: [] });
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
        title="Customers"
        description="Admin visibility across Customer Mobile App and Customer Web App users."
        loading={loading}
        loadingError={loadError}
        onRetry={() => void load()}
        breadcrumbs={[{ label: "Ecosystem" }, { label: "Customers" }]}
        kpis={[
          { label: "Active", value: String(rows.filter((r) => r.status === "Active").length) },
          { label: "KYC Pending", value: String(rows.filter((r) => r.kycStatus === "Pending").length), href: "/kyc", tone: "warning" },
          { label: "Suspended", value: String(rows.filter((r) => r.status === "Suspended").length), tone: "danger" },
          { label: "Total Spend", value: formatInr(rows.reduce((sum, r) => sum + r.spend, 0)) },
        ]}
        rows={rows}
        getRowId={(row) => row.id}
        columns={[
          { key: "id", header: "Customer ID", sortable: true, accessor: (r) => r.id },
          { key: "company", header: "Company", sortable: true, accessor: (r) => r.company },
          { key: "contact", header: "Contact", accessor: (r) => r.contact },
          { key: "email", header: "Email", accessor: (r) => r.email },
          { key: "location", header: "Location", accessor: (r) => r.location },
          { key: "kyc", header: "KYC", render: (r) => <StatusBadge value={r.kycStatus} /> },
          { key: "credit", header: "Credit", render: () => "PetroTrade managed" },
          { key: "orders", header: "Orders", sortable: true, accessor: (r) => r.orders, render: (r) => formatNumber(r.orders) },
          { key: "spend", header: "Spend", sortable: true, accessor: (r) => r.spend, render: (r) => formatInr(r.spend) },
          { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
          { key: "source", header: "Source", render: (r) => <SourceBadge source={r.source} /> },
        ]}
        searchPlaceholder="Search customers"
        searchFn={(r, q) => `${r.id} ${r.company} ${r.contact} ${r.email} ${r.phone}`.toLowerCase().includes(q)}
        filters={[
          { label: "Active", value: "Active", predicate: (r) => r.status === "Active" },
          { label: "Inactive", value: "Inactive", predicate: (r) => r.status === "Inactive" },
          { label: "KYC Pending", value: "kyc-pending", predicate: (r) => r.kycStatus === "Pending" },
          { label: "KYC Approved", value: "kyc-approved", predicate: (r) => r.kycStatus === "Approved" },
          { label: "Suspended", value: "Suspended", predicate: (r) => r.status === "Suspended" },
        ]}
        emptyTitle="No customers found."
        emptyDescription="Try changing your filters."
        exportName="customers"
        exportRow={(r) => ({ id: r.id, company: r.company, email: r.email, kyc: r.kycStatus, status: r.status, source: r.source })}
        drawerTitle={(r) => r.company}
        drawerDescription={(r) => r.id}
        renderDetails={(r) => (
          <dl>
            <DetailRow label="Contact" value={r.contact} />
            <DetailRow label="Email" value={r.email} />
            <DetailRow label="Phone" value={r.phone} />
            <DetailRow label="Location" value={r.location} />
            <DetailRow label="GST" value={r.gst} />
            <DetailRow label="PAN" value={r.pan} />
            <DetailRow label="KYC" value={<StatusBadge value={r.kycStatus} />} />
            <CustomerCreditPanel customerId={r.id} />
            <DetailRow label="Orders" value={r.orders} />
            <DetailRow label="Addresses" value={r.addresses.join(" · ")} />
            <DetailRow label="Source" value={<SourceBadge source={r.source} />} />
          </dl>
        )}
        drawerFooter={(r) => (
          <div className="flex gap-2">
            <Button className="flex-1" variant="outline" onClick={() => router.push("/orders")}>Orders</Button>
            <Button className="flex-1" variant="destructive" onClick={() => setConfirmId(r.id)}>Suspend</Button>
          </div>
        )}
      />
      <ConfirmDialog
        open={Boolean(confirmId)}
        onOpenChange={(open) => !open && setConfirmId(null)}
        title="Suspend customer"
        description="This is an Admin control action. The buyer will no longer transact until reactivated."
        confirmLabel="Suspend"
        destructive
        onConfirm={async () => {
          if (!confirmId) return;
          try {
            await suspendAdminCustomer(confirmId);
            updateCustomer(confirmId, { status: "Suspended" });
            pushAudit({ admin: user?.name ?? "Admin", role: user?.role ?? "ADMIN", action: `Suspended customer ${confirmId}`, module: "Customers", entity: confirmId, result: "Success" });
            toast.success("Customer suspended");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to suspend customer.");
          }
          setConfirmId(null);
        }}
      />
    </>
  );
}
