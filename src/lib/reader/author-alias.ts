/**
 * Older credits and published versions use a pen-name address ("/penulis/nara-zahin", "/penulis/rafiq-naim"); the editor's record
 * for that person is under another slug ("claude", "chatgpt": Admin > Penyumbang). The old address shows the editor's record, and
 * names the record's address as the one page for that person, so a search engine does not see two pages for one author.
 */
export const EDITOR_RECORD: Record<string, string> = { "nara-zahin": "claude", "rafiq-naim": "chatgpt" };

/** The one address of an author's page: the editor's record when the slug is an older address. */
export function authorSlug(slug: string): string {
  return isAuthorAlias(slug) ? EDITOR_RECORD[slug] : slug;
}

/** Own entries only: an address such as "/penulis/constructor" or "/penulis/toString" is not an alias (a plain lookup finds those on every object). */
export const isAuthorAlias = (slug: string) => Object.prototype.hasOwnProperty.call(EDITOR_RECORD, slug);
