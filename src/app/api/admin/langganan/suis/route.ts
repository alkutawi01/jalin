import { getDb } from "../../../../../lib/db";
import { logActivity } from "../../../../../lib/admin/activity";
import { actor, guarded, json, readBody, sameOriginOrRefuse } from "../../../../../lib/admin/langganan-api";
import { isRedeemHalted, setRedeemHalted } from "../../../../../lib/reader-auth/redeem";

export const dynamic = "force-dynamic";

export async function GET() {
  return guarded(async () => json({ halted: await isRedeemHalted(getDb()) }));
}

/** The stop switch: while it is on nobody can redeem anything. Takes effect on the next attempt, no deploy needed. */
export async function POST(request: Request) {
  return guarded(async () => {
    const refused = sameOriginOrRefuse(request);
    if (refused) return refused;
    const halted = (await readBody(request)).halted === true;
    const who = await actor();
    await setRedeemHalted(getDb(), halted, who.name);
    await logActivity({ action: "subscription.switch", subjectType: "switch", subjectId: "redeem_halted", summary: halted ? "Penebusan dihentikan" : "Penebusan disambung semula" });
    return json({ ok: true, halted });
  });
}
