import type { AdminRole } from "@/types";

export const PUSH_PERMISSIONS = {
  view: "push.view",
  create: "push.create",
  update: "push.update",
  send: "push.send",
  schedule: "push.schedule",
  cancel: "push.cancel",
  export: "push.export",
  delete: "push.delete",
} as const;

export type PushPermission = (typeof PUSH_PERMISSIONS)[keyof typeof PUSH_PERMISSIONS];

const ROLE_PUSH_PERMISSIONS: Record<AdminRole, PushPermission[]> = {
  SUPER_ADMIN: Object.values(PUSH_PERMISSIONS),
  ADMIN: Object.values(PUSH_PERMISSIONS),
  OPERATIONS: [PUSH_PERMISSIONS.view, PUSH_PERMISSIONS.export],
  PROCUREMENT: [PUSH_PERMISSIONS.view, PUSH_PERMISSIONS.export],
  FINANCE: [PUSH_PERMISSIONS.view, PUSH_PERMISSIONS.export],
  COMPLIANCE: [PUSH_PERMISSIONS.view, PUSH_PERMISSIONS.export],
  SUPPORT: [PUSH_PERMISSIONS.view],
};

export function hasPushPermission(role: AdminRole | undefined, permission: PushPermission) {
  if (!role) return false;
  return ROLE_PUSH_PERMISSIONS[role].includes(permission);
}
