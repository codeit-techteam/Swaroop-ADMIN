"use client";

import { create } from "zustand";

import * as gradeApi from "@/lib/api/grades";
import { GradeServiceError } from "@/lib/api/grades";
import { diffGradeFields } from "@/lib/grade-utils";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore } from "@/store/data-store";
import type {
  Grade,
  GradeAuditEvent,
  GradeBulkAction,
  GradeFacets,
  GradeFilters,
  GradeInput,
  GradePagination,
  GradeSort,
  GradeStats,
  GradeStatus,
} from "@/types/grade";
import {
  DEFAULT_GRADE_PAGINATION,
  DEFAULT_GRADE_SORT,
  EMPTY_GRADE_FILTERS,
} from "@/types/grade";

type LoadStatus = "idle" | "loading" | "success" | "error";

interface GradeUi {
  selectedGradeId: string | null;
  selectedGradeIds: string[];
  filters: GradeFilters;
  sort: GradeSort;
  pagination: GradePagination;
  isCreateOpen: boolean;
  isEditOpen: boolean;
  isDetailsOpen: boolean;
  isImportOpen: boolean;
}

interface GradeState extends GradeUi {
  /** Current server page only; the full master is never loaded into the browser. */
  grades: Grade[];
  total: number;
  stats: GradeStats | null;
  facets: GradeFacets;
  /** Grade opened on the detail / edit pages, loaded by id. */
  detail: Grade | null;
  detailStatus: LoadStatus;
  auditEvents: GradeAuditEvent[];
  loadStatus: LoadStatus;
  loadError: string | null;

  fetchGrades: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchFacets: () => Promise<void>;
  loadGrade: (id: string) => Promise<void>;
  addGrade: (input: GradeInput) => Promise<Grade>;
  updateGrade: (id: string, input: Partial<GradeInput>) => Promise<Grade>;
  toggleStatus: (id: string, status: GradeStatus) => Promise<Grade>;
  toggleCustomerVisibility: (id: string, customerVisible: boolean) => Promise<Grade>;
  toggleSellerVisibility: (id: string, sellerVisible: boolean) => Promise<Grade>;
  deleteGrade: (id: string) => Promise<void>;
  bulkUpdate: (action: GradeBulkAction, ids?: string[]) => Promise<void>;
  /** Called after a CSV import finished on the server. */
  refreshAfterImport: () => Promise<void>;

  setSelectedGrade: (id: string | null) => void;
  setSelectedGradeIds: (ids: string[]) => void;
  toggleGradeSelection: (id: string) => void;
  clearSelection: () => void;
  setFilters: (filters: Partial<GradeFilters>) => void;
  resetFilters: () => void;
  setSort: (sort: GradeSort) => void;
  setPagination: (pagination: Partial<GradePagination>) => void;
  setCreateOpen: (open: boolean) => void;
  setEditOpen: (open: boolean) => void;
  setDetailsOpen: (open: boolean) => void;
  setImportOpen: (open: boolean) => void;
}

function actor() {
  return useAuthStore.getState().user?.name ?? "Admin";
}

function role() {
  return useAuthStore.getState().user?.role ?? "ADMIN";
}

function pushPlatformAudit(action: string, entityId: string) {
  useDataStore.getState().pushAudit({
    admin: actor(),
    role: role(),
    action,
    module: "Grade Master",
    entity: entityId,
    result: "Success",
  });
}

function pushNotice(title: string, body: string) {
  useDataStore.getState().pushNotification({
    type: "System",
    title,
    body,
    href: "/master-data/grades",
    source: "Admin Portal",
  });
}

let auditSeq = 1;
let listRequest = 0;
let facetRequest = 0;

function recordEvents(
  set: (fn: (s: GradeState) => Partial<GradeState>) => void,
  grade: Grade,
  action: string,
  changes?: Array<Pick<GradeAuditEvent, "field" | "oldValue" | "newValue">>,
) {
  const timestamp = new Date().toISOString();
  const base = {
    action,
    gradeId: grade.id,
    gradeCode: grade.gradeCode,
    admin: actor(),
    timestamp,
  };
  const events: GradeAuditEvent[] =
    changes && changes.length > 0
      ? changes.map((change) => ({ id: `GAUD-${Date.now()}-${auditSeq++}`, ...base, ...change }))
      : [{ id: `GAUD-${Date.now()}-${auditSeq++}`, ...base }];
  set((s) => ({ auditEvents: [...events, ...s.auditEvents] }));
  pushPlatformAudit(action, grade.gradeCode);
}

function replaceGrade(grades: Grade[], updated: Grade) {
  return grades.map((item) => (item.id === updated.id ? updated : item));
}

export const useGradeStore = create<GradeState>((set, get) => {
  const findGrade = (id: string) =>
    get().grades.find((item) => item.id === id) ?? (get().detail?.id === id ? get().detail : null);

  const applyUpdate = (updated: Grade) =>
    set((s) => ({
      grades: replaceGrade(s.grades, updated),
      detail: s.detail?.id === updated.id ? updated : s.detail,
    }));

  const refreshAfterChange = () => {
    void get().fetchStats();
    void get().fetchGrades();
  };

  return {
    grades: [],
    total: 0,
    stats: null,
    facets: { gradeGroups: [], manufacturers: [] },
    detail: null,
    detailStatus: "idle",
    auditEvents: [],
    loadStatus: "idle",
    loadError: null,
    selectedGradeId: null,
    selectedGradeIds: [],
    filters: { ...EMPTY_GRADE_FILTERS },
    sort: { ...DEFAULT_GRADE_SORT },
    pagination: { ...DEFAULT_GRADE_PAGINATION },
    isCreateOpen: false,
    isEditOpen: false,
    isDetailsOpen: false,
    isImportOpen: false,

    fetchGrades: async () => {
      const request = ++listRequest;
      const { filters, sort, pagination, loadStatus } = get();
      set(
        loadStatus === "idle" || loadStatus === "error"
          ? { loadStatus: "loading", loadError: null }
          : { loadError: null },
      );
      try {
        if (gradeApi.getCategoryCache().length === 0) await gradeApi.getCategories();
        const { grades: rows, meta } = await gradeApi.listGrades(
          filters,
          sort,
          pagination.page + 1,
          pagination.pageSize,
        );
        if (request !== listRequest) return;
        set({ grades: rows, total: meta.total, loadStatus: "success" });
      } catch (error) {
        if (request !== listRequest) return;
        set({
          loadStatus: "error",
          loadError: error instanceof Error ? error.message : "Unable to load Grade Master.",
        });
      }
    },

    fetchStats: async () => {
      try {
        set({ stats: await gradeApi.getGradeStats() });
      } catch {
        set({ stats: null });
      }
    },

    fetchFacets: async () => {
      const request = ++facetRequest;
      const { categoryId } = get().filters;
      try {
        const facets = await gradeApi.getGradeFacets(categoryId === "ALL" ? undefined : categoryId);
        if (request === facetRequest) set({ facets });
      } catch {
        if (request === facetRequest) set({ facets: { gradeGroups: [], manufacturers: [] } });
      }
    },

    loadGrade: async (id) => {
      set({ detailStatus: "loading" });
      try {
        if (gradeApi.getCategoryCache().length === 0) await gradeApi.getCategories();
        set({ detail: await gradeApi.getGradeById(id), detailStatus: "success" });
      } catch {
        set({ detail: null, detailStatus: "error" });
      }
    },

    addGrade: async (input) => {
      const created = await gradeApi.createGrade(input);
      set({ isCreateOpen: false });
      recordEvents(set, created, `Grade created ${created.gradeCode}`);
      pushNotice("Grade created successfully.", `${created.gradeName} is now available in Grade Master.`);
      refreshAfterChange();
      return created;
    },

    updateGrade: async (id, input) => {
      const before = findGrade(id) ?? undefined;
      const updated = await gradeApi.updateGrade(id, input, before);
      applyUpdate(updated);
      set({ isEditOpen: false });
      const changes = before ? diffGradeFields(before, updated) : [];
      recordEvents(set, updated, `Grade updated ${updated.gradeCode}`, changes);
      pushNotice("Grade updated successfully.", `${updated.gradeName} was updated.`);
      refreshAfterChange();
      return updated;
    },

    toggleStatus: async (id, status) => {
      const updated = await gradeApi.updateGradeStatus(id, status);
      applyUpdate(updated);
      recordEvents(set, updated, status === "ACTIVE" ? `Grade activated ${updated.gradeCode}` : `Grade deactivated ${updated.gradeCode}`, [
        { field: "Status", oldValue: status === "ACTIVE" ? "INACTIVE" : "ACTIVE", newValue: status },
      ]);
      pushNotice(
        status === "ACTIVE" ? "Grade activated successfully." : "Grade deactivated successfully.",
        `${updated.gradeName} is now ${status === "ACTIVE" ? "active" : "inactive"}.`,
      );
      refreshAfterChange();
      return updated;
    },

    toggleCustomerVisibility: async (id, customerVisible) => {
      const updated = await gradeApi.updateVisibility(id, { customerVisible });
      applyUpdate(updated);
      recordEvents(set, updated, `Customer visibility updated ${updated.gradeCode}`, [
        { field: "Customer Visible", oldValue: customerVisible ? "NO" : "YES", newValue: customerVisible ? "YES" : "NO" },
      ]);
      pushNotice("Customer visibility updated.", `${updated.gradeName} is ${customerVisible ? "visible" : "hidden"} to customers.`);
      refreshAfterChange();
      return updated;
    },

    toggleSellerVisibility: async (id, sellerVisible) => {
      const updated = await gradeApi.updateVisibility(id, { sellerVisible });
      applyUpdate(updated);
      recordEvents(set, updated, `Seller visibility updated ${updated.gradeCode}`, [
        { field: "Seller Visible", oldValue: sellerVisible ? "NO" : "YES", newValue: sellerVisible ? "YES" : "NO" },
      ]);
      pushNotice("Seller visibility updated.", `${updated.gradeName} is ${sellerVisible ? "visible" : "hidden"} to sellers.`);
      refreshAfterChange();
      return updated;
    },

    deleteGrade: async (id) => {
      const current = findGrade(id);
      await gradeApi.deleteGrade(id);
      set((s) => ({
        grades: s.grades.filter((item) => item.id !== id),
        selectedGradeIds: s.selectedGradeIds.filter((item) => item !== id),
        selectedGradeId: s.selectedGradeId === id ? null : s.selectedGradeId,
        isDetailsOpen: s.selectedGradeId === id ? false : s.isDetailsOpen,
      }));
      if (current) {
        recordEvents(set, current, `Grade deleted ${current.gradeCode}`);
        pushNotice("Grade deleted.", `${current.gradeName} was removed because it had no transactional usage.`);
      }
      refreshAfterChange();
    },

    bulkUpdate: async (action, ids) => {
      const target = ids ?? get().selectedGradeIds;
      const updated = await gradeApi.bulkUpdateGrades(target, action);
      const map = new Map(updated.map((item) => [item.id, item]));
      set((s) => ({
        grades: s.grades.map((item) => map.get(item.id) ?? item),
        selectedGradeIds: [],
      }));
      const sample = updated[0];
      if (sample) {
        recordEvents(set, sample, `Bulk ${action.toLowerCase()} on ${updated.length} grades`);
      }
      refreshAfterChange();
    },

    refreshAfterImport: async () => {
      await gradeApi.getCategories();
      await Promise.all([get().fetchGrades(), get().fetchStats(), get().fetchFacets()]);
    },

    setSelectedGrade: (id) => set({ selectedGradeId: id }),
    setSelectedGradeIds: (ids) => set({ selectedGradeIds: ids }),
    toggleGradeSelection: (id) =>
      set((s) => ({
        selectedGradeIds: s.selectedGradeIds.includes(id)
          ? s.selectedGradeIds.filter((item) => item !== id)
          : [...s.selectedGradeIds, id],
      })),
    clearSelection: () => set({ selectedGradeIds: [] }),
    setFilters: (filters) =>
      set((s) => {
        const next = { ...s.filters, ...filters };
        // Grade group / manufacturer options depend on the category.
        if (filters.categoryId !== undefined && filters.categoryId !== s.filters.categoryId) {
          next.gradeGroup = "ALL";
          next.manufacturer = "ALL";
        }
        return { filters: next, pagination: { ...s.pagination, page: 0 }, selectedGradeIds: [] };
      }),
    resetFilters: () =>
      set((s) => ({
        filters: { ...EMPTY_GRADE_FILTERS },
        pagination: { ...s.pagination, page: 0 },
        selectedGradeIds: [],
      })),
    setSort: (sort) => set({ sort, pagination: { ...get().pagination, page: 0 } }),
    setPagination: (pagination) =>
      set((s) => ({ pagination: { ...s.pagination, ...pagination }, selectedGradeIds: [] })),
    setCreateOpen: (open) => set({ isCreateOpen: open }),
    setEditOpen: (open) => set({ isEditOpen: open }),
    setDetailsOpen: (open) => set({ isDetailsOpen: open }),
    setImportOpen: (open) => set({ isImportOpen: open }),
  };
});

export { GradeServiceError };
