import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import * as fs from "node:fs";
import * as path from "node:path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content");
const WORKS_DIR = path.join(CONTENT_DIR, "works");
const CONTRIBUTORS_DIR = path.join(CONTENT_DIR, "contributors");

interface WorkData {
  id: string;
  slug: string;
  title: string;
  type: string;
  status: string;
  genre?: string;
  audience?: string;
  dek?: string;
  body: string;
  readingMinutes?: number;
  version: string;
  publishedAt?: string;
  updatedAt?: string;
  editorialHistory: unknown[];
  credits: unknown[];
  visuals: unknown[];
  glossary: unknown[];
  metadata?: unknown;
  reader?: unknown;
  sourceWork?: unknown;
}

interface ContributorData {
  slug: string;
  displayName: string;
  kind: string;
  bio: string;
  disclosure?: string;
}

function parseWorkFile(filePath: string): WorkData | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(raw);
    const body = content.replace(/\n---\s*$/, "").trim();

    return {
      id: data.id || "",
      slug: data.slug || path.basename(filePath, ".md"),
      title: data.title || "",
      type: data.type || "cerpen",
      status: data.status || "draft",
      genre: data.genre,
      audience: data.audience,
      dek: data.dek,
      body,
      readingMinutes: data.readingMinutes,
      version: data.version || "v0.1",
      publishedAt: data.publishedAt,
      updatedAt: data.updatedAt,
      editorialHistory: data.editorialHistory || [],
      credits: data.credits || [],
      visuals: data.visuals || [],
      glossary: data.glossary || [],
      metadata: data.metadata && typeof data.metadata === "object" ? data.metadata : undefined,
      reader: data.reader && typeof data.reader === "object" ? data.reader : undefined,
      sourceWork: data.sourceWork && typeof data.sourceWork === "object" ? data.sourceWork : undefined,
    };
  } catch (error) {
    console.error(`Error parsing work file: ${filePath}`, error);
    return null;
  }
}

function parseContributorFile(filePath: string): ContributorData | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(raw);

    const bio = content.trim();
    const disclosureMatch = bio.match(/Identiti ini[^]*?(?:manusia sebenar|persona editorial)/);
    const disclosure = disclosureMatch ? disclosureMatch[0] : undefined;

    return {
      slug: path.basename(filePath, ".md"),
      displayName: data.name || "",
      kind: data.kind || "virtual",
      bio,
      disclosure,
    };
  } catch (error) {
    console.error(`Error parsing contributor file: ${filePath}`, error);
    return null;
  }
}

function validateWork(work: WorkData): string[] {
  const errors: string[] = [];

  if (!work.id) errors.push("Missing id");
  if (!work.slug) errors.push("Missing slug");
  if (!work.title) errors.push("Missing title");
  if (!work.type) errors.push("Missing type");
  if (!["cerpen", "novela", "bersiri", "terjemahan", "fragmen", "sinopsis"].includes(work.type)) {
    errors.push(`Invalid type: ${work.type}`);
  }
  if (!work.status) errors.push("Missing status");
  if (!["draft", "review", "ready", "published", "archived"].includes(work.status)) {
    errors.push(`Invalid status: ${work.status}`);
  }

  return errors;
}

function validateContributor(contributor: ContributorData): string[] {
  const errors: string[] = [];

  if (!contributor.slug) errors.push("Missing slug");
  if (!contributor.displayName) errors.push("Missing display_name");
  if (!contributor.kind) errors.push("Missing kind");
  if (!["human", "virtual", "organization"].includes(contributor.kind)) {
    errors.push(`Invalid kind: ${contributor.kind}`);
  }

  return errors;
}

export function getAllWorkFiles(): string[] {
  if (!fs.existsSync(WORKS_DIR)) return [];
  return fs.readdirSync(WORKS_DIR).filter(f => f.endsWith(".md"));
}

export function getAllContributorFiles(): string[] {
  if (!fs.existsSync(CONTRIBUTORS_DIR)) return [];
  return fs.readdirSync(CONTRIBUTORS_DIR).filter(f => f.endsWith(".md"));
}

export function getWorkData(slug: string): WorkData | null {
  const filePath = path.join(WORKS_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  return parseWorkFile(filePath);
}

export function getContributorData(slug: string): ContributorData | null {
  const filePath = path.join(CONTRIBUTORS_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  return parseContributorFile(filePath);
}

export function getAllWorks(): WorkData[] {
  return getAllWorkFiles()
    .map(f => parseWorkFile(path.join(WORKS_DIR, f)))
    .filter((w): w is WorkData => w !== null);
}

export function getAllContributors(): ContributorData[] {
  return getAllContributorFiles()
    .map(f => parseContributorFile(path.join(CONTRIBUTORS_DIR, f)))
    .filter((c): c is ContributorData => c !== null);
}

export function validateAllData(): { works: number; contributors: number; errors: string[] } {
  const works = getAllWorks();
  const contributors = getAllContributors();
  const errors: string[] = [];

  for (const work of works) {
    const workErrors = validateWork(work);
    errors.push(...workErrors.map(e => `Work ${work.slug}: ${e}`));
  }

  for (const contributor of contributors) {
    const contributorErrors = validateContributor(contributor);
    errors.push(...contributorErrors.map(e => `Contributor ${contributor.slug}: ${e}`));
  }

  return { works: works.length, contributors: contributors.length, errors };
}

if (require.main === module) {
  console.log("Validating content data...");
  const result = validateAllData();
  console.log(`Found ${result.works} works and ${result.contributors} contributors`);
  if (result.errors.length > 0) {
    console.error("Validation errors:");
    result.errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  } else {
    console.log("Validation passed.");
  }
}
