"use client";

import { DetailDrawer, DetailRow } from "@/components/shared/detail-drawer";
import { GradeAuditTimeline } from "@/components/grades/grade-audit-timeline";
import { GradeStatusBadge } from "@/components/grades/grade-status-badge";
import { GradeVisibilityBadge } from "@/components/grades/grade-visibility-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime } from "@/lib/format";
import { formatRsKg, usageCount } from "@/lib/grade-utils";
import { GRADE_IMPACT_SURFACES, type Grade, type GradeAuditEvent } from "@/types/grade";

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
        <TabsTrigger value="usage">Usage</TabsTrigger>
        <TabsTrigger value="audit">Audit</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <dl>
          <DetailRow label="Grade Code" value={<span className="font-mono">{grade.gradeCode}</span>} />
          <DetailRow label="Grade Name" value={grade.gradeName} />
          <DetailRow label="Category" value={grade.categoryName} />
          {grade.source ? (
            <>
              <DetailRow label="Grade Group" value={grade.gradeGroup || "—"} />
              <DetailRow label="Grade No." value={grade.gradeNo || "—"} />
              <DetailRow label="Manufacturer" value={grade.manufacturer || "—"} />
              <DetailRow label="Full Grade Name" value={grade.fullGradeName || "—"} />
              <DetailRow label="In Today's Delhi List" value={grade.inTodaysDelhiPriceList ? "Yes" : "No"} />
              <DetailRow label="Price Today (₹/kg)" value={formatRsKg(grade.priceTodayRsKg)} />
              <DetailRow
                label="Producer Price (₹/kg)"
                value={
                  grade.producerPriceRsKg
                    ? `${formatRsKg(grade.producerPriceRsKg)}${grade.producerPriceType ? ` · ${grade.producerPriceType}` : ""}`
                    : "—"
                }
              />
              <DetailRow label="Source" value={`${grade.source} · v${grade.version}`} />
              <DetailRow label="Source Reference" value={grade.sourceReference || "—"} />
              <DetailRow label="Last Imported" value={grade.lastImportedAt ? formatDateTime(grade.lastImportedAt) : "—"} />
            </>
          ) : null}
          <DetailRow label="Description" value={grade.description || "—"} />
          <DetailRow label="Applications" value={grade.applications.join(", ") || "—"} />
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

function UsageStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-slate-50 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
