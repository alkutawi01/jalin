/**
 * Two tabs (or two editors) open on the same work: the second Save used to send its whole form, so a field it never touched went back to
 * the old value it loaded and wiped what the first tab had saved (a whole manuscript, silently). The form now says what it loaded
 * (`base`); the server compares three values per field: what the form loaded, what it is sending, and what is stored now.
 *   sent = base                      -> the editor did not touch it: leave the stored value alone
 *   stored = base or stored = sent   -> nobody else changed it (or it already matches): apply
 *   anything else                    -> someone saved a different value meanwhile: refuse the save (409), overwrite nothing
 */
export const GUARDED_FIELDS = ["title", "slug", "body", "dek", "genre", "audience", "readingMinutes", "editorNote", "readerNote", "origin"] as const;
export type GuardedField = (typeof GUARDED_FIELDS)[number];

export const GUARDED_LABELS: Record<GuardedField, string> = {
  title: "tajuk", slug: "alamat pautan", body: "teks", dek: "tajuk kecil", genre: "genre", audience: "audiens",
  readingMinutes: "minit bacaan", editorNote: "catatan editor", readerNote: "nota pembaca", origin: "asal karya",
};

/** The stored work as the form shows it (every guarded field as text), for comparing with what the form loaded and sends. */
export function storedFormValues(work: { slug: string; title: string; body: string | null; dek: string | null; genre: string | null; audience: string | null; reading_minutes: number | null; metadata: Record<string, unknown> | null; reader?: unknown }): Record<GuardedField, string> {
  const metadata = work.metadata ?? {};
  const reader = work.reader as { note?: unknown } | null | undefined;
  return {
    title: work.title, slug: work.slug, body: work.body ?? "", dek: work.dek ?? "", genre: work.genre ?? "", audience: work.audience ?? "",
    readingMinutes: work.reading_minutes ? String(work.reading_minutes) : "",
    editorNote: typeof metadata.editorNote === "string" ? metadata.editorNote : "",
    readerNote: typeof reader?.note === "string" ? reader.note : "",
    origin: metadata.origin === "sumber" ? "sumber" : "asli",
  };
}

export interface Reconciled {
  /** Fields to leave out of the update because the editor did not change them. */
  skip: GuardedField[];
  /** Fields someone else changed to a different value since this form loaded. */
  conflicts: GuardedField[];
}

const text = (value: unknown) => (typeof value === "string" ? value : value == null ? "" : String(value));

export function reconcileEdit(base: unknown, sent: Partial<Record<GuardedField, unknown>>, stored: Partial<Record<GuardedField, unknown>>): Reconciled {
  const result: Reconciled = { skip: [], conflicts: [] };
  if (!base || typeof base !== "object") return result;
  const loaded = base as Record<string, unknown>;
  for (const field of GUARDED_FIELDS) {
    if (typeof loaded[field] !== "string" || sent[field] === undefined) continue;
    const was = loaded[field] as string;
    const now = text(stored[field]);
    const mine = text(sent[field]);
    if (mine === was) result.skip.push(field);
    else if (now !== was && now !== mine) result.conflicts.push(field);
  }
  return result;
}

export function conflictMessage(fields: GuardedField[]): string {
  return `Karya ini telah diubah di tab atau sesi lain sejak halaman ini dimuatkan (${fields.map((f) => GUARDED_LABELS[f]).join(", ")}). Tiada apa-apa disimpan. Salin teks anda, muat semula halaman, kemudian simpan semula.`;
}
