/**
 * Two tabs (or two editors) open on the same work: the second Save used to send its whole form, so a field it never touched went back to
 * the old value it loaded and wiped what the first tab had saved (a whole manuscript, silently). The form now says what it loaded
 * (`base`); the server compares three values per field: what the form loaded, what it is sending, and what is stored now.
 *   sent = base                      -> the editor did not touch it: leave the stored value alone
 *   stored = base or stored = sent   -> nobody else changed it (or it already matches): apply
 *   anything else                    -> someone saved a different value meanwhile: refuse the save (409), overwrite nothing
 */
export const GUARDED_FIELDS = ["title", "body", "dek", "genre", "audience"] as const;
export type GuardedField = (typeof GUARDED_FIELDS)[number];

export const GUARDED_LABELS: Record<GuardedField, string> = { title: "tajuk", body: "teks", dek: "tajuk kecil", genre: "genre", audience: "audiens" };

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
