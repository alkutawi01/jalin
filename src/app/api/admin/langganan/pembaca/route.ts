import { getDb } from "../../../../../lib/db";
import { guarded, json } from "../../../../../lib/admin/langganan-api";
import { findReaders } from "../../../../../lib/reader-auth/admin";

export const dynamic = "force-dynamic";

/** Find readers by part of their e-mail address (at least three characters). */
export async function GET(request: Request) {
  return guarded(async () => json({ readers: await findReaders(getDb(), new URL(request.url).searchParams.get("q") ?? "") }));
}
