/**
 * The business behind every Jalin page, exactly as registered with SSM (Suruhanjaya Syarikat Malaysia, Akta Pendaftaran Perniagaan 1956).
 * The registration number is printed with the old-format number in brackets, as on the certificate.
 */
export const COMPANY_NAME = "Adjung Press Platform";
export const COMPANY_REGISTRATION_NUMBER = "202603277981 (PG0594995-P)";

/** The line shown in every footer. The caller passes the current year, so a page that renders on request never goes stale. */
export function copyrightNotice(year: number): string {
  return `© ${year} ${COMPANY_NAME} (${COMPANY_REGISTRATION_NUMBER}). Hak cipta terpelihara.`;
}
