export type FragmenKind = "asal" | "terjemahan" | "belum_ditentukan";

function canonicalLanguage(value: string | null | undefined): string {
  const language = (value ?? "").trim().toLocaleLowerCase("ms-MY")
    .replace(/^bahasa\s+/, "").replace(/\s+/g, " ");
  if (!language) return "";
  if (/^(melayu|malay|bm|ms)(\s|$)/.test(language)) return "melayu";
  if (/^(indonesia|indonesian|bi|id)(\s|$)/.test(language)) return "indonesia";
  if (/^(inggeris|english|en)(\s|$)/.test(language)) return "inggeris";
  return language;
}

export function classifyFragmen(
  originalLanguage: string | null | undefined,
  textLanguage: string | null | undefined,
): FragmenKind {
  const original = canonicalLanguage(originalLanguage);
  const text = canonicalLanguage(textLanguage);
  if (!original || !text) return "belum_ditentukan";
  return original === text ? "asal" : "terjemahan";
}
