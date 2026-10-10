import { NextResponse } from "next/server";
import { buildStoryPool, pickCollection } from "../../../lib/reader/story-collection";

export const dynamic = "force-dynamic";

/**
 * Public, read-only: another random set of stories. `lihat` lists the cards already on screen (they are left out so a click always changes
 * the set). The homepage asks for the default size; the "Baca lagi" block under a story asks for `n` cards and names the story being read
 * in `kecuali` so it is never offered to someone who is reading it.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const seen = (params.get("lihat") ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter((key) => key.length > 0 && key.length <= 200)
    .slice(0, 24);
  const n = Number(params.get("n"));
  const size = Number.isInteger(n) && n >= 1 && n <= 6 ? n : undefined;
  const except = (params.get("kecuali") ?? "").trim().slice(0, 200);
  const pool = (await buildStoryPool()).filter((card) => !except || !card.href.endsWith(`/${except}`));
  const cards = pickCollection(pool, new Set(seen), size);
  return NextResponse.json({ cards }, { headers: { "Cache-Control": "no-store" } });
}
