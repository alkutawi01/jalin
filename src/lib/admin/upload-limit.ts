/**
 * The largest picture an editor can upload.
 *
 * The forms said "maksimum 10 MB", but the host refuses any request above 4.5 MB before it reaches Jalin (a plain-text
 * "Request Entity Too Large"), so a 5 MB picture failed with only "Gagal memuat naik…" and no reason. The limit is 4 MB (the
 * upload carries a little more than the file itself), said on the forms and checked in the browser before anything is sent.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = "4 MB";

/** What to tell the editor when the chosen file is too large; null when it can be sent. */
export function uploadTooLargeMessage(size: number): string | null {
  if (!(size > MAX_UPLOAD_BYTES)) return null;
  const mb = (size / (1024 * 1024)).toFixed(1);
  return `Fail ini ${mb} MB. Had muat naik ialah ${MAX_UPLOAD_LABEL}: kecilkan gambar dahulu (contohnya simpan sebagai JPEG atau WebP), kemudian muat naik semula.`;
}
