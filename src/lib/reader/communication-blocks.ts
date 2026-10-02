export type CommunicationKind = "mesej" | "emel";
export type CommunicationSegment = { kind: "prose"; content: string } | { kind: CommunicationKind; content: string };

/** A small, explicit authoring extension; unmatched delimiters stay ordinary text. */
export function splitCommunicationBlocks(markdown: string): CommunicationSegment[] {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const pattern = /(?:^|\n{2,}):::(mesej|emel)\n([\s\S]*?)\n:::(?=\n{2,}|$)/g;
  const result: CommunicationSegment[] = [];
  let cursor = 0;
  for (const match of normalized.matchAll(pattern)) {
    const start = match.index;
    if (start > cursor) result.push({ kind: "prose", content: normalized.slice(cursor, start) });
    result.push({ kind: match[1] as CommunicationKind, content: match[2] ?? "" });
    cursor = start + match[0].length;
  }
  if (cursor < normalized.length || result.length === 0) result.push({ kind: "prose", content: normalized.slice(cursor) });
  return result;
}
