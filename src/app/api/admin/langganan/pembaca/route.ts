import { getDb } from "../../../../../lib/db";
import { logActivity } from "../../../../../lib/admin/activity";
import { guarded, json } from "../../../../../lib/admin/langganan-api";
import { findReaders } from "../../../../../lib/reader-auth/admin";

export const dynamic = "force-dynamic";

/** Find readers by part of their e-mail address (at least three characters). */
export async function GET(request: Request) {
  return guarded(async () => {
    const readers = await findReaders(getDb(), new URL(request.url).searchParams.get("q") ?? "");
    await logActivity({ action: "subscription.reader.view", subjectType: "reader", subjectId: "carian", summary: `Carian pembaca (${readers.length} hasil)` });
    return json({ readers });
  });
}
