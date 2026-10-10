import { NextResponse } from "next/server";
import { initContentRepository } from "../../../../lib/content";
import { buildSearchIndex, restrictForViewer } from "../../../../lib/reader/search";
import { siteOpenForViewer, viewerReach } from "../../../../lib/reader/access-gate";
import { suggest } from "../../../../lib/reader/search-suggest";

export const dynamic = "force-dynamic";

/** Public, read-only: the few works that fit what a reader has typed so far (the header search box). */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  // The library is for readers with access: a visitor is offered nothing here (search itself sends them to the landing page).
  if (!(await siteOpenForViewer())) return NextResponse.json({ suggestions: [] }, { headers: { "Cache-Control": "private, no-store" } });
  const repo = await initContentRepository();
  const suggestions = suggest(restrictForViewer(buildSearchIndex(repo), await viewerReach()), q);
  return NextResponse.json({ suggestions }, { headers: { "Cache-Control": "private, no-store" } });
}
