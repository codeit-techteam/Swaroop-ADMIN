import type { AdminRole } from "@/types";

export const GRADE_PERMISSIONS = {
  view: "grade.view",
  create: "grade.create",
  update: "grade.update",
  status: "grade.status",
  visibility: "grade.visibility",
  import: "grade.import",
  export: "grade.export",
  delete: "grade.delete",
} as const;

export type GradePermission = (typeof GRADE_PERMISSIONS)[keyof typeof GRADE_PERMISSIONS];

const ROLE_GRADE_PERMISSIONS: Record<AdminRole, GradePermission[]> = {
  SUPER_ADMIN: Object.values(GRADE_PERMISSIONS),
  ADMIN: Object.values(GRADE_PERMISSIONS),
  PROCUREMENT: [
    GRADE_PERMISSIONS.view,
    GRADE_PERMISSIONS.create,
    GRADE_PERMISSIONS.update,
    GRADE_PERMISSIONS.status,
    GRADE_PERMISSIONS.visibility,
    GRADE_PERMISSIONS.import,
    GRADE_PERMISSIONS.export,
  ],
  OPERATIONS: [GRADE_PERMISSIONS.view, GRADE_PERMISSIONS.export],
  FINANCE: [GRADE_PERMISSIONS.view, GRADE_PERMISSIONS.export],
  COMPLIANCE: [GRADE_PERMISSIONS.view, GRADE_PERMISSIONS.export],
  SUPPORT: [GRADE_PERMISSIONS.view],
};

export function hasGradePermission(role: AdminRole | undefined, permission: GradePermission) {
  if (!role) return false;
  return ROLE_GRADE_PERMISSIONS[role].includes(permission);
}
