"use client";

import { useState } from "react";
import { toast } from "sonner";

import { CreditPager, CreditTable, CreditToolbar } from "@/components/credit/credit-table";
import { useCreditQuery } from "@/components/credit/use-credit-query";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { downloadCreditDocument, listCreditDocuments } from "@/lib/api/credit";
import { creditErrorMessage } from "@/lib/credit-format";
import { formatDate } from "@/lib/format";

export default function CreditDocumentsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useCreditQuery(
    () => listCreditDocuments({ search, page, limit: 20 }),
    [search, page],
  );

  const onDownload = async (id: string) => {
    try {
      const result = await downloadCreditDocument(id);
      if (result.storagePending || !result.url) {
        toast.message("R2 storage is not connected yet. Document key is retained for later download.");
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(creditErrorMessage(err, "Unable to download this document."));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Credit Documents"
        description="KYC and financial documents for credit review. File storage uses the existing StorageService; R2 is pending."
        breadcrumbs={[{ label: "Credit Management", href: "/credit" }, { label: "Documents" }]}
      />
      <CreditToolbar
        search={search}
        onSearch={(value) => {
          setPage(1);
          setSearch(value);
        }}
        searchPlaceholder="Search document or customer"
      />
      {loading ? (
        <>
          <p className="text-sm text-muted-foreground">Loading credit documents…</p>
          <TableSkeleton />
        </>
      ) : error ? (
        <ErrorState title="Unable to load credit information. Please try again." description={error} onRetry={reload} />
      ) : (
        <>
          <CreditTable
            rows={data?.items ?? []}
            getRowId={(row) => row.id}
            emptyTitle="No credit documents found."
            emptyDescription="Requested and uploaded credit documents will appear here."
            columns={[
              { key: "doc", header: "Document", accessor: (r) => r.documentNumber ?? r.fileName },
              { key: "file", header: "File", accessor: (r) => r.fileName },
              { key: "customer", header: "Customer", accessor: (r) => r.organizationName ?? "—" },
              { key: "cat", header: "Category", accessor: (r) => r.category },
              { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
              { key: "storage", header: "Storage", render: (r) => (r.storagePending ? "Pending R2" : r.storageProvider) },
              { key: "key", header: "File key", accessor: (r) => r.storageKey },
              { key: "date", header: "Uploaded", render: (r) => formatDate(r.createdAt) },
              {
                key: "actions",
                header: "Actions",
                render: (r) => (
                  <Button size="sm" variant="outline" onClick={() => void onDownload(r.id)}>
                    {r.storagePending ? "View key" : "Download"}
                  </Button>
                ),
              },
            ]}
          />
          <CreditPager meta={data?.meta} onPage={setPage} />
        </>
      )}
    </div>
  );
}
