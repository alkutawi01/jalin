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

function compareCredits(markdown: ContributorRef[], database: ContributorRef[]): string[] {
  const diffs: string[] = [];

  if (markdown.length !== database.length) {
    diffs.push(`credits count: markdown=${markdown.length}, database=${database.length}`);
  }

  const sortedMd = [...markdown].sort((a, b) => a.slug.localeCompare(b.slug));
  const sortedDb = [...database].sort((a, b) => a.slug.localeCompare(b.slug));

  for (let i = 0; i < Math.min(sortedMd.length, sortedDb.length); i++) {
    const md = sortedMd[i];
    const db = sortedDb[i];

    if (md.slug !== db.slug) {
      diffs.push(`credit[${i}].slug: markdown="${md.slug}", database="${db.slug}"`);
    }
    if (md.role !== db.role) {
      diffs.push(`credit[${i}].role: markdown="${md.role}", database="${db.role}"`);
    }
    if (md.byline !== db.byline) {
      diffs.push(`credit[${i}].byline: markdown=${md.byline}, database=${db.byline}`);
    }
  }

  return diffs;
}

function compareVisuals(markdown: VisualRef[], database: VisualRef[]): string[] {
  const diffs: string[] = [];

  if (markdown.length !== database.length) {
    diffs.push(`visuals count: markdown=${markdown.length}, database=${database.length}`);
  }

  for (let i = 0; i < Math.min(markdown.length, database.length); i++) {
    const md = markdown[i];
    const db = database[i];

    if (md.src !== db.src) {
      diffs.push(`visual[${i}].src: markdown="${md.src}", database="${db.src}"`);
    }
    if (md.alt !== db.alt) {
      diffs.push(`visual[${i}].alt: markdown="${md.alt}", database="${db.alt}"`);
    }
    if (md.role !== db.role) {
      diffs.push(`visual[${i}].role: markdown="${md.role}", database="${db.role}"`);
    }
    if (md.place !== db.place) {
      diffs.push(`visual[${i}].place: markdown="${md.place}", database="${db.place}"`);
    }
  }

  return diffs;
}

function compareGlossary(markdown: GlossaryEntry[], database: GlossaryEntry[]): string[] {
  const diffs: string[] = [];

  if (markdown.length !== database.length) {
    diffs.push(`glossary count: markdown=${markdown.length}, database=${database.length}`);
  }

  for (let i = 0; i < Math.min(markdown.length, database.length); i++) {
    const md = markdown[i];
    const db = database[i];

    if (md.term !== db.term) {
      diffs.push(`glossary[${i}].term: markdown="${md.term}", database="${db.term}"`);
    }
    if (md.meaning !== db.meaning) {
      diffs.push(`glossary[${i}].meaning: markdown="${md.meaning}", database="${db.meaning}"`);
    }
  }

  return diffs;
}

function compareWork(markdown: Work, database: Work): string[] {
  const diffs: string[] = [];

  if (markdown.id !== database.id) {
    diffs.push(`id: markdown="${markdown.id}", database="${database.id}"`);
  }
  if (markdown.slug !== database.slug) {
    diffs.push(`slug: markdown="${markdown.slug}", database="${database.slug}"`);
  }
  if (markdown.title !== database.title) {
    diffs.push(`title: markdown="${markdown.title}", database="${database.title}"`);
  }
  if (markdown.type !== database.type) {
    diffs.push(`type: markdown="${markdown.type}", database="${database.type}"`);
  }
  if (markdown.status !== database.status) {
    diffs.push(`status: markdown="${markdown.status}", database="${database.status}"`);
  }
  if (markdown.genre !== database.genre) {
    diffs.push(`genre: markdown="${markdown.genre}", database="${database.genre}"`);
  }
  if (markdown.audience !== database.audience) {
    diffs.push(`audience: markdown="${markdown.audience}", database="${database.audience}"`);
  }
  if (markdown.dek !== database.dek) {
    diffs.push(`dek: markdown="${markdown.dek}", database="${database.dek}"`);
  }
  if (markdown.readingMinutes !== database.readingMinutes) {
    diffs.push(`readingMinutes: markdown=${markdown.readingMinutes}, database=${database.readingMinutes}`);
  }
  if (markdown.version !== database.version) {
    diffs.push(`version: markdown="${markdown.version}", database="${database.version}"`);
  }
  if (markdown.body !== database.body) {
    diffs.push(`body: length markdown=${markdown.body.length}, database=${database.body.length}`);
  }

  diffs.push(...compareCredits(markdown.credits, database.credits));
  diffs.push(...compareVisuals(markdown.visuals, database.visuals));
  diffs.push(...compareGlossary(markdown.glossary, database.glossary));

  return diffs;
}

async function main() {
  console.log("Content Comparison: Markdown vs Database\n");

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
    console.log(`Comparing: ${slug}`);

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

    const differences = compareWork(markdownWork, databaseWork);
    results.push({
      slug,
      passed: differences.length === 0,
      differences,
    });
  }

  console.log("\nResults:\n");

  let allPassed = true;

  for (const result of results) {
    const icon = result.passed ? "✓" : "✗";
    console.log(`${icon} ${result.slug}`);

    if (!result.passed) {
      allPassed = false;
      for (const diff of result.differences) {
        console.log(`  - ${diff}`);
      }
    }
  }

  console.log("\n" + (allPassed ? "All comparisons passed!" : "Some comparisons failed."));
  process.exit(allPassed ? 0 : 1);
}

main();
