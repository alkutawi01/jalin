import type { CharacterMeta } from "../content/types";

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
