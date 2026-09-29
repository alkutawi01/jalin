/**
 * Chapter navigation for a novela whose chapters live in ONE markdown body
 * as `## Bab N: Title` headings (the Markdown content source has no
 * reading_sections). Pure helpers shared by the story page (to build the
 * list) and StoryMarkdown (to give each heading a matching anchor id).
 */

export interface InlineChapter {
  id: string;
  label: string;
}

export function headingId(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Second-level headings (`## `) of a markdown body, in order. */
export function extractInlineChapters(body: string): InlineChapter[] {
  const chapters: InlineChapter[] = [];
  for (const line of body.split(/\r?\n/)) {
    const match = line.match(/^##\s+(.+?)\s*#*\s*$/);
    if (!match) continue;
    const label = match[1]!.trim();
    const id = headingId(label);
    if (id) chapters.push({ id, label });
  }
  return chapters;
}
