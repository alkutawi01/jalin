import { formatEndMYT } from "./periods";

/** Reviewed in the Jalin ChatGPT project, 2 Nov 2026, three rounds (launch plan section 10). */
export const CARD_EXTENSION_NOTICE = "Setiap akaun hanya boleh mempunyai satu tempoh langganan tambahan yang belum bermula. Semak had sambungan dan tarikh akhir penebusan sebelum membeli kod, termasuk kod untuk dihadiahkan.";
export const CARD_EXTENSION_HELP_LABEL = "Lihat had sambungan";
export const CARD_EXTENSION_FAQ_QUESTION = "Bolehkah saya menebus beberapa kod untuk menyambung langganan?";
export const CARD_EXTENSION_FAQ = [
  "Boleh, secara berperingkat. Anda hanya boleh mempunyai satu tempoh langganan tambahan yang belum bermula. Apabila tempoh tambahan itu mula aktif, anda boleh menebus satu kod seterusnya, tertakluk pada had yang sama.",
  "Jika ada kad yang sedang aktif, akses daripada kod tambahan mesti tamat selewat-lewatnya 12 bulan kalendar selepas kad itu tamat. Jika tiada kad aktif, had dikira daripada tarikh tamat akses semasa, atau daripada waktu penebusan jika tiada akses aktif.",
  "Kod yang ditolak kerana had ini belum digunakan. Pastikan kod masih dalam tempoh sah untuk ditebus.",
] as const;

export function cardQueuedMessage(availableAt: Date): string {
  return `Anda sudah mempunyai tempoh langganan tambahan yang menunggu untuk bermula. Kod yang baru dimasukkan belum digunakan. Anda boleh mencuba penebusan semula apabila tempoh tambahan itu bermula pada ${formatEndMYT(availableAt)}. Pastikan tarikh akhir penebusan kod belum berlalu.`;
}

export function cardYearLimitMessage(maximumEndsAt: Date): string {
  return `Penebusan ini akan melanjutkan akses melepasi had tarikh ${formatEndMYT(maximumEndsAt)}. Kod ini belum digunakan. Semak tempoh akses pada halaman Akaun atau hubungi sokongan Jalin.`;
}
