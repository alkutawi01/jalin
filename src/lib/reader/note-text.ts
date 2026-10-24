import { fixEmphasisBeforeSuffix } from "./emphasis-fix";
import { unitaliciseDictionaryWords } from "./dictionary-words";
import { shortenNoteLinks } from "./note-links";
import { smartQuotes } from "../admin/smart-quotes";
import { spacedDashes } from "./spaced-dash";

/** The Markdown of a note as the reader should see it: the same treatment the story body gets, and long addresses shortened to the site. */
export function noteMarkdown(text: string): string {
  return spacedDashes(smartQuotes(unitaliciseDictionaryWords(fixEmphasisBeforeSuffix(shortenNoteLinks(text)))));
}
