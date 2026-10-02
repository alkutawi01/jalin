import type { Metadata } from "next";
import AdminShell from "../../components/admin/AdminShell";
import "./admin.css";

export const metadata: Metadata = {
  title: "Jalin · Pentadbiran",
  description: "Panel pentadbiran untuk editor Jalin",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
