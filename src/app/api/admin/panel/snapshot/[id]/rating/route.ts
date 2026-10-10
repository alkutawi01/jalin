import { notReady } from "@/lib/panel/ready";
import { getDb } from "../../../../../../../lib/db";
import { logActivity } from "../../../../../../../lib/admin/activity";
import { actor, bad, panelGuarded, json, readBody, sameOriginOrRefuse, str } from "../../../../../../../lib/admin/langganan-api";
import { addRating, asContributed } from "../../../../../../../lib/panel/service";

export const dynamic = "force-dynamic";

/** Paste in what a reviewer answered. An answer that cannot be read is kept as refused, with the reasons, and does not count. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return panelGuarded(async () => {
    const blocked = await notReady();
    if (blocked) return blocked;
    const refused = sameOriginOrRefuse(request);
    if (refused) return refused;
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return bad("Snapshot tidak sah.");
    const body = await readBody(request, 70000);
    const raw = typeof body.raw === "string" ? body.raw : "";
    const reviewerLabel = str(body.reviewerLabel, 80);
    if (raw.trim().length < 50) return bad("Tampal jawapan penilai penuh, termasuk blok [RATING_JALIN].");
    const who = await actor();
    const outcome = await addRating(getDb(), { snapshotId: id, reviewerLabel: reviewerLabel || undefined, provider: str(body.provider, 80), contributed: asContributed(body.contributed), raw, by: who.name });
    if (!outcome.ok) {
      await logActivity({ action: "panel.rate.invalid", subjectType: "panel_snapshot", subjectId: id, summary: `${reviewerLabel || "jawapan ditampal"}: ${outcome.errors[0] ?? "ditolak"}` });
      return json({ ok: false, errors: outcome.errors, ratingId: outcome.ratingId }, 422);
    }
    await logActivity({ action: "panel.rate", subjectType: "panel_snapshot", subjectId: id, summary: `${outcome.rating.reviewerLabel}: ${outcome.rating.compositeText}` });
    return json({ ok: true, ratingId: outcome.rating.id, composite: outcome.rating.compositeText, warnings: outcome.rating.warnings });
  });
}
