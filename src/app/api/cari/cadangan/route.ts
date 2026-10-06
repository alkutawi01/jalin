import { NextResponse } from "next/server";
import { initContentRepository } from "../../../../lib/content";
import { buildSearchIndex } from "../../../../lib/reader/search";
import { suggest } from "../../../../lib/reader/search-suggest";

export const dynamic = "force-dynamic";

/** Public, read-only: the few works that fit what a reader has typed so far (the header search box). */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const repo = await initContentRepository();
  const suggestions = suggest(buildSearchIndex(repo), q);
  return NextResponse.json({ suggestions }, { headers: { "Cache-Control": "public, max-age=30" } });
}
