"use client";

import { Plus, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { GradeBulkActions } from "@/components/grades/grade-bulk-actions";
import { GradeDeleteDialog } from "@/components/grades/grade-delete-dialog";
import { GradeDetailsDrawer } from "@/components/grades/grade-details-drawer";
import { GradeEmptyState } from "@/components/grades/grade-empty-state";
import { GradeExportMenu } from "@/components/grades/grade-export-menu";
import { GradeFilters } from "@/components/grades/grade-filters";
import { GradeForm } from "@/components/grades/grade-form";
import { GradeImportDialog } from "@/components/grades/grade-import-dialog";
import { GradeKpiCards } from "@/components/grades/grade-kpi-cards";
import { GradeSkeleton } from "@/components/grades/grade-skeleton";
import { GradeTable } from "@/components/grades/grade-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { downloadCsv, downloadExcel } from "@/lib/csv";
import { GradeServiceError, listAllGrades } from "@/lib/api/grades";
import { filtersAreActive, gradeExportRows } from "@/lib/grade-utils";
import { GRADE_PERMISSIONS, hasGradePermission } from "@/lib/grade-permissions";
import { useAuthStore } from "@/store/auth-store";
import { useGradeStore } from "@/store/grade-store";
import type { Grade, GradeBulkAction, GradeInput } from "@/types/grade";

const BULK_COPY: Record<GradeBulkAction, { title: string; description: string; success: string }> = {
  ACTIVATE: {
    title: "Activate selected grades?",
    description: "These grades will be available for new marketplace transactions if visibility allows.",
    success: "Selected grades activated.",
  },
  DEACTIVATE: {
    title: "Deactivate selected grades?",
    description: "These grades will be unavailable for new transactions. Existing historical records will not be deleted.",
    success: "Selected grades deactivated.",
  },
  CUSTOMER_VISIBLE: {
    title: "Make selected grades customer visible?",
    description: "Active grades in this set will appear in the Customer marketplace.",
    success: "Customer visibility updated.",
  },
  CUSTOMER_HIDDEN: {
    title: "Hide selected grades from customers?",
    description: "Customers will no longer browse these grades. Seller visibility is unchanged.",
    success: "Customer visibility updated.",
  },
  SELLER_VISIBLE: {
    title: "Make selected grades seller visible?",
    description: "Sellers will be able to select these grades when creating offers.",
    success: "Seller visibility updated.",
  },
  SELLER_HIDDEN: {
    title: "Hide selected grades from sellers?",
    description: "Sellers will not see these grades in offer creation. Customer visibility is unchanged.",
    success: "Seller visibility updated.",
  },
};

export function GradeMasterPage() {
  const role = useAuthStore((s) => s.user?.role);
  const grades = useGradeStore((s) => s.grades);
  const total = useGradeStore((s) => s.total);
  const filters = useGradeStore((s) => s.filters);
  const sort = useGradeStore((s) => s.sort);
  const pagination = useGradeStore((s) => s.pagination);
  const loadStatus = useGradeStore((s) => s.loadStatus);
  const loadError = useGradeStore((s) => s.loadError);
  const selectedIds = useGradeStore((s) => s.selectedGradeIds);
  const selectedGradeId = useGradeStore((s) => s.selectedGradeId);
  const isCreateOpen = useGradeStore((s) => s.isCreateOpen);
  const isEditOpen = useGradeStore((s) => s.isEditOpen);
  const isDetailsOpen = useGradeStore((s) => s.isDetailsOpen);
  const isImportOpen = useGradeStore((s) => s.isImportOpen);
  const auditEvents = useGradeStore((s) => s.auditEvents);
  const fetchGrades = useGradeStore((s) => s.fetchGrades);
  const fetchStats = useGradeStore((s) => s.fetchStats);
  const fetchFacets = useGradeStore((s) => s.fetchFacets);
  const refreshAfterImport = useGradeStore((s) => s.refreshAfterImport);
  const addGrade = useGradeStore((s) => s.addGrade);
  const updateGrade = useGradeStore((s) => s.updateGrade);
  const toggleStatus = useGradeStore((s) => s.toggleStatus);
  const deleteGrade = useGradeStore((s) => s.deleteGrade);
  const bulkUpdate = useGradeStore((s) => s.bulkUpdate);
  const toggleGradeSelection = useGradeStore((s) => s.toggleGradeSelection);
  const setSelectedGradeIds = useGradeStore((s) => s.setSelectedGradeIds);
  const clearSelection = useGradeStore((s) => s.clearSelection);
  const setSelectedGrade = useGradeStore((s) => s.setSelectedGrade);
  const setCreateOpen = useGradeStore((s) => s.setCreateOpen);
  const setEditOpen = useGradeStore((s) => s.setEditOpen);
  const setDetailsOpen = useGradeStore((s) => s.setDetailsOpen);
  const setImportOpen = useGradeStore((s) => s.setImportOpen);
  const resetFilters = useGradeStore((s) => s.resetFilters);

  const [pendingStatus, setPendingStatus] = useState<Grade | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Grade | null>(null);
  const [pendingBulk, setPendingBulk] = useState<GradeBulkAction | null>(null);
  const [pendingCodeChange, setPendingCodeChange] = useState<GradeInput | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    void fetchGrades();
  }, [fetchGrades, filters, sort, pagination]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    void fetchFacets();
  }, [fetchFacets, filters.categoryId]);

  const canView = hasGradePermission(role, GRADE_PERMISSIONS.view);
  const canCreate = hasGradePermission(role, GRADE_PERMISSIONS.create);
  const canUpdate = hasGradePermission(role, GRADE_PERMISSIONS.update);
  const canStatus = hasGradePermission(role, GRADE_PERMISSIONS.status);
  const canVisibility = hasGradePermission(role, GRADE_PERMISSIONS.visibility);
  const canImport = hasGradePermission(role, GRADE_PERMISSIONS.import);
  const canExport = hasGradePermission(role, GRADE_PERMISSIONS.export);
  const canDelete = hasGradePermission(role, GRADE_PERMISSIONS.delete);

  const selected = grades.find((item) => item.id === selectedGradeId) ?? null;
  const editing = selected;
  const hasFilters = filtersAreActive(filters);
  const existingCodes = grades.map((item) => item.gradeCode);

  async function exportRows(format: "csv" | "excel") {
    if (exporting) return;
    setExporting(true);
    try {
      const rows = gradeExportRows(await listAllGrades(filters, sort));
      if (format === "csv") downloadCsv("grade-master.csv", rows);
      else downloadExcel("grade-master.xls", rows);
      toast.success(`Grade export downloaded (${rows.length} grades).`);
    } catch (error) {
      toast.error(error instanceof GradeServiceError ? error.message : "Grade export failed.");
    } finally {
      setExporting(false);
    }
  }

  async function handleCreate(values: GradeInput) {
    try {
      const created = await addGrade(values);
      toast.success("Grade created successfully.");
      setSelectedGrade(created.id);
    } catch (error) {
      toast.error(error instanceof GradeServiceError ? error.message : "Unable to save grade.");
    }
  }

  async function handleUpdate(values: GradeInput, options?: { confirmCodeChange?: boolean }) {
    if (!editing) return;
    if (options?.confirmCodeChange && !pendingCodeChange) {
      setPendingCodeChange(values);
      return;
    }
    try {
      await updateGrade(editing.id, values);
      toast.success("Grade updated successfully.");
      setPendingCodeChange(null);
    } catch (error) {
      toast.error(error instanceof GradeServiceError ? error.message : "Unable to save grade.");
    }
  }

  if (!canView) {
    return (
      <GradeEmptyState
        filtered={false}
        title="You do not have access to Grade Master."
        description="Ask an administrator if you need permission to view or maintain grades."
      />
    );
  }

  if (loadStatus === "loading" && grades.length === 0) {
    return <GradeSkeleton />;
  }

  if (loadStatus === "error" && grades.length === 0 && !hasFilters) {
    return (
      <ErrorState
        title="Unable to load Grade Master."
        description={loadError ?? "Please try again."}
        onRetry={() => void fetchGrades()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Grade Master"
        description="Manage grades available across the Swaroop marketplace."
        breadcrumbs={[{ label: "Master Data" }, { label: "Grade Master" }]}
        actions={
          <>
            {canCreate ? (
              <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="size-3.5" />
                Add Grade
              </Button>
            ) : null}
            {canImport ? (
              <Button type="button" size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="size-3.5" />
                Import Grades
              </Button>
            ) : null}
            {canExport ? (
              <GradeExportMenu onExportCsv={() => void exportRows("csv")} onExportExcel={() => void exportRows("excel")} />
            ) : null}
          </>
        }
      />

      <GradeKpiCards />
      <GradeFilters />
      <GradeBulkActions
        count={selectedIds.length}
        canStatus={canStatus}
        canVisibility={canVisibility}
        onAction={setPendingBulk}
        onClear={clearSelection}
      />

      {loadStatus === "error" ? (
        <ErrorState
          title="Unable to load grades."
          description={loadError ?? "Please try again."}
          onRetry={() => void fetchGrades()}
        />
      ) : grades.length === 0 && loadStatus === "success" ? (
        <GradeEmptyState
          filtered={hasFilters}
          action={
            hasFilters ? (
              <Button type="button" variant="outline" onClick={resetFilters}>
                Reset Filters
              </Button>
            ) : canCreate ? (
              <Button type="button" onClick={() => setCreateOpen(true)}>
                <Plus className="size-3.5" />
                Add Grade
              </Button>
            ) : null
          }
        />
      ) : (
        <GradeTable
          rows={grades}
          total={total}
          selectedIds={selectedIds}
          onToggle={toggleGradeSelection}
          onToggleAll={setSelectedGradeIds}
          canUpdate={canUpdate}
          canStatus={canStatus}
          canDelete={canDelete}
          onView={(grade) => {
            setSelectedGrade(grade.id);
            setDetailsOpen(true);
          }}
          onEdit={(grade) => {
            setSelectedGrade(grade.id);
            setEditOpen(true);
          }}
          onToggleStatus={setPendingStatus}
          onDelete={setPendingDelete}
        />
      )}

      <GradeForm
        open={isCreateOpen}
        mode="create"
        onOpenChange={setCreateOpen}
        onSave={handleCreate}
        existingCodes={existingCodes}
      />
      <GradeForm
        open={isEditOpen}
        mode="edit"
        grade={editing}
        onOpenChange={setEditOpen}
        onSave={handleUpdate}
        existingCodes={existingCodes}
      />
      <GradeDetailsDrawer
        grade={selected}
        open={isDetailsOpen}
        onOpenChange={setDetailsOpen}
        auditEvents={auditEvents.filter((event) => event.gradeId === selected?.id || event.gradeCode === selected?.gradeCode)}
        onEdit={(grade) => {
          setDetailsOpen(false);
          setSelectedGrade(grade.id);
          setEditOpen(true);
        }}
      />
      <GradeImportDialog
        open={isImportOpen}
        onOpenChange={setImportOpen}
        onImported={() => void refreshAfterImport()}
      />
      <ConfirmDialog
        open={Boolean(pendingStatus)}
        onOpenChange={(open) => !open && setPendingStatus(null)}
        title={pendingStatus?.status === "ACTIVE" ? "Deactivate Grade?" : "Activate Grade?"}
        description={
          pendingStatus?.status === "ACTIVE"
            ? "This grade will no longer be available for new marketplace transactions. Existing historical transactions will not be deleted."
            : "This grade will become available for new marketplace transactions where visibility allows."
        }
        confirmLabel={pendingStatus?.status === "ACTIVE" ? "Deactivate" : "Activate"}
        destructive={pendingStatus?.status === "ACTIVE"}
        onConfirm={() => {
          if (!pendingStatus) return;
          const next = pendingStatus.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
          void toggleStatus(pendingStatus.id, next)
            .then(() => {
              toast.success(next === "ACTIVE" ? "Grade activated successfully." : "Grade deactivated successfully.");
              setPendingStatus(null);
            })
            .catch(() => toast.error("Unable to update status."));
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingBulk)}
        onOpenChange={(open) => !open && setPendingBulk(null)}
        title={pendingBulk ? BULK_COPY[pendingBulk].title.replace("selected", String(selectedIds.length)) : "Confirm"}
        description={
          pendingBulk === "DEACTIVATE"
            ? `Deactivate ${selectedIds.length} grades? These grades will be unavailable for new transactions.`
            : pendingBulk
              ? BULK_COPY[pendingBulk].description
              : ""
        }
        confirmLabel="Confirm"
        destructive={pendingBulk === "DEACTIVATE" || pendingBulk === "CUSTOMER_HIDDEN" || pendingBulk === "SELLER_HIDDEN"}
        onConfirm={() => {
          if (!pendingBulk) return;
          void bulkUpdate(pendingBulk)
            .then(() => {
              toast.success(BULK_COPY[pendingBulk].success);
              setPendingBulk(null);
            })
            .catch(() => toast.error("Unable to update status."));
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingCodeChange)}
        onOpenChange={(open) => !open && setPendingCodeChange(null)}
        title="Change Grade Code?"
        description="External systems may already reference this code in offers, PRs, POs, orders and reports. Only continue if you intend to remap those references."
        confirmLabel="Change Code"
        destructive
        onConfirm={() => {
          if (!pendingCodeChange) return;
          void handleUpdate(pendingCodeChange, { confirmCodeChange: false });
        }}
      />
      <GradeDeleteDialog
        grade={pendingDelete}
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          void deleteGrade(pendingDelete.id)
            .then(() => {
              toast.success("Grade deleted.");
              setPendingDelete(null);
            })
            .catch((error) => {
              toast.error(error instanceof GradeServiceError ? error.message : "Unable to save grade.");
            });
        }}
      />
    </div>
  );
}
