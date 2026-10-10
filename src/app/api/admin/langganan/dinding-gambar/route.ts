import { getDb } from "../../../../../lib/db";
import { logActivity } from "../../../../../lib/admin/activity";
import { actor, bad, guarded, json, sameOriginOrRefuse } from "../../../../../lib/admin/langganan-api";
import { generateWall, getWall } from "../../../../../lib/reader/start-wall";
import { wallSources } from "../../../../../lib/reader/start-wall-sources";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** When the picture behind /mula was last made. */
export async function GET() {
  return guarded(async () => json({ wall: await getWall(getDb()) }));
}

/** Make it now (it is otherwise made by itself on the 1st of every month). */
export async function POST(request: Request) {
  return guarded(async () => {
    const refused = sameOriginOrRefuse(request);
    if (refused) return refused;
    const who = await actor();
    const result = await generateWall(getDb(), await wallSources(), who.name);
    if (!result.ok) return bad(result.error, 500);
    await logActivity({ action: "subscription.switch", subjectType: "wall", subjectId: result.wall.month, summary: `Gambar latar /mula dijana (${result.pictures} gambar, ${Math.round(result.bytes / 1024)} KB)` });
    return json({ ok: true, wall: result.wall, bytes: result.bytes, pictures: result.pictures });
  });
}
