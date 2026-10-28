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

/**
 * The second company behind Jalin (Izzat, 28 Oct 2026): it sells the subscriptions and receives and manages their payments, while Adjung
 * Press Platform remains the publisher. Both are owned by the same person. Details as on the SSM company profile (the registered address,
 * not the business address). Personal details of directors and officers on that profile are NOT used anywhere.
 */
export const PARTNER_NAME = "Antakesuma Holdings Sdn. Bhd.";
export const PARTNER_REGISTRATION_NUMBER = "200501023605 (705737-H)";
export const PARTNER_REGISTERED_ADDRESS = "PT 189B-190B, Aras 1, Jalan Kelochor, 15300 Kota Bharu, Kelantan";

/** Who owns and runs Jalin, in one sentence, with both registration numbers. Shown in the footer of every page. */
export function ownershipNotice(): string {
  return `Jalin dimiliki dan diuruskan oleh ${COMPANY_NAME} (No. pendaftaran SSM: ${COMPANY_REGISTRATION_NUMBER}) dan ${PARTNER_NAME} (No. pendaftaran SSM: ${PARTNER_REGISTRATION_NUMBER}).`;
}
