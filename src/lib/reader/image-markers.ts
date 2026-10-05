/** Stable, movable image positions in the manuscript. Legacy text anchors stay supported. */
const MARKER_PATTERN = /\[\[gambar:([1-9]\d*)\]\]/g;

export function isImageMarker(value: string | null | undefined): boolean {
  return /^\[\[gambar:[1-9]\d*\]\]$/.test(value?.trim() ?? "");
}

export function imageMarkers(body: string): string[] {
  return [...new Set([...body.matchAll(MARKER_PATTERN)].map((match) => match[0]))];
}

export function imageMarkerLabel(marker: string): string {
  const number = /^\[\[gambar:([1-9]\d*)\]\]$/.exec(marker.trim())?.[1];
  return number ? `Gambar ${number}` : marker;
}

export function nextImageMarker(body: string, existingAnchors: (string | null)[] = []): string {
  const numbers = [...imageMarkers(body), ...existingAnchors.filter(isImageMarker)]
    .map((marker) => Number(marker!.match(/\d+/)?.[0] ?? 0));
  return `[[gambar:${Math.max(0, ...numbers) + 1}]]`;
}

/** Insert after the paragraph containing the caret; the marker itself can later be moved. */
export function insertImageMarker(
  body: string,
  caret: number,
  existingAnchors: (string | null)[] = []
): { body: string; marker: string } | null {
  const position = Math.max(0, Math.min(caret, body.length));
  const previousBreak = body.lastIndexOf("\n\n", position);
  const paragraphStart = previousBreak < 0 ? 0 : previousBreak + 2;
  const nextBreak = body.indexOf("\n\n", position);
  const paragraphEnd = nextBreak < 0 ? body.length : nextBreak;
  if (!body.slice(paragraphStart, paragraphEnd).trim()) return null;

  const marker = nextImageMarker(body, existingAnchors);
  return { body: `${body.slice(0, paragraphEnd)}\n\n${marker}${body.slice(paragraphEnd)}`, marker };
}

/** Never expose authoring markers in the public reading text, even if no image is attached. */
export function stripImageMarkers(text: string): string {
  if (!text.includes("[[gambar:")) return text;
  return text.replace(/[ \t]*\[\[gambar:[1-9]\d*\]\][ \t]*/g, "").replace(/\n{3,}/g, "\n\n");
}
