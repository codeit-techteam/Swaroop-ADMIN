"use client";

import { Download, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { GradeRequestActions } from "@/components/grade-requests/grade-request-actions";
import { DetailRow } from "@/components/shared/detail-drawer";
import { EntityWorkbench } from "@/components/shared/entity-workbench";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  GRADE_REQUEST_STATUS_LABELS,
  GRADE_REQUESTER_TYPE_LABELS,
  getGradeRequest,
  getGradeRequestDocumentUrl,
  getGradeRequestSummary,
  getRequesterAccountEmail,
  getRequesterAccountPhone,
  getRequesterCompanyName,
  getRequesterType,
  listGradeRequests,
  type GradeRequest,
  type GradeRequestDetail,
  type GradeRequestRequesterType,
  type GradeRequestStatus,
  type GradeRequestSummary,
} from "@/lib/api/grade-requests";
import { formatDate, formatDateTime, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const OPEN: GradeRequestStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "INFO_REQUIRED",
  "GRADE_IDENTIFIED",
  "QUOTATION_AVAILABLE",
];

type RequesterFilter = "ALL" | GradeRequestRequesterType;

const REQUESTER_FILTERS: { value: RequesterFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "SELLER", label: "Seller" },
];

const ACTOR_ROLE_LABELS: Record<string, string> = {
  CUSTOMER: "Customer",
  SELLER: "Seller",
  ADMIN: "Admin",
  SUPER_ADMIN: "Admin",
  SYSTEM: "System",
};

function actorRoleLabel(role: string | null | undefined) {
  if (!role) return "";
  return (
    ACTOR_ROLE_LABELS[role] ??
    role.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
  );
}

/** "SELLER_RESPONDED" -> "Seller responded" */
function eventTypeLabel(type: string) {
  return type
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function RequesterBadge({ type }: { type: GradeRequestRequesterType }) {
  return (
    <StatusBadge
      value={GRADE_REQUESTER_TYPE_LABELS[type]}
      className={
        type === "SELLER"
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : "border-sky-200 bg-sky-50 text-sky-700"
      }
    />
  );
}

export default function GradeRequestsPage() {
  const [rows, setRows] = useState<GradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GradeRequestDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [summary, setSummary] = useState<GradeRequestSummary | null>(null);
  const [requesterFilter, setRequesterFilter] =
    useState<RequesterFilter>("ALL");
  const hasLoaded = useRef(false);

  const load = useCallback(async (mode: "initial" | "refresh") => {
    if (mode === "initial") setLoading(true);
    else setRefreshing(true);
    try {
      const [nextRows, nextSummary] = await Promise.all([
        listGradeRequests(
          requesterFilter === "ALL" ? undefined : requesterFilter,
        ),
        getGradeRequestSummary().catch(() => null),
      ]);
      setRows(nextRows);
      if (nextSummary) setSummary(nextSummary);
      setLoadError(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load grade requests.";
      if (mode === "initial") setLoadError(message);
      else toast.error(message);
    } finally {
      hasLoaded.current = true;
      setLoading(false);
      setRefreshing(false);
    }
  }, [requesterFilter]);

  // Initial load, and a silent refetch whenever the requester filter changes.
  useEffect(() => {
    void load(hasLoaded.current ? "refresh" : "initial");
  }, [load]);

  // Load the full record (timeline + documents) whenever a row is opened.
  const loadDetail = useCallback(async (id: string) => {
    try {
      setDetail(await getGradeRequest(id));
      setDetailError(null);
    } catch (error) {
      setDetail(null);
      setDetailError(
        error instanceof Error ? error.message : "Unable to load request.",
      );
    }
  }, []);

  useEffect(() => {
    setDetail(null);
    setDetailError(null);
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const reload = useCallback(() => {
    void load("refresh");
    if (selectedId) void loadDetail(selectedId);
  }, [load, loadDetail, selectedId]);

  const kpis = useMemo(() => {
    const fromRows = (...statuses: GradeRequestStatus[]) =>
      rows.filter((r) => statuses.includes(r.status)).length;
    const byStatus = summary?.byStatus;
    return [
      {
        label: "Submitted",
        value: String(byStatus?.SUBMITTED ?? fromRows("SUBMITTED")),
        tone: "warning" as const,
      },
      {
        label: "Under review",
        value: String(byStatus?.UNDER_REVIEW ?? fromRows("UNDER_REVIEW")),
      },
      {
        label: "Info required",
        value: String(byStatus?.INFO_REQUIRED ?? fromRows("INFO_REQUIRED")),
        tone: "warning" as const,
      },
      {
        label: "Unassigned",
        value: String(
          summary?.unassigned ??
            rows.filter((r) => r.isOpen && !r.assignedAdmin).length,
        ),
      },
      {
        label: "Open",
        value: String(summary?.open ?? rows.filter((r) => r.isOpen).length),
      },
    ];
  }, [rows, summary]);

  const openDocument = async (requestId: string, documentId: string) => {
    try {
      const res = await getGradeRequestDocumentUrl(requestId, documentId);
      if (res.url) window.open(res.url, "_blank", "noopener,noreferrer");
      else
        toast.error(
          "File storage is not configured, so this file cannot be opened.",
        );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to open document",
      );
    }
  };

  return (
    <EntityWorkbench
      title="New Grade Requests"
      description="Customers and sellers can request grades that are missing from the catalogue. Review, ask for information, map to an existing grade or create a new (unpublished) one."
      kpis={kpis}
      loading={loading}
      loadingError={loadError}
      onRetry={() => void load("initial")}
      selectedId={selectedId}
      onSelectedIdChange={setSelectedId}
      actions={
        <>
          <div
            className="flex gap-1.5"
            role="group"
            aria-label="Filter by requester type"
          >
            {REQUESTER_FILTERS.map((item) => (
              <Button
                key={item.value}
                type="button"
                size="sm"
                variant={requesterFilter === item.value ? "default" : "outline"}
                disabled={refreshing}
                onClick={() => setRequesterFilter(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={refreshing}
            onClick={() => void load("refresh")}
          >
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </>
      }
      rows={rows}
      getRowId={(r) => r.id}
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
          header: "Requested grade",
          sortable: true,
          accessor: (r) => r.gradeName,
        },
        {
          key: "mfr",
          header: "Manufacturer",
          accessor: (r) => r.manufacturer ?? "—",
        },
        {
          key: "requester",
          header: "Requester",
          sortable: true,
          accessor: (r) => getRequesterCompanyName(r),
          render: (r) => (
            <div className="flex items-center gap-2">
              <span>{getRequesterCompanyName(r)}</span>
              <RequesterBadge type={getRequesterType(r)} />
            </div>
          ),
        },
        {
          key: "qty",
          header: "Quantity",
          accessor: (r) => `${r.quantity} ${r.unit}`,
        },
        {
          key: "status",
          header: "Status",
          render: (r) => (
            <StatusBadge value={GRADE_REQUEST_STATUS_LABELS[r.status]} />
          ),
        },
        {
          key: "assignee",
          header: "Assigned to",
          accessor: (r) => r.assignedAdmin?.name ?? "Unassigned",
        },
        {
          key: "submitted",
          header: "Submitted",
          sortable: true,
          accessor: (r) => r.submittedAt,
          render: (r) => formatRelativeTime(r.submittedAt),
        },
      ]}
      searchPlaceholder="Search by reference, grade, manufacturer, requester"
      searchFn={(r, q) =>
        `${r.referenceNumber} ${r.gradeName} ${r.manufacturer ?? ""} ${r.materialCategory} ${getRequesterCompanyName(r)} ${getRequesterType(r)} ${r.contact.name}`
          .toLowerCase()
          .includes(q)
      }
      filters={[
        {
          label: "Open",
          value: "OPEN",
          predicate: (r) => OPEN.includes(r.status),
        },
        {
          label: "Submitted",
          value: "SUBMITTED",
          predicate: (r) => r.status === "SUBMITTED",
        },
        {
          label: "Under review",
          value: "UNDER_REVIEW",
          predicate: (r) => r.status === "UNDER_REVIEW",
        },
        {
          label: "Info required",
          value: "INFO_REQUIRED",
          predicate: (r) => r.status === "INFO_REQUIRED",
        },
        {
          label: "Grade identified",
          value: "GRADE_IDENTIFIED",
          predicate: (r) => r.status === "GRADE_IDENTIFIED",
        },
        {
          label: "Quotation",
          value: "QUOTATION_AVAILABLE",
          predicate: (r) => r.status === "QUOTATION_AVAILABLE",
        },
        {
          label: "Converted",
          value: "CONVERTED_TO_PR",
          predicate: (r) => r.status === "CONVERTED_TO_PR",
        },
        {
          label: "Rejected / closed",
          value: "DONE",
          predicate: (r) => r.status === "REJECTED" || r.status === "CLOSED",
        },
        {
          label: "Unassigned",
          value: "UNASSIGNED",
          predicate: (r) => r.isOpen && !r.assignedAdmin,
        },
      ]}
      emptyTitle="No new grade requests yet."
      emptyDescription="When a customer or seller requests a grade that is not in the catalogue it will appear here."
      exportName="new-grade-requests"
      exportRow={(r) => ({
        reference: r.referenceNumber,
        grade: r.gradeName,
        manufacturer: r.manufacturer,
        materialCategory: r.materialCategory,
        requesterType: getRequesterType(r),
        requester: getRequesterCompanyName(r),
        contact: r.contact.name,
        phone: r.contact.phone,
        quantity: `${r.quantity} ${r.unit}`,
        deliveryLocation: r.deliveryLocation,
        status: GRADE_REQUEST_STATUS_LABELS[r.status],
        assignedTo: r.assignedAdmin?.name ?? "",
        submittedAt: r.submittedAt,
      })}
      drawerTitle={(r) => r.referenceNumber}
      drawerDescription={(r) => `${r.gradeName} · ${getRequesterCompanyName(r)} (${GRADE_REQUESTER_TYPE_LABELS[getRequesterType(r)]})`}
      drawerClassName="sm:max-w-xl"
      renderDetails={(r) => {
        const d = detail && detail.id === r.id ? detail : null;
        const view: GradeRequest = d ?? r;
        return (
          <div className="space-y-5">
            <dl>
              <DetailRow
                label="Status"
                value={
                  <StatusBadge
                    value={GRADE_REQUEST_STATUS_LABELS[view.status]}
                  />
                }
              />
              <DetailRow
                label="Assigned to"
                value={view.assignedAdmin?.name ?? "Unassigned"}
              />
              <DetailRow label="Requested grade" value={view.gradeName} />
              <DetailRow label="Material" value={view.materialCategory} />
              <DetailRow
                label="Manufacturer"
                value={view.manufacturer ?? "—"}
              />
              <DetailRow label="Application" value={view.application ?? "—"} />
              <DetailRow
                label="Quantity"
                value={`${view.quantity} ${view.unit}`}
              />
              <DetailRow
                label="Delivery"
                value={`${view.deliveryLocation}${view.deliveryPincode ? ` – ${view.deliveryPincode}` : ""}`}
              />
              <DetailRow
                label="Required by"
                value={
                  view.requiredByDate ? formatDate(view.requiredByDate) : "—"
                }
              />
              <DetailRow
                label="Packaging"
                value={view.preferredPackaging ?? "—"}
              />
              <DetailRow
                label="Submitted"
                value={formatDateTime(view.submittedAt)}
              />
            </dl>

            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Requester
              </h3>
              <dl>
                <DetailRow
                  label="Type"
                  value={<RequesterBadge type={getRequesterType(view)} />}
                />
                <DetailRow
                  label="Company"
                  value={getRequesterCompanyName(view)}
                />
                <DetailRow label="Contact" value={view.contact.name} />
                <DetailRow
                  label="Phone"
                  value={view.contact.phone ?? getRequesterAccountPhone(view) ?? "—"}
                />
                <DetailRow
                  label="Email"
                  value={
                    view.contact.email ?? getRequesterAccountEmail(view) ?? "—"
                  }
                />
              </dl>
            </section>

            {view.technicalSpecs ? (
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Technical specs
                </h3>
                <p className="whitespace-pre-wrap rounded-md border bg-slate-50 p-3 text-sm">
                  {view.technicalSpecs}
                </p>
              </section>
            ) : null}
            {view.remarks ? (
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Remarks
                </h3>
                <p className="whitespace-pre-wrap rounded-md border bg-slate-50 p-3 text-sm">
                  {view.remarks}
                </p>
              </section>
            ) : null}
            {view.customerResponse ? (
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Latest response
                </h3>
                <p className="whitespace-pre-wrap rounded-md border border-sky-200 bg-sky-50 p-3 text-sm">
                  {view.customerResponse}
                </p>
              </section>
            ) : null}

            {view.resolvedGrade ? (
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Catalogue grade
                </h3>
                <dl>
                  <DetailRow
                    label="Grade"
                    value={
                      view.resolvedGrade.displayName ?? view.resolvedGrade.name
                    }
                  />
                  <DetailRow label="Code" value={view.resolvedGrade.code} />
                  <DetailRow
                    label="Published"
                    value={
                      view.resolvedGrade.status === "ACTIVE" &&
                      view.resolvedGrade.customerVisible
                        ? "Yes — visible to customers"
                        : "No — publish it in Grade Master"
                    }
                  />
                  <DetailRow
                    label="Resolution"
                    value={
                      view.resolutionType === "CREATED_NEW"
                        ? "New grade created"
                        : "Mapped to existing"
                    }
                  />
                </dl>
              </section>
            ) : null}

            {detailError ? (
              <p className="text-sm text-red-600">
                {detailError}{" "}
                <button
                  className="underline"
                  onClick={() => void loadDetail(r.id)}
                >
                  Retry
                </button>
              </p>
            ) : null}

            {d ? (
              <>
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Attachments ({d.documents.length})
                  </h3>
                  {d.documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No documents attached.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {d.documents.map((doc) => (
                        <li
                          key={doc.id}
                          className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                        >
                          <span className="truncate">
                            {doc.fileName}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {doc.documentType}
                            </span>
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void openDocument(d.id, doc.id)}
                          >
                            <Download className="size-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Decision history
                  </h3>
                  <ol className="space-y-3">
                    {d.timeline.map((e) => (
                      <li
                        key={e.id}
                        className={cn(
                          "relative border-l pl-4",
                          e.internal ? "border-amber-300" : "border-slate-200",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute -left-1 top-1.5 size-2 rounded-full",
                            e.internal ? "bg-amber-400" : "bg-primary",
                          )}
                        />
                        <p className="text-sm font-medium">
                          {e.toStatus
                            ? GRADE_REQUEST_STATUS_LABELS[e.toStatus]
                            : eventTypeLabel(e.type)}
                          {e.internal ? (
                            <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                              INTERNAL
                            </span>
                          ) : null}
                        </p>
                        {e.message ? (
                          <p className="whitespace-pre-wrap text-xs text-slate-600">
                            {e.message}
                          </p>
                        ) : null}
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {e.actorName
                            ? `${e.actorName} (${actorRoleLabel(e.actorRole)})`
                            : actorRoleLabel(e.actorRole)}{" "}
                          ·{" "}
                          {formatDateTime(e.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
              </>
            ) : !detailError ? (
              <p className="text-sm text-muted-foreground">Loading history…</p>
            ) : null}
          </div>
        );
      }}
      drawerFooter={(r) => (
        <GradeRequestActions
          request={detail && detail.id === r.id ? detail : r}
          onChanged={(updated) => {
            if (updated) setDetail(updated);
          }}
          onReload={reload}
        />
      )}
    />
  );
}
