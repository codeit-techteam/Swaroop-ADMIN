"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DetailRow } from "@/components/shared/detail-drawer";
import { EntityWorkbench } from "@/components/shared/entity-workbench";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  approveAdminDocument,
  downloadAdminDocument,
  listAdminDocuments,
  rejectAdminDocument,
} from "@/lib/api/ops";
import { formatDateTime } from "@/lib/format";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore } from "@/store/data-store";
import type { PlatformDocument } from "@/types";

export default function DocumentsPage() {
  const rows = useDataStore((s) => s.documents);
  const updateDocument = useDataStore((s) => s.updateDocument);
  const pushAudit = useDataStore((s) => s.pushAudit);
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      useDataStore.setState({ documents: await listAdminDocuments() });
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Unable to load documents.",
      );
      useDataStore.setState({ documents: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const withBusy = async (id: string, action: () => Promise<void>) => {
    setBusyId(id);
    try {
      await action();
    } finally {
      setBusyId(null);
    }
  };

  const handleVerify = async (row: PlatformDocument) => {
    await withBusy(row.id, async () => {
      await approveAdminDocument(row.id);
      updateDocument(row.id, { status: "Verified" });
      pushAudit({
        admin: user?.name ?? "Admin",
        role: user?.role ?? "ADMIN",
        action: `Verified ${row.name}`,
        module: "Documents",
        entity: row.id,
        result: "Success",
      });
      toast.success("Document verified — seller panel will show Approved.");
      await load();
    });
  };

  const handleReject = async (row: PlatformDocument) => {
    const reason = window.prompt(
      "Rejection reason (required — visible to the seller):",
      "Document unclear or incomplete. Please upload a clearer copy.",
    );
    if (!reason?.trim()) {
      toast.error("Rejection reason is required.");
      return;
    }
    await withBusy(row.id, async () => {
      await rejectAdminDocument(row.id, reason.trim());
      updateDocument(row.id, { status: "Rejected" });
      pushAudit({
        admin: user?.name ?? "Admin",
        role: user?.role ?? "ADMIN",
        action: `Rejected ${row.name}`,
        module: "Documents",
        entity: row.id,
        result: "Success",
      });
      toast.success("Document rejected — seller must upload a replacement.");
      await load();
    });
  };

  const handleRequestRevision = async (row: PlatformDocument) => {
    const reason =
      window.prompt(
        "Ask seller for a new version:",
        "Please upload a revised document for verification.",
      ) ?? "Please upload a revised document for verification.";
    await withBusy(row.id, async () => {
      await rejectAdminDocument(row.id, reason.trim());
      updateDocument(row.id, { status: "Revision Requested" });
      toast.success("Revision requested — seller can replace and resubmit.");
      await load();
    });
  };

  const handleDownload = async (row: PlatformDocument) => {
    await withBusy(row.id, async () => {
      const data = await downloadAdminDocument(row.id);
      if (!data?.url) {
        throw new Error("Download URL was not issued");
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
      toast.success("Download opened");
    });
  };

  return (
    <EntityWorkbench
      title="Document Center"
      description="Review seller onboarding and compliance documents. Approve or reject — status syncs to the seller panel. Replacements return here for re-approval."
      loading={loading}
      loadingError={loadError}
      onRetry={() => void load()}
      rows={rows}
      getRowId={(r) => r.id}
      columns={[
        {
          key: "name",
          header: "Document",
          sortable: true,
          accessor: (r) => r.name,
        },
        { key: "category", header: "Category", accessor: (r) => r.category },
        { key: "entity", header: "Seller / Entity", accessor: (r) => r.entity },
        {
          key: "uploaded",
          header: "Uploaded",
          render: (r) => formatDateTime(r.uploadedAt),
        },
        {
          key: "status",
          header: "Status",
          render: (r) => <StatusBadge value={r.status} />,
        },
        {
          key: "source",
          header: "Source",
          render: (r) => <SourceBadge source={r.source} />,
        },
      ]}
      searchPlaceholder="Search documents, sellers, categories"
      searchFn={(r, q) =>
        `${r.name} ${r.category} ${r.entity} ${r.source}`.toLowerCase().includes(q)
      }
      filters={[
        {
          label: "Pending",
          value: "Pending",
          predicate: (r) => r.status === "Pending",
        },
        {
          label: "Seller Web",
          value: "Seller Web",
          predicate: (r) => r.source === "Seller Web",
        },
        { label: "KYC", value: "KYC", predicate: (r) => r.category === "KYC" },
        { label: "GST", value: "GST", predicate: (r) => r.category === "GST" },
        { label: "PAN", value: "PAN", predicate: (r) => r.category === "PAN" },
        {
          label: "Verified",
          value: "Verified",
          predicate: (r) => r.status === "Verified",
        },
        {
          label: "Rejected",
          value: "Rejected",
          predicate: (r) =>
            r.status === "Rejected" || r.status === "Revision Requested",
        },
      ]}
      emptyTitle="No documents found."
      emptyDescription="Seller onboarding and compliance uploads appear here for verification."
      exportName="documents"
      exportRow={(r) => ({
        name: r.name,
        category: r.category,
        entity: r.entity,
        status: r.status,
        source: r.source,
      })}
      drawerTitle={(r) => r.name}
      renderDetails={(r) => (
        <dl>
          <DetailRow label="Category" value={r.category} />
          <DetailRow label="Seller / Entity" value={r.entity} />
          <DetailRow label="Status" value={<StatusBadge value={r.status} />} />
          <DetailRow label="Source" value={<SourceBadge source={r.source} />} />
          <DetailRow label="Uploaded" value={formatDateTime(r.uploadedAt)} />
        </dl>
      )}
      drawerFooter={(r) => {
        const busy = busyId === r.id;
        const canReview = r.status === "Pending" || r.status === "Revision Requested";
        return (
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                void handleDownload(r).catch((error: unknown) =>
                  toast.error(
                    error instanceof Error ? error.message : "Download failed",
                  ),
                );
              }}
            >
              Download
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                void handleDownload(r).catch((error: unknown) =>
                  toast.error(
                    error instanceof Error ? error.message : "Preview failed",
                  ),
                );
              }}
            >
              View
            </Button>
            <Button
              size="sm"
              disabled={busy || (!canReview && r.status === "Verified")}
              onClick={() => {
                void handleVerify(r).catch((error: unknown) =>
                  toast.error(
                    error instanceof Error ? error.message : "Verify failed",
                  ),
                );
              }}
            >
              {busy ? "Working…" : "Verify"}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={busy || r.status === "Rejected"}
              onClick={() => {
                void handleReject(r).catch((error: unknown) =>
                  toast.error(
                    error instanceof Error ? error.message : "Reject failed",
                  ),
                );
              }}
            >
              Reject
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="col-span-2"
              disabled={busy}
              onClick={() => {
                void handleRequestRevision(r).catch((error: unknown) =>
                  toast.error(
                    error instanceof Error ? error.message : "Request failed",
                  ),
                );
              }}
            >
              Request New Version
            </Button>
          </div>
        );
      }}
    />
  );
}
