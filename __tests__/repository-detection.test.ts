/**
 * Regression: stable database repository detection.
 *
 * Production (SWC) minification renames classes (e.g. DatabaseContentRepository
 * → `h`), so detection based on `repo.constructor.name === "DatabaseContentRepository"`
 * silently evaluated to false in every production build: generateStaticParams and
 * reader routes fell back to the markdown loader even when CONTENT_SOURCE=database,
 * which made published DB-only Works (e.g. JLN-NOV-9990) 404 with dynamicParams=false.
 *
 * These tests prove:
 *   1. The database repository is recognized even when its class name is changed
 *      (simulated minification).
 *   2. The markdown repository remains recognized.
 *   3. No source file uses `constructor.name` for repository detection anymore.
 *   4. Reader pages render dynamically, so production DB changes cannot be
 *      hidden behind build-time static params.
 *
 * Requires DATABASE_URL (runs from the repo root with .env.local).
 */

import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { hasDb } from "../src/lib/db";
import {
  initContentRepository,
  resetContentRepository,
  MarkdownContentRepository,
  DatabaseContentRepository,
} from "../src/lib/content";

config({ path: ".env.local", override: true });

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ok: ${description}`);
    passed++;
  } else {
    console.log(`  FAIL: ${description}`);
    failed++;
  }
}

async function main() {
  console.log("\n=== REPOSITORY DETECTION REGRESSION (minification-safe) ===\n");

  // --- 1. Detection survives class renaming (simulated SWC minification) ---
  console.log("class-name independence:");
  class h extends DatabaseContentRepository {}
  const renamedDbRepo = new h();
  assert(
    renamedDbRepo.constructor.name !== "DatabaseContentRepository",
    `old mechanism would fail (constructor.name = "${renamedDbRepo.constructor.name}")`,
  );
  assert(
    renamedDbRepo.source === "database",
    "database repository recognized despite renamed class",
  );

  const dbRepoDirect = new DatabaseContentRepository();
  assert(
    dbRepoDirect.source === "database",
    "database repository recognized via stable source property",
  );

  const mdRepo = new MarkdownContentRepository();
  assert(
    mdRepo.source === "markdown",
    "markdown repository remains recognized via stable source property",
  );

  // --- 2. No constructor.name detection remains in source ---
  console.log("source scan:");
  const srcRoot = path.join(process.cwd(), "src");
  const offenders: string[] = [];
  function scan(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(full);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        const content = fs.readFileSync(full, "utf8");
        if (content.includes("constructor.name")) {
          offenders.push(path.relative(process.cwd(), full));
        }
      }
    }
  }
  scan(srcRoot);
  assert(
    offenders.length === 0,
    `no "constructor.name" usage in src/ (offenders: ${offenders.join(", ") || "none"})`,
  );

  // --- 3. Factory wiring: source switch honours CONTENT_SOURCE ---
  console.log("repository factory:");
  assert(
    hasDb(),
    "DATABASE_URL available (required — run from repo root with .env.local)",
  );

  process.env.CONTENT_SOURCE = "markdown";
  resetContentRepository();
  const factoryMarkdown = await initContentRepository();
  assert(
    factoryMarkdown.source === "markdown",
    "factory returns markdown repository when CONTENT_SOURCE=markdown",
  );

  process.env.CONTENT_SOURCE = "database";
  resetContentRepository();
  const factoryDatabase = await initContentRepository();
  assert(
    factoryDatabase.source === "database",
    "factory returns database repository when CONTENT_SOURCE=database",
  );

  // --- 4. DB works are available and reader pages are not pre-rendered ---
  console.log("dynamic reader routes:");
  const novelas = factoryDatabase.getWorksByType("novela");
  assert(
    novelas.length > 0,
    "database exposes at least one published novela",
  );

  const target = novelas[0];
  assert((target.sections ?? []).length > 0, `novela "${target.slug}" exposes reading sections`);
  for (const route of [
    "src/app/kategori/[type]/[slug]/page.tsx",
    "src/app/kategori/[type]/[slug]/[sectionSlug]/page.tsx",
    "src/app/kategori/bersiri/[seriesSlug]/page.tsx",
    "src/app/kategori/bersiri/[seriesSlug]/[episodeSlug]/page.tsx",
  ]) {
    const source = fs.readFileSync(path.join(process.cwd(), route), "utf8");
    assert(source.includes('export const dynamic = "force-dynamic"') && !source.includes("generateStaticParams"), `${route} renders on demand`);
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("ERROR:", error);
  process.exit(1);
});
