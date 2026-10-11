import { audienceCodes, DEFAULT_AUDIENCE_BANDS, type AudienceBand } from "../audience";
import { displayableGenre } from "./genre-display";
import { fold, READING_BANDS, type ReadingBand } from "./search";
import { SERIES_STATUS_LABELS, type SeriesStatus } from "./series-status";
import { capitaliseFirst } from "../capitalise-first";

/**
 * Sorting and filtering of a category list (cerpen, novela, bersiri, fragmen, sinopsis). The choices live in the address
 * (?susun=, ?genre=, ?bacaan=, ?umur=, ?status=) so a filtered list can be shared, goes back and forward, and works without JavaScript.
 *
 * Every value comes from the address, so it is checked against what exists: an unknown sort, reading band, audience or status falls
 * back to "no filter", and a word such as "constructor" is never looked up as a property.
 */

export const SORTS = {
  terbaru: "Terbaru diterbitkan",
  kemaskini: "Baru dikemas kini",
  terlama: "Terlama diterbitkan",
  terpendek: "Paling pendek",
  terpanjang: "Paling panjang",
  tajuk: "Tajuk A hingga Z"
} as const;
export type ListSort = keyof typeof SORTS;
export const DEFAULT_SORT: ListSort = "terbaru";

/** The word in the address and the status it means. A series that is not "completed" is still going on. */
export const STATUS_PARAMS = { berterusan: "ongoing", tamat: "completed" } as const satisfies Record<string, SeriesStatus>;
export type StatusParam = keyof typeof STATUS_PARAMS;

export interface ListQuery {
  susun: ListSort;
  /** The genre as typed in the address; compared without case or accents. Empty = every genre. */
  genre: string;
  bacaan: ReadingBand | "";
  /** An audience band code (an editor-defined list, so it is checked against the bands). Empty = everyone. */
  umur: string;
  /** Series only. */
  status: StatusParam | "";
}

/** What a card needs to be sorted and filtered; a work and a series both fit. */
export interface ListItem {
  title: string;
  genre?: string;
  readingMinutes?: number;
  publishedAt?: string;
  updatedAt?: string;
  /** The stored audience value (band codes, a label or an old age range). */
  audience?: string;
  /** A series' status. */
  status?: string;
}

const has = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key);
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
const GENRE_MAX = 60;

export function parseListQuery(
  raw: Record<string, string | string[] | undefined> | undefined,
  bands: AudienceBand[] = DEFAULT_AUDIENCE_BANDS
): ListQuery {
  const source = raw ?? {};
  const susun = one(source.susun).trim();
  const bacaan = one(source.bacaan).trim();
  const umur = one(source.umur).trim().toLowerCase();
  const status = one(source.status).trim();
  return {
    susun: has(SORTS, susun) ? (susun as ListSort) : DEFAULT_SORT,
    genre: one(source.genre).slice(0, GENRE_MAX).trim(),
    bacaan: has(READING_BANDS, bacaan) ? (bacaan as ReadingBand) : "",
    umur: bands.some((band) => band.code === umur) ? umur : "",
    status: has(STATUS_PARAMS, status) ? (status as StatusParam) : ""
  };
}

/** True when the address asks for anything other than the plain list (so the filtered view is not indexed as a page of its own). */
export function isFilteredQuery(query: ListQuery): boolean {
  return query.susun !== DEFAULT_SORT || query.genre !== "" || query.bacaan !== "" || query.umur !== "" || query.status !== "";
}

/** The address of the list with this query ("" parts left out), for links and for the form's reset. */
export function listQueryString(query: Partial<ListQuery>): string {
  const params = new URLSearchParams();
  if (query.susun && query.susun !== DEFAULT_SORT) params.set("susun", query.susun);
  if (query.genre) params.set("genre", query.genre);
  if (query.bacaan) params.set("bacaan", query.bacaan);
  if (query.umur) params.set("umur", query.umur);
  if (query.status) params.set("status", query.status);
  const text = params.toString();
  return text ? `?${text}` : "";
}

const genreKey = (genre: string | undefined) => fold(displayableGenre(genre) ?? "").trim();
const statusOf = (item: ListItem): SeriesStatus | undefined => (item.status === undefined ? undefined : item.status === "completed" ? "completed" : "ongoing");

/** Newest or oldest first; an item without a date is last either way, not first. */
function byDate(pick: (item: ListItem) => string | undefined, direction: 1 | -1) {
  return (a: ListItem, b: ListItem) => {
    const left = pick(a) ?? "";
    const right = pick(b) ?? "";
    if (left === right) return 0;
    if (!left) return 1;
    if (!right) return -1;
    return direction * left.localeCompare(right);
  };
}

function byMinutes(direction: 1 | -1) {
  return (a: ListItem, b: ListItem) => {
    const left = a.readingMinutes;
    const right = b.readingMinutes;
    if (left === right) return 0;
    if (left === undefined) return 1;
    if (right === undefined) return -1;
    return direction * (left - right);
  };
}

const COMPARATORS: Record<ListSort, (a: ListItem, b: ListItem) => number> = {
  terbaru: byDate((item) => item.publishedAt, -1),
  terlama: byDate((item) => item.publishedAt, 1),
  kemaskini: byDate((item) => item.updatedAt ?? item.publishedAt, -1),
  terpendek: byMinutes(1),
  terpanjang: byMinutes(-1),
  tajuk: (a, b) => a.title.localeCompare(b.title, "ms")
};

/** Filtered, then sorted; the title decides a tie, so the order is the same on every request. */
export function applyListQuery<T extends ListItem>(items: T[], query: ListQuery, bands: AudienceBand[] = DEFAULT_AUDIENCE_BANDS): T[] {
  const wantedGenre = fold(query.genre).trim();
  const band = query.bacaan ? READING_BANDS[query.bacaan] : null;
  const wantedStatus = query.status ? STATUS_PARAMS[query.status] : null;
  const compare = COMPARATORS[query.susun];
  return items
    .filter((item) => {
      if (wantedGenre && genreKey(item.genre) !== wantedGenre) return false;
      if (band && (item.readingMinutes === undefined || !band.test(item.readingMinutes))) return false;
      if (query.umur && !audienceCodes(item.audience, bands).includes(query.umur)) return false;
      if (wantedStatus && statusOf(item) !== wantedStatus) return false;
      return true;
    })
    .sort((a, b) => compare(a, b) || a.title.localeCompare(b.title, "ms"));
}

export interface ListFacets {
  /** Genres that exist in this category, with how many items each has (a genre written two ways is one entry). */
  genres: { value: string; count: number }[];
  /** Reading bands that have at least one item. */
  bands: { value: ReadingBand; label: string; count: number }[];
  /** Audience bands that have at least one item (an item may be for several). */
  audiences: { code: string; label: string; count: number }[];
  /** Series statuses that have at least one item. */
  statuses: { value: StatusParam; label: string; count: number }[];
}

export function listFacets(items: ListItem[], bands: AudienceBand[] = DEFAULT_AUDIENCE_BANDS): ListFacets {
  const genres = new Map<string, { value: string; count: number }>();
  for (const item of items) {
    const shown = displayableGenre(item.genre);
    if (!shown) continue;
    const key = fold(shown).trim();
    const entry = genres.get(key);
    if (entry) entry.count += 1;
    else genres.set(key, { value: capitaliseFirst(shown), count: 1 });
  }
  const readingBands = (Object.keys(READING_BANDS) as ReadingBand[])
    .map((value) => ({
      value,
      label: READING_BANDS[value].label,
      count: items.filter((item) => item.readingMinutes !== undefined && READING_BANDS[value].test(item.readingMinutes)).length
    }))
    .filter((band) => band.count > 0);
  const audiences = bands
    .map((band) => ({ code: band.code, label: band.label, count: items.filter((item) => audienceCodes(item.audience, bands).includes(band.code)).length }))
    .filter((band) => band.count > 0);
  const statuses = (Object.keys(STATUS_PARAMS) as StatusParam[])
    .map((value) => ({
      value,
      label: SERIES_STATUS_LABELS[STATUS_PARAMS[value]],
      count: items.filter((item) => statusOf(item) === STATUS_PARAMS[value]).length
    }))
    .filter((status) => status.count > 0);
  return { genres: [...genres.values()].sort((a, b) => a.value.localeCompare(b.value, "ms")), bands: readingBands, audiences, statuses };
}
