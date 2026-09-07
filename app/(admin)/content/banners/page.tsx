"use client";

import { Download, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BannerBulkBar } from "@/components/content/banners/banner-bulk-bar";
import { BannerDetails } from "@/components/content/banners/banner-details";
import { BannerFilters } from "@/components/content/banners/banner-filters";
import { BannerForm } from "@/components/content/banners/banner-form";
import { BannerKpis } from "@/components/content/banners/banner-kpis";
import { BannerPreview } from "@/components/content/banners/banner-preview";
import { BannerTable } from "@/components/content/banners/banner-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, KpiSkeleton, TableSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv";
import { formValuesToBanner, matchesBannerFilters, PLATFORM_LABELS, placementLabel, sortBanners, STATUS_LABELS } from "@/lib/banner-utils";
import { hasContentPermission } from "@/lib/content-permissions";
import { useBannerStore } from "@/store/banner-store";
import type { Banner, BannerInput, BannerPriority } from "@/types/banner";

export default function BannerManagementPage() {
  const banners = useBannerStore((s) => s.banners);
  const filters = useBannerStore((s) => s.filters);
  const loadStatus = useBannerStore((s) => s.loadStatus);
  const selectedIds = useBannerStore((s) => s.selectedBannerIds);
  const isCreateOpen = useBannerStore((s) => s.isCreateOpen);
  const isEditOpen = useBannerStore((s) => s.isEditOpen);
  const isPreviewOpen = useBannerStore((s) => s.isPreviewOpen);
  const isDetailsOpen = useBannerStore((s) => s.isDetailsOpen);
  const selectedBannerId = useBannerStore((s) => s.selectedBannerId);
  const previewBannerId = useBannerStore((s) => s.previewBannerId);
  const fetchBanners = useBannerStore((s) => s.fetchBanners);
  const addBanner = useBannerStore((s) => s.addBanner);
  const saveBanner = useBannerStore((s) => s.saveBanner);
  const deleteBanner = useBannerStore((s) => s.deleteBanner);
  const duplicateBanner = useBannerStore((s) => s.duplicateBanner);
  const activateBanner = useBannerStore((s) => s.activateBanner);
  const pauseBanner = useBannerStore((s) => s.pauseBanner);
  const resumeBanner = useBannerStore((s) => s.resumeBanner);
  const bulkDelete = useBannerStore((s) => s.bulkDelete);
  const bulkActivate = useBannerStore((s) => s.bulkActivate);
  const bulkPause = useBannerStore((s) => s.bulkPause);
  const bulkChangePriority = useBannerStore((s) => s.bulkChangePriority);
  const toggleBannerSelection = useBannerStore((s) => s.toggleBannerSelection);
  const setSelectedBannerIds = useBannerStore((s) => s.setSelectedBannerIds);
  const clearSelection = useBannerStore((s) => s.clearSelection);
  const setSelectedBanner = useBannerStore((s) => s.setSelectedBanner);
  const setCreateOpen = useBannerStore((s) => s.setCreateOpen);
  const setEditOpen = useBannerStore((s) => s.setEditOpen);
  const setPreviewOpen = useBannerStore((s) => s.setPreviewOpen);
  const setDetailsOpen = useBannerStore((s) => s.setDetailsOpen);
  const [pendingDelete, setPendingDelete] = useState<Banner | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);
  const [draftPreview, setDraftPreview] = useState<Banner | null>(null);

  useEffect(() => {
    void fetchBanners();
  }, [fetchBanners]);

  const rows = useMemo(
    () => sortBanners(banners.filter((item) => matchesBannerFilters(item, filters))),
    [banners, filters],
  );
  const selected = banners.find((item) => item.id === selectedBannerId) ?? null;
  const previewSource = draftPreview ?? banners.find((item) => item.id === previewBannerId) ?? selected;
  const editing = banners.find((item) => item.id === selectedBannerId) ?? null;
  const hasFilters = Boolean(
    filters.search ||
      filters.platform !== "ALL" ||
      filters.placement !== "ALL" ||
      filters.status !== "ALL" ||
      filters.campaignType !== "ALL" ||
      filters.dateFrom ||
      filters.dateTo,
  );

  function exportRows(items: Banner[]) {
    downloadCsv(
      "banners.csv",
      items.map((item) => ({
        id: item.id,
        name: item.name,
        campaign: item.campaignName,
        platforms: item.platforms.map((p) => PLATFORM_LABELS[p]).join(" | "),
        placements: item.placements.map(placementLabel).join(" | "),
        status: STATUS_LABELS[item.status],
        start: item.startDate,
        end: item.endDate,
        priority: `P${item.priority}`,
      })),
    );
    toast.success("Banner export downloaded.");
  }

  async function handleCreate(values: BannerInput, action: "draft" | "schedule" | "activate") {
    const created = await addBanner(values, action);
    toast.success(
      action === "draft"
        ? "Banner saved as draft."
        : action === "schedule"
          ? "Banner scheduled successfully."
          : "Banner activated successfully.",
    );
    setSelectedBanner(created.id);
  }

  async function handleUpdate(values: BannerInput, action: "draft" | "schedule" | "activate") {
    if (!editing) return;
    await saveBanner(editing.id, values, action);
    toast.success(
      action === "draft"
        ? "Banner saved as draft."
        : action === "schedule"
          ? "Banner scheduled successfully."
          : "Banner activated successfully.",
    );
  }

  if (!hasContentPermission("content.banner.view")) {
    return <EmptyState title="You do not have access to Banner Management." />;
  }

  if (loadStatus === "loading" && banners.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Banner Management" description="Manage promotional banners and content displayed across Customer and Seller platforms." />
        <KpiSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  if (loadStatus === "error" && banners.length === 0) {
    return <ErrorState title="Unable to load banners." onRetry={() => void fetchBanners()} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Banner Management"
        description="Manage promotional banners and content displayed across Customer and Seller platforms."
        breadcrumbs={[{ label: "Content Management" }, { label: "Banner Management" }]}
        actions={
          <>
            {hasContentPermission("content.banner.create") ? (
              <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="size-3.5" />
                Create Banner
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="outline" onClick={() => exportRows(rows)}>
              <Download className="size-3.5" />
              Export
            </Button>
          </>
        }
      />

      <BannerKpis />
      <BannerFilters />
      <BannerBulkBar
        count={selectedIds.length}
        onActivate={() => {
          void bulkActivate().then(() => toast.success("Selected banners activated."));
        }}
        onPause={() => {
          void bulkPause().then(() => toast.success("Selected banners paused."));
        }}
        onDelete={() => setPendingBulkDelete(true)}
        onExport={() => exportRows(banners.filter((item) => selectedIds.includes(item.id)))}
        onChangePriority={(priority: BannerPriority) => {
          void bulkChangePriority(priority).then(() => toast.success(`Priority updated to P${priority}.`));
        }}
        onClear={clearSelection}
      />

      {rows.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No banners match your current filters." : "No banners found."}
          description={
            hasFilters
              ? "Try changing search or filters to see more campaigns."
              : "Create your first banner to start managing promotional content."
          }
          action={
            hasFilters ? null : (
              <Button type="button" onClick={() => setCreateOpen(true)}>
                Create Banner
              </Button>
            )
          }
        />
      ) : (
        <BannerTable
          rows={rows}
          selectedIds={selectedIds}
          onToggle={toggleBannerSelection}
          onToggleAll={setSelectedBannerIds}
          onView={(banner) => {
            setSelectedBanner(banner.id);
            setDetailsOpen(true);
          }}
          onEdit={(banner) => {
            setSelectedBanner(banner.id);
            setEditOpen(true);
          }}
          onPreview={(banner) => {
            setDraftPreview(null);
            setSelectedBanner(banner.id);
            setPreviewOpen(true, banner.id);
          }}
          onDuplicate={(banner) => {
            void duplicateBanner(banner.id).then(() => toast.success("Banner duplicated as a draft."));
          }}
          onPause={(banner) => {
            void pauseBanner(banner.id).then(() => toast.success("Banner paused."));
          }}
          onActivate={(banner) => {
            if (banner.status === "PAUSED") {
              void resumeBanner(banner.id).then(() => toast.success("Banner resumed."));
            } else {
              void activateBanner(banner.id).then(() => toast.success("Banner activated successfully."));
            }
          }}
          onDelete={setPendingDelete}
        />
      )}

      <BannerForm
        open={isCreateOpen}
        mode="create"
        onOpenChange={setCreateOpen}
        onSave={handleCreate}
        onPreview={(values) => {
          setDraftPreview(formValuesToBanner(values));
          setPreviewOpen(true);
        }}
      />
      <BannerForm
        open={isEditOpen}
        mode="edit"
        banner={editing}
        onOpenChange={setEditOpen}
        onSave={handleUpdate}
        onPreview={(values) => {
          setDraftPreview(formValuesToBanner(values, editing));
          setPreviewOpen(true);
        }}
      />
      <BannerPreview
        open={isPreviewOpen}
        banner={previewSource}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) setDraftPreview(null);
        }}
      />
      <BannerDetails
        banner={selected}
        open={isDetailsOpen}
        onOpenChange={setDetailsOpen}
        onEdit={(banner) => {
          setDetailsOpen(false);
          setSelectedBanner(banner.id);
          setEditOpen(true);
        }}
        onPreview={(banner) => {
          setDraftPreview(null);
          setPreviewOpen(true, banner.id);
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete Banner?"
        description="This action cannot be undone."
        confirmLabel="Delete Banner"
        destructive
        onConfirm={() => {
          if (!pendingDelete) return;
          void deleteBanner(pendingDelete.id).then(() => {
            toast.success("Banner deleted successfully.");
            setPendingDelete(null);
          });
        }}
      />
      <ConfirmDialog
        open={pendingBulkDelete}
        onOpenChange={setPendingBulkDelete}
        title="Delete selected banners?"
        description="This action cannot be undone."
        confirmLabel="Delete Banners"
        destructive
        onConfirm={() => {
          void bulkDelete().then(() => {
            toast.success("Selected banners deleted.");
            setPendingBulkDelete(false);
          });
        }}
      />
    </div>
  );
}
