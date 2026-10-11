import { READING_BANDS } from "../../lib/reader/search";
import { DEFAULT_SORT, isFilteredQuery, listQueryString, SORTS, STATUS_PARAMS, type ListFacets, type ListQuery, type ListSort } from "../../lib/reader/category-list";
import { SERIES_STATUS_LABELS } from "../../lib/reader/series-status";

/**
 * Sort and filter bar of a category list. A plain GET form: it works without JavaScript, the result is an address that can be shared,
 * and nothing is stored. The count below it is a status region so a screen reader hears how many works match.
 *
 * A filter is offered only when it can change the list: with a single genre (or none) there is nothing to choose, unless that
 * filter is already applied (then it stays so it can be removed).
 */
export default function CategoryControls({
  type,
  nounPlural,
  query,
  facets,
  shown,
  total
}: {
  type: string;
  /** "cerpen", "novela", "siri" ... used in "9 cerpen". */
  nounPlural: string;
  query: ListQuery;
  facets: ListFacets;
  shown: number;
  total: number;
}) {
  const base = `/kategori/${type}`;
  const filtered = isFilteredQuery(query);
  const showGenreFilter = facets.genres.length > 1 || query.genre !== "";
  const showBandFilter = facets.bands.length > 1 || query.bacaan !== "";
  const showAudienceFilter = facets.audiences.length > 1 || query.umur !== "";
  const showStatusFilter = facets.statuses.length > 1 || query.status !== "";
  const chips: { label: string; href: string }[] = [];
  if (query.genre) chips.push({ label: `Genre: ${query.genre}`, href: `${base}${listQueryString({ ...query, genre: "" })}` });
  if (query.bacaan) chips.push({ label: `Bacaan: ${READING_BANDS[query.bacaan].label}`, href: `${base}${listQueryString({ ...query, bacaan: "" })}` });
  if (query.umur) {
    const label = facets.audiences.find((band) => band.code === query.umur)?.label ?? query.umur;
    chips.push({ label: `Untuk: ${label}`, href: `${base}${listQueryString({ ...query, umur: "" })}` });
  }
  if (query.status) chips.push({ label: `Status: ${SERIES_STATUS_LABELS[STATUS_PARAMS[query.status]]}`, href: `${base}${listQueryString({ ...query, status: "" })}` });
  const count = shown === total ? `${total} ${nounPlural}` : `${shown} daripada ${total} ${nounPlural}`;

  // One item (or none): there is nothing to sort or filter, so the bar would only be noise.
  if (total < 2 && !filtered) return <p className="list-count" role="status">{count}</p>;

  return (
    <section className="list-controls" aria-label={`Susun dan tapis senarai ${nounPlural}`}>
      <form method="get" action={base} className="list-controls-form">
        <label>
          <span>Susun</span>
          <select name="susun" defaultValue={query.susun}>
            {(Object.keys(SORTS) as ListSort[]).map((key) => (
              <option key={key} value={key}>{SORTS[key]}</option>
            ))}
          </select>
        </label>
        {showGenreFilter ? (
          <label>
            <span>Genre</span>
            <select name="genre" defaultValue={query.genre}>
              <option value="">Semua genre</option>
              {facets.genres.map((genre) => (
                <option key={genre.value} value={genre.value}>{genre.value} ({genre.count})</option>
              ))}
            </select>
          </label>
        ) : null}
        {showBandFilter ? (
          <label>
            <span>Panjang bacaan</span>
            <select name="bacaan" defaultValue={query.bacaan}>
              <option value="">Mana-mana</option>
              {facets.bands.map((band) => (
                <option key={band.value} value={band.value}>{band.label} ({band.count})</option>
              ))}
            </select>
          </label>
        ) : null}
        {showAudienceFilter ? (
          <label>
            <span>Sesuai untuk</span>
            <select name="umur" defaultValue={query.umur}>
              <option value="">Semua pembaca</option>
              {facets.audiences.map((band) => (
                <option key={band.code} value={band.code}>{band.label} ({band.count})</option>
              ))}
            </select>
          </label>
        ) : null}
        {showStatusFilter ? (
          <label>
            <span>Status siri</span>
            <select name="status" defaultValue={query.status}>
              <option value="">Semua</option>
              {facets.statuses.map((status) => (
                <option key={status.value} value={status.value}>{status.label} ({status.count})</option>
              ))}
            </select>
          </label>
        ) : null}
        <button type="submit" className="list-controls-apply">Tapis</button>
        {filtered ? <a className="list-controls-reset" href={base}>Kosongkan</a> : null}
      </form>
      {chips.length > 0 ? (
        <ul className="list-chips" aria-label="Penapis aktif">
          {chips.map((chip) => (
            <li key={chip.label}><a href={chip.href} aria-label={`Buang penapis ${chip.label}`}>{chip.label} <span aria-hidden="true">×</span></a></li>
          ))}
        </ul>
      ) : null}
      <p className="list-count" role="status">
        {count}
        {query.susun !== DEFAULT_SORT ? ` · Disusun: ${SORTS[query.susun]}` : ""}
      </p>
    </section>
  );
}
