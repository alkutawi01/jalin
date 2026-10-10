/**
 * The language code (BCP 47) for the language name an editor wrote on a glossary entry ("Arab", "Inggeris", "Jepun"), so a screen reader
 * can voice the original spelling in its own language. Only the first word counts ("Arab klasik" is Arabic). A name that is not in the
 * list gives undefined and the text is left without a language, which is better than a wrong one.
 */
const CODES: Record<string, string> = {
  arab: "ar", inggeris: "en", english: "en", jepun: "ja", cina: "zh", mandarin: "zh", parsi: "fa", farsi: "fa", urdu: "ur", hindi: "hi",
  perancis: "fr", jerman: "de", sepanyol: "es", belanda: "nl", latin: "la", sanskrit: "sa", turki: "tr", rusia: "ru", korea: "ko",
  thai: "th", indonesia: "id", jawa: "jv", ibrani: "he", yunani: "el", itali: "it", portugis: "pt",
};

export function languageCode(name: string | undefined | null): string | undefined {
  const first = (name ?? "").trim().toLowerCase().replace(/^bahasa\s+/, "").split(/[\s,;/(]+/)[0] ?? "";
  return CODES[first];
}
