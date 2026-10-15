/**
 * Negara latar: the country a story is set in, shown on a card beside the reading time ("Jepun · ± 11 minit").
 *
 * Decided with Izzat (12 Oct 2026):
 * - the country only, never a village, street or district;
 * - Malaysia is not shown when it is the only country (Jalin is Malaysian, so it would be noise);
 * - the editor types one principal country or older region ("Empayar Inka", "Al-Andalus", "Joseon"); countries merely mentioned
 *   in the story are not included;
 * - no flags (modern flags are wrong for Inka, Marinid or Joseon settings);
 * - a historical setting may use its own name; the period is explained on the work page.
 *
 * The dictionary below suggests Malay display names (and resolves the codes stored on the first works); it does not limit the editor.
 * "GB-ENG" (England) and "KR" (Korea) are deliberate display choices: readers know England and Korea, not "United Kingdom"
 * or "Korea Selatan" for a story set in Manchester or in the Joseon period.
 */

export const COUNTRIES: Record<string, string> = {
  MY: "Malaysia",
  ID: "Indonesia",
  SG: "Singapura",
  BN: "Brunei",
  TH: "Thailand",
  PH: "Filipina",
  VN: "Vietnam",
  KH: "Kemboja",
  MM: "Myanmar",
  IN: "India",
  PK: "Pakistan",
  BD: "Bangladesh",
  LK: "Sri Lanka",
  CN: "China",
  JP: "Jepun",
  KR: "Korea",
  RU: "Rusia",
  TR: "Turki",
  IR: "Iran",
  IQ: "Iraq",
  SY: "Syria",
  LB: "Lubnan",
  JO: "Jordan",
  PS: "Palestin",
  SA: "Arab Saudi",
  YE: "Yaman",
  OM: "Oman",
  AE: "Emiriah Arab Bersatu",
  QA: "Qatar",
  KW: "Kuwait",
  BH: "Bahrain",
  EG: "Mesir",
  LY: "Libya",
  TN: "Tunisia",
  DZ: "Algeria",
  MA: "Maghribi",
  SD: "Sudan",
  ET: "Ethiopia",
  KE: "Kenya",
  NG: "Nigeria",
  ZA: "Afrika Selatan",
  "GB-ENG": "England",
  GB: "United Kingdom",
  IE: "Ireland",
  FR: "Perancis",
  DE: "Jerman",
  IT: "Itali",
  ES: "Sepanyol",
  PT: "Portugal",
  NL: "Belanda",
  BE: "Belgium",
  CH: "Switzerland",
  AT: "Austria",
  GR: "Greece",
  PL: "Poland",
  UA: "Ukraine",
  NO: "Norway",
  SE: "Sweden",
  DK: "Denmark",
  FI: "Finland",
  IS: "Iceland",
  US: "Amerika Syarikat",
  CA: "Kanada",
  MX: "Mexico",
  BR: "Brazil",
  AR: "Argentina",
  PE: "Peru",
  CL: "Chile",
  CO: "Colombia",
  CU: "Cuba",
  AU: "Australia",
  NZ: "New Zealand"
};

/** Codes in the order an editor expects to find them: by name. */
export const COUNTRY_OPTIONS: Array<{ code: string; name: string }> = Object.entries(COUNTRIES)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name, "ms"));

/** A label is short: it sits on a card next to the reading time. */
export const MAX_COUNTRY_LENGTH = 40;

/** Negara latar is the single principal country/region, never every country mentioned. */
export const MAX_COUNTRIES = 1;

/** Remove escaped chatbot layout separators before a country reaches the form or database. */
export function cleanCountryText(raw: string): string {
  return raw
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, "")
    .split(/(?:_{3,}|={3,}|-{3,}|(?:\\\s*){2,})/, 1)[0]!
    .replace(/\s*\\+\s*/g, " ")
    .replace(/\s*[-–—]\s*/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The editor types the principal country or region as it should read on the card ("Jepun", "Empayar Inka", "Al-Andalus"),
 * so it is not limited to today's countries. The dictionary above only suggests names; a stored entry that is one of its codes
 * (older works) is shown as that code's name. Entries are trimmed, unique, at most MAX_COUNTRY_LENGTH long, at most MAX_COUNTRIES.
 */
export function normaliseCountries(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of value) {
    if (typeof raw !== "string") continue;
    const text = cleanCountryText(raw);
    if (!text || text.length > MAX_COUNTRY_LENGTH || /[<>]/.test(text)) continue;
    const key = text.toLocaleLowerCase("ms");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length === MAX_COUNTRIES) break;
  }
  return out;
}

/** How one stored entry reads: a dictionary code becomes its name, anything else is the editor's own text. */
export function countryName(entry: string): string {
  const code = entry.trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(COUNTRIES, code) ? COUNTRIES[code]! : entry.trim();
}

/** "Jepun · ± 11 minit": the country (when there is one to show) next to the reading time. Empty when there is neither. */
export function readingLine(country: string | undefined, readingMinutes: number | undefined): string {
  return [country, readingMinutes ? `± ${readingMinutes} minit` : ""].filter(Boolean).join(" · ");
}

/**
 * What a card shows for a work's country, or undefined when nothing should be shown: nothing entered, or Malaysia alone.
 * Older arrays with several entries display only their first principal entry.
 */
export function countryLabel(value: unknown): string | undefined {
  const names = normaliseCountries(value).map(countryName);
  if (names.length === 0) return undefined;
  if (names.length === 1 && names[0]!.toLocaleLowerCase("ms") === "malaysia") return undefined;
  return names[0];
}
