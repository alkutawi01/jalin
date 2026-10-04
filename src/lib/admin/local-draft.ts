/**
 * A copy of the text and details an editor is typing, kept in the browser until they are saved to the server.
 * If the page is refreshed, closed or crashes before "Simpan", the editor is offered what they had typed instead of
 * losing it. It never replaces the server's copy by itself: the editor chooses to restore it or throw it away.
 */

/** The fields of the work form that hold what the editor writes. */
export const DRAFT_FIELDS = ["title", "dek", "body", "genre", "audience", "readingMinutes", "editorNote", "origin"] as const;
export type DraftFields = Record<(typeof DRAFT_FIELDS)[number], string>;

export interface StoredDraft {
  savedAt: number;
  fields: DraftFields;
}

/** Just enough of the Storage interface, so it can be tested without a browser. */
export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const keyFor = (workId: string) => `jalin:draft:${workId}`;

export function pickDraftFields(form: Record<string, unknown>): DraftFields {
  const out = {} as DraftFields;
  for (const field of DRAFT_FIELDS) out[field] = typeof form[field] === "string" ? (form[field] as string) : "";
  return out;
}

/** True when the stored text is not what the server already has. */
export function draftDiffers(stored: DraftFields, saved: DraftFields): boolean {
  return DRAFT_FIELDS.some((field) => stored[field] !== saved[field]);
}

/** Browser storage can be missing, full or blocked (private windows); the editor must work without it. */
export function saveDraft(storage: DraftStorage | undefined, workId: string, form: Record<string, unknown>, now = Date.now()): void {
  try {
    storage?.setItem(keyFor(workId), JSON.stringify({ savedAt: now, fields: pickDraftFields(form) } satisfies StoredDraft));
  } catch {
    /* no backup is better than a broken editor */
  }
}

export function readDraft(storage: DraftStorage | undefined, workId: string): StoredDraft | null {
  try {
    const raw = storage?.getItem(keyFor(workId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDraft>;
    if (typeof parsed.savedAt !== "number" || !parsed.fields || typeof parsed.fields !== "object") return null;
    return { savedAt: parsed.savedAt, fields: pickDraftFields(parsed.fields as Record<string, unknown>) };
  } catch {
    return null;
  }
}

export function clearDraft(storage: DraftStorage | undefined, workId: string): void {
  try {
    storage?.removeItem(keyFor(workId));
  } catch {
    /* ignore */
  }
}
