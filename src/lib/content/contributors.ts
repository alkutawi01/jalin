const CONTRIBUTOR_MAP: Record<string, { name: string; kind: "human" | "virtual" }> = {
  chatgpt: { name: "Rafiq Naim", kind: "virtual" },
  mimo: { name: "Amir Syafiq", kind: "virtual" },
  "nara-zahin": { name: "Nara Zahin", kind: "virtual" },
  "izzat-anas": { name: "Izzat Anas", kind: "human" },
};

export interface ContributorMeta {
  name: string;
  kind: "human" | "virtual";
}

export function getContributorMeta(slug: string): ContributorMeta | undefined {
  const mapped = CONTRIBUTOR_MAP[slug];
  if (mapped) return mapped;
  return undefined;
}

export function getContributors(): ContributorMeta[] {
  return Object.entries(CONTRIBUTOR_MAP).map(([slug, meta]) => ({
    slug,
    ...meta,
  }));
}

export function getContributorDisplay(slug: string): { name: string; kind: "human" | "virtual" } {
  const mapped = CONTRIBUTOR_MAP[slug];
  if (mapped) return mapped;
  return { name: slug, kind: "human" };
}