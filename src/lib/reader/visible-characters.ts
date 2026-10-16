import type { CharacterMeta } from "../content/types";
import { stripSeparatorMarks } from "../separator-marks";

/** Layout separators belong to the chatbot answer, never to public character metadata. */
export function publicCharacterText(value: unknown): string {
  if (typeof value !== "string") return "";
  return stripSeparatorMarks(value.replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, ""))
    .split(/(?:(?:\\\s*){2,})/, 1)[0]!
    .trim();
}

/** Defensive projection for older frozen revisions that contain chatbot layout debris. */
export function publicCharacters(value: unknown): CharacterMeta[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const row = (entry ?? {}) as { name?: unknown; role?: unknown; firstAppearanceSection?: unknown };
    const name = publicCharacterText(row.name);
    const role = publicCharacterText(row.role);
    if (!name || !role) return [];
    const firstAppearanceSection = publicCharacterText(row.firstAppearanceSection);
    return [{ name, role, ...(firstAppearanceSection ? { firstAppearanceSection } : {}) }];
  });
}

/**
 * Characters a reader may see while reading a chapter: those introduced in this chapter or earlier.
 * A character with no recorded first appearance stays visible (nothing says it would spoil), and a work
 * without chapters shows everyone.
 */
export function visibleCharacters(
  characters: CharacterMeta[],
  sectionSlugsInOrder: string[],
  activeSectionSlug?: string
): CharacterMeta[] {
  if (!activeSectionSlug || sectionSlugsInOrder.length === 0) return characters;
  const activeIndex = sectionSlugsInOrder.indexOf(activeSectionSlug);
  if (activeIndex < 0) return characters;
  return characters.filter((character) => {
    const first = character.firstAppearanceSection;
    if (!first) return true;
    const index = sectionSlugsInOrder.indexOf(first);
    return index < 0 || index <= activeIndex;
  });
}
