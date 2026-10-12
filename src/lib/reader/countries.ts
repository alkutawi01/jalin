/**
 * Negara latar: the country a story is set in, shown on a card beside the reading time ("Jepun · ± 11 minit").
 *
 * Decided with Izzat (12 Oct 2026):
 * - the country only, never a village, street or district;
 * - Malaysia is not shown when it is the only country (Jalin is Malaysian, so it would be noise);
 * - two countries are shown with a hyphen ("Malaysia-Indonesia") only when the story truly belongs to both;
 *   otherwise the editor picks one;
 * - no flags (modern flags are wrong for Inka, Marinid or Joseon settings);
 * - historical settings show today's country; the period is explained on the work page.
 *
 * The codes are stable and the names are Jalin's own Malay display names, so a spelling is fixed in one place.
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

/** At most two: one country, or two when the story truly belongs to both. */
export const MAX_COUNTRIES = 2;

/** The valid, unique codes of a stored value, in the order given, capped at MAX_COUNTRIES. Anything unknown is dropped. */
export function normaliseCountries(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (typeof raw !== "string") continue;
    const code = raw.trim().toUpperCase();
    if (Object.prototype.hasOwnProperty.call(COUNTRIES, code) && !seen.has(code)) seen.add(code);
    if (seen.size === MAX_COUNTRIES) break;
  }
  return [...seen];
}

/** "Jepun · ± 11 minit": the country (when there is one to show) next to the reading time. Empty when there is neither. */
export function readingLine(country: string | undefined, readingMinutes: number | undefined): string {
  return [country, readingMinutes ? `± ${readingMinutes} minit` : ""].filter(Boolean).join(" · ");
}

/**
 * What a card shows for a work's countries, or undefined when nothing should be shown:
 * no country, or Malaysia alone.
 */
export function countryLabel(value: unknown): string | undefined {
  const codes = normaliseCountries(value);
  if (codes.length === 0) return undefined;
  if (codes.length === 1 && codes[0] === "MY") return undefined;
  return codes.map((code) => COUNTRIES[code]).join("-");
}
