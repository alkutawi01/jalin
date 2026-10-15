import { NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../../lib/admin/auth";
import { getDb } from "../../../../../../lib/db";
import { deleteUnpublishedWork } from "../../../../../../lib/admin/work-service";
import { isUntouchedProvisionalDraft } from "../../../../../../lib/admin/provisional-draft";

/**
 * A newly opened editor is provisional. If the editor leaves without saving,
 * remove the untouched placeholder instead of accumulating "Draf tanpa tajuk".
 * The strict timestamp/content checks make this a no-op after any real save.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getCurrentAdmin()) return NextResponse.json({ error: "Sesi tamat." }, { status: 401 });
  const { id } = await params;
  const work = await getDb().selectFrom("works").where("id", "=", id).select([
    "id", "title", "body", "status", "created_at", "updated_at", "published_at", "published_revision_id"
  ]).executeTakeFirst();
  if (!work) return NextResponse.json({ discarded: true });
  if (!isUntouchedProvisionalDraft(work)) return NextResponse.json({ discarded: false });
  await deleteUnpublishedWork(id);
  return NextResponse.json({ discarded: true });
}
