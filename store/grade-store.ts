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
  GradeFilters,
  GradeInput,
  GradePagination,
  GradeSort,
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
  grades: Grade[];
  auditEvents: GradeAuditEvent[];
  loadStatus: LoadStatus;
  loadError: string | null;

  selectedGrade: () => Grade | null;

  fetchGrades: () => Promise<void>;
  addGrade: (input: GradeInput) => Promise<Grade>;
  updateGrade: (id: string, input: Partial<GradeInput>) => Promise<Grade>;
  toggleStatus: (id: string, status: GradeStatus) => Promise<Grade>;
  toggleCustomerVisibility: (id: string, customerVisible: boolean) => Promise<Grade>;
  toggleSellerVisibility: (id: string, sellerVisible: boolean) => Promise<Grade>;
  deleteGrade: (id: string) => Promise<void>;
  bulkUpdate: (action: GradeBulkAction, ids?: string[]) => Promise<void>;
  importGrades: (inputs: GradeInput[]) => Promise<Grade[]>;

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

function recordEvents(
  set: (fn: (s: GradeState) => Partial<GradeState>) => void,
  grade: Grade,
  action: string,
  changes?: Array<Pick<GradeAuditEvent, "field" | "oldValue" | "newValue">>,
) {
  const timestamp = new Date().toISOString();
  const events: GradeAuditEvent[] =
    changes && changes.length > 0
      ? changes.map((change) => ({
          id: `GAUD-${Date.now()}-${auditSeq++}`,
          action,
          gradeId: grade.id,
          gradeCode: grade.gradeCode,
          admin: actor(),
          timestamp,
          ...change,
        }))
      : [
          {
            id: `GAUD-${Date.now()}-${auditSeq++}`,
            action,
            gradeId: grade.id,
            gradeCode: grade.gradeCode,
            admin: actor(),
            timestamp,
          },
        ];
  set((s) => ({ auditEvents: [...events, ...s.auditEvents] }));
  pushPlatformAudit(action, grade.gradeCode);
}

export const useGradeStore = create<GradeState>((set, get) => ({
  grades: gradeApi.getGradesSync(),
  auditEvents: [
    {
      id: "GAUD-SEED-1",
      action: "Grade Updated",
      gradeId: "GRD-1001",
      gradeCode: "HDPE_FILM",
      admin: "Admin",
      timestamp: "2026-09-08T11:22:00.000Z",
      field: "Customer Visible",
      oldValue: "YES",
      newValue: "YES",
    },
    {
      id: "GAUD-SEED-2",
      action: "Grade Created",
      gradeId: "GRD-1080",
      gradeCode: "BASE_OIL",
      admin: "Priya Shah",
      timestamp: "2026-08-28T09:00:00.000Z",
    },
  ],
  loadStatus: "success",
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

  selectedGrade: () => {
    const { grades, selectedGradeId } = get();
    return grades.find((item) => item.id === selectedGradeId) ?? null;
  },

  fetchGrades: async () => {
    if (get().grades.length === 0) set({ loadStatus: "loading", loadError: null });
    else set({ loadError: null });
    try {
      const grades = await gradeApi.getGrades();
      set({ grades, loadStatus: "success" });
    } catch {
      set({ loadStatus: "error", loadError: "Unable to load Grade Master." });
    }
  },

  addGrade: async (input) => {
    const created = await gradeApi.createGrade(input, actor());
    set((s) => ({ grades: [created, ...s.grades], isCreateOpen: false }));
    recordEvents(set, created, `Grade created ${created.gradeCode}`);
    pushNotice("Grade created successfully.", `${created.gradeName} is now available in Grade Master.`);
    return created;
  },

  updateGrade: async (id, input) => {
    const before = get().grades.find((item) => item.id === id);
    const updated = await gradeApi.updateGrade(id, input, actor());
    set((s) => ({
      grades: s.grades.map((item) => (item.id === id ? updated : item)),
      isEditOpen: false,
    }));
    const changes = before ? diffGradeFields(before, updated) : [];
    recordEvents(set, updated, `Grade updated ${updated.gradeCode}`, changes);
    pushNotice("Grade updated successfully.", `${updated.gradeName} was updated.`);
    return updated;
  },

  toggleStatus: async (id, status) => {
    const updated = await gradeApi.updateGradeStatus(id, status, actor());
    set((s) => ({ grades: s.grades.map((item) => (item.id === id ? updated : item)) }));
    recordEvents(set, updated, status === "ACTIVE" ? `Grade activated ${updated.gradeCode}` : `Grade deactivated ${updated.gradeCode}`, [
      { field: "Status", oldValue: status === "ACTIVE" ? "INACTIVE" : "ACTIVE", newValue: status },
    ]);
    pushNotice(
      status === "ACTIVE" ? "Grade activated successfully." : "Grade deactivated successfully.",
      `${updated.gradeName} is now ${status === "ACTIVE" ? "active" : "inactive"}.`,
    );
    return updated;
  },

  toggleCustomerVisibility: async (id, customerVisible) => {
    const updated = await gradeApi.updateVisibility(id, { customerVisible }, actor());
    set((s) => ({ grades: s.grades.map((item) => (item.id === id ? updated : item)) }));
    recordEvents(set, updated, `Customer visibility updated ${updated.gradeCode}`, [
      { field: "Customer Visible", oldValue: customerVisible ? "NO" : "YES", newValue: customerVisible ? "YES" : "NO" },
    ]);
    pushNotice("Customer visibility updated.", `${updated.gradeName} is ${customerVisible ? "visible" : "hidden"} to customers.`);
    return updated;
  },

  toggleSellerVisibility: async (id, sellerVisible) => {
    const updated = await gradeApi.updateVisibility(id, { sellerVisible }, actor());
    set((s) => ({ grades: s.grades.map((item) => (item.id === id ? updated : item)) }));
    recordEvents(set, updated, `Seller visibility updated ${updated.gradeCode}`, [
      { field: "Seller Visible", oldValue: sellerVisible ? "NO" : "YES", newValue: sellerVisible ? "YES" : "NO" },
    ]);
    pushNotice("Seller visibility updated.", `${updated.gradeName} is ${sellerVisible ? "visible" : "hidden"} to sellers.`);
    return updated;
  },

  deleteGrade: async (id) => {
    const current = get().grades.find((item) => item.id === id);
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
  },

  bulkUpdate: async (action, ids) => {
    const target = ids ?? get().selectedGradeIds;
    const updated = await gradeApi.bulkUpdateGrades(target, action, actor());
    const map = new Map(updated.map((item) => [item.id, item]));
    set((s) => ({
      grades: s.grades.map((item) => map.get(item.id) ?? item),
      selectedGradeIds: [],
    }));
    const sample = updated[0];
    if (sample) {
      recordEvents(set, sample, `Bulk ${action.toLowerCase()} on ${updated.length} grades`);
    }
  },

  importGrades: async (inputs) => {
    const created = await gradeApi.importGrades(inputs, actor());
    set((s) => ({ grades: [...created, ...s.grades], isImportOpen: false }));
    const sample = created[0];
    if (sample) recordEvents(set, sample, `Imported ${created.length} grades`);
    pushNotice("Grades imported successfully.", `${created.length} valid rows were added to Grade Master.`);
    return created;
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
    set((s) => ({
      filters: { ...s.filters, ...filters },
      pagination: { ...s.pagination, page: 0 },
    })),
  resetFilters: () =>
    set((s) => ({
      filters: { ...EMPTY_GRADE_FILTERS },
      pagination: { ...s.pagination, page: 0 },
    })),
  setSort: (sort) => set({ sort, pagination: { ...get().pagination, page: 0 } }),
  setPagination: (pagination) => set((s) => ({ pagination: { ...s.pagination, ...pagination } })),
  setCreateOpen: (open) => set({ isCreateOpen: open }),
  setEditOpen: (open) => set({ isEditOpen: open }),
  setDetailsOpen: (open) => set({ isDetailsOpen: open }),
  setImportOpen: (open) => set({ isImportOpen: open }),
}));

export { GradeServiceError };
