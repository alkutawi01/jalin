/**
 * Panel Bacaan AI: the arithmetic. Everything is done with exact fractions (BigInt), because the owner's rule is "strictly above 8.0
 * on the raw score": a value of 8.0000001 must qualify and 8.000 must not, whatever a rounded display says.
 *
 * A rating's composite is  sum(score_i * weight_i) / sum(weight_i)  over the components that apply. The result for a piece is the plain
 * mean of its valid ratings (no median, no trimming, no minimum number of reviewers: one rating is enough, more can be added).
 */
import { COMPONENT_BY_KEY, THRESHOLD, validScore, type ComponentKey } from "./rubric";

const pow10 = (n: number): bigint => { let r = BigInt(1); for (let i = 0; i < n; i++) r = r * BigInt(10); return r; };

export interface Fraction { num: bigint; den: bigint }

const gcd = (a: bigint, b: bigint): bigint => { a = a < BigInt(0) ? -a : a; b = b < BigInt(0) ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
export function frac(num: bigint, den: bigint): Fraction {
  if (den === BigInt(0)) throw new Error("A fraction cannot have a zero denominator.");
  const g = gcd(num, den) || BigInt(1);
  return den < BigInt(0) ? { num: -num / g, den: -den / g } : { num: num / g, den: den / g };
}
export const addFrac = (a: Fraction, b: Fraction): Fraction => frac(a.num * b.den + b.num * a.den, a.den * b.den);
/** > 0, 0 or < 0 comparing two fractions. */
export const compareFrac = (a: Fraction, b: Fraction): number => { const l = a.num * b.den, r = b.num * a.den; return l > r ? 1 : l < r ? -1 : 0; };

/** "8", "8.0" or "7.75" (at most three decimals, 1 to 10) as an exact fraction, or null. */
export function parseThreshold(text: string): Fraction | null {
  const m = /^(\d{1,2})(?:[.,](\d{1,3}))?$/.exec(text.trim());
  if (!m) return null;
  const decimals = m[2] ?? "";
  const num = BigInt(m[1] + decimals);
  const den = pow10(decimals.length);
  const f = frac(num, den);
  return compareFrac(f, frac(BigInt(1), BigInt(1))) >= 0 && compareFrac(f, frac(BigInt(10), BigInt(1))) <= 0 ? f : null;
}

/** > 0, 0 or < 0 comparing a with an integer. */
export const compareToInt = (a: Fraction, n: number): number => { const l = a.num, r = BigInt(n) * a.den; return l > r ? 1 : l < r ? -1 : 0; };

/** Decimal text of a fraction, rounded half up to `places` (display only; never compare these). */
export function toDecimal(a: Fraction, places = 3): string {
  const scale = pow10(places);
  const scaled = (a.num * scale * BigInt(2) + a.den) / (a.den * BigInt(2)); // round half up for non-negative values
  const whole = scaled / scale;
  const rest = (scaled % scale).toString().padStart(places, "0");
  return places > 0 ? `${whole}.${rest}` : `${whole}`;
}

export type ScoreMap = Partial<Record<ComponentKey, number | null>>;

/** The composite of one rating. null = N/A. Throws if a core component is missing or a score is off the 0.5 grid. */
export function composite(scores: ScoreMap): Fraction {
  let num = BigInt(0);
  let weights = BigInt(0);
  for (const [key, component] of COMPONENT_BY_KEY) {
    const score = scores[key];
    if (score === null || score === undefined) {
      if (!component.optional) throw new Error(`The component ${key} cannot be N/A.`);
      continue;
    }
    if (!validScore(score)) throw new Error(`The score ${score} for ${key} is not between 1 and 10 in steps of 0.5.`);
    num += BigInt(Math.round(score * 2)) * BigInt(component.weight);
    weights += BigInt(component.weight);
  }
  if (weights === BigInt(0)) throw new Error("No component applies.");
  return frac(num, weights * BigInt(2));
}

export interface PanelResult {
  count: number;
  /** The mean of the ratings, exact. null when there are none. */
  mean: Fraction | null;
  meanText: string | null;
  /** The score rule: mean strictly above THRESHOLD. null when there is no rating, so nothing to say. */
  meetsThreshold: boolean | null;
}

export const DEFAULT_THRESHOLD: Fraction = frac(BigInt(THRESHOLD), BigInt(1));

export function panelResult(composites: Fraction[], threshold: Fraction = DEFAULT_THRESHOLD): PanelResult {
  if (composites.length === 0) return { count: 0, mean: null, meanText: null, meetsThreshold: null };
  let sum: Fraction = frac(BigInt(0), BigInt(1));
  for (const c of composites) sum = addFrac(sum, c);
  const mean = frac(sum.num, sum.den * BigInt(composites.length));
  return { count: composites.length, mean, meanText: toDecimal(mean, 3), meetsThreshold: compareFrac(mean, threshold) > 0 };
}
