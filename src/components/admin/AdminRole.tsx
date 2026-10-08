"use client";

import { createContext, useContext, type ReactNode } from "react";
import { can, type Permission, type Role } from "../../lib/admin/permissions";

/**
 * The role of whoever is signed in, for the admin pages that offer buttons only some roles may use (the server refuses the rest anyway:
 * this only stops a button from being offered that would end in "Anda tidak mempunyai kebenaran"). Without a provider the owner is
 * assumed, so a page shown outside the admin shell (the editor's preview, tests) keeps every button.
 */
const AdminRoleContext = createContext<Role>("owner");

export function AdminRoleProvider({ role, children }: { role: Role; children: ReactNode }) {
  return <AdminRoleContext.Provider value={role}>{children}</AdminRoleContext.Provider>;
}

export function useAdminCan(permission: Permission): boolean {
  return can(useContext(AdminRoleContext), permission);
}
