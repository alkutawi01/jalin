import { notReady } from "@/lib/panel/ready";
import { getDb } from "../../../../../lib/db";
import { logActivity } from "../../../../../lib/admin/activity";
import { actor, bad, panelGuarded, json, readBody, sameOriginOrRefuse, str } from "../../../../../lib/admin/langganan-api";
import { ensureSnapshot } from "../../../../../lib/panel/service";

export const dynamic = "force-dynamic";

/** Prepare a piece for rating: the snapshot (this exact text, its hash, its reference code). The same text gives the same snapshot. */
export async function POST(request: Request) {
  return panelGuarded(async () => {
    const blocked = await notReady();
    if (blocked) return blocked;
    const refused = sameOriginOrRefuse(request);
    if (refused) return refused;
    const body = await readBody(request);
    const kind = body.kind === "submission" ? "submission" : body.kind === "work" ? "work" : null;
    const id = str(body.id, 120);
    if (!kind || !id) return bad("Karya atau kiriman tidak dinyatakan.");
    // A submission is somebody else's manuscript: it goes to AI providers, so the editor must confirm the author was told. Our own works need no such step.
    if (kind === "submission" && body.consent !== true) return bad("Sahkan bahawa penulis telah dimaklumkan manuskrip ini akan diproses oleh penyedia AI untuk penilaian, atau gunakan semakan manusia sahaja.", 422);
    const who = await actor();
    const result = await ensureSnapshot(getDb(), kind, id, who.name, kind === "submission" ? { consent: { confirmedBy: who.name, at: new Date().toISOString(), text: "Penulis dimaklumkan: manuskrip diproses oleh penyedia AI bagi penilaian Panel Bacaan AI." } } : {});
    if ("error" in result) return bad(result.error, 422);
    if (result.created) await logActivity({ action: "panel.snapshot", subjectType: kind, subjectId: id, workId: kind === "work" ? id : null, summary: `${result.snapshot.title}: ${result.snapshot.ref_code}` });
    return json({ snapshotId: result.snapshot.id, created: result.created });
  });
}
