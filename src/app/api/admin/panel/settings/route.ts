import { notReady } from "@/lib/panel/ready";
import { getDb } from "../../../../../lib/db";
import { logActivity } from "../../../../../lib/admin/activity";
import { actor, bad, panelGuarded, json, readBody, sameOriginOrRefuse, str } from "../../../../../lib/admin/langganan-api";
import { loadSettings, saveSettings } from "../../../../../lib/panel/service";

export const dynamic = "force-dynamic";

const shape = (s: Awaited<ReturnType<typeof loadSettings>>) => ({ threshold: s.thresholdText, referenceName: s.referenceName, referenceKeywords: s.referenceKeywords.join(", ") });

/** Anyone who may rate can read the settings. */
export async function GET() {
  return panelGuarded(async () => (await notReady()) ?? json(shape(await loadSettings(getDb()))));
}

/** The threshold and the official reviewer. Only the chief editor and the owner (permissions.ts). */
export async function PUT(request: Request) {
  return panelGuarded(async () => {
    const blocked = await notReady();
    if (blocked) return blocked;
    const refused = sameOriginOrRefuse(request);
    if (refused) return refused;
    const body = await readBody(request);
    const who = await actor();
    const result = await saveSettings(getDb(), { threshold: str(body.threshold, 12), referenceName: str(body.referenceName, 60), referenceKeywords: str(body.referenceKeywords, 200) }, who.name);
    if (!result.ok) return bad(result.errors.join(" "), 422);
    await logActivity({ action: "panel.settings", subjectType: "panel_settings", subjectId: "panel", summary: `Ambang ${result.settings.thresholdText}; penilai rasmi ${result.settings.referenceName}` });
    return json(shape(result.settings));
  }, "panel.settings");
}
