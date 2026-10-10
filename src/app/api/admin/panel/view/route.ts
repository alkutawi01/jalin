import { notReady } from "@/lib/panel/ready";
import { getDb } from "../../../../../lib/db";
import { bad, panelGuarded, json } from "../../../../../lib/admin/langganan-api";
import { panelView } from "../../../../../lib/panel/view";

export const dynamic = "force-dynamic";

/** Everything the Penilaian AI tab of one work (or submission) shows: its snapshot, the instruction, the ratings, the mean and the history. */
export async function GET(request: Request) {
  return panelGuarded(async () => {
    const blocked = await notReady();
    if (blocked) return blocked;
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind") === "submission" ? "submission" : url.searchParams.get("kind") === "work" ? "work" : null;
    const id = (url.searchParams.get("id") ?? "").slice(0, 120);
    if (!kind || !id) return bad("Karya atau kiriman tidak dinyatakan.");
    return json(await panelView(getDb(), kind, id));
  });
}
