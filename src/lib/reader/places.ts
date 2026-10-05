/**
 * The places of a story (Latar tempat) as the reader sees them: a name and, if the editor wrote one, a few words about it.
 * Only those two fields are passed on, whatever else the stored metadata holds.
 */
import type { PlaceMeta } from "../../components/reader/types";

export function publicPlaces(metadata: { places?: unknown } | null | undefined): PlaceMeta[] {
  const list = metadata?.places;
  if (!Array.isArray(list)) return [];
  const places: PlaceMeta[] = [];
  for (const entry of list) {
    const row = (entry ?? {}) as { name?: unknown; description?: unknown };
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name) continue;
    const description = typeof row.description === "string" ? row.description.trim() : "";
    places.push(description ? { name, description } : { name });
  }
  return places;
}
