/**
 * Publish Work from Database to Markdown
 *
 * Handles the publish workflow with safety checks, validation, and rollback.
 */

import fs from "node:fs";
import path from "node:path";
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
 * Create a backup of existing Markdown before overwriting.
 */
function createBackup(slug: string): string | null {
  const existing = readExistingMarkdown(slug);
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

  const existing = readExistingMarkdown(slug);
  const currentExists = existing !== null;

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

    // Create backup if file exists
    let backupPath: string | undefined;
    if (workExistsAsMarkdown(slug)) {
      backupPath = createBackup(slug) || undefined;
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
