/**
 * How many sample cards the landing page shows, so no row ever ends with one card alone whether the screen puts 3 or 4 in a row.
 * A count that leaves exactly one over for 3 or for 4 (4, 5, 7, 9, 10) is rounded down to the nearest that does not; 12 at most.
 */
export function visibleSampleCount(n: number): number {
  if (n <= 3) return Math.max(0, n);
  let k = Math.min(n, 12);
  while (k > 3 && (k % 3 === 1 || k % 4 === 1)) k--;
  return k;
}
