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
import { downloadCsv, downloadCsvText } from "@/lib/csv";
import { gradeExportRows } from "@/lib/grade-utils";
import { exportProcurement } from "@/lib/api/procurement-workbench";
import { audienceLabel, CATEGORY_LABELS, PLATFORM_LABELS, STATUS_LABELS } from "@/lib/push-notification-utils";
import { useDataStore } from "@/store/data-store";
import { useGradeStore } from "@/store/grade-store";
import { usePushNotificationStore } from "@/store/push-notification-store";
import { useUiStore } from "@/store/ui-store";

const EXPORTS = [
  { key: "orders", label: "Orders" },
  { key: "customers", label: "Customers" },
  { key: "sellers", label: "Sellers" },
  { key: "payments", label: "Payments" },
  { key: "procurement", label: "Procurement" },
  { key: "receivables", label: "Receivables" },
  { key: "grades", label: "Grades" },
  { key: "push", label: "Push Notifications" },
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
      void exportProcurement({})
        .then((file) => {
          downloadCsvText(file.filename, file.csv);
          toast.success(`Exported ${file.rowCount} procurement records`);
          setExportOpen(false);
        })
        .catch(() => toast.error("Procurement export failed."));
      return;
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
    } else if (key === "grades") {
      downloadCsv("petrotrade-grades.csv", gradeExportRows(useGradeStore.getState().grades));
    } else if (key === "push") {
      downloadCsv(
        "petrotrade-push-notifications.csv",
        usePushNotificationStore.getState().notifications.map((row) => ({
          id: row.id,
          title: row.title,
          platforms: row.platforms.map((p) => PLATFORM_LABELS[p]).join(" | "),
          audience: audienceLabel(row),
          category: CATEGORY_LABELS[row.category],
          status: STATUS_LABELS[row.status],
          delivered: row.delivered,
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
