import { getDb } from "../../../../../lib/db";
import { guarded, json } from "../../../../../lib/admin/langganan-api";
import { listMembers, type MemberStatus } from "../../../../../lib/reader-auth/admin";

export const dynamic = "force-dynamic";

const STATUSES = ["semua", "percubaan", "aktif", "tamat", "tiada"] as const;

/** Every reader with the state of their access: filter by status, search by e-mail or name, 50 to a page. */
export async function GET(request: Request) {
  return guarded(async () => {
    const url = new URL(request.url);
    const raw = url.searchParams.get("status") ?? "semua";
    const status = (STATUSES as readonly string[]).includes(raw) ? (raw as MemberStatus | "semua") : "semua";
    return json(await listMembers(getDb(), { status, q: url.searchParams.get("q") ?? "", page: Number(url.searchParams.get("halaman") ?? 1) }));
  });
}
