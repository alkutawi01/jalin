/**
 * What a virtual code costs. The prices are not decided yet (plan A2), so none is written here: they come from PLAN_PRICES_MYR, for
 * example "1=15,6=79,12=149" (ringgit), and while that is missing or incomplete nothing can be bought. Selling is also off until
 * PURCHASES_ENABLED=yes, reader accounts are on, and the gateway keys are set.
 */
import { readerAccountsEnabled } from "../reader-auth/enabled";
import { billplzConfigFromEnv } from "./billplz";
import { chipConfigFromEnv } from "./chip";

export type PlanPrices = { 1: number; 6: number; 12: number };

/** Prices in whole sen, or null unless all of 1, 6 and 12 months are given as plain amounts. */
export function parsePlanPrices(text: string | undefined): PlanPrices | null {
  if (!text) return null;
  const found: Partial<Record<1 | 6 | 12, number>> = {};
  for (const part of text.split(",")) {
    const m = /^\s*(1|6|12)\s*=\s*(\d{1,5})(?:\.(\d{1,2}))?\s*$/.exec(part);
    if (!m) return null;
    const sen = Number(m[2]) * 100 + (m[3] ? Number(m[3].padEnd(2, "0")) : 0);
    if (sen < 100) return null;
    found[Number(m[1]) as 1 | 6 | 12] = sen;
  }
  return found[1] && found[6] && found[12] ? { 1: found[1], 6: found[6], 12: found[12] } : null;
}

export const formatRinggit = (sen: number): string => `RM${(sen / 100).toFixed(sen % 100 === 0 ? 0 : 2)}`;

export type PaymentProvider = "chip" | "billplz";

/** PAYMENT_PROVIDER=billplz keeps Billplz; anything else (or nothing) is CHIP, the gateway Jalin is moving to. */
export function paymentProviderFromEnv(env: Record<string, string | undefined> = process.env): PaymentProvider {
  return env.PAYMENT_PROVIDER?.trim() === "billplz" ? "billplz" : "chip";
}

export const PROVIDER_NAME: Record<PaymentProvider, string> = { chip: "CHIP", billplz: "Billplz" };

export type PurchaseStatus = { enabled: true; prices: PlanPrices; provider: PaymentProvider; providerName: string } | { enabled: false; reason: string };

export function purchaseStatus(env: Record<string, string | undefined> = process.env): PurchaseStatus {
  if (!readerAccountsEnabled(env)) return { enabled: false, reason: "reader accounts are off" };
  if (env.PURCHASES_ENABLED !== "yes") return { enabled: false, reason: "PURCHASES_ENABLED is not yes" };
  const provider = paymentProviderFromEnv(env);
  if (!(provider === "chip" ? chipConfigFromEnv(env) : billplzConfigFromEnv(env))) return { enabled: false, reason: "the gateway keys are missing" };
  const prices = parsePlanPrices(env.PLAN_PRICES_MYR);
  if (!prices) return { enabled: false, reason: "PLAN_PRICES_MYR is missing or incomplete" };
  return { enabled: true, prices, provider, providerName: PROVIDER_NAME[provider] };
}
