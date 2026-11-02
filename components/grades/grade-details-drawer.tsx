"use client";

import { FileText, Loader2, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { DetailDrawer, DetailRow } from "@/components/shared/detail-drawer";
import { GradeAuditTimeline } from "@/components/grades/grade-audit-timeline";
import { GradeStatusBadge } from "@/components/grades/grade-status-badge";
import { GradeVisibilityBadge } from "@/components/grades/grade-visibility-badge";
import { TdsUploadDialog } from "@/components/tds/tds-upload-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listTdsDocuments, type TdsDocument } from "@/lib/api/tds";
import { formatDateTime } from "@/lib/format";
import { formatRsKg, usageCount } from "@/lib/grade-utils";
import { formatInr, mtFromKg } from "@/lib/price-units";
import { GRADE_IMPACT_SURFACES, type Grade, type GradeAuditEvent } from "@/types/grade";

function formatRsKgAndMt(value: string | null) {
  if (value == null || value === "") return "—";
  const kg = Number(value);
  if (!Number.isFinite(kg)) return formatRsKg(value);
  return `₹${formatInr(kg, 2)} / kg · ₹${formatInr(mtFromKg(kg), 0)} / MT`;
}

function formatBytes(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value <= 0) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

interface GradeDetailsDrawerProps {
  grade: Grade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (grade: Grade) => void;
  auditEvents: GradeAuditEvent[];
}

export function GradeDetailsDrawer({ grade, open, onOpenChange, onEdit, auditEvents }: GradeDetailsDrawerProps) {
  if (!grade) return null;
  const used = usageCount(grade.usage);

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={grade.gradeName}
      description={grade.gradeCode}
      contentClassName="sm:max-w-lg"
      footer={
        <Button type="button" className="w-full" onClick={() => onEdit(grade)}>
          Edit Grade
        </Button>
      }
    >
      <GradeDetailsContent grade={grade} used={used} auditEvents={auditEvents} />
    </DetailDrawer>
  );
}

export function GradeDetailsContent({
  grade,
  used,
  auditEvents,
}: {
  grade: Grade;
  used: number;
  auditEvents: GradeAuditEvent[];
}) {
  return (
    <Tabs defaultValue="overview">
      <TabsList className="mb-3">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="tds">TDS</TabsTrigger>
        <TabsTrigger value="usage">Usage</TabsTrigger>
        <TabsTrigger value="audit">Audit</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <dl>
          <DetailRow label="Grade Code" value={<span className="font-mono">{grade.gradeCode}</span>} />
          <DetailRow label="Grade Name" value={grade.gradeName} />
          <DetailRow label="Category" value={grade.categoryName} />
          <DetailRow label="Grade Group" value={grade.gradeGroup || "—"} />
          <DetailRow label="Grade No." value={grade.gradeNo || "—"} />
          <DetailRow label="Manufacturer" value={grade.manufacturer || "—"} />
          <DetailRow label="Full Grade Name" value={grade.fullGradeName || "—"} />
          <DetailRow label="HSN Code" value={grade.hsnCode || "—"} />
          <DetailRow label="In Today's Delhi List" value={grade.inTodaysDelhiPriceList ? "Yes" : "No"} />
          <DetailRow label="Price Today" value={formatRsKgAndMt(grade.priceTodayRsKg)} />
          <DetailRow
            label="Producer Price"
            value={
              grade.producerPriceRsKg
                ? `${formatRsKgAndMt(grade.producerPriceRsKg)}${grade.producerPriceType ? ` · ${grade.producerPriceType}` : ""}`
                : "—"
            }
          />
          {grade.source ? (
            <>
              <DetailRow
                label="Marketplace note"
                value="Customer Material Price comes from seller Offers (₹/MT), not this Delhi reference. Fix checkout ₹10/MT listings under Commerce → Offers."
              />
              <DetailRow label="Source" value={`${grade.source} · v${grade.version}`} />
              <DetailRow label="Source Reference" value={grade.sourceReference || "—"} />
              <DetailRow label="Last Imported" value={grade.lastImportedAt ? formatDateTime(grade.lastImportedAt) : "—"} />
            </>
          ) : null}
          <DetailRow label="Description" value={grade.description || "—"} />
          <DetailRow label="Applications" value={grade.applications.join(", ") || "—"} />
          <DetailRow label="Features" value={(grade.features ?? []).join(", ") || "—"} />
          <DetailRow label="Catalog MFI" value={grade.catalogSpecs?.mfi || "—"} />
          <DetailRow label="Catalog Density" value={grade.catalogSpecs?.density || "—"} />
          <DetailRow label="CAS Number" value={grade.catalogSpecs?.casNumber || "—"} />
          <DetailRow label="Default Packaging" value={grade.catalogSpecs?.defaultPackaging || "—"} />
          <DetailRow label="Status" value={<GradeStatusBadge status={grade.status} />} />
          <DetailRow label="Customer" value={<GradeVisibilityBadge visible={grade.customerVisible} />} />
          <DetailRow label="Seller" value={<GradeVisibilityBadge visible={grade.sellerVisible} />} />
          <DetailRow label="Sort Order" value={String(grade.sortOrder)} />
          <DetailRow label="Created At" value={formatDateTime(grade.createdAt)} />
          <DetailRow label="Created By" value={grade.createdBy || "—"} />
          <DetailRow label="Last Updated" value={formatDateTime(grade.updatedAt)} />
          <DetailRow label="Updated By" value={grade.updatedBy || "—"} />
        </dl>
      </TabsContent>
      <TabsContent value="tds">
        <GradeTdsPanel grade={grade} />
      </TabsContent>
      <TabsContent value="usage">
        <p className="mb-3 text-sm text-muted-foreground">
          Usage is mocked until transactional APIs are connected. Historical records are never deleted when a grade is
          deactivated.
        </p>
        <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
          <UsageStat label="Marketplace offers" value={grade.usage.marketplaceOffers} />
          <UsageStat label="Purchase requests" value={grade.usage.purchaseRequests} />
          <UsageStat label="Orders" value={grade.usage.orders} />
          <UsageStat label="Invoices" value={grade.usage.invoices} />
          <UsageStat label="Shipments" value={grade.usage.shipments} />
          <UsageStat label="Reports" value={grade.usage.reports} />
        </div>
        <p className="section-label mb-2">Used by</p>
        <ul className="space-y-1 text-sm">
          {GRADE_IMPACT_SURFACES.map((surface) => (
            <li key={surface} className="rounded border bg-slate-50 px-2 py-1.5">
              {surface}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">Total references: {used}</p>
      </TabsContent>
      <TabsContent value="audit">
        <GradeAuditTimeline events={auditEvents} />
      </TabsContent>
    </Tabs>
  );
}

function GradeTdsPanel({ grade }: { grade: Grade }) {
  const [docs, setDocs] = useState<TdsDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items } = await listTdsDocuments({
        q: grade.gradeCode,
        limit: 50,
      });
      setDocs(items.filter((doc) => doc.gradeId === grade.id || doc.gradeCode === grade.gradeCode));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load TDS documents.");
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [grade.gradeCode, grade.id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900">Technical Data Sheets</p>
          <p className="text-[11px] text-muted-foreground">
            Grade-level TDS is consumed by Customer and Seller apps after verification.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setUploadOpen(true)}>
          <Upload className="size-3.5" />
          Upload TDS
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-md border bg-slate-50 px-3 py-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading TDS…
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-md border border-dashed bg-slate-50 px-3 py-6 text-center text-sm text-muted-foreground">
          No TDS linked to this grade yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {docs.map((doc) => (
            <li key={doc.id} className="rounded-md border bg-white px-3 py-2">
              <div className="flex items-start gap-2">
                <FileText className="mt-0.5 size-4 text-slate-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{doc.documentTitle || doc.originalFilename || "TDS"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {doc.verificationStatus}
                    {doc.mimeType ? ` · ${doc.mimeType}` : ""}
                    {doc.fileSizeBytes != null ? ` · ${formatBytes(doc.fileSizeBytes)}` : ""}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <TdsUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        presetGrade={{
          gradeId: grade.id,
          gradeName: grade.gradeName,
          gradeCode: grade.gradeCode,
          manufacturer: grade.manufacturer,
        }}
        onDone={() => {
          toast.success("TDS uploaded.");
          void load();
        }}
      />
    </div>
  );
}

function UsageStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-slate-50 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
