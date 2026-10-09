import { getDb } from "../../../../../../lib/db";
import { logActivity } from "../../../../../../lib/admin/activity";
import { bad, guarded, json, readBody, sameOriginOrRefuse, str } from "../../../../../../lib/admin/langganan-api";
import { setSharedCodeStatus } from "../../../../../../lib/reader-auth/redeem";

export const dynamic = "force-dynamic";

const LABELS = { active: "disambung semula", paused: "dijeda", revoked: "dibatalkan" } as const;

/** Pause, resume or cancel a shared code. Access readers already got from it stays. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(async () => {
    const refused = sameOriginOrRefuse(request);
    if (refused) return refused;
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/.test(id)) return bad("Kod tidak sah.");
    const status = str((await readBody(request)).status, 10) as keyof typeof LABELS;
    if (!(status in LABELS)) return bad("Status tidak dikenali.");
    const done = await setSharedCodeStatus(getDb(), id, status);
    if (!done) return bad("Kod tidak dijumpai.", 404);
    await logActivity({ action: "subscription.shared.update", subjectType: "shared_code", subjectId: id, summary: `Kod kongsi ${LABELS[status]}` });
    return json({ ok: true });
  });
}
