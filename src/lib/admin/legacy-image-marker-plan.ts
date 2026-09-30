import { imageMarkers, isImageMarker } from "../reader/image-markers";

export interface LegacyVisualAnchor {
  id: number;
  role: string;
  anchor: string | null;
  place: "before" | "after";
}

export interface MarkerMigrationPlan {
  originalBody: string;
  body: string;
  changes: { id: number; from: string; to: string }[];
  skipped: { id: number; reason: string }[];
}

/** Pure preview: ambiguous or missing anchors are never guessed. */
export function planLegacyImageMarkers(body: string, visuals: LegacyVisualAnchor[]): MarkerMigrationPlan {
  const changes: MarkerMigrationPlan["changes"] = [];
  const skipped: MarkerMigrationPlan["skipped"] = [];
  const insertions: { at: number; marker: string; place: "before" | "after"; id: number }[] = [];
  let next = Math.max(0, ...imageMarkers(body).map((m) => Number(m.match(/\d+/)?.[0] ?? 0)),
    ...visuals.filter((v) => isImageMarker(v.anchor)).map((v) => Number(v.anchor!.match(/\d+/)?.[0] ?? 0))) + 1;

  for (const visual of visuals) {
    if (visual.role !== "inline" || !visual.anchor || isImageMarker(visual.anchor)) continue;
    const first = body.indexOf(visual.anchor);
    if (first < 0) {
      skipped.push({ id: visual.id, reason: "Petikan anchor tidak ditemui dalam manuskrip." });
      continue;
    }
    if (body.indexOf(visual.anchor, first + visual.anchor.length) >= 0) {
      skipped.push({ id: visual.id, reason: "Petikan anchor muncul lebih sekali; pilih kedudukan secara manual." });
      continue;
    }
    const previousBreak = body.lastIndexOf("\n\n", first);
    const nextBreak = body.indexOf("\n\n", first + visual.anchor.length);
    const at = visual.place === "before" ? (previousBreak < 0 ? 0 : previousBreak + 2) : (nextBreak < 0 ? body.length : nextBreak);
    const marker = `[[gambar:${next++}]]`;
    changes.push({ id: visual.id, from: visual.anchor, to: marker });
    insertions.push({ at, marker, place: visual.place, id: visual.id });
  }

  const converted = insertions.sort((a, b) => b.at - a.at || b.id - a.id).reduce(
    (text, item) => `${text.slice(0, item.at)}${item.place === "before" ? `${item.marker}\n\n` : `\n\n${item.marker}`}${text.slice(item.at)}`,
    body,
  );
  return { originalBody: body, body: converted, changes, skipped };
}
