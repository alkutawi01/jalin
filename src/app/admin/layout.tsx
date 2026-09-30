import type { Metadata } from "next";
import AdminShell from "../../components/admin/AdminShell";
import "./admin.css";

export const metadata: Metadata = {
  title: "Jalin Admin",
  description: "Admin panel for Jalin literary publication platform",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
