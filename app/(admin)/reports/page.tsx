"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv";
import { useDataStore } from "@/store/data-store";
import { toast } from "sonner";

const REPORTS = [
  { name: "Orders by source", description: "Customer App vs Customer Web" },
  { name: "Seller performance", description: "Seller App vs Seller Web" },
  { name: "KYC aging", description: "Pending packs by reviewer" },
  { name: "Credit aging", description: "Receivable buckets" },
];

export default function ReportsPage() {
  const orders = useDataStore((s) => s.orders);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Reports" description="Download operating reports from mock platform data." />
      <div className="grid gap-3 md:grid-cols-2">
        {REPORTS.map((report) => (
          <div key={report.name} className="rounded-md border bg-white p-4">
            <h2 className="text-sm font-semibold">{report.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
            <Button
              className="mt-4"
              size="sm"
              variant="outline"
              onClick={() => {
                downloadCsv(
                  `${report.name.replace(/ /g, "-").toLowerCase()}.csv`,
                  orders.map((row) => ({ id: row.id, source: row.source, status: row.status, value: row.value })),
                );
                toast.success("Report downloaded");
              }}
            >
              Download CSV
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
