/**
 * Length limits for the two reader-facing notes on a work. One source for every path that writes them: the form's save
 * (api/admin/works/[id]), the pasted chatbot answer (authoring/editor-answer-service) and the counters under the fields.
 * A pasted answer used to skip the check, so a note over the limit was accepted and only refused later, at the next save.
 */
export const READER_NOTE_MAX = 600;
export const EDITOR_NOTE_MAX = 5000;

export const READER_NOTE_LABEL = "Nota pada kad 'Tentang karya'";
export const EDITOR_NOTE_LABEL = "Catatan editor";

const COUNT = new Intl.NumberFormat("en-US");

/** The sentence shown when a note is too long: which note, how long it is, the limit. */
export function noteTooLongMessage(label: string, length: number, max: number): string {
  return `${label} terlalu panjang (${COUNT.format(length)} aksara; maksimum ${COUNT.format(max)}).`;
}

/** Throws the message above when `text` is over `max`; otherwise returns it unchanged. */
export function assertNoteFits(label: string, text: string, max: number): string {
  if (text.length > max) throw new Error(`${noteTooLongMessage(label, text.length, max)} Minta AI memendekkannya; tiada perubahan disimpan.`);
  return text;
}
