import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type {
  ContributorRef,
  EditorialRevision,
  GlossaryEntry,
  VisualRef,
  Work,
  WorkType
} from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content");
const WORKS_DIR = path.join(CONTENT_DIR, "works");

function getWorkFile(slug: string): string {
  return path.join(WORKS_DIR, `${slug}.md`);
}

function normalizeCredits(credits: unknown): ContributorRef[] {
  if (!Array.isArray(credits)) return [];
  return credits.map((credit) => {
    if (typeof credit !== "object" || credit === null) {
      return { slug: "", role: "" };
    }
    const entry = credit as Record<string, unknown>;
    return {
      slug: String(entry.contributor ?? entry.slug ?? ""),
      role: String(entry.role ?? ""),
      byline: Boolean(entry.byline)
    };
  });
}

function normalizeGlossary(glossary: unknown): GlossaryEntry[] {
  if (!Array.isArray(glossary)) return [];
  return glossary.map((item) => {
    if (typeof item !== "object" || item === null) {
      return { term: "", meaning: "", source: "" };
    }
    const entry = item as Record<string, unknown>;
    return {
      term: String(entry.term ?? ""),
      meaning: String(entry.meaning ?? entry.definition ?? ""),
      source: String(entry.source ?? "")
    };
  });
}

function normalizeVisuals(visuals: unknown): VisualRef[] {
  if (!Array.isArray(visuals)) return [];
  return visuals.map((item) => {
    if (typeof item !== "object" || item === null) {
      return { src: "", alt: "" };
    }
    const entry = item as Record<string, unknown>;
    return {
      role: entry.role ? String(entry.role) : undefined,
      src: String(entry.src ?? ""),
      alt: String(entry.alt ?? ""),
      provider: entry.provider ? String(entry.provider) : undefined,
      creationId: entry.creationId ? String(entry.creationId) : undefined
    };
  });
}

function normalizeEditorialHistory(history: unknown): EditorialRevision[] {
  if (!Array.isArray(history)) return [];
  return history.map((item) => {
    if (typeof item !== "object" || item === null) {
      return { version: "", type: "minor", summary: "", date: "" };
    }
    const entry = item as Record<string, unknown>;
    return {
      version: String(entry.version ?? ""),
      type: (["initial", "minor", "major"] as const).includes(
        entry.type as "initial" | "minor" | "major"
      )
        ? (entry.type as "initial" | "minor" | "major")
        : "minor",
      summary: String(entry.summary ?? ""),
      date: String(entry.date ?? "")
    };
  });
}

function parseWorkSlug(slug: string): Work | undefined {
  const filePath = getWorkFile(slug);
  if (!fs.existsSync(filePath)) return undefined;

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);

  const body = content.replace(/\n---\s*$/, "").trim();
  const metadata = data.metadata && typeof data.metadata === "object"
    ? data.metadata as Work["metadata"]
    : undefined;

  return {
    id: String(data.id ?? ""),
    slug: String(data.slug ?? slug),
    title: String(data.title ?? slug),
    type: String(data.type ?? "cerpen") as WorkType,
    status: String(data.status ?? "draft") as Work["status"],
    genre: data.genre ? String(data.genre) : undefined,
    audience: data.audience ? String(data.audience) : undefined,
    dek: data.dek ? String(data.dek) : undefined,
    readingMinutes: typeof data.readingMinutes === "number" ? data.readingMinutes : undefined,
    publishedAt: data.publishedAt ? String(data.publishedAt) : undefined,
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
    version: String(data.version ?? "v0.1"),
    body,
    credits: normalizeCredits(data.credits),
    visuals: normalizeVisuals(data.visuals),
    glossary: normalizeGlossary(data.glossary),
    editorialHistory: normalizeEditorialHistory(data.editorialHistory),
    metadata
  };
}

function getAllWorkSlugs(): string[] {
  if (!fs.existsSync(WORKS_DIR)) return [];
  return fs
    .readdirSync(WORKS_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""));
}

const worksCache: { slug: string; work: Work }[] = [];

function loadWorks(): void {
  if (worksCache.length > 0) return;
  for (const slug of getAllWorkSlugs()) {
    const work = parseWorkSlug(slug);
    if (work) worksCache.push({ slug, work });
  }
}

export function getWorkBySlug(slug: string): Work | undefined {
  loadWorks();
  return worksCache.find((entry) => entry.slug === slug)?.work;
}

export function getWorksByType(type: WorkType): Work[] {
  loadWorks();
  return worksCache
    .filter((entry) => entry.work.type === type)
    .map((entry) => entry.work);
}

export function getAllWorks(): Work[] {
  loadWorks();
  return worksCache.map((entry) => entry.work);
}