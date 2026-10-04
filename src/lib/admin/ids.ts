/** The largest value a Postgres integer column holds. */
const MAX_DB_INTEGER = 2147483647;

/**
 * Reads a numeric id from a URL or query string. Only plain positive whole numbers that fit the database column
 * are accepted; anything else gives NaN, which the routes answer with 400 instead of passing it to the database
 * (where "abc" or a huge number would come back as a 500 carrying raw database error text).
 */
export function parseDbId(value: string | null | undefined): number {
  if (typeof value !== "string" || !/^\d{1,10}$/.test(value)) return NaN;
  const n = Number(value);
  return n >= 1 && n <= MAX_DB_INTEGER ? n : NaN;
}
