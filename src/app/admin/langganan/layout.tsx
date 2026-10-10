import { notFound } from "next/navigation";
import { getCurrentAdmin } from "../../../lib/admin/auth";

/** Subscriber and card details are checked against the live account, not only a middleware claim. */
export default async function LanggananLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin();
  if (admin?.role !== "admin") notFound();
  return children;
}
