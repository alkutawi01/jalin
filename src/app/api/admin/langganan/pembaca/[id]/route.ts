import { getDb } from "../../../../../../lib/db";
import { bad, guarded, json } from "../../../../../../lib/admin/langganan-api";
import { readerDetail } from "../../../../../../lib/reader-auth/admin";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(async () => {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/.test(id)) return bad("Pembaca tidak sah.");
    const detail = await readerDetail(getDb(), id);
    return detail ? json({ reader: detail }) : bad("Pembaca tidak dijumpai.", 404);
  });
}
