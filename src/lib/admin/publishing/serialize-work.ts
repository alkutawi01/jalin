/**
 * Serialize Work from Database to Markdown
 *
 * Converts database representation into canonical Jalin Markdown format.
 * Output is deterministic and preserves paragraph structure.
 */

import { getDb, hasDb } from "../../db";
import type { Database } from "../../db/types";

interface SerializedWork {
  frontmatter: Record<string, unknown>;
  body: string;
  content: string;
}

/**
 * Get all data needed for serialization.
 */
async function getWorkData(workId: string) {
  if (!hasDb()) {
    throw new Error("[SerializeWork] Database not available.");
  }

  const db = getDb();

  const work = await db
    .selectFrom("works")
    .where("id", "=", workId)
    .selectAll()
    .executeTakeFirst();

  if (!work) {
    throw new Error(`Work "${workId}" not found.`);
  }

  const credits = await db
    .selectFrom("credits")
    .where("work_id", "=", workId)
    .orderBy("sort_order", "asc")
    .selectAll()
    .execute();

  const visuals = await db
    .selectFrom("visuals")
    .where("work_id", "=", workId)
    .orderBy("sort_order", "asc")
    .selectAll()
    .execute();

  const glossary = await db
    .selectFrom("glossary_terms")
    .where("work_id", "=", workId)
    .orderBy("sort_order", "asc")
    .selectAll()
    .execute();

  return { work, credits, visuals, glossary };
}

/**
 * Serialize a Work from database into canonical Jalin Markdown.
 */
export async function serializeWork(workId: string): Promise<SerializedWork> {
  const { work, credits, visuals, glossary } = await getWorkData(workId);

  // Build frontmatter
  const frontmatter: Record<string, unknown> = {
    id: work.id,
    slug: work.slug,
    title: work.title,
    type: work.type,
    status: work.status,
    version: work.version,
  };

  if (work.genre) frontmatter.genre = work.genre;
  if (work.audience) frontmatter.audience = work.audience;
  if (work.dek) frontmatter.dek = work.dek;
  if (work.reading_minutes) frontmatter.readingMinutes = work.reading_minutes;
  if (work.published_at) frontmatter.publishedAt = work.published_at;
  if (work.updated_at) frontmatter.updatedAt = work.updated_at;

  // Serialize credits
  if (credits.length > 0) {
    frontmatter.credits = credits.map((c) => {
      const credit: Record<string, unknown> = {
        contributor: c.contributor_slug || c.guest_name,
        role: c.role_label,
        byline: c.byline,
      };
      return credit;
    });
  }

  // Serialize visuals
  if (visuals.length > 0) {
    frontmatter.visuals = visuals.map((v) => {
      const visual: Record<string, unknown> = {
        role: v.role,
        src: v.src,
        alt: v.alt || "",
      };
      if (v.provider) visual.provider = v.provider;
      if (v.creation_id) visual.creationId = v.creation_id;
      if (v.anchor) visual.anchor = v.anchor;
      if (v.place) visual.place = v.place;
      return visual;
    });
  }

  // Serialize glossary
  if (glossary.length > 0) {
    frontmatter.glossary = glossary.map((g) => ({
      term: g.term,
      meaning: g.meaning,
      source: g.source,
    }));
  }

  // Editorial history
  const editorialHistory = [
    {
      version: work.version,
      type: "initial",
      summary: "Diterbitkan dari Admin",
      date: new Date().toISOString(),
    },
  ];
  frontmatter.editorialHistory = editorialHistory;

  // Build body
  const body = work.body || "";

  // Build full content
  const content = serializeToMarkdown(frontmatter, body);

  return { frontmatter, body, content };
}

/**
 * Convert frontmatter and body to canonical Jalin Markdown.
 */
function serializeToMarkdown(frontmatter: Record<string, unknown>, body: string): string {
  const lines: string[] = ["---"];

  // Serialize frontmatter in consistent order
  const orderedKeys = [
    "id", "slug", "title", "type", "status", "genre", "audience",
    "dek", "readingMinutes", "version", "publishedAt", "updatedAt",
    "credits", "visuals", "glossary", "editorialHistory",
  ];

  for (const key of orderedKeys) {
    if (frontmatter[key] !== undefined) {
      const value = frontmatter[key];
      if (Array.isArray(value)) {
        lines.push(`${key}:`);
        for (const item of value) {
          if (typeof item === "object" && item !== null) {
            const entries = Object.entries(item)
              .map(([k, v]) => `  ${k}: ${formatValue(v)}`)
              .join("\n");
            lines.push(`- ${entries.split("\n")[0]}`);
            if (entries.split("\n").length > 1) {
              for (let i = 1; i < entries.split("\n").length; i++) {
                lines.push(`    ${entries.split("\n")[i]}`);
              }
            }
          } else {
            lines.push(`- ${formatValue(item)}`);
          }
        }
      } else {
        lines.push(`${key}: ${formatValue(value)}`);
      }
    }
  }

  lines.push("---");
  lines.push("");
  lines.push(body);

  return lines.join("\n");
}

/**
 * Format a value for YAML frontmatter.
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") {
    // Quote strings that contain special characters
    if (value.includes(":") || value.includes("#") || value.includes('"') || value.includes("'")) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  return String(value);
}
