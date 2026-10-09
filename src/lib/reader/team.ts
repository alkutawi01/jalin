import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { getDb, hasDb } from "../db";
import { projectRole } from "./credit-projection";

export type TeamMember = {
  slug: string;
  name: string;
  /** "virtual" is a writer persona built with the help of AI; it is always said so on the card. */
  kind: "human" | "virtual" | "organization";
  /** What the published stories credit this person for, in the order a reader expects (Penulis first). */
  roles: string[];
  /** Set for the people who hold an editorial post; they sit in "Penyuntingan dan penerbitan", not in the list of writers. */
  post?: { title: string; duty: string };
};

/**
 * Editorial posts are decided by the editor (Admin > Penyumbang > Jawatan editorial), not read from a single credit (one credit as
 * Penyunting does not make a standing editor). These are used only where the database cannot say: reading from the Markdown files,
 * or before migration 031 has been run. Keyed by the contributor's slug.
 */
export const EDITORIAL_POSTS: Record<string, { title: string; duty: string }> = {
  "izzat-anas": {
    title: "Editor dan pemilik Jalin",
    duty: "Memutuskan pemilihan, penyuntingan dan kelulusan akhir setiap penerbitan Jalin."
  }
};

const ROLE_ORDER = ["Penulis", "Penulis & penyemak", "Penterjemah", "Penyunting", "Penyunting terjemahan", "Penyunting penerbitan", "Penyemak bahasa", "Penyemak fakta"];

function rankRole(role: string): number {
  const index = ROLE_ORDER.indexOf(role);
  return index === -1 ? ROLE_ORDER.length : index;
}

/** The distinct public role labels for one person's credits, most familiar first. Labels a reader may not see are left out. */
export function publicRoles(roleLabels: string[]): string[] {
  const labels = roleLabels.map((label) => projectRole(label)).filter((label): label is string => !!label && label !== "Pengarang asal");
  const distinct = [...new Set(labels)].sort((a, b) => rankRole(a) - rankRole(b));
  // "Penulis & penyemak" and a custom "Penulis sinopsis" say the same to a reader as "Penulis"; two roles are enough on a card.
  const simplified = distinct.includes("Penulis") ? distinct.filter((label) => label === "Penulis" || !label.startsWith("Penulis")) : distinct;
  return simplified.slice(0, 2);
}

/**
 * Who appears on the Editorial page: every contributor the editor made visible who either holds an editorial post or is credited by
 * a published story. Editors first, then everyone else in alphabetical order (never by how much they have published).
 */
export async function listTeam(): Promise<{ editors: TeamMember[]; contributors: TeamMember[] }> {
  let members: TeamMember[] = [];

  if (process.env.CONTENT_SOURCE === "database" && hasDb()) {
    const db = getDb();
    const rows = await db.selectFrom("contributors").select(["slug", "display_name", "kind"]).where("is_visible", "=", true).execute();
    // The post lives in columns from migration 031; until it is run the page still works, from the fallbacks above.
    const profiles = new Map<string, { post?: { title: string; duty: string } }>();
    try {
      const extra = await db.selectFrom("contributors").select(["slug", "post_title", "post_duty"]).execute();
      for (const row of extra) {
        profiles.set(row.slug, {
          post: row.post_title && row.post_duty ? { title: row.post_title, duty: row.post_duty } : undefined
        });
      }
    } catch {
      profiles.clear();
    }
    const migrated = profiles.size > 0;
    const postOf = (slug: string) => (migrated ? profiles.get(slug)?.post : EDITORIAL_POSTS[slug]);
    const credits = await db
      .selectFrom("credits")
      .innerJoin("works", "works.id", "credits.work_id")
      .select(["credits.contributor_slug", "credits.role_label"])
      .where("works.status", "=", "published")
      .where("credits.is_public", "=", true)
      .where("credits.contributor_slug", "is not", null)
      .execute();
    const bySlug = new Map<string, string[]>();
    for (const credit of credits) {
      const slug = credit.contributor_slug as string;
      bySlug.set(slug, [...(bySlug.get(slug) ?? []), credit.role_label]);
    }
    members = rows
      .filter((row) => postOf(row.slug) || bySlug.has(row.slug))
      .map((row) => ({ slug: row.slug, name: row.display_name, kind: row.kind, roles: publicRoles(bySlug.get(row.slug) ?? []), post: postOf(row.slug) }));
  } else {
    const dir = path.join(process.cwd(), "content/contributors");
    if (fs.existsSync(dir)) {
      members = fs.readdirSync(dir)
        .filter((file) => file.endsWith(".md"))
        .map((file) => ({ slug: file.replace(/\.md$/, ""), data: matter(fs.readFileSync(path.join(dir, file), "utf8")).data }))
        .filter(({ data }) => data.status === "published")
        .map(({ slug, data }) => ({ slug, name: String(data.name ?? slug), kind: (data.kind === "human" ? "human" : "virtual") as TeamMember["kind"], roles: [], post: EDITORIAL_POSTS[slug] }));
    }
  }

  // One person is listed once, even when an older pen-name record and the editor's record are both visible.
  const seen = new Set<string>();
  const unique = members
    .sort((a, b) => Number(!!b.post) - Number(!!a.post))
    .filter((member) => (seen.has(member.name) ? false : (seen.add(member.name), true)));
  const byName = (a: TeamMember, b: TeamMember) => a.name.localeCompare(b.name, "ms");
  return {
    editors: unique.filter((member) => member.post).sort(byName),
    contributors: unique.filter((member) => !member.post).sort(byName)
  };
}
