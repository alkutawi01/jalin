/**
 * The line under a virtual contributor's bio. It is left out when the bio already says it: an older import cut the sentence
 * "Identiti ini ialah persona editorial Jalin, bukan manusia sebenar." to "Identiti ini ialah persona editorial", so the page showed
 * the same sentence twice, the second one cut short.
 */
const FALLBACK = "Persona ini ialah identiti editorial maya Jalin dan bekerja di bawah kawal selia editorial manusia.";

function plain(text: string): string {
  return text.replace(/[*_`>#]/g, "").replace(/\s+/g, " ").trim().replace(/[.\s]+$/, "").toLocaleLowerCase("ms");
}

export function disclosureToShow(body: string, disclosure: string | null | undefined): string | null {
  const text = (disclosure ?? "").trim();
  if (!text) return FALLBACK;
  const key = plain(text);
  return key && plain(body).includes(key) ? null : text;
}
