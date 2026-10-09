import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { getDb, hasDb } from "../db";

export type ContributorListing = { slug: string; name: string; kind: "human" | "virtual" | "organization"; about: string };

/** The first sentence of a bio, without the "# Name" title line or markdown marks, short enough for a list. */
export function bioLead(bio: string | null | undefined): string {
  const text = (bio ?? "").replace(/\r\n/g, "\n").trim().replace(/^# .+\n+/, "").trim();
  const first = text.split(/\n\s*\n/)[0] ?? "";
  const plain = first.replace(/[*_`>#]/g, "").replace(/\s+/g, " ").trim();
  const sentence = plain.match(/^.+?[.!?](\s|$)/)?.[0].trim() ?? plain;
  return sentence.length > 190 ? `${sentence.slice(0, 187).trimEnd()}...` : sentence;
}

/** Every contributor the editor has made visible: the database when the site reads from it, the files in content/contributors otherwise. */
export async function listVisibleContributors(): Promise<ContributorListing[]> {
  if (process.env.CONTENT_SOURCE === "database" && hasDb()) {
    const rows = await getDb().selectFrom("contributors")
      .select(["slug", "display_name", "kind", "bio"])
      .where("is_visible", "=", true)
      .orderBy("display_name", "asc")
      .execute();
    // The editor's record and an older pen-name record can both be visible; one person is listed once.
    const seen = new Set<string>();
    return rows
      .filter((row) => (seen.has(row.display_name) ? false : (seen.add(row.display_name), true)))
      .map((row) => ({ slug: row.slug, name: row.display_name, kind: row.kind, about: bioLead(row.bio) }));
  }
  const dir = path.join(process.cwd(), "content/contributors");
  if (!fs.existsSync(dir)) return [];
  const seen = new Set<string>();
  return fs.readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => ({ slug: file.replace(/\.md$/, ""), parsed: matter(fs.readFileSync(path.join(dir, file), "utf8")) }))
    .filter(({ parsed }) => parsed.data.status === "published")
    .map(({ slug, parsed }) => ({ slug, name: String(parsed.data.name ?? slug), kind: (parsed.data.kind === "human" ? "human" : "virtual") as ContributorListing["kind"], about: bioLead(parsed.content) }))
    .filter((entry) => (seen.has(entry.name) ? false : (seen.add(entry.name), true)))
    .sort((a, b) => a.name.localeCompare(b.name, "ms"));
}
