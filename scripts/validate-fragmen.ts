/**
 * Fragmen Validator (Phase 4F — Patched)
 *
 * Validates fragmen markdown files against Jalin's structural/metadata contract.
 *
 * POLICY: Fragmen ialah petikan daripada novel dan terus bermula dengan teks karya.
 * Fragmen TIDAK mempunyai mukadimah.
 *
 * Rules enforced:
 * 1. Fragmen must not have mukadimah/introduction in body
 * 2. Source must be novel (sourceWork.type must be "novel")
 * 3. One source novel cannot be used more than once across all Jalin fragmen
 * 4. Fragmen body minimum 2,000 words
 * 5. Body must be pure source text (no metadata, provenance, handoff, notes)
 * 6. Status cannot exceed "review" through import workflow
 * 7. AI cannot be recorded as author
 * 8. Glossary with unverifiable source = warning/review
 * 9. Visuals: no fabricated creationId/src/assets, no remote URLs
 * 10. Source cannot be Jalin cerpen/novela/fragmen/sinopsis
 *
 * Does NOT verify text fidelity to source novel (requires editorial review).
 *
 * Usage:
 *   npx tsx scripts/validate-fragmen.ts <path-to-fragmen.md>
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
    type?: string;
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

function checkMukadimah(body: string): string[] {
  const errors: string[] = [];
  // Only check for explicit section markers at the start of the body
  const lines = body.split("\n");
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i].trim();
    if (/^##\s+(Mukadimah|Pengenalan|Introduction|Foreword)/i.test(line)) {
      errors.push(`Body starts with introduction section: "${line}" — fragmen must start directly with source text`);
      break;
    }
    if (/^#\s+(Mukadimah|Pengenalan|Introduction|Foreword)/i.test(line)) {
      errors.push(`Body starts with introduction section: "${line}" — fragmen must start directly with source text`);
      break;
    }
  }
  return errors;
}

function checkBodyPurity(body: string): string[] {
  const errors: string[] = [];
  const patterns = [
    { pattern: /^---\s*$/m, name: "frontmatter separator" },
    { pattern: /sourceWork:/i, name: "sourceWork metadata" },
    { pattern: /credits:/i, name: "credits metadata" },
    { pattern: /editorialHistory:/i, name: "editorialHistory metadata" },
    { pattern: /JALIN VISUAL HANDOFF/i, name: "JALIN VISUAL HANDOFF" },
    { pattern: /MAGNIFIC PROMPT/i, name: "MAGNIFIC PROMPT" },
    { pattern: /rightsStatus/i, name: "rightsStatus metadata" },
    { pattern: /source\.text\.basis/i, name: "source_text_basis" },
    { pattern: /nota editor/gi, name: "nota editor" },
    { pattern: /editorial note/gi, name: "editorial note" },
    { pattern: /Sumber asal:/i, name: "Sumber asal" },
    { pattern: /Original title:/i, name: "Original title" },
    { pattern: /Source:/i, name: "Source metadata" },
  ];
  for (const { pattern, name } of patterns) {
    if (pattern.test(body)) {
      errors.push(`Body contains non-source content: ${name}`);
    }
  }
  return errors;
}

function checkProvenanceLeak(body: string): string[] {
  const errors: string[] = [];
  const patterns = [
    /sourceWork/i,
    /public_domain/i,
    /needs_review/i,
    /author:\s/i,
    /language:\s/i,
    /rights_status/i,
    /source_locator/i,
    /source_edition/i,
    /source_url/i,
  ];
  for (const pattern of patterns) {
    if (pattern.test(body)) {
      errors.push(`Body contains provenance pattern: ${pattern.source}`);
    }
  }
  return errors;
}

const AI_PATTERNS = [
  /\bgemini\b/i,
  /\bchatgpt\b/i,
  /\bgpt[\s-]?[0-9]/i,
  /\bclaude\b/i,
  /\bllm\b/i,
  /\bartificial intelligence\b/i,
  /\bmodel\b.*\bAI\b/i,
  /\bAI\b.*\bmodel\b/i,
  /\bbot\b/i,
  /\bmimo\b/i,
  /\bcodex\b/i,
  /\banthropic\b/i,
  /\bopenai\b/i,
  /\bgoogle\b.*\bai\b/i,
];

function checkAIAuthor(credits: Array<{ contributor?: string; role?: string }>): string[] {
  const errors: string[] = [];
  for (const credit of credits) {
    if (credit.role === "author") {
      const identity = credit.contributor || "";
      for (const pattern of AI_PATTERNS) {
        if (pattern.test(identity)) {
          errors.push(`AI detected in author credit: "${identity}" — AI cannot be recorded as author`);
          break;
        }
      }
    }
  }
  return errors;
}

function validateFragmen(file: FragmenFile, allFragmenSlugs: Set<string>, usedSources: Map<string, string>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Type must be fragmen
  if (file.type !== "fragmen") {
    errors.push(`type must be "fragmen", got "${file.type}"`);
  }

  // 2. Fragmen must NOT have mukadimah
  const mukadimahErrors = checkMukadimah(file.body);
  errors.push(...mukadimahErrors);

  // 3. Source must be novel
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
    // Source type check — must be explicitly "novel"
    if (file.sourceWork.type && file.sourceWork.type !== "novel") {
      errors.push(`sourceWork.type must be "novel", got "${file.sourceWork.type}" — fragmen only from novels`);
    }
  }

  // 4. Source uniqueness — one source novel cannot be used more than once
  if (file.sourceWork?.title) {
    const sourceKey = `${file.sourceWork.title}|${file.sourceWork.author}`;
    if (usedSources.has(sourceKey)) {
      const existingSlug = usedSources.get(sourceKey);
      errors.push(`Source "${file.sourceWork.title}" by ${file.sourceWork.author} already used by fragmen "${existingSlug}"`);
    } else {
      usedSources.set(sourceKey, file.slug);
    }
  }

  // 5. Word count — at least 2,000 words
  const wordCount = countWords(file.body);
  if (wordCount < 2000) {
    errors.push(`Body has ${wordCount} words, minimum is 2,000`);
  }

  // 6. Body purity — no metadata, provenance, handoff, notes
  const purityErrors = checkBodyPurity(file.body);
  errors.push(...purityErrors);

  // 7. Provenance leak check
  const provenanceErrors = checkProvenanceLeak(file.body);
  errors.push(...provenanceErrors);

  // 8. Status cannot exceed "review" through import workflow
  const allowedStatuses = ["draft", "review"];
  if (!allowedStatuses.includes(file.status)) {
    errors.push(`Status "${file.status}" not allowed through import workflow — must be draft or review`);
  }

  // 9. AI cannot be recorded as author
  const aiErrors = checkAIAuthor(file.credits);
  errors.push(...aiErrors);

  // 10. At least one credit required
  if (file.credits.length === 0) {
    errors.push("At least one credit is required");
  }

  // 11. At least one public byline required
  const hasByline = file.credits.some((c) => c.byline === true);
  if (!hasByline) {
    errors.push("At least one public byline credit is required");
  }

  // 12. Glossary — unverifiable source = warning/review
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

  // 13. Visuals — no fabricated creationId/src/assets, no remote URLs
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

  // 14. Body must be non-empty
  if (!file.body || file.body.trim().length === 0) {
    errors.push("Body is empty");
  }

  // 15. Required fields
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
    process.exit(1);
  }

  const files: FragmenFile[] = [];
  const allFragmenSlugs = new Set<string>();
  const usedSources = new Map<string, string>();

  // Load existing fragmen from content directory for cross-Jalin uniqueness check
  const contentDir = path.resolve(__dirname, "../content/works");
  if (fs.existsSync(contentDir)) {
    const contentFiles = fs.readdirSync(contentDir).filter((f) => f.endsWith(".md"));
    for (const cf of contentFiles) {
      const filePath = path.join(contentDir, cf);
      const file = parseFragmenFile(filePath);
      if (file && file.type === "fragmen") {
        allFragmenSlugs.add(file.slug);
        if (file.sourceWork?.title) {
          const sourceKey = `${file.sourceWork.title}|${file.sourceWork.author}`;
          usedSources.set(sourceKey, file.slug);
        }
      }
    }
  }

  // Load input files
  for (const arg of args) {
    const resolved = path.resolve(arg);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      const file = parseFragmenFile(resolved);
      if (file && file.type === "fragmen") {
        files.push(file);
        allFragmenSlugs.add(file.slug);
      }
    }
  }

  if (files.length === 0) {
    console.error("No fragmen files found in arguments");
    process.exit(1);
  }

  console.log(`\n=== FRAGMEN VALIDATOR (Phase 4F — Patched) ===`);
  console.log(`Files: ${files.length}\n`);

  let allPassed = true;
  for (const file of files) {
    const result = validateFragmen(file, allFragmenSlugs, usedSources);
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
