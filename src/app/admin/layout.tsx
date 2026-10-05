import type { Metadata } from "next";
import AdminShell from "../../components/admin/AdminShell";
import "./admin.css";

export const metadata: Metadata = {
  // The site template adds " · Jalin" itself (it showed as "Jalin · Pentadbiran · Jalin").
  title: "Pentadbiran",
  description: "Panel pentadbiran untuk editor Jalin",
  // robots.txt asks crawlers to stay out; this also tells a search engine that reached the login page by a link not to list it.
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
