/**
 * Where each note of a story is set beside the text on a wide screen. Pure arithmetic, so it can be tested without a browser;
 * the component measures the page and hands the numbers in.
 *
 * A note wants to sit level with the line that refers to it. It is set in the right margin, below the card that column already
 * holds (Watak & Latar), and below the note before it, so two notes never overlap. When that would push a note more than
 * `maxShift` below its line, the right margin is "full" at that place: the note goes to the left margin instead, if the left
 * margin has room there (it is below its own card too). When neither margin is close to its line, the note still goes to the margin
 * that is nearer (it sits a little lower than its line, as side notes do when they crowd), so a wide screen never shows two kinds of
 * notes. Only a note that would run past the end of the text (`limit`), or whose number cannot be found, is left to the list.
 */
export interface MarginNoteInput {
  number: number;
  /** Top of the reference in the text, from the top of the reading grid. NaN when the reference cannot be found. */
  refTop: number;
  height: number;
}

export interface MarginPlacement {
  number: number;
  side: "right" | "left" | "list";
  top: number;
}

export interface MarginOptions {
  /** Where the right margin starts being free (below the card in that column). */
  rightFloor: number;
  /** Where the left margin starts being free, or null when there is no left margin (narrow screens). */
  leftFloor: number | null;
  /** Space kept between two notes in the same margin. */
  gap: number;
  /** How far below its own line a note may sit before the margin counts as full there. */
  maxShift: number;
  /** The bottom of the text: a note that would end below it is left to the list. Default: no limit. */
  limit?: number;
}

export function placeMarginNotes(notes: MarginNoteInput[], options: MarginOptions): MarginPlacement[] {
  let rightBottom = options.rightFloor;
  let leftBottom = options.leftFloor ?? 0;
  return notes.map((note) => {
    if (!Number.isFinite(note.refTop)) return { number: note.number, side: "list", top: 0 };
    const limit = options.limit ?? Number.POSITIVE_INFINITY;
    const rightTop = Math.max(note.refTop, rightBottom);
    const leftTop = options.leftFloor === null ? Number.POSITIVE_INFINITY : Math.max(note.refTop, leftBottom, options.leftFloor);
    const rightShift = rightTop - note.refTop;
    const leftShift = leftTop - note.refTop;
    // Level with its line when the right margin allows, else the left; else whichever is nearer.
    const side: "right" | "left" = rightShift <= options.maxShift ? "right" : leftShift <= options.maxShift ? "left" : leftShift < rightShift ? "left" : "right";
    const top = side === "right" ? rightTop : leftTop;
    if (top + note.height > limit) return { number: note.number, side: "list", top: 0 };
    if (side === "right") rightBottom = top + note.height + options.gap;
    else leftBottom = top + note.height + options.gap;
    return { number: note.number, side, top };
  });
}

/**
 * Where the columns of a grid sit, from what the browser reports for it (the resolved track sizes, the gap and how the free
 * space is shared), as distances from the grid's left edge.
 */
export function trackOffsets(tracks: number[], gap: number, contentWidth: number, justify: string, paddingLeft = 0): number[] {
  const free = Math.max(0, contentWidth - tracks.reduce((a, b) => a + b, 0) - gap * Math.max(0, tracks.length - 1));
  const start = justify === "center" ? free / 2 : 0;
  const spread = justify === "space-between" && tracks.length > 1 ? free / (tracks.length - 1) : 0;
  const out: number[] = [];
  let x = paddingLeft + start;
  for (const track of tracks) {
    out.push(x);
    x += track + gap + spread;
  }
  return out;
}
