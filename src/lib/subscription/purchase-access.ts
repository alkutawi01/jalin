import { getCurrentAdmin } from "../admin/auth";
import { purchaseStatus } from "./prices";

/** Both checkout entry points must verify the owner session on the server during the pilot. */
export async function purchaseStatusForRequest() {
  const publicStatus = purchaseStatus();
  if (publicStatus.enabled || process.env.PURCHASES_PILOT_ENABLED !== "yes") return publicStatus;
  const admin = await getCurrentAdmin();
  return purchaseStatus(process.env, admin?.role === "admin" && !admin.mustChangePassword);
}
