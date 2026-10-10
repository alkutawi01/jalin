import { getDb } from "../../../../../lib/db";
import { guarded, json } from "../../../../../lib/admin/langganan-api";
import { panelSummary } from "../../../../../lib/panel/view";

export const dynamic = "force-dynamic";

/** The module's overview numbers (Ringkasan). */
export async function GET() {
  return guarded(async () => json(await panelSummary(getDb())));
}
