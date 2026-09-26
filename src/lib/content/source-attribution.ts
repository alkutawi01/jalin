import type { Work } from "./types";

export interface SourceAttributionDisplay {
  sumberAsal: string | null;
  status: string;
}

const RIGHTS_LABELS: Record<string, string> = {
  public_domain: "Domain awam",
  needs_review: "Perlu semakan",
  licensed: "Lesen diperoleh",
  permission: "Kebenaran diperoleh"
};

export function buildSourceAttribution(
  work: Pick<Work, "sourceWork">
): SourceAttributionDisplay {
  const source = work.sourceWork;
  if (!source || !source.title) {
    return { sumberAsal: null, status: "Karya asli Jalin" };
  }
  const parts = [source.title, source.author].filter(
    (part): part is string => Boolean(part)
  );
  return {
    sumberAsal: parts.join(" · "),
    status: (source.rightsStatus && RIGHTS_LABELS[source.rightsStatus]) || "Karya berasaskan sumber"
  };
}
