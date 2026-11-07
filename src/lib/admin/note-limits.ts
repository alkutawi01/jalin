/**
 * Publication length targets for the two reader-facing notes. Draft saves and pasted answers retain full text;
 * the editor can shorten it afterward. The counters, review notes and publication gate share these values.
 */
export const READER_NOTE_MAX = 600;
export const EDITOR_NOTE_MAX = 5000;

export const READER_NOTE_LABEL = "Nota pada kad 'Tentang karya'";
export const EDITOR_NOTE_LABEL = "Catatan";

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
