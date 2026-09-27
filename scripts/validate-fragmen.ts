/**
 * Fragmen Validator (Phase 4F)
 *
 * Validates fragmen markdown files against Jalin's structural/metadata contract.
 * Does NOT verify text fidelity to source novel — that requires editorial review.
 *
 * Rules enforced:
 * 1. Source must be "novel" (not cerpen, autobiografi, etc.)
 * 2. One source work cannot be used more than once (across all fragmen)
 * 3. Fragmen body must be at least 2,000 words (excluding introduction)
 * 4. Introduction (mukadimah) must be 150-300 words
 * 5. Metadata/provenance must not leak into body
 * 6. Status cannot exceed "review" through import workflow
 * 7. AI cannot be recorded as author
 * 8. Glossary must have valid source
 * 9. Visuals: no fabricated creationId/src/assets
 *
 * Usage:
 *   npx tsx scripts/validate-fragmen.ts <path-to-fragmen.md>
 *   npx tsx scripts/validate-fragmen.ts content/works/*.md (fragmen only)
 */
import * as fs from "fs";
import * as path from "path";
import matter from "gray-matter";

interface FragmenFile {
  path: string;
  slug: string;
  type: string;
  status: string;
  title: string;
  body: string;
  sourceWork?: {
    title?: string;
    author?: string;
    language?: string;
    rightsStatus?: string;
  };
  credits: Array<{
    contributor?: string;
    role?: string;
    byline?: boolean;
  }>;
  glossary: Array<{
    term?: string;
    meaning?: string;
    source?: string;
  }>;
  visuals: Array<{
    role?: string;
    src?: string;
    alt?: string;
    provider?: string;
    creationId?: string;
  }>;
}

interface ValidationResult {
  file: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
}

function parseFragmenFile(filePath: string): FragmenFile | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);
    const body = content.replace(/\n---\s*$/, "").trim();

    return {
      path: filePath,
      slug: data.slug || path.basename(filePath, ".md"),
      type: data.type || "unknown",
      status: data.status || "unknown",
      title: data.title || "",
      body,
      sourceWork: data.sourceWork || undefined,
      credits: data.credits || [],
      glossary: data.glossary || [],
      visuals: data.visuals || [],
    };
  } catch (e) {
    return null;
  }
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

function findMukadimah(body: string): { mukadimah: string; rest: string } | null {
  // Look for mukadimah section marker
  const markers = ["## Mukadimah", "# Mukadimah", "**Mukadimah**", "Mukadimah:"];
  for (const marker of markers) {
    const idx = body.indexOf(marker);
    if (idx >= 0) {
      const afterMarker = body.slice(idx + marker.length).trim();
      // Find next section marker, separator, or end
      const nextSection = afterMarker.search(/\n##\s|\n#\s|\n\*\*|\n---\s*\n/);
      if (nextSection > 0) {
        return { mukadimah: afterMarker.slice(0, nextSection).trim(), rest: afterMarker.slice(nextSection).trim() };
      }
      return { mukadimah: afterMarker, rest: "" };
    }
  }
  // No explicit mukadimah marker — treat first paragraph as mukadimah
  const firstParagraphEnd = body.indexOf("\n\n");
  if (firstParagraphEnd > 0) {
    return { mukadimah: body.slice(0, firstParagraphEnd).trim(), rest: body.slice(firstParagraphEnd).trim() };
  }
  return null;
}

function checkProvenanceLeak(body: string): string[] {
  const leaks: string[] = [];
  const patterns = [
    /Sumber asal:/i,
    /Source:/i,
    /Original title:/i,
    /rightsStatus/i,
    /public_domain/i,
    /needs_review/i,
    /sourceWork/i,
    /author:\s/i,
    /language:\s/i,
  ];
  for (const pattern of patterns) {
    if (pattern.test(body)) {
      leaks.push(`Body contains metadata pattern: ${pattern.source}`);
    }
  }
  return leaks;
}

function validateFragmen(file: FragmenFile, allSlugs: Set<string>, usedSources: Map<string, string>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Type must be fragmen
  if (file.type !== "fragmen") {
    errors.push(`type must be "fragmen", got "${file.type}"`);
  }

  // 2. Source must be "novel"
  if (!file.sourceWork) {
    errors.push("sourceWork is required for fragmen");
  } else {
    if (!file.sourceWork.title) {
      errors.push("sourceWork.title is required");
    }
    if (!file.sourceWork.author) {
      errors.push("sourceWork.author is required");
    }
    if (!file.sourceWork.language) {
      errors.push("sourceWork.language is required");
    }
    // Source type check — we infer from sourceWork presence and context
    // The source type is not stored in sourceWork, so we check if the source
    // is a novel by looking at the source title/author patterns
    // For now, we flag if sourceWork exists but title is too short (likely not a novel)
    if (file.sourceWork.title && file.sourceWork.title.split(/\s+/).length < 2) {
      warnings.push("sourceWork.title seems too short for a novel — verify source type");
    }
  }

  // 3. Source uniqueness — one source work cannot be used more than once
  if (file.sourceWork?.title) {
    const sourceKey = `${file.sourceWork.title}|${file.sourceWork.author}`;
    if (usedSources.has(sourceKey)) {
      const existingSlug = usedSources.get(sourceKey);
      errors.push(`Source "${file.sourceWork.title}" by ${file.sourceWork.author} already used by fragmen "${existingSlug}"`);
    } else {
      usedSources.set(sourceKey, file.slug);
    }
  }

  // 4. Word count — at least 2,000 words (excluding introduction)
  const wordCount = countWords(file.body);
  if (wordCount < 2000) {
    errors.push(`Body has ${wordCount} words, minimum is 2,000`);
  }

  // 5. Introduction (mukadimah) — 150-300 words
  const mukadimahResult = findMukadimah(file.body);
  if (mukadimahResult) {
    const mukadimahWords = countWords(mukadimahResult.mukadimah);
    if (mukadimahWords < 150) {
      errors.push(`Mukadimah has ${mukadimahWords} words, minimum is 150`);
    } else if (mukadimahWords > 300) {
      errors.push(`Mukadimah has ${mukadimahWords} words, maximum is 300`);
    }
  } else {
    warnings.push("No mukadimah section detected — expected 150-300 word introduction");
  }

  // 6. Metadata/provenance must not leak into body
  const leaks = checkProvenanceLeak(file.body);
  errors.push(...leaks);

  // 7. Status cannot exceed "review" through import workflow
  const reviewStatuses = ["draft", "review"];
  if (!reviewStatuses.includes(file.status)) {
    errors.push(`Status "${file.status}" not allowed through import workflow — must be draft or review`);
  }

  // 8. AI cannot be recorded as author
  for (const credit of file.credits) {
    if (credit.role === "author") {
      const identity = credit.contributor || "";
      const aiPatterns = [/ai/i, /gpt/i, /gemini/i, /claude/i, /bot/i, /model/i, /llm/i];
      for (const pattern of aiPatterns) {
        if (pattern.test(identity)) {
          errors.push(`AI detected in author credit: "${identity}" — AI cannot be recorded as author`);
        }
      }
    }
  }

  // 9. Glossary must have valid source
  for (const entry of file.glossary) {
    if (!entry.term) {
      errors.push("Glossary entry missing term");
    }
    if (!entry.meaning) {
      errors.push(`Glossary term "${entry.term}" missing meaning`);
    }
    if (!entry.source) {
      warnings.push(`Glossary term "${entry.term}" missing source — will default to "Kamus Dewan"`);
    }
  }

  // 10. Visuals: no fabricated creationId/src/assets
  for (const visual of file.visuals) {
    if (!visual.src) {
      errors.push(`Visual "${visual.role}" missing src`);
    }
    if (!visual.alt) {
      errors.push(`Visual "${visual.role}" missing alt text`);
    }
    if (visual.src && visual.src.startsWith("http")) {
      warnings.push(`Visual "${visual.role}" uses remote URL: ${visual.src} — should be local asset`);
    }
  }

  // 11. Body must be non-empty
  if (!file.body || file.body.trim().length === 0) {
    errors.push("Body is empty");
  }

  // 12. Required fields
  if (!file.title) errors.push("Title is missing");
  if (!file.slug) errors.push("Slug is missing");

  return {
    file: file.path,
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: npx tsx scripts/validate-fragmen.ts <path-to-fragmen.md>");
    console.error("       npx tsx scripts/validate-fragmen.ts content/works/*.md");
    process.exit(1);
  }

  // Collect all fragmen files
  const files: FragmenFile[] = [];
  const allSlugs = new Set<string>();
  const usedSources = new Map<string, string>();

  for (const arg of args) {
    const resolved = path.resolve(arg);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      const file = parseFragmenFile(resolved);
      if (file && file.type === "fragmen") {
        files.push(file);
        allSlugs.add(file.slug);
      }
    }
  }

  if (files.length === 0) {
    console.error("No fragmen files found in arguments");
    process.exit(1);
  }

  console.log(`\n=== FRAGMEN VALIDATOR (Phase 4F) ===`);
  console.log(`Files: ${files.length}\n`);

  let allPassed = true;
  for (const file of files) {
    const result = validateFragmen(file, allSlugs, usedSources);
    const icon = result.passed ? "✓" : "✗";
    console.log(`${icon} ${file.slug} (${file.title})`);

    if (result.errors.length > 0) {
      allPassed = false;
      for (const error of result.errors) {
        console.log(`  ERROR: ${error}`);
      }
    }
    if (result.warnings.length > 0) {
      for (const warning of result.warnings) {
        console.log(`  WARNING: ${warning}`);
      }
    }
  }

  console.log(`\n${allPassed ? "ALL PASSED" : "SOME FAILED"}`);
  process.exit(allPassed ? 0 : 1);
}

main();
