"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ReasonDialog } from "@/components/documents/reason-dialog";
import { KycReviewPanel } from "@/components/kyc/kyc-review-panel";
import { RequestChangesDialog } from "@/components/kyc/request-changes-dialog";
import { EntityWorkbench } from "@/components/shared/entity-workbench";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  approveAdminDocument,
  approveAdminKyc,
  getAdminKycDetail,
  listAdminKyc,
  rejectAdminDocument,
  rejectAdminKyc,
  requestAdminKycChanges,
} from "@/lib/api/ops";
import { formatDateTime } from "@/lib/format";
import { useDataStore } from "@/store/data-store";
import type { AdminKycDetail, AdminKycDocument, KycRecord } from "@/types";

const REJECT_PRESETS = [
  "Documents do not match the registered business details.",
  "GST registration is cancelled or could not be verified.",
  "Business is not eligible to trade on PetroTrade.",
];

const DOCUMENT_REJECT_PRESETS = [
  "The copy is blurred or unreadable.",
  "Name on the document does not match the business.",
  "Document has expired.",
];

type DialogState =
  | { kind: "approve" }
  | { kind: "reject" }
  | { kind: "changes"; documentId?: string }
  | { kind: "reject-document"; doc: AdminKycDocument }
  | null;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function pickActiveDocument(detail: AdminKycDetail, keepId: string | null) {
  const docs = detail.slots.flatMap((slot) => (slot.document ? [slot.document] : []));
  if (keepId && docs.some((doc) => doc.id === keepId)) return keepId;
  return (docs.find((doc) => doc.status === "Pending") ?? docs[0])?.id ?? null;
}

export default function KycPage() {
  const rows = useDataStore((s) => s.kyc);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminKycDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const detailRequest = useRef(0);

  const selected = useMemo(() => rows.find((row) => row.id === selectedId) ?? null, [rows, selectedId]);

  const loadList = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      useDataStore.setState({ kyc: await listAdminKyc() });
    } catch (error) {
      if (silent) {
        toast.error(errorMessage(error, "Unable to refresh KYC records."));
      } else {
        setLoadError(errorMessage(error, "Unable to load KYC records."));
        useDataStore.setState({ kyc: [] });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (record: KycRecord, keepDocumentId: string | null = null) => {
    if (!record.entityId) return;
    const request = ++detailRequest.current;
    setDetailError(null);
    try {
      const next = await getAdminKycDetail(record);
      if (request !== detailRequest.current) return;
      setDetail(next);
      setActiveDocumentId(pickActiveDocument(next, keepDocumentId));
    } catch (error) {
      if (request !== detailRequest.current) return;
      setDetailError(errorMessage(error, "Unable to load KYC record."));
    }
  }, []);

  useEffect(() => {
    void loadList();
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) setSelectedId(id);
  }, [loadList]);

  const selectedKey = selected ? `${selected.entityType}:${selected.entityId}` : null;
  useEffect(() => {
    setDetail(null);
    setActiveDocumentId(null);
    if (selected) void loadDetail(selected);
    // Reload only when a different record is opened, not on every list refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, loadDetail]);

  const refresh = async (keepDocumentId: string | null = activeDocumentId) => {
    await Promise.all([loadList(true), selected ? loadDetail(selected, keepDocumentId) : Promise.resolve()]);
  };

  const runAction = async (action: () => Promise<void>, success: string, failure: string) => {
    try {
      await action();
      toast.success(success);
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error, failure));
      throw error;
    }
  };

  const verifyDocument = (doc: AdminKycDocument) => {
    void runAction(
      () => approveAdminDocument(doc.id, `Verified during KYC review of ${selected?.entity ?? "entity"}`),
      `${doc.slotLabel} verified.`,
      "Could not verify the document.",
    ).catch(() => undefined);
  };

  const audience = selected?.entityType === "Customer" ? "customer" : "seller";
  const approved = selected?.status === "Approved";
  const blockers = detail?.blockers ?? [];
  const pendingDocs = detail?.record.documentsPending ?? 0;

  return (
    <>
      <EntityWorkbench
        title="KYC Control Center"
        description="Review seller onboarding and customer KYC packs uploaded from the Seller and Customer apps. View every document, then approve, reject or request changes."
        loading={loading}
        loadingError={loadError}
        onRetry={() => void loadList()}
        rows={rows}
        getRowId={(r) => r.id}
        selectedId={selectedId}
        onSelectedIdChange={setSelectedId}
        drawerClassName="sm:max-w-2xl"
        kpis={[
          { label: "Awaiting review", value: String(rows.filter((r) => r.status === "Under Review").length), tone: "warning" },
          { label: "Changes requested", value: String(rows.filter((r) => r.status === "Changes Requested").length) },
          { label: "Not submitted", value: String(rows.filter((r) => r.status === "Pending").length) },
          { label: "Approved", value: String(rows.filter((r) => r.status === "Approved").length), tone: "success" },
        ]}
        columns={[
          {
            key: "entity",
            header: "Entity",
            sortable: true,
            accessor: (r) => r.entity,
            render: (r) => (
              <div className="min-w-0">
                <p className="truncate font-medium">{r.entity}</p>
                {r.phone || r.email ? (
                  <p className="truncate text-xs text-muted-foreground">{r.phone || r.email}</p>
                ) : null}
              </div>
            ),
          },
          { key: "type", header: "Type", accessor: (r) => r.entityType },
          {
            key: "submitted",
            header: "Submitted",
            sortable: true,
            accessor: (r) => r.submitted,
            render: (r) => (r.status === "Pending" ? "—" : formatDateTime(r.submitted)),
          },
          {
            key: "documents",
            header: "Documents",
            accessor: (r) => r.documents,
            render: (r) => (
              <span className="text-sm">
                {r.documents}
                {r.documentsPending ? <span className="text-amber-700"> · {r.documentsPending} pending</span> : null}
                {r.documentsMissing?.length ? (
                  <span className="text-muted-foreground"> · {r.documentsMissing.length} missing</span>
                ) : null}
              </span>
            ),
          },
          { key: "risk", header: "Risk", render: (r) => <StatusBadge value={r.risk} /> },
          { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
          { key: "source", header: "Source", render: (r) => <SourceBadge source={r.source} /> },
        ]}
        searchPlaceholder="Search by company, GSTIN, PAN or phone"
        searchFn={(r, q) =>
          `${r.entity} ${r.entityType} ${r.gst} ${r.pan} ${r.phone ?? ""} ${r.email ?? ""}`.toLowerCase().includes(q)
        }
        filters={[
          { label: "Under Review", value: "Under Review", predicate: (r) => r.status === "Under Review" },
          { label: "Changes Requested", value: "Changes Requested", predicate: (r) => r.status === "Changes Requested" },
          { label: "Not submitted", value: "Pending", predicate: (r) => r.status === "Pending" },
          { label: "Approved", value: "Approved", predicate: (r) => r.status === "Approved" },
          { label: "Rejected", value: "Rejected", predicate: (r) => r.status === "Rejected" },
          { label: "Sellers", value: "Seller", predicate: (r) => r.entityType === "Seller" },
          { label: "Customers", value: "Customer", predicate: (r) => r.entityType === "Customer" },
        ]}
        emptyTitle="No KYC records found."
        emptyDescription="Seller onboarding and customer KYC submitted from the apps will appear here."
        exportName="kyc"
        exportRow={(r) => ({
          id: r.entityId ?? r.id,
          entity: r.entity,
          type: r.entityType,
          status: r.status,
          gstin: r.gst,
          pan: r.pan,
          documents: r.documents,
          pending: r.documentsPending ?? 0,
          missing: r.documentsMissing?.join("; ") ?? "",
          submitted: r.status === "Pending" ? "" : r.submitted,
          source: r.source,
        })}
        drawerTitle={(r) => r.entity}
        drawerDescription={(r) => `${r.entityType} KYC · ${r.status}`}
        renderDetails={(r) => (
          <KycReviewPanel
            record={r}
            detail={detail && detail.record.id === r.id ? detail : null}
            error={detailError}
            onRetry={() => void loadDetail(r)}
            activeDocumentId={activeDocumentId}
            onSelectDocument={setActiveDocumentId}
            onVerifyDocument={verifyDocument}
            onRejectDocument={(doc) => setDialog({ kind: "reject-document", doc })}
          />
        )}
        drawerFooter={(r) => (
          <div className="grid grid-cols-3 gap-2">
            <Button
              size="sm"
              disabled={!detail || approved || blockers.length > 0}
              title={blockers.length ? `Blocked: ${blockers.join(", ")}` : undefined}
              onClick={() => setDialog({ kind: "approve" })}
            >
              {approved ? "Approved" : "Approve"}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={!detail || r.status === "Rejected"}
              onClick={() => setDialog({ kind: "reject" })}
            >
              Reject
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!detail || approved}
              onClick={() => setDialog({ kind: "changes" })}
            >
              Request Changes
            </Button>
          </div>
        )}
      />

      {selected && detail ? (
        <>
          <ReasonDialog
            open={dialog?.kind === "approve"}
            onOpenChange={(open) => !open && setDialog(null)}
            title={`Approve ${selected.entity}?`}
            description={
              pendingDocs
                ? `${pendingDocs} document(s) still pending review will be marked Verified and the ${audience} is notified.`
                : `All documents are verified. The ${audience} is notified that KYC is approved.`
            }
            confirmLabel="Approve KYC"
            required={false}
            placeholder="Internal notes (optional)"
            onSubmit={(notes) =>
              runAction(
                () => approveAdminKyc(selected, notes),
                `${selected.entity} approved.`,
                "Approval failed.",
              )
            }
          />
          <ReasonDialog
            open={dialog?.kind === "reject"}
            onOpenChange={(open) => !open && setDialog(null)}
            title={`Reject ${selected.entity}?`}
            description={`The ${audience} is notified with this reason. Use Request Changes instead if they only need to fix documents or details.`}
            confirmLabel="Reject KYC"
            destructive
            presets={REJECT_PRESETS}
            placeholder={`Visible to the ${audience}`}
            onSubmit={(reason) =>
              runAction(
                () => rejectAdminKyc(selected, reason),
                `${selected.entity} rejected — ${audience} notified.`,
                "Rejection failed.",
              )
            }
          />
          <ReasonDialog
            open={dialog?.kind === "reject-document"}
            onOpenChange={(open) => !open && setDialog(null)}
            title={dialog?.kind === "reject-document" ? `Reject ${dialog.doc.slotLabel}?` : "Reject document"}
            description={`Only this file is rejected. To ask the ${audience} for a new upload, follow up with Request Changes.`}
            confirmLabel="Reject document"
            destructive
            presets={DOCUMENT_REJECT_PRESETS}
            placeholder={`Visible to the ${audience}`}
            onSubmit={(reason) => {
              if (dialog?.kind !== "reject-document") return Promise.resolve();
              const doc = dialog.doc;
              return runAction(
                () => rejectAdminDocument(doc.id, reason),
                `${doc.slotLabel} rejected.`,
                "Could not reject the document.",
              );
            }}
          />
          <RequestChangesDialog
            open={dialog?.kind === "changes"}
            onOpenChange={(open) => !open && setDialog(null)}
            entityName={selected.entity}
            audience={audience}
            slots={detail.slots}
            initialDocumentId={dialog?.kind === "changes" ? dialog.documentId : null}
            onSubmit={(reason, documentIds) =>
              runAction(
                () => requestAdminKycChanges(selected, reason, documentIds),
                `Changes requested — ${selected.entity} has been notified.`,
                "Could not request changes.",
              )
            }
          />
        </>
      ) : null}
    </>
  );
}
