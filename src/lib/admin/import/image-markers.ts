import type { ImportPlan } from "./plan";
import { imageMarkers } from "../../reader/image-markers";

/** Convert validated chatbot text anchors into movable manuscript markers at draft creation. */
export function materializeImportImageMarkers(plan: ImportPlan): ImportPlan {
  const bodies = [
    { key: "work", body: plan.work.body },
    ...plan.sections.map((section) => ({ key: section.slug, body: section.body })),
  ];
  const allMarkers = bodies.flatMap((entry) => imageMarkers(entry.body));
  let nextNumber = Math.max(0, ...allMarkers.map((marker) => Number(marker.match(/\d+/)?.[0] ?? 0))) + 1;
  const insertions = new Map<string, { at: number; text: string; index: number }[]>();

  const visuals = plan.visuals.map((visual, index) => {
    if (visual.role !== "inline" || !visual.anchor) return visual;
    const candidates = visual.sectionSlug
      ? [...bodies.filter((entry) => entry.key === visual.sectionSlug), ...bodies.filter((entry) => entry.key !== visual.sectionSlug)]
      : bodies;
    const target = candidates.find((entry) => entry.body.includes(visual.anchor!));
    if (!target) return visual; // Preserve the verified legacy anchor if a later edit removed its source.
    const start = target.body.indexOf(visual.anchor);
    // Keep the manuscript paragraph intact; the quoted phrase only locates it.
    const previousBreak = target.body.lastIndexOf("\n\n", start);
    const nextBreak = target.body.indexOf("\n\n", start + visual.anchor.length);
    const at = visual.place === "before"
      ? (previousBreak < 0 ? 0 : previousBreak + 2)
      : (nextBreak < 0 ? target.body.length : nextBreak);
    const marker = `[[gambar:${nextNumber++}]]`;
    insertions.set(target.key, [...(insertions.get(target.key) ?? []), { at, text: visual.place === "before" ? `${marker}\n\n` : `\n\n${marker}`, index }]);
    return { ...visual, anchor: marker, sectionSlug: target.key === "work" ? null : target.key };
  });

  function addMarkers(key: string, body: string): string {
    const positions = insertions.get(key) ?? [];
    return positions.sort((a, b) => b.at - a.at || b.index - a.index).reduce(
      (text, item) => `${text.slice(0, item.at)}${item.text}${text.slice(item.at)}`,
      body
    );
  }

  return {
    ...plan,
    work: { ...plan.work, body: addMarkers("work", plan.work.body) },
    sections: plan.sections.map((section) => ({ ...section, body: addMarkers(section.slug, section.body) })),
    visuals,
  };
}
