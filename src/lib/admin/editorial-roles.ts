export type EditorialRole = "admin" | "editor" | "reviewer" | "viewer";

export type EditorialAction = 
  | "view_dashboard"
  | "run_audit"
  | "sync_issues"
  | "resolve_issue"
  | "publish_work"
  | "manage_roles";

const PERMISSION_MATRIX: Record<EditorialAction, EditorialRole[]> = {
  view_dashboard: ["admin", "editor", "reviewer", "viewer"],
  run_audit: ["admin", "editor"],
  sync_issues: ["admin", "editor"],
  resolve_issue: ["admin", "editor"],
  publish_work: ["admin", "editor"],
  manage_roles: ["admin"],
};

export function hasPermission(role: EditorialRole, action: EditorialAction): boolean {
  return PERMISSION_MATRIX[action]?.includes(role) ?? false;
}

export function getPermissionsForRole(role: EditorialRole): EditorialAction[] {
  return (Object.keys(PERMISSION_MATRIX) as EditorialAction[]).filter(
    action => hasPermission(role, action)
  );
}