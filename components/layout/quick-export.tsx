"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { downloadCsv } from "@/lib/csv";
import { applyFilters, toExportRow } from "@/lib/procurement";
import { useDataStore } from "@/store/data-store";
import { useProcurementStore } from "@/store/procurement-store";
import { useUiStore } from "@/store/ui-store";

const EXPORTS = [
  { key: "orders", label: "Orders" },
  { key: "customers", label: "Customers" },
  { key: "sellers", label: "Sellers" },
  { key: "payments", label: "Payments" },
  { key: "procurement", label: "Procurement" },
  { key: "receivables", label: "Receivables" },
  { key: "analytics", label: "Analytics" },
] as const;

export function QuickExport() {
  const open = useUiStore((s) => s.exportOpen);
  const setExportOpen = useUiStore((s) => s.setExportOpen);
  const data = useDataStore();

  const run = (key: (typeof EXPORTS)[number]["key"]) => {
    if (key === "orders") {
      downloadCsv(
        "petrotrade-orders.csv",
        data.orders.map((row) => ({
          id: row.id,
          buyer: row.buyer,
          seller: row.seller,
          grade: row.grade,
          value: row.value,
          status: row.status,
          source: row.source,
        })),
      );
    } else if (key === "customers") {
      downloadCsv(
        "petrotrade-customers.csv",
        data.customers.map((row) => ({
          id: row.id,
          company: row.company,
          location: row.location,
          kyc: row.kycStatus,
          spend: row.spend,
          source: row.source,
        })),
      );
    } else if (key === "sellers") {
      downloadCsv(
        "petrotrade-sellers.csv",
        data.sellers.map((row) => ({
          id: row.id,
          company: row.company,
          kyc: row.kycStatus,
          revenue: row.revenue,
          source: row.source,
        })),
      );
    } else if (key === "payments") {
      downloadCsv(
        "petrotrade-payments.csv",
        data.payments.map((row) => ({
          id: row.id,
          order: row.orderId,
          amount: row.amount,
          status: row.status,
        })),
      );
    } else if (key === "procurement") {
      const state = useProcurementStore.getState();
      const visible = applyFilters(state.procurements, {
        search: state.filters.search,
        quick: state.filters.quick,
        kpi: state.filters.kpi,
        advanced: state.filters.advanced,
      });
      downloadCsv("petrotrade-procurement-export.csv", visible.map(toExportRow));
    } else if (key === "receivables") {
      downloadCsv(
        "petrotrade-receivables.csv",
        data.receivables.map((row) => ({
          invoice: row.invoice,
          customer: row.customer,
          outstanding: row.outstanding,
          daysOverdue: row.daysOverdue,
        })),
      );
    } else {
      downloadCsv("petrotrade-analytics.csv", [
        { metric: "Buyers", value: 1284 },
        { metric: "Sellers", value: 452 },
        { metric: "Orders", value: 8920 },
        { metric: "Revenue INR", value: 142000000 },
      ]);
    }
    toast.success("CSV downloaded");
    setExportOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setExportOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick Export</DialogTitle>
          <DialogDescription>Download a CSV of live mock platform data.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-2">
          {EXPORTS.map((item) => (
            <Button key={item.key} type="button" variant="outline" onClick={() => run(item.key)}>
              <Download className="size-3.5" />
              {item.label}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
