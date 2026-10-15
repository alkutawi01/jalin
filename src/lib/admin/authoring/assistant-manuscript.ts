/** A novela may store its text in chapters rather than works.body. */
export function assistantManuscript(type: string, body: string, sections: { slug: string; title: string | null; position: number; body: string }[]): string {
  if (body.trim() || type !== "novela") return body;
  return [...sections].sort((a, b) => a.position - b.position)
    .filter(section => section.body.trim())
    .map(section => `## ${section.title || section.slug}\nSlug bab: ${section.slug}\n\n${section.body}`).join("\n\n");
}
