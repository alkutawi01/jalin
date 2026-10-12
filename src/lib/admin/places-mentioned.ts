/**
 * The places (Latar tempat) that the text still mentions. An empty text keeps every place (nothing to judge by yet). A place
 * counts as mentioned when any word of its name longer than two letters appears in the text as a whole word.
 */
export function placesMentionedIn<T extends { name: string }>(places: T[], body: string): T[] {
  const fold = (value: string) => value.normalize("NFKD").replace(/\p{M}+/gu, "").toLocaleLowerCase("ms-MY").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const haystack = ` ${fold(body)} `;
  if (haystack.trim() === "") return places;
  return places.filter((place) => {
    const words = fold(place.name).split(" ").filter((word) => word.length > 2);
    return words.some((word) => haystack.includes(` ${word} `));
  });
}
