"use client";

import { CloudDownload, RefreshCw, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { DetailRow } from "@/components/shared/detail-drawer";
import { EntityWorkbench } from "@/components/shared/entity-workbench";
import { StatusBadge } from "@/components/shared/status-badge";
import { TdsDocumentActions } from "@/components/tds/tds-document-actions";
import { TdsUploadDialog } from "@/components/tds/tds-upload-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  TDS_REQUEST_STATUS_LABELS,
  TDS_SOURCE_LABELS,
  TDS_STATUS_LABELS,
  getTdsDashboard,
  getTdsPreview,
  listAllTdsDocuments,
  listAllTdsRequests,
  syncTdsFromStorage,
  updateTdsRequest,
  type TdsDashboard,
  type TdsDocument,
  type TdsRequest,
  type TdsRequestStatus,
  type TdsSourceKind,
  type TdsVerificationStatus,
} from "@/lib/api/tds";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tab = "documents" | "requests";

function formatBytes(bytes?: number | null) {
  if (bytes == null || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function gradeLabel(doc: TdsDocument) {
  return doc.grade?.name ?? doc.gradeCode ?? "—";
}

function productLabel(doc: TdsDocument) {
  return (
    doc.productName?.trim() ||
    doc.linkedProducts?.[0]?.name?.trim() ||
    null
  );
}

const REQUEST_NEXT: Record<TdsRequestStatus, TdsRequestStatus[]> = {
  OPEN: ["IN_PROGRESS", "FULFILLED", "REJECTED", "CLOSED"],
  IN_PROGRESS: ["FULFILLED", "REJECTED", "CLOSED"],
  FULFILLED: ["CLOSED"],
  REJECTED: ["OPEN", "CLOSED"],
  CLOSED: ["OPEN"],
};

export default function TdsLibraryPage() {
  const [tab, setTab] = useState<Tab>("documents");
  const [docs, setDocs] = useState<TdsDocument[]>([]);
  const [requests, setRequests] = useState<TdsRequest[]>([]);
  const [dashboard, setDashboard] = useState<TdsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [docFilter, setDocFilter] = useState("all");
  const [reqFilter, setReqFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reqNotes, setReqNotes] = useState<Record<string, string>>({});
  const [uploadOpen, setUploadOpen] = useState(false);
  const [replaceDoc, setReplaceDoc] = useState<TdsDocument | null>(null);
  const [fulfillRequest, setFulfillRequest] = useState<TdsRequest | null>(null);
  const hasLoaded = useRef(false);

  const load = useCallback(async (mode: "initial" | "refresh") => {
    if (mode === "initial") setLoading(true);
    else setRefreshing(true);
    try {
      const [nextDocs, nextRequests, nextDashboard] = await Promise.all([
        listAllTdsDocuments(),
        listAllTdsRequests(),
        getTdsDashboard().catch(() => null),
      ]);
      setDocs(nextDocs);
      setRequests(nextRequests);
      if (nextDashboard) setDashboard(nextDashboard);
      setLoadError(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load TDS library.";
      if (mode === "initial") setLoadError(message);
      else toast.error(message);
    } finally {
      hasLoaded.current = true;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load("initial");
  }, [load]);

  const reload = useCallback(() => {
    void load("refresh");
  }, [load]);

  const openPreview = async (doc: TdsDocument) => {
    setBusyId(doc.id);
    try {
      const preview = await getTdsPreview(doc.id);
      if (preview.url) window.open(preview.url, "_blank", "noopener,noreferrer");
      else toast.error("Preview URL was not issued.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to open preview",
      );
    } finally {
      setBusyId(null);
    }
  };

  const runStorageSync = async () => {
    setSyncing(true);
    try {
      const result = await syncTdsFromStorage({ autoVerify: true });
      toast.success(
        `Storage sync complete — ${result.created} created, ${result.updated} updated, ${result.verified} verified`,
      );
      if (result.needsMapping > 0) {
        toast.message(
          `${result.needsMapping} file(s) need grade mapping before publish`,
        );
      }
      setTab("documents");
      setDocFilter(result.needsMapping > 0 && result.verified === 0 ? "NEEDS_MAPPING" : "all");
      await load("refresh");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Storage sync failed",
      );
    } finally {
      setSyncing(false);
    }
  };

  const toggleDocFilter = (value: string) => {
    setDocFilter((current) => (current === value ? "all" : value));
  };

  const toggleReqFilter = (value: string) => {
    setReqFilter((current) => (current === value ? "all" : value));
  };

  const docKpis = useMemo(() => {
    const d = dashboard;
    return [
      {
        label: "Pending review",
        value: String(d?.pendingReview ?? docs.filter((r) => r.verificationStatus === "PENDING_REVIEW").length),
        tone: "warning" as const,
        active: docFilter === "PENDING_REVIEW",
        onClick: () => toggleDocFilter("PENDING_REVIEW"),
      },
      {
        label: "Needs mapping",
        value: String(d?.needsMapping ?? docs.filter((r) => r.verificationStatus === "NEEDS_MAPPING").length),
        tone: "warning" as const,
        active: docFilter === "NEEDS_MAPPING",
        onClick: () => toggleDocFilter("NEEDS_MAPPING"),
      },
      {
        label: "Verified",
        value: String(d?.verified ?? docs.filter((r) => r.verificationStatus === "VERIFIED").length),
        tone: "success" as const,
        active: docFilter === "VERIFIED",
        onClick: () => toggleDocFilter("VERIFIED"),
      },
      {
        label: "Missing",
        value: String(d?.missing ?? docs.filter((r) => r.verificationStatus === "MISSING").length),
        active: docFilter === "MISSING",
        onClick: () => toggleDocFilter("MISSING"),
      },
      {
        label: "Open requests",
        value: String(d?.openRequests ?? requests.filter((r) => r.status === "OPEN" || r.status === "IN_PROGRESS").length),
        active: false,
        onClick: () => {
          setTab("requests");
          setReqFilter("OPEN");
        },
      },
    ];
  }, [dashboard, docs, requests, docFilter]);

  const reqKpis = useMemo(() => {
    const count = (status: TdsRequestStatus) =>
      String(requests.filter((r) => r.status === status).length);
    return [
      {
        label: "Open",
        value: count("OPEN"),
        tone: "warning" as const,
        active: reqFilter === "OPEN",
        onClick: () => toggleReqFilter("OPEN"),
      },
      {
        label: "In progress",
        value: count("IN_PROGRESS"),
        active: reqFilter === "IN_PROGRESS",
        onClick: () => toggleReqFilter("IN_PROGRESS"),
      },
      {
        label: "Fulfilled",
        value: count("FULFILLED"),
        tone: "success" as const,
        active: reqFilter === "FULFILLED",
        onClick: () => toggleReqFilter("FULFILLED"),
      },
      {
        label: "Closed / rejected",
        value: String(requests.filter((r) => r.status === "CLOSED" || r.status === "REJECTED").length),
        active: reqFilter === "CLOSED_REJECTED",
        onClick: () => toggleReqFilter("CLOSED_REJECTED"),
      },
    ];
  }, [requests, reqFilter]);

  const saveRequest = async (
    row: TdsRequest,
    input: { status?: TdsRequestStatus; adminNotes?: string },
  ) => {
    setBusyId(row.id);
    try {
      const updated = await updateTdsRequest(row.id, input);
      setRequests((current) =>
        current.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
      );
      toast.success(`Request ${row.referenceNumber} updated`);
      void getTdsDashboard()
        .then(setDashboard)
        .catch(() => undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const openFulfillUpload = (row: TdsRequest) => {
    setReplaceDoc(null);
    setFulfillRequest(row);
    setUploadOpen(true);
  };

  const tabActions = (
    <>
      <div className="flex gap-1.5" role="group" aria-label="TDS sections">
        {(
          [
            { value: "documents" as const, label: "Documents" },
            { value: "requests" as const, label: "Requests" },
          ] as const
        ).map((item) => (
          <Button
            key={item.value}
            type="button"
            size="sm"
            variant={tab === item.value ? "default" : "outline"}
            onClick={() => setTab(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      {tab === "documents" ? (
        <>
          <Button
            size="sm"
            variant="outline"
            disabled={syncing || refreshing}
            onClick={() => void runStorageSync()}
          >
            <CloudDownload className={cn("size-4", syncing && "animate-pulse")} />
            {syncing ? "Syncing…" : "Sync from storage"}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setReplaceDoc(null);
              setFulfillRequest(null);
              setUploadOpen(true);
            }}
          >
            <Upload className="size-4" />
            Upload TDS
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          onClick={() => {
            setReplaceDoc(null);
            setFulfillRequest(null);
            setUploadOpen(true);
          }}
        >
          <Upload className="size-4" />
          Upload TDS
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={refreshing || syncing}
        onClick={() => void load("refresh")}
      >
        <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
        Refresh
      </Button>
    </>
  );

  const uploadDialog = (
    <TdsUploadDialog
      open={uploadOpen}
      onOpenChange={(next) => {
        setUploadOpen(next);
        if (!next) {
          setReplaceDoc(null);
          setFulfillRequest(null);
        }
      }}
      replaceDocument={replaceDoc}
      presetGrade={
        fulfillRequest
          ? {
              gradeId: fulfillRequest.gradeId,
              gradeName:
                fulfillRequest.grade?.displayName ??
                fulfillRequest.grade?.name ??
                null,
              gradeCode: fulfillRequest.grade?.code ?? null,
            }
          : null
      }
      onDone={(doc) => {
        setSelectedDocId(doc.id);
        setTab("documents");
        setDocFilter("VERIFIED");
        if (fulfillRequest) {
          setRequests((current) =>
            current.map((r) =>
              r.id === fulfillRequest.id
                ? {
                    ...r,
                    status: "FULFILLED",
                    fulfilledDocumentId: doc.id,
                    resolvedAt: new Date().toISOString(),
                  }
                : r,
            ),
          );
          setSelectedReqId(null);
        }
        void load("refresh");
      }}
    />
  );

  if (tab === "requests") {
    return (
      <>
      <EntityWorkbench
        title="TDS Library"
        description="Customer requests for missing technical data sheets. Upload a TDS to fulfill, or update status and leave admin notes."
        kpis={reqKpis}
        loading={loading}
        loadingError={loadError}
        onRetry={() => void load("initial")}
        actions={tabActions}
        rows={requests}
        getRowId={(r) => r.id}
        selectedId={selectedReqId}
        onSelectedIdChange={setSelectedReqId}
        filter={reqFilter}
        onFilterChange={setReqFilter}
        pageSize={10}
        columns={[
          {
            key: "ref",
            header: "Reference",
            sortable: true,
            accessor: (r) => r.referenceNumber,
          },
          {
            key: "grade",
            header: "Grade",
            sortable: true,
            accessor: (r) => r.grade?.displayName ?? r.grade?.name ?? r.gradeId,
            render: (r) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800">
                  {r.grade?.displayName ?? r.grade?.name ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.grade?.code ?? r.gradeId}
                </p>
              </div>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (r) => (
              <StatusBadge value={TDS_REQUEST_STATUS_LABELS[r.status]} />
            ),
          },
          {
            key: "created",
            header: "Requested",
            sortable: true,
            accessor: (r) => r.createdAt,
            render: (r) => formatRelativeTime(r.createdAt),
          },
        ]}
        searchPlaceholder="Search by reference or grade"
        searchFn={(r, q) =>
          `${r.referenceNumber} ${r.grade?.code ?? ""} ${r.grade?.name ?? ""} ${r.grade?.displayName ?? ""} ${r.message ?? ""}`
            .toLowerCase()
            .includes(q)
        }
        filters={[
          { label: "Open", value: "OPEN", predicate: (r) => r.status === "OPEN" },
          {
            label: "In progress",
            value: "IN_PROGRESS",
            predicate: (r) => r.status === "IN_PROGRESS",
          },
          {
            label: "Fulfilled",
            value: "FULFILLED",
            predicate: (r) => r.status === "FULFILLED",
          },
          {
            label: "Rejected",
            value: "REJECTED",
            predicate: (r) => r.status === "REJECTED",
          },
          {
            label: "Closed",
            value: "CLOSED",
            predicate: (r) => r.status === "CLOSED",
          },
          {
            label: "Closed / rejected",
            value: "CLOSED_REJECTED",
            predicate: (r) => r.status === "CLOSED" || r.status === "REJECTED",
          },
        ]}
        emptyTitle="No TDS requests yet."
        emptyDescription="When a customer asks for a missing TDS it will appear here."
        exportName="tds-requests"
        exportRow={(r) => ({
          reference: r.referenceNumber,
          grade: r.grade?.displayName ?? r.grade?.name ?? "",
          gradeCode: r.grade?.code ?? "",
          status: TDS_REQUEST_STATUS_LABELS[r.status],
          message: r.message,
          adminNotes: r.adminNotes,
          createdAt: r.createdAt,
          resolvedAt: r.resolvedAt,
        })}
        drawerTitle={(r) => r.referenceNumber}
        drawerDescription={(r) =>
          r.grade?.displayName ?? r.grade?.name ?? "TDS request"
        }
        renderDetails={(r) => (
          <div className="space-y-4">
            <dl>
              <DetailRow
                label="Status"
                value={
                  <StatusBadge value={TDS_REQUEST_STATUS_LABELS[r.status]} />
                }
              />
              <DetailRow
                label="Grade"
                value={r.grade?.displayName ?? r.grade?.name ?? "—"}
              />
              <DetailRow label="Grade code" value={r.grade?.code ?? "—"} />
              <DetailRow
                label="Requested"
                value={formatDateTime(r.createdAt)}
              />
              <DetailRow
                label="Resolved"
                value={r.resolvedAt ? formatDateTime(r.resolvedAt) : "—"}
              />
            </dl>
            {r.message ? (
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Customer message
                </h3>
                <p className="whitespace-pre-wrap rounded-md border bg-slate-50 p-3 text-sm">
                  {r.message}
                </p>
              </section>
            ) : null}
          </div>
        )}
        drawerFooter={(r) => {
          const notes = reqNotes[r.id] ?? r.adminNotes ?? "";
          const next = REQUEST_NEXT[r.status];
          const canUpload =
            r.status === "OPEN" || r.status === "IN_PROGRESS";
          return (
            <div className="space-y-3">
              {canUpload ? (
                <Button
                  size="sm"
                  className="w-full"
                  disabled={busyId === r.id}
                  onClick={() => openFulfillUpload(r)}
                >
                  <Upload className="size-4" />
                  Upload TDS to fulfill
                </Button>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor={`tds-req-notes-${r.id}`}>Admin notes</Label>
                <Textarea
                  id={`tds-req-notes-${r.id}`}
                  rows={3}
                  value={notes}
                  onChange={(e) =>
                    setReqNotes((m) => ({ ...m, [r.id]: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === r.id}
                  onClick={() =>
                    void saveRequest(r, { adminNotes: notes.trim() || undefined })
                  }
                >
                  Save notes
                </Button>
                {next.map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={
                      status === "REJECTED" ? "destructive" : "default"
                    }
                    disabled={busyId === r.id}
                    onClick={() =>
                      void saveRequest(r, {
                        status,
                        adminNotes: notes.trim() || undefined,
                      })
                    }
                  >
                    Mark {TDS_REQUEST_STATUS_LABELS[status]}
                  </Button>
                ))}
              </div>
            </div>
          );
        }}
      />
      {uploadDialog}
      </>
    );
  }

  return (
    <>
    <EntityWorkbench
      title="TDS Library"
      description="Upload TDS by marketplace product, sync files already in storage, or review imported sheets. Titles sync to product names. Approve to publish on Customer App, Customer WebApp, Seller App, and Seller WebApp."
      kpis={docKpis}
      loading={loading}
      loadingError={loadError}
      onRetry={() => void load("initial")}
      actions={tabActions}
      rows={docs}
      getRowId={(r) => r.id}
      selectedId={selectedDocId}
      onSelectedIdChange={setSelectedDocId}
      filter={docFilter}
      onFilterChange={setDocFilter}
      pageSize={10}
      columns={[
        {
          key: "title",
          header: "Document",
          sortable: true,
          accessor: (r) => r.documentTitle,
          render: (r) => (
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-800">
                {r.documentTitle}
              </p>
              <p className="text-xs text-muted-foreground">
                {[r.originalFilename, formatBytes(r.fileSizeBytes)]
                  .filter(Boolean)
                  .join(" · ") || "No file"}
              </p>
            </div>
          ),
        },
        {
          key: "product",
          header: "Product",
          sortable: true,
          accessor: (r) => productLabel(r) ?? "",
          render: (r) => {
            const name = productLabel(r);
            const linkedCount = r.linkedProducts?.length ?? 0;
            return (
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800">
                  {name ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {linkedCount > 1
                    ? `${linkedCount} linked products`
                    : name
                      ? "Synced to product"
                      : "No product link"}
                </p>
              </div>
            );
          },
        },
        {
          key: "grade",
          header: "Grade",
          sortable: true,
          accessor: (r) => gradeLabel(r),
          render: (r) => (
            <div className="min-w-0">
              <p className="truncate">{gradeLabel(r)}</p>
              <p className="text-xs text-muted-foreground">
                {r.categoryCode} · {r.producerName}
              </p>
            </div>
          ),
        },
        {
          key: "source",
          header: "Source",
          accessor: (r) => TDS_SOURCE_LABELS[r.sourceKind as TdsSourceKind] ?? r.sourceKind,
        },
        {
          key: "status",
          header: "Status",
          render: (r) => (
            <StatusBadge
              value={
                TDS_STATUS_LABELS[r.verificationStatus as TdsVerificationStatus] ??
                r.verificationStatus
              }
            />
          ),
        },
        {
          key: "updated",
          header: "Updated",
          sortable: true,
          accessor: (r) => r.updatedAt,
          render: (r) => formatRelativeTime(r.updatedAt),
        },
      ]}
      searchPlaceholder="Search product, grade, producer, title, filename"
      searchFn={(r, q) =>
        `${r.documentTitle} ${r.libraryTitle ?? ""} ${r.productName ?? ""} ${r.linkedProducts?.map((p) => p.name).join(" ") ?? ""} ${r.gradeCode} ${r.categoryCode} ${r.producerName} ${r.originalFilename ?? ""} ${r.grade?.name ?? ""} ${r.grade?.code ?? ""}`
          .toLowerCase()
          .includes(q)
      }
      filters={[
        {
          label: "Pending review",
          value: "PENDING_REVIEW",
          predicate: (r) => r.verificationStatus === "PENDING_REVIEW",
        },
        {
          label: "Needs mapping",
          value: "NEEDS_MAPPING",
          predicate: (r) => r.verificationStatus === "NEEDS_MAPPING",
        },
        {
          label: "Verified",
          value: "VERIFIED",
          predicate: (r) => r.verificationStatus === "VERIFIED",
        },
        {
          label: "Rejected",
          value: "REJECTED",
          predicate: (r) => r.verificationStatus === "REJECTED",
        },
        {
          label: "Missing",
          value: "MISSING",
          predicate: (r) => r.verificationStatus === "MISSING",
        },
        {
          label: "Has file",
          value: "HAS_FILE",
          predicate: (r) => Boolean(r.hasFile),
        },
      ]}
      emptyTitle="No TDS documents yet."
      emptyDescription="Imported sheets, admin uploads, or Sync from storage will appear here for review."
      exportName="tds-documents"
      exportRow={(r) => ({
        title: r.documentTitle,
        libraryTitle: r.libraryTitle ?? "",
        productName: productLabel(r) ?? "",
        category: r.categoryCode,
        gradeCode: r.gradeCode,
        producer: r.producerName,
        mappedGrade: r.grade?.name ?? "",
        source: TDS_SOURCE_LABELS[r.sourceKind as TdsSourceKind] ?? r.sourceKind,
        status:
          TDS_STATUS_LABELS[r.verificationStatus as TdsVerificationStatus] ??
          r.verificationStatus,
        hasFile: r.hasFile ? "yes" : "no",
        updatedAt: r.updatedAt,
      })}
      drawerTitle={(r) => r.documentTitle}
      drawerDescription={(r) =>
        `${productLabel(r) ?? r.categoryCode} · ${r.gradeCode} · ${r.producerName}`
      }
      drawerClassName="sm:max-w-xl"
      renderDetails={(r) => (
        <div className="space-y-4">
          <dl>
            <DetailRow
              label="Status"
              value={
                <StatusBadge
                  value={
                    TDS_STATUS_LABELS[
                      r.verificationStatus as TdsVerificationStatus
                    ] ?? r.verificationStatus
                  }
                />
              }
            />
            <DetailRow
              label="Source"
              value={
                TDS_SOURCE_LABELS[r.sourceKind as TdsSourceKind] ?? r.sourceKind
              }
            />
            <DetailRow
              label="Product name"
              value={productLabel(r) ?? "—"}
            />
            <DetailRow
              label="Library title"
              value={r.libraryTitle ?? "—"}
            />
            <DetailRow label="Category" value={r.categoryCode} />
            <DetailRow label="Grade code" value={r.gradeCode} />
            <DetailRow label="Producer" value={r.producerName} />
            <DetailRow
              label="Mapped grade"
              value={
                r.grade
                  ? `${r.grade.name}${r.grade.code ? ` (${r.grade.code})` : ""}`
                  : "Unmapped"
              }
            />
            <DetailRow
              label="Linked products"
              value={
                r.linkedProducts?.length
                  ? r.linkedProducts.map((p) => p.name).join(", ")
                  : "—"
              }
            />
            <DetailRow
              label="Mapping confidence"
              value={r.mappingConfidence ?? "—"}
            />
            <DetailRow label="File" value={r.originalFilename ?? "—"} />
            <DetailRow label="Size" value={formatBytes(r.fileSizeBytes)} />
            <DetailRow label="MIME" value={r.mimeType ?? "—"} />
            <DetailRow label="Revision" value={String(r.revision)} />
            <DetailRow
              label="Uploaded"
              value={r.uploadedAt ? formatDateTime(r.uploadedAt) : "—"}
            />
            <DetailRow
              label="Approved"
              value={r.approvedAt ? formatDateTime(r.approvedAt) : "—"}
            />
            <DetailRow label="Updated" value={formatDateTime(r.updatedAt)} />
          </dl>
          {r.sourceUrl ? (
            <DetailRow
              label="Source URL"
              value={
                <a
                  href={r.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-700 underline"
                >
                  Open link
                </a>
              }
            />
          ) : null}
          {r.workbookNotes || r.reviewNotes ? (
            <section className="space-y-2">
              {r.workbookNotes ? (
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Workbook notes
                  </h3>
                  <p className="whitespace-pre-wrap rounded-md border bg-slate-50 p-3 text-sm">
                    {r.workbookNotes}
                  </p>
                </div>
              ) : null}
              {r.reviewNotes ? (
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Review notes
                  </h3>
                  <p className="whitespace-pre-wrap rounded-md border bg-slate-50 p-3 text-sm">
                    {r.reviewNotes}
                  </p>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      )}
      drawerFooter={(r) => (
        <TdsDocumentActions
          document={r}
          busy={busyId === r.id}
          onBusy={(busy) => setBusyId(busy ? r.id : null)}
          onReload={reload}
          onPreview={() => void openPreview(r)}
          onReplace={() => {
            setFulfillRequest(null);
            setReplaceDoc(r);
            setUploadOpen(true);
          }}
        />
      )}
    />
    {uploadDialog}
    </>
  );
}
