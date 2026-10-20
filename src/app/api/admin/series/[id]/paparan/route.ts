import { NextRequest, NextResponse } from "next/server";
import { getSeries, listSeriesEntries } from "../../../../../../lib/admin/series-service";
import { archiveWork, getWork, updateWork } from "../../../../../../lib/admin/work-service";
import { getCurrentAdmin } from "../../../../../../lib/admin/auth";
import { logActivity } from "../../../../../../lib/admin/activity";
import { publicErrorMessage } from "../../../../../../lib/admin/api-errors";

export const dynamic = "force-dynamic";

/**
 * What readers see of a whole series, in one step. A series has no publication state of its own: it is on the site while one of
 * its episodes is published. So hiding a series means archiving its published episodes, and bringing it back for rewriting means
 * returning its archived episodes to draft. The texts are kept either way; nothing is deleted.
 *
 *   { action: "archive" }  every published episode becomes "archived": readers no longer see the series.
 *   { action: "restore" } every archived episode becomes "draft", to be edited and published again one by one.
 *
 * Only whoever may publish may do this (permissions.ts: work.publish), as for archiving a single published work.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
    const { id } = await params;
    const series = await getSeries(id);
    if (!series) return NextResponse.json({ error: "Siri tidak ditemui." }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const action = body?.action;
    if (action !== "archive" && action !== "restore") {
      return NextResponse.json({ error: "Tindakan tidak sah." }, { status: 400 });
    }

    const entries = await listSeriesEntries(id);
    // Latest episode first, so that at no moment is there a published episode after a hidden one.
    const ordered = [...entries].sort((a, b) => b.position - a.position);
    const changed: string[] = [];
    for (const entry of ordered) {
      const work = await getWork(entry.work_id);
      if (!work) continue;
      if (action === "archive" && work.status === "published") {
        await archiveWork(work.id);
        changed.push(work.title);
      } else if (action === "restore" && work.status === "archived") {
        await updateWork(work.id, { status: "draft" });
        changed.push(work.title);
      }
    }

    await logActivity({
      action: action === "archive" ? "series.archive" : "series.restore",
      subjectType: "series",
      subjectId: id,
      summary: `${series.title}: ${changed.length} episod`
    });

    return NextResponse.json({ ok: true, action, count: changed.length, titles: changed.reverse() });
  } catch (error) {
    return NextResponse.json({ error: publicErrorMessage(error, "Ralat tidak diketahui.") }, { status: 500 });
  }
}
