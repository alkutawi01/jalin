import { notReady } from "@/lib/panel/ready";
import { getDb } from "../../../../../lib/db";
import { panelGuarded, json } from "../../../../../lib/admin/langganan-api";
import { panelSummary } from "../../../../../lib/panel/view";

export const dynamic = "force-dynamic";

/** The module's overview numbers (Ringkasan). */
export async function GET() {
  return panelGuarded(async () => (await notReady()) ?? json(await panelSummary(getDb())));
}
