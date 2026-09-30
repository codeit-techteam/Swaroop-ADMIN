"use client";

import { Download } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DocumentPreview } from "@/components/documents/document-preview";
import { ReasonDialog } from "@/components/documents/reason-dialog";
import { SellerOnboardingPanel } from "@/components/documents/seller-onboarding-panel";
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

const REJECT_PRESETS = [
  "Document is blurry or unreadable. Please upload a clearer copy.",
  "Document is incomplete — all pages must be visible.",
  "Details do not match the business registered on PetroTrade.",
  "Document has expired. Please upload a valid copy.",
];

function formatBytes(bytes?: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function DocumentsPage() {
  const rows = useDataStore((s) => s.documents);
  const pushAudit = useDataStore((s) => s.pushAudit);
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<PlatformDocument | null>(null);
  const [panelRefresh, setPanelRefresh] = useState(0);

  // Silent reloads keep the drawer mounted after review actions.
  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setLoadError(null);
    try {
      useDataStore.setState({ documents: await listAdminDocuments() });
    } catch (error) {
      if (options?.silent) {
        toast.error(errorMessage(error, "Unable to refresh documents."));
      } else {
        setLoadError(errorMessage(error, "Unable to load documents."));
        useDataStore.setState({ documents: [] });
      }
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) setSelectedId(id);
    void load();
  }, [load]);

  const afterReview = async () => {
    setPanelRefresh((n) => n + 1);
    await load({ silent: true });
  };

  const audit = (action: string, row: PlatformDocument) =>
    pushAudit({
      admin: user?.name ?? "Admin",
      role: user?.role ?? "ADMIN",
      action: `${action} ${row.name}`,
      module: "Documents",
      entity: row.id,
      result: "Success",
    });

  const handleVerify = async (row: PlatformDocument) => {
    setBusyId(row.id);
    try {
      await approveAdminDocument(row.id);
      audit("Verified", row);
      toast.success("Document verified — the seller sees it as approved.");
      await afterReview();
    } catch (error) {
      toast.error(errorMessage(error, "Verify failed"));
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (row: PlatformDocument, reason: string) => {
    try {
      await rejectAdminDocument(row.id, reason);
      audit("Rejected", row);
      toast.success("Document rejected — the seller was notified to upload a replacement.");
      await afterReview();
    } catch (error) {
      toast.error(errorMessage(error, "Reject failed"));
      throw error;
    }
  };

  const handleDownload = async (row: PlatformDocument) => {
    setBusyId(row.id);
    try {
      const data = await downloadAdminDocument(row.id, "attachment");
      if (!data?.url) throw new Error("Download URL was not issued");
      const link = document.createElement("a");
      link.href = data.url;
      link.rel = "noopener";
      link.download = data.fileName ?? row.fileName ?? "document";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error(errorMessage(error, "Download failed"));
    } finally {
      setBusyId(null);
    }
  };

  const kpis = useMemo(() => {
    const pending = rows.filter((r) => r.status === "Pending");
    return [
      { label: "Pending review", value: String(pending.length), tone: "warning" as const },
      {
        label: "Seller onboarding pending",
        value: String(pending.filter((r) => r.isOnboarding).length),
        tone: "warning" as const,
      },
      {
        label: "Verified",
        value: String(rows.filter((r) => r.status === "Verified").length),
        tone: "success" as const,
      },
      {
        label: "Rejected",
        value: String(rows.filter((r) => r.status === "Rejected").length),
        tone: "danger" as const,
      },
    ];
  }, [rows]);

  return (
    <>
      <EntityWorkbench
        title="Document Center"
        description="Seller onboarding and compliance documents uploaded from the Seller App and Seller Web, stored in Cloudflare R2. Preview, download, verify or reject each file, then approve the seller."
        kpis={kpis}
        loading={loading}
        loadingError={loadError}
        onRetry={() => void load()}
        rows={rows}
        getRowId={(r) => r.id}
        selectedId={selectedId}
        onSelectedIdChange={setSelectedId}
        pageSize={10}
        columns={[
          {
            key: "name",
            header: "Document",
            sortable: true,
            accessor: (r) => r.name,
            render: (r) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[r.documentNumber, formatBytes(r.fileSizeBytes)].filter(Boolean).join(" · ")}
                </p>
              </div>
            ),
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
          `${r.name} ${r.category} ${r.entity} ${r.source} ${r.documentNumber ?? ""} ${r.uploadedBy?.phone ?? ""}`
            .toLowerCase()
            .includes(q)
        }
        filters={[
          { label: "Pending", value: "Pending", predicate: (r) => r.status === "Pending" },
          { label: "Onboarding", value: "Onboarding", predicate: (r) => Boolean(r.isOnboarding) },
          { label: "Seller App", value: "Seller App", predicate: (r) => r.source === "Seller App" },
          { label: "Seller Web", value: "Seller Web", predicate: (r) => r.source === "Seller Web" },
          { label: "KYC", value: "KYC", predicate: (r) => r.category === "KYC" },
          { label: "GST", value: "GST", predicate: (r) => r.category === "GST" },
          { label: "PAN", value: "PAN", predicate: (r) => r.category === "PAN" },
          { label: "Bank", value: "Bank", predicate: (r) => r.category === "Bank" },
          { label: "Verified", value: "Verified", predicate: (r) => r.status === "Verified" },
          {
            label: "Rejected",
            value: "Rejected",
            predicate: (r) => r.status === "Rejected" || r.status === "Revision Requested",
          },
        ]}
        emptyTitle="No documents found."
        emptyDescription="Documents appear here as soon as a seller finishes uploading them from the Seller App or Seller Web."
        exportName="documents"
        exportRow={(r) => ({
          name: r.name,
          documentNumber: r.documentNumber ?? "",
          category: r.category,
          entity: r.entity,
          status: r.status,
          source: r.source,
          uploadedAt: r.uploadedAt,
          uploadedBy: r.uploadedBy?.name ?? "",
          rejectionReason: r.rejectionReason ?? "",
        })}
        drawerTitle={(r) => r.name}
        drawerDescription={(r) => `${r.entity} · ${r.category}`}
        drawerClassName="sm:max-w-2xl"
        renderDetails={(r) => (
          <div className="flex flex-col gap-4">
            <DocumentPreview key={r.id} documentId={r.id} mimeType={r.mimeType} fileName={r.fileName} />

            {r.status === "Rejected" && r.rejectionReason ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                <span className="font-semibold">Rejected:</span> {r.rejectionReason}
              </div>
            ) : null}

            <dl>
              <DetailRow label="Document no." value={r.documentNumber ?? "—"} />
              <DetailRow label="File" value={`${r.fileName ?? r.name} · ${formatBytes(r.fileSizeBytes)}`} />
              <DetailRow label="Category" value={r.category} />
              <DetailRow label="Seller / Entity" value={r.entity} />
              {r.organization?.gstin ? <DetailRow label="GSTIN" value={r.organization.gstin} /> : null}
              <DetailRow
                label="Uploaded by"
                value={
                  r.uploadedBy
                    ? [r.uploadedBy.name, r.uploadedBy.phone].filter(Boolean).join(" · ")
                    : "—"
                }
              />
              <DetailRow label="Uploaded" value={formatDateTime(r.uploadedAt)} />
              {r.reviewedAt ? <DetailRow label="Reviewed" value={formatDateTime(r.reviewedAt)} /> : null}
              <DetailRow label="Status" value={<StatusBadge value={r.status} />} />
              <DetailRow label="Source" value={<SourceBadge source={r.source} />} />
            </dl>

            {r.seller ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Seller onboarding
                </p>
                <SellerOnboardingPanel
                  sellerId={r.seller.id}
                  activeDocumentId={r.id}
                  refreshKey={panelRefresh}
                  onSelectDocument={setSelectedId}
                  onChanged={() => void load({ silent: true })}
                />
              </div>
            ) : null}
          </div>
        )}
        drawerFooter={(r) => {
          const busy = busyId === r.id;
          const canReview = r.status === "Pending";
          return (
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" variant="outline" disabled={busy} onClick={() => void handleDownload(r)}>
                <Download className="size-3.5" />
                Download
              </Button>
              <Button size="sm" disabled={busy || !canReview} onClick={() => void handleVerify(r)}>
                {busy ? "Working…" : r.status === "Verified" ? "Verified" : "Verify"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy || !canReview}
                onClick={() => setRejecting(r)}
              >
                Reject
              </Button>
            </div>
          );
        }}
      />
      <ReasonDialog
        open={Boolean(rejecting)}
        onOpenChange={(open) => !open && setRejecting(null)}
        title={`Reject ${rejecting?.name ?? "document"}?`}
        description="The seller is notified with this reason and asked to upload a replacement, which returns here for review."
        confirmLabel="Reject document"
        destructive
        presets={REJECT_PRESETS}
        onSubmit={(reason) => (rejecting ? handleReject(rejecting, reason) : Promise.resolve())}
      />
    </>
  );
}
