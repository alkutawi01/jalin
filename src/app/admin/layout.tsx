import type { Metadata } from "next";
import AdminShell from "../../components/admin/AdminShell";
import { AdminRoleProvider } from "../../components/admin/AdminRole";
import { getCurrentAdmin } from "../../lib/admin/auth";
import { roleFromClaim } from "../../lib/admin/permissions";
import "./admin.css";

export const metadata: Metadata = {
  // The site template adds " · Jalin" itself (it showed as "Jalin · Pentadbiran · Jalin").
  title: "Pentadbiran",
  description: "Panel pentadbiran untuk editor Jalin",
  // robots.txt asks crawlers to stay out; this also tells a search engine that reached the login page by a link not to list it.
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The menu shows only what this person may open (the server refuses the rest anyway).
  const user = await getCurrentAdmin();
  const role = (user && roleFromClaim(user.role)) || "owner";
  return (
    <AdminRoleProvider role={role}>
      <AdminShell role={role}>{children}</AdminShell>
    </AdminRoleProvider>
  );
}
