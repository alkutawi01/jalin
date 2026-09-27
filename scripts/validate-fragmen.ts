/**
 * Fragmen Validator (Phase 4F — mechanical checks only)
 *
 * Validates that a fragmen markdown file prepared by a human is clean and
 * parseable. Scope is deliberately mechanical:
 *
 *   Manusia memilih novel → manusia mengesahkan sumber/hak → AI menyediakan
 *   fragmen → validator memastikan format bersih → manusia menyemak → publish.
 *
 * The validator does NOT make editorial decisions. Explicitly out of scope:
 * - no source type enforcement / HUMAN_REVIEW_REQUIRED / novelty inference
 * - no source reuse detection across works (fragmen vs sinopsis etc.)
 * - no "Jalin work as source" detection
 * - no self-duplicate detection
 * - no candidate vs audit status modes
 * - no provenance policy enforcement
 * - no provenance identifier; no SourceWorkRef.type; no DB schema changes
 * Source selection, source verification, rights and reuse checks are human
 * editorial review.
 *
 * Mechanical rules enforced:
 * 1. body >= 2,000 words (non-empty body)
 * 2. no explicit editorial mukadimah/introductory block at body start
 *    (known-marker detector only; source fidelity remains editorial review)
 * 3. body must not contain frontmatter, provenance/metadata,
 *    JALIN VISUAL HANDOFF or MAGNIFIC PROMPT (leakage detector only)
 * 4. AI cannot be credited as `author`
 * 5. valid sourceWork structure (title/author/language present)
 * 6. glossary structure: canonical fields are term + meaning; source is NOT
 *    required; empty/omitted glossary is valid; empty term/meaning and any
 *    extra field (incl. source, definition) are invalid; no semantic
 *    verification against any dictionary is claimed
 * 7. visuals: remote URLs invalid when visuals are supplied; declared local
 *    assets must exist under public/; visuals: [] is valid
 * 8. creationId, if supplied, receives structural validation only — the
 *    validator never claims Magnific verification
 * 9. type must be fragmen; title/slug/credits/byline present
 *
 * Usage:
 *   npx tsx scripts/validate-fragmen.ts <path-to-fragmen.md ...>
 */
import * as fs from "fs";
import * as path from "path";
import matter from "gray-matter";

export interface FragmenFile {
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
    [key: string]: unknown;
  }>;
  visuals: Array<{
    role?: string;
    src?: string;
    alt?: string;
    provider?: string;
    creationId?: unknown;
  }>;
}

interface ValidationResult {
  file: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export function parseFragmenFile(filePath: string): FragmenFile | null {
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

export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Mukadimah detector: catches KNOWN editorial section markers only.
 * This is a detector, not proof — it cannot distinguish arbitrary
 * editorial prose from source prose. Source fidelity remains editorial.
 */
export function checkMukadimah(body: string): string[] {
  const errors: string[] = [];
  const lines = body.split("\n");
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i].trim();
    if (/^#{1,6}\s+(Mukadimah|Pengenalan|Introduction|Foreword)\b/i.test(line)) {
      errors.push(
        `Body starts with known introduction marker: "${line}" — fragmen must start directly with source text (mukadimah = 0)`,
      );
      break;
    }
  }
  return errors;
}

/**
 * Metadata leakage DETECTOR (safety net). Catches known contamination
 * patterns only; it does NOT prove that the body is 100% source text.
 * Source fidelity remains editorial verification.
 */
export function checkBodyPurity(body: string): string[] {
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
      errors.push(`Body contains known contamination pattern: ${name}`);
    }
  }
  return errors;
}

/**
 * Provenance/metadata leakage DETECTOR for the body (mechanical safety
 * net). Catches known provenance patterns only; source fidelity remains
 * editorial verification.
 */
export function checkProvenanceLeak(body: string): string[] {
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
      errors.push(`Body contains known provenance pattern: ${pattern.source}`);
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

export function checkAIAuthor(
  credits: Array<{ contributor?: string; role?: string }>,
): string[] {
  const errors: string[] = [];
  for (const credit of credits) {
    if (credit.role === "author") {
      const identity = credit.contributor || "";
      for (const pattern of AI_PATTERNS) {
        if (pattern.test(identity)) {
          errors.push(
            `AI detected in author credit: "${identity}" — AI cannot be recorded as author`,
          );
          break;
        }
      }
    }
  }
  return errors;
}

const GLOSSARY_ALLOWED_FIELDS = ["term", "meaning"];

/**
 * Glossary contract (Jalin, final):
 * - glossary is optional (glossary: [] or omitted is valid)
 * - each entry: term + meaning only ("meaning" is canonical; "definition"
 *   is not an accepted alternative)
 * - source is NOT required and NOT part of the new output contract
 * - empty term or empty meaning is invalid; do not invent definitions
 * - the validator does NOT verify definition semantics against any source
 */
export function checkGlossary(glossary: unknown): string[] {
  const errors: string[] = [];
  if (glossary === undefined || glossary === null) {
    return errors;
  }
  if (!Array.isArray(glossary)) {
    errors.push("glossary must be an array (or omitted entirely)");
    return errors;
  }
  glossary.forEach((entry, index) => {
    const label = `glossary entry ${index + 1}`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push(`${label} must be an object with term and meaning`);
      return;
    }
    const record = entry as Record<string, unknown>;
    const term = typeof record.term === "string" ? record.term.trim() : "";
    if (!term) {
      errors.push(`${label} missing term`);
    }
    const meaning =
      typeof record.meaning === "string" ? record.meaning : "";
    if (!meaning.trim()) {
      errors.push(
        `glossary term "${term || label}" has empty meaning — definitions must not be empty or invented; omit the term instead`,
      );
    }
    const disallowed = Object.keys(record).filter(
      (key) => !GLOSSARY_ALLOWED_FIELDS.includes(key),
    );
    if (disallowed.length > 0) {
      errors.push(
        `glossary term "${term || label}" contains disallowed field(s): ${disallowed.join(", ")} — Jalin glossary contract is term + meaning only (no source/provenance; "definition" is not an accepted field)`,
      );
    }
  });
  return errors;
}

export function validateFragmen(file: FragmenFile): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // type must be fragmen
  if (file.type !== "fragmen") {
    errors.push(`type must be "fragmen", got "${file.type}"`);
  }

  // mukadimah = 0 (known-marker detector, not a fidelity proof)
  errors.push(...checkMukadimah(file.body));

  // sourceWork structure (no type/novelty/reuse checks — human editorial)
  if (!file.sourceWork) {
    errors.push("sourceWork is required for fragmen");
  } else {
    if (!file.sourceWork.title) errors.push("sourceWork.title is required");
    if (!file.sourceWork.author) errors.push("sourceWork.author is required");
    if (!file.sourceWork.language)
      errors.push("sourceWork.language is required");
  }

  // body minimum 2,000 words
  const wordCount = countWords(file.body);
  if (wordCount < 2000) {
    errors.push(`Body has ${wordCount} words, minimum is 2,000`);
  }

  // body leakage detector (frontmatter / provenance / handoff / prompts)
  errors.push(...checkBodyPurity(file.body));
  errors.push(...checkProvenanceLeak(file.body));

  // AI cannot be recorded as author
  errors.push(...checkAIAuthor(file.credits));

  // credits
  if (file.credits.length === 0) {
    errors.push("At least one credit is required");
  }
  if (!file.credits.some((c) => c.byline === true)) {
    errors.push("At least one public byline credit is required");
  }

  // glossary structure (term + meaning only; source not required)
  errors.push(...checkGlossary(file.glossary));

  // visuals (remote = invalid; declared local asset must exist; [] valid)
  const publicDir = path.resolve(__dirname, "../public");
  for (const visual of file.visuals) {
    const role = visual.role || "(unnamed)";
    if (!visual.src) {
      errors.push(`Visual "${role}" missing src`);
    } else {
      const isRemote =
        /^https?:\/\//i.test(visual.src) || visual.src.startsWith("//");
      if (isRemote) {
        errors.push(
          `Visual "${role}" uses remote URL (${visual.src}) — production assets must be local`,
        );
      } else {
        const localPath = path.join(
          publicDir,
          visual.src.replace(/^[/\\]+/, ""),
        );
        if (!fs.existsSync(localPath)) {
          errors.push(
            `Visual "${role}" declares local asset "${visual.src}" but it does not exist (expected ${path.relative(path.resolve(__dirname, ".."), localPath)})`,
          );
        }
      }
    }
    if (!visual.alt) {
      errors.push(`Visual "${role}" missing alt text`);
    }
    if (visual.creationId !== undefined) {
      const cid = visual.creationId;
      if (typeof cid !== "string" || cid.trim() === "" || /\s/.test(cid)) {
        errors.push(
          `Visual "${role}" has invalid creationId — structural format check only (non-empty identifier without whitespace); the validator does NOT verify that the ID corresponds to a real Magnific generation`,
        );
      }
    }
  }

  // required fields / non-empty body
  if (!file.body || file.body.trim().length === 0) {
    errors.push("Body is empty");
  }
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
    console.error(
      "Usage: npx tsx scripts/validate-fragmen.ts <path-to-fragmen.md ...>",
    );
    process.exit(1);
  }

  const files: FragmenFile[] = [];
  for (const arg of args) {
    const resolved = path.resolve(arg);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      const file = parseFragmenFile(resolved);
      if (file && file.type === "fragmen") {
        files.push(file);
      }
    }
  }

  if (files.length === 0) {
    console.error("No fragmen files found in arguments");
    process.exit(1);
  }

  console.log(`\n=== FRAGMEN VALIDATOR (Phase 4F — mechanical) ===`);
  console.log(`Files: ${files.length}\n`);

  let allPassed = true;
  for (const file of files) {
    const result = validateFragmen(file);
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

const invokedDirectly =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]).endsWith("validate-fragmen.ts");

if (invokedDirectly) {
  main();
}
