/**
 * Which works carry a source (a text that came from somewhere else).
 *
 * Terjemahan, Fragmen and Sinopsis always do. A Cerpen or Novela is original to Jalin unless the editor
 * says it came from another source (works.metadata.origin = "sumber"); then it gets the same source
 * record, rights review and "one source, one kind of publication" rule.
 */
export const ALWAYS_SOURCED_TYPES: ReadonlySet<string> = new Set(["terjemahan", "fragmen", "sinopsis"]);
export const OPTIONALLY_SOURCED_TYPES: ReadonlySet<string> = new Set(["cerpen", "novela"]);

export function originOf(metadata: unknown): "asli" | "sumber" {
  const value = (metadata as { origin?: unknown } | null | undefined)?.origin;
  return value === "sumber" ? "sumber" : "asli";
}

export function isSourcedWork(type: string, metadata?: unknown): boolean {
  if (ALWAYS_SOURCED_TYPES.has(String(type))) return true;
  return OPTIONALLY_SOURCED_TYPES.has(String(type)) && originOf(metadata) === "sumber";
}
