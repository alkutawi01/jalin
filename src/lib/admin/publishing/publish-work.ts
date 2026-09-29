/**
 * Publish Work from Database to Markdown
 *
 * Handles the publish workflow with safety checks, validation, and rollback.
 */

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { serializeWork } from "./serialize-work";

const CONTENT_DIR = path.join(process.cwd(), "content");
const WORKS_DIR = path.join(CONTENT_DIR, "works");
const BACKUP_DIR = path.join(CONTENT_DIR, "backups");

export interface PublishResult {
  success: boolean;
  slug: string;
  filePath: string;
  backupPath?: string;
  error?: string;
}

export interface PublishPreview {
  slug: string;
  isNew: boolean;
  currentExists: boolean;
  /**
   * True when a Markdown file already occupies this slug but its
   * frontmatter `id` does NOT match this work's id — i.e. the slug is
   * taken by an unrelated file, not by a prior publish of this same
   * work. Surfaced explicitly rather than folded into currentExists so
   * the UI can warn instead of silently treating it as "no conflict".
   */
  slugCollision: boolean;
  metadataChanged: boolean;
  bodyChanged: boolean;
  creditsChanged: boolean;
  visualsChanged: boolean;
  glossaryChanged: boolean;
  currentContent?: string;
  newContent: string;
}

/**
 * Get the file path for a work's Markdown file.
 */
function getWorkFilePath(slug: string): string {
  return path.join(WORKS_DIR, `${slug}.md`);
}

/**
 * Get the backup file path for a work.
 */
function getBackupFilePath(slug: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(BACKUP_DIR, `${slug}.${timestamp}.md`);
}

/**
 * Check if a work exists as Markdown.
 */
export function workExistsAsMarkdown(slug: string): boolean {
  return fs.existsSync(getWorkFilePath(slug));
}

/**
 * Read existing Markdown content for a work.
 */
function readExistingMarkdown(slug: string): string | null {
  const filePath = getWorkFilePath(slug);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, "utf8");
}

/**
 * Identity guard for the DB -> Markdown publish boundary.
 *
 * Slugs are unique within the database (`slugExists`), but nothing
 * stops a newly created DB work from sharing a slug with an unrelated
 * Markdown file that predates it or was never migrated in (legacy
 * content, a fixture, another work entirely). Both the DB row and a
 * canonical Jalin Markdown file carry a stable `id` in frontmatter —
 * use that, not just the slug, to decide whether an existing file on
 * disk is genuinely "this work"'s current published state.
 *
 * Returns the existing file's raw content only when its frontmatter
 * `id` matches the DB work's id. A same-slug file with a different
 * (or missing) id is treated as unrelated: present on disk, but not
 * "this work"'s current content.
 */
export function readMatchingExistingMarkdown(slug: string, workId: string): string | null {
  const existing = readExistingMarkdown(slug);
  if (existing === null) return null;

  let existingId: unknown;
  try {
    existingId = matter(existing).data?.id;
  } catch {
    // Malformed frontmatter on the existing file: don't treat it as a
    // match, but don't let a parse failure here break publishing either.
    return null;
  }

  return existingId === workId ? existing : null;
}

/**
 * Create a backup of existing Markdown before overwriting.
 *
 * Only backs up content that is actually this work's own prior
 * publish (matching frontmatter `id`). An unrelated file at the same
 * slug is never backed up here, because publishWork() refuses to
 * overwrite it in the first place — see the collision check there.
 */
function createBackup(slug: string, workId: string): string | null {
  const existing = readMatchingExistingMarkdown(slug, workId);
  if (!existing) {
    return null;
  }

  // Ensure backup directory exists
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const backupPath = getBackupFilePath(slug);
  fs.writeFileSync(backupPath, existing, "utf8");

  return backupPath;
}

/**
 * Generate a publish preview showing what will change.
 */
export async function generatePublishPreview(workId: string): Promise<PublishPreview> {
  const serialized = await serializeWork(workId);
  const slug = serialized.frontmatter.slug as string;

  const rawExisting = readExistingMarkdown(slug);
  const existing = readMatchingExistingMarkdown(slug, workId);
  const currentExists = existing !== null;
  const slugCollision = rawExisting !== null && existing === null;

  // Simple diff detection
  let metadataChanged = true;
  let bodyChanged = true;
  let creditsChanged = true;
  let visualsChanged = true;
  let glossaryChanged = true;

  if (existing) {
    // Compare body content
    const existingBody = extractBodyFromMarkdown(existing);
    bodyChanged = existingBody !== serialized.body;

    // For simplicity, mark as changed if content differs
    metadataChanged = existing !== serialized.content;
    creditsChanged = metadataChanged;
    visualsChanged = metadataChanged;
    glossaryChanged = metadataChanged;
  }

  return {
    slug,
    isNew: !currentExists,
    currentExists,
    slugCollision,
    metadataChanged,
    bodyChanged,
    creditsChanged,
    visualsChanged,
    glossaryChanged,
    currentContent: existing || undefined,
    newContent: serialized.content,
  };
}

/**
 * Extract body content from Markdown file.
 */
function extractBodyFromMarkdown(markdown: string): string {
  const parts = markdown.split("---");
  if (parts.length < 3) {
    return markdown;
  }
  return parts.slice(2).join("---").trim();
}

/**
 * Validate generated Markdown before writing.
 */
function validateMarkdown(content: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for frontmatter
  if (!content.startsWith("---")) {
    errors.push("Missing frontmatter opening delimiter");
  }

  const parts = content.split("---");
  if (parts.length < 3) {
    errors.push("Missing frontmatter closing delimiter");
  }

  // Check for required fields
  if (!content.includes("title:")) {
    errors.push("Missing required field: title");
  }
  if (!content.includes("slug:")) {
    errors.push("Missing required field: slug");
  }
  if (!content.includes("type:")) {
    errors.push("Missing required field: type");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Publish a work from database to Markdown.
 */
export async function publishWork(workId: string): Promise<PublishResult> {
  try {
    // Generate serialized content
    const serialized = await serializeWork(workId);
    const slug = serialized.frontmatter.slug as string;
    const filePath = getWorkFilePath(slug);

    // Validate
    const validation = validateMarkdown(serialized.content);
    if (!validation.valid) {
      return {
        success: false,
        slug,
        filePath,
        error: `Validation failed: ${validation.errors.join(", ")}`,
      };
    }

    // Refuse to publish over a Markdown file that already occupies
    // this slug but belongs to a different work (mismatched or
    // missing frontmatter id). Overwriting it would silently destroy
    // unrelated published content just because two works happened to
    // land on the same slug string.
    if (workExistsAsMarkdown(slug) && readMatchingExistingMarkdown(slug, workId) === null) {
      return {
        success: false,
        slug,
        filePath,
        error: `Slug "${slug}" sudah digunakan oleh fail Markdown lain yang bukan kepunyaan karya ini (id tidak sepadan). Selesaikan konflik slug sebelum menerbitkan.`,
      };
    }

    // Create backup if file exists
    let backupPath: string | undefined;
    if (workExistsAsMarkdown(slug)) {
      backupPath = createBackup(slug, workId) || undefined;
    }

    // Ensure works directory exists
    if (!fs.existsSync(WORKS_DIR)) {
      fs.mkdirSync(WORKS_DIR, { recursive: true });
    }

    // Write file
    fs.writeFileSync(filePath, serialized.content, "utf8");

    return {
      success: true,
      slug,
      filePath,
      backupPath,
    };
  } catch (error) {
    return {
      success: false,
      slug: "",
      filePath: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Rollback a work to its backup version.
 */
export function rollbackWork(slug: string, backupTimestamp: string): PublishResult {
  const backupPath = path.join(BACKUP_DIR, `${slug}.${backupTimestamp}.md`);
  const filePath = getWorkFilePath(slug);

  if (!fs.existsSync(backupPath)) {
    return {
      success: false,
      slug,
      filePath,
      error: `Backup not found: ${backupPath}`,
    };
  }

  const backupContent = fs.readFileSync(backupPath, "utf8");
  fs.writeFileSync(filePath, backupContent, "utf8");

  return {
    success: true,
    slug,
    filePath,
    backupPath,
  };
}

/**
 * List available backups for a work.
 */
export function listBackups(slug: string): string[] {
  if (!fs.existsSync(BACKUP_DIR)) {
    return [];
  }

  return fs
    .readdirSync(BACKUP_DIR)
    .filter((file) => file.startsWith(`${slug}.`) && file.endsWith(".md"))
    .map((file) => file.replace(`${slug}.`, "").replace(".md", ""))
    .sort()
    .reverse();
}
