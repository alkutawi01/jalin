import { getDb } from "../../../../../lib/db";
import { logActivity } from "../../../../../lib/admin/activity";
import { actor, guarded, json, readBody, sameOriginOrRefuse } from "../../../../../lib/admin/langganan-api";
import { readerAccountsEnabled } from "../../../../../lib/reader-auth/enabled";
import { isPaywallSwitchOn, setPaywall } from "../../../../../lib/reader-auth/switches";

export const dynamic = "force-dynamic";

export async function GET() {
  return guarded(async () => json({ on: await isPaywallSwitchOn(getDb()), accountsEnabled: readerAccountsEnabled() }));
}

/** The paywall switch: while it is on, the text of every work not marked as a sample is kept for readers with access. */
export async function POST(request: Request) {
  return guarded(async () => {
    const refused = sameOriginOrRefuse(request);
    if (refused) return refused;
    const on = (await readBody(request)).on === true;
    const who = await actor();
    await setPaywall(getDb(), on, who.name);
    await logActivity({ action: "subscription.switch", subjectType: "switch", subjectId: "paywall_on", summary: on ? "Dinding bayar dihidupkan" : "Dinding bayar dimatikan" });
    return json({ ok: true, on });
  });
}
