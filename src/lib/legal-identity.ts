/**
 * Who runs Jalin in law: the data controller named in the privacy notice (PDPA 2010 section 7 and the 2013 Regulations ask for who
 * collects the data and how to reach them). Registered with SSM on 19 October 2026 as a sole proprietorship (Adjung Press Platform,
 * valid until 18 October 2027: renew before then). The notice names the registered business, its number and address, and the monitored
 * e-mail address. The owner's name and a telephone number are NOT published (Izzat, 19 October 2026: not the Malaysian practice for a
 * notice of this kind). If a registered detail is ever empty, the
 * notice falls back to the name and e-mail only and the admin overview says the details are incomplete. Use the real value or null,
 * never a placeholder. Personal identifiers on the SSM printout (identity card number, date of birth, home address) do not belong here.
 */
export interface ControllerIdentity {
  tradeName: string;
  /** SSM business registration number. */
  ssmNumber: string | null;
  /** The registered business address, for letters. */
  address: string | null;
  /** Optional: not published unless filled. */
  phone?: string | null;
  /** The address privacy requests go to; monitored. */
  email: string;
}

export const CONTROLLER: ControllerIdentity = {
  tradeName: "Adjung Press Platform",
  ssmNumber: "202603277981 (PG0594995-P)",
  address: "PT 428, Blok E, Jalan Kota Jelasin KJ 4/1, Pusat Perniagaan Bandar Baru Tunjung, 15100 Kota Bharu, Kelantan",
  email: "editorial@adjung.com",
};

/** True when the registered details a notice needs are all there. */
export function controllerComplete(identity: ControllerIdentity = CONTROLLER): boolean {
  return Boolean(identity.ssmNumber && identity.address);
}

/** The fields still empty, for the admin warning. */
export function controllerMissing(identity: ControllerIdentity = CONTROLLER): string[] {
  const out: string[] = [];
  if (!identity.ssmNumber) out.push("nombor SSM");
  if (!identity.address) out.push("alamat");
  return out;
}

/**
 * The company that sells the subscriptions and receives and manages their payments (it runs the purchases; Adjung Press Platform above is
 * the publisher). Named in the privacy notice next to the controller. Same source as company-notice.ts.
 */
export const SALES_PARTNER = {
  name: "Antakesuma Holdings Sdn. Bhd.",
  ssmNumber: "200501023605 (705737-H)",
  address: "PT 189B-190B, Aras 1, Jalan Kelochor, 15300 Kota Bharu, Kelantan",
} as const;
