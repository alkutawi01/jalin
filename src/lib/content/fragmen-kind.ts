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

export function isMalayLanguage(value: string | null | undefined): boolean {
  return canonicalLanguage(value) === "melayu";
}

/** Fingerprint of the displayed text, so a human review of the language applies to exactly that text. */
export function fragmenTextHash(body: string | null | undefined): string {
  const text = (body ?? "").replace(/\s+/g, " ").trim();
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
  return (hash >>> 0).toString(16);
}

export interface FragmenTextReview {
  reviewedBy: string;
  reviewedAt: string;
  textHash: string;
}

/** The human confirmation that the displayed fragment text is Bahasa Melayu, read from work metadata. */
export function readFragmenTextReview(metadata: unknown): FragmenTextReview | null {
  const m = (metadata ?? {}) as Record<string, unknown>;
  const r = m.fragmenTextReview as Record<string, unknown> | undefined;
  if (!r || typeof r.reviewedBy !== "string" || typeof r.reviewedAt !== "string" || typeof r.textHash !== "string") return null;
  return { reviewedBy: r.reviewedBy, reviewedAt: r.reviewedAt, textHash: r.textHash };
}
