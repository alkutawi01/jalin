import { NextResponse } from "next/server";
import { buildStoryPool, pickCollection } from "../../../lib/reader/story-collection";

export const dynamic = "force-dynamic";

/** Public, read-only: another random set of stories for the homepage "Koleksi cerita". `lihat` lists the cards already on screen. */
export async function GET(request: Request) {
  const seen = (new URL(request.url).searchParams.get("lihat") ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter((key) => key.length > 0 && key.length <= 200)
    .slice(0, 24);
  const cards = pickCollection(await buildStoryPool(), new Set(seen));
  return NextResponse.json({ cards }, { headers: { "Cache-Control": "no-store" } });
}
