import { stripItalicMarks } from "./inline-italics";
import { smartQuotes } from "../admin/smart-quotes";
import { spacedDashes } from "./spaced-dash";

/**
 * The dek (blurb) as plain text for places that cannot show italics: the page description, the link preview, structured data and search
 * results. The page itself sets the same words with curved quotes and spaced dashes, so these places must say them the same way.
 */
export function plainDek(dek: string): string {
  return spacedDashes(smartQuotes(stripItalicMarks(dek)));
}
