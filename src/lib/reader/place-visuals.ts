export interface AnchoredVisual {
  role?: string | null;
  anchor?: string | null;
  place?: string | null;
}

/** Place editorial images at their text anchors, independent of DB sort_order. */
export function placeVisuals<T extends AnchoredVisual>(body: string, visuals: T[]): (string | T)[] {
  const placements = visuals
    .filter((visual) => visual.role !== "hero" && visual.anchor?.trim())
    .map((visual, index) => {
      const anchor = visual.anchor!.trim();
      const start = body.indexOf(anchor);
      return { visual, index, position: visual.place === "before" ? start : start + anchor.length, found: start >= 0 };
    })
    .filter((item) => item.found)
    .sort((a, b) => a.position - b.position || a.index - b.index);

  const result: (string | T)[] = [];
  let cursor = 0;
  for (const item of placements) {
    result.push(body.slice(cursor, item.position));
    result.push(item.visual);
    cursor = item.position;
  }
  result.push(body.slice(cursor));
  return result;
}
