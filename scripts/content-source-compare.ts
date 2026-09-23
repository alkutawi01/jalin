import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { MarkdownContentRepository } from "../src/lib/content/markdown-repository";
import { DatabaseContentRepository } from "../src/lib/content/database-repository";
import type { Work, ContributorRef, VisualRef, GlossaryEntry } from "../src/lib/content/types";

const SLUGS = [
  "kerusi-di-beranda",
  "nombor-giliran-117",
  "rumah-yang-masih-menyimpan-suara",
];

interface ComparisonResult {
  slug: string;
  passed: boolean;
  differences: string[];
}

function compareCredits(markdown: ContributorRef[], database: ContributorRef[], slug: string): string[] {
  const diffs: string[] = [];

  if (markdown.length !== database.length) {
    diffs.push(`${slug}.credits.count: markdown=${markdown.length}, database=${database.length}`);
  }

  // Order-sensitive comparison
  for (let i = 0; i < Math.min(markdown.length, database.length); i++) {
    const md = markdown[i];
    const db = database[i];

    if (md.slug !== db.slug) {
      diffs.push(`${slug}.credits[${i}].slug: markdown="${md.slug}", database="${db.slug}"`);
    }
    if (md.role !== db.role) {
      diffs.push(`${slug}.credits[${i}].role: markdown="${md.role}", database="${db.role}"`);
    }
    if (md.byline !== db.byline) {
      diffs.push(`${slug}.credits[${i}].byline: markdown=${md.byline}, database=${db.byline}`);
    }
  }

  return diffs;
}

function compareVisuals(markdown: VisualRef[], database: VisualRef[], slug: string): string[] {
  const diffs: string[] = [];

  if (markdown.length !== database.length) {
    diffs.push(`${slug}.visuals.count: markdown=${markdown.length}, database=${database.length}`);
  }

  // Order-sensitive comparison
  for (let i = 0; i < Math.min(markdown.length, database.length); i++) {
    const md = markdown[i];
    const db = database[i];

    if (md.src !== db.src) {
      diffs.push(`${slug}.visuals[${i}].src: markdown="${md.src}", database="${db.src}"`);
    }
    if (md.alt !== db.alt) {
      diffs.push(`${slug}.visuals[${i}].alt: markdown="${md.alt}", database="${db.alt}"`);
    }
    if (md.role !== db.role) {
      diffs.push(`${slug}.visuals[${i}].role: markdown="${md.role}", database="${db.role}"`);
    }
    if (md.place !== db.place) {
      diffs.push(`${slug}.visuals[${i}].place: markdown="${md.place}", database="${db.place}"`);
    }
    if (md.provider !== db.provider) {
      diffs.push(`${slug}.visuals[${i}].provider: markdown="${md.provider}", database="${db.provider}"`);
    }
    if (md.creationId !== db.creationId) {
      diffs.push(`${slug}.visuals[${i}].creationId: markdown="${md.creationId}", database="${db.creationId}"`);
    }
  }

  return diffs;
}

function compareGlossary(markdown: GlossaryEntry[], database: GlossaryEntry[], slug: string): string[] {
  const diffs: string[] = [];

  if (markdown.length !== database.length) {
    diffs.push(`${slug}.glossary.count: markdown=${markdown.length}, database=${database.length}`);
  }

  // Order-sensitive comparison
  for (let i = 0; i < Math.min(markdown.length, database.length); i++) {
    const md = markdown[i];
    const db = database[i];

    if (md.term !== db.term) {
      diffs.push(`${slug}.glossary[${i}].term: markdown="${md.term}", database="${db.term}"`);
    }
    if (md.meaning !== db.meaning) {
      diffs.push(`${slug}.glossary[${i}].meaning: markdown="${md.meaning}", database="${db.meaning}"`);
    }
  }

  return diffs;
}

function compareWork(markdown: Work, database: Work, slug: string): string[] {
  const diffs: string[] = [];

  if (markdown.id !== database.id) {
    diffs.push(`${slug}.id: markdown="${markdown.id}", database="${database.id}"`);
  }
  if (markdown.slug !== database.slug) {
    diffs.push(`${slug}.slug: markdown="${markdown.slug}", database="${database.slug}"`);
  }
  if (markdown.title !== database.title) {
    diffs.push(`${slug}.title: markdown="${markdown.title}", database="${database.title}"`);
  }
  if (markdown.type !== database.type) {
    diffs.push(`${slug}.type: markdown="${markdown.type}", database="${database.type}"`);
  }
  if (markdown.status !== database.status) {
    diffs.push(`${slug}.status: markdown="${markdown.status}", database="${database.status}"`);
  }
  if (markdown.genre !== database.genre) {
    diffs.push(`${slug}.genre: markdown="${markdown.genre}", database="${database.genre}"`);
  }
  if (markdown.audience !== database.audience) {
    diffs.push(`${slug}.audience: markdown="${markdown.audience}", database="${database.audience}"`);
  }
  if (markdown.dek !== database.dek) {
    diffs.push(`${slug}.dek: markdown="${markdown.dek}", database="${database.dek}"`);
  }
  if (markdown.readingMinutes !== database.readingMinutes) {
    diffs.push(`${slug}.readingMinutes: markdown=${markdown.readingMinutes}, database=${database.readingMinutes}`);
  }
  if (markdown.version !== database.version) {
    diffs.push(`${slug}.version: markdown="${markdown.version}", database="${database.version}"`);
  }
  if (markdown.body !== database.body) {
    diffs.push(`${slug}.body: length markdown=${markdown.body.length}, database=${database.body.length}`);
  }

  // Order-sensitive comparisons
  diffs.push(...compareCredits(markdown.credits, database.credits, slug));
  diffs.push(...compareVisuals(markdown.visuals, database.visuals, slug));
  diffs.push(...compareGlossary(markdown.glossary, database.glossary, slug));

  return diffs;
}

async function main() {
  console.log("CONTENT SOURCE PARITY CHECK\n");

  const markdownRepo = new MarkdownContentRepository();
  const databaseRepo = new DatabaseContentRepository();

  if (!databaseRepo.isEnabled()) {
    console.error("DatabaseContentRepository not enabled.");
    console.error("Ensure DATABASE_URL is set and CONTENT_SOURCE=database");
    process.exit(1);
  }

  await databaseRepo.init();

  const results: ComparisonResult[] = [];

  for (const slug of SLUGS) {
    const markdownWork = markdownRepo.getWork(slug);
    const databaseWork = databaseRepo.getWork(slug);

    if (!markdownWork) {
      results.push({
        slug,
        passed: false,
        differences: ["Work not found in markdown repository"],
      });
      continue;
    }

    if (!databaseWork) {
      results.push({
        slug,
        passed: false,
        differences: ["Work not found in database repository"],
      });
      continue;
    }

    const differences = compareWork(markdownWork, databaseWork, slug);
    results.push({
      slug,
      passed: differences.length === 0,
      differences,
    });
  }

  for (const result of results) {
    const icon = result.passed ? "✓" : "✗";
    console.log(`${icon} ${result.slug}`);

    if (!result.passed) {
      for (const diff of result.differences) {
        console.log(`  - ${diff}`);
      }
    }
  }

  const totalDiffs = results.reduce((sum, r) => sum + r.differences.length, 0);
  console.log(`\nDifferences: ${totalDiffs}`);

  process.exit(totalDiffs === 0 ? 0 : 1);
}

main();
