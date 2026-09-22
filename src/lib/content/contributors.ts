import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export interface ContributorMeta {
  slug: string;
  name: string;
  kind: string;
  role?: string;
}

export function getContributorMeta(slug: string): ContributorMeta | undefined {
  const contributorPath = path.join(process.cwd(), "content", "contributors", `${slug}.md`);
  if (!fs.existsSync(contributorPath)) return undefined;
  const parsed = matter(fs.readFileSync(contributorPath, "utf8"));
  return {
    slug,
    name: String(parsed.data.name ?? slug),
    kind: String(parsed.data.kind ?? "human"),
    role: parsed.data.role ? String(parsed.data.role) : undefined
  };
}

export function getContributors(slugs: string[]): ContributorMeta[] {
  return slugs
    .map((slug) => getContributorMeta(slug))
    .filter((meta): meta is ContributorMeta => meta !== undefined);
}