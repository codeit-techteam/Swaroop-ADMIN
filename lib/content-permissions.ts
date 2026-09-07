export const CONTENT_PERMISSIONS = {
  view: "content.banner.view",
  create: "content.banner.create",
  edit: "content.banner.edit",
  delete: "content.banner.delete",
  publish: "content.banner.publish",
} as const;

export type ContentPermission = (typeof CONTENT_PERMISSIONS)[keyof typeof CONTENT_PERMISSIONS];

/** Frontend MVP: all content permissions are allowed. Replace with role checks when RBAC is wired. */
export function hasContentPermission(_permission: ContentPermission) {
  return true;
}
