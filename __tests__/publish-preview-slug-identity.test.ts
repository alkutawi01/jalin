/**
 * Regression tests for the publish-preview slug/identity fix.
 *
 * Bug: generatePublishPreview()/publishWork() matched an existing
 * content/works/<slug>.md file to a DB work by slug alone. A brand
 * new DB work whose slug happened to collide with an unrelated
 * Markdown file (legacy content, another work, a fixture) was treated
 * as if that file were its own prior publish — confusing the preview
 * diff and, worse, risking a silent overwrite of unrelated content on
 * actual publish. See docs/JALIN_MASTER_PARSER_V2_REAL_MANUSCRIPT_TEST.md.
 *
 * Fix: match on frontmatter `id`, not just slug. These tests exercise
 * that identity check directly against real temp files under
 * content/works/ (cleaned up after each run), without needing a
 * database connection.
 */

import fs from "node:fs";
import path from "node:path";
import { readMatchingExistingMarkdown, workExistsAsMarkdown } from "../src/lib/admin/publishing/publish-work";

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

const WORKS_DIR = path.join(process.cwd(), "content", "works");

function writeFixture(slug: string, id: string) {
  const content = `---\nid: ${id}\nslug: ${slug}\ntitle: Ujian Serpihan\ntype: cerpen\nstatus: published\nversion: v1\n---\n\nTeks ujian.\n`;
  fs.writeFileSync(path.join(WORKS_DIR, `${slug}.md`), content, "utf8");
}

function removeFixture(slug: string) {
  const filePath = path.join(WORKS_DIR, `${slug}.md`);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

console.log("=== Publish preview slug/identity regression ===\n");

// A. No collision: DB work's slug has no Markdown file at all.
// generatePublishPreview()'s existing "brand new work" path must be
// unaffected by this fix.
{
  const slug = "__test-no-collision-slug__";
  removeFixture(slug); // just in case a previous run left one behind
  assert(!workExistsAsMarkdown(slug), "A: no file exists for a fresh slug");
  assert(
    readMatchingExistingMarkdown(slug, "JLN-TEST-0001") === null,
    "A: readMatchingExistingMarkdown returns null when no file exists"
  );
}

// B. Collision: a Markdown file occupies the slug, but its
// frontmatter id belongs to a different work. Must NOT be treated as
// this work's current content — this is the exact bug scenario found
// via content/works/nombor-giliran-117.md.
{
  const slug = "__test-collision-slug__";
  writeFixture(slug, "JLN-OTHER-9999");
  try {
    assert(workExistsAsMarkdown(slug), "B: fixture file exists on disk");
    assert(
      readMatchingExistingMarkdown(slug, "JLN-MINE-0001") === null,
      "B: a same-slug file with a different id is NOT treated as this work's content"
    );
  } finally {
    removeFixture(slug);
  }
}

// C. Legitimate re-publish: a Markdown file at this slug IS this same
// work's own prior publish (matching id). Existing backup/diff
// behaviour must be preserved — this must NOT regress into treating
// every existing file as a collision.
{
  const slug = "__test-legit-republish-slug__";
  const workId = "JLN-MINE-0002";
  writeFixture(slug, workId);
  try {
    assert(workExistsAsMarkdown(slug), "C: fixture file exists on disk");
    const matched = readMatchingExistingMarkdown(slug, workId);
    assert(matched !== null, "C: a same-slug file with the same id IS treated as this work's content");
    assert(
      typeof matched === "string" && matched.includes(`id: ${workId}`),
      "C: the matched content is genuinely the fixture's own content"
    );
  } finally {
    removeFixture(slug);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
