import { notFound } from "next/navigation";
import { getCurrentAdmin } from "../../../lib/admin/auth";

/** A disabled or demoted staff account cannot keep reading unpublished panel data. */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin();
  if (!admin || (admin.role !== "admin" && admin.role !== "chief_editor")) notFound();
  return children;
}
