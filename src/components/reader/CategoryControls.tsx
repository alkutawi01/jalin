import type { CSSProperties } from "react";
import CategoryControlsAutoApply from "./CategoryControlsAutoApply";
import { isFilteredQuery, SORTS, type ListFacets, type ListQuery, type ListSort } from "../../lib/reader/category-list";

/**
 * Sort and filter bar of a category list. A plain GET form: it works without JavaScript, the result is an address that can be shared,
 * and nothing is stored. It is drawn with the same parts as the search page (.search-form, .search-filters, .search-actions,
 * .search-apply, .search-clear, .search-count), so a list and the search look like one family.
 *
 * What is applied is shown once, in the field itself (no chips repeating it, no counts inside the choices); "Kosongkan" resets.
 * The count under the form is a status region so a screen reader hears how many works match.
 *
 * A filter is offered only when it can change the list: with a single genre (or none) there is nothing to choose, unless that
 * filter is already applied (then it stays so it can be changed).
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
  // How many fields the form has (Susun is always there): the grid below gives each one a column and the buttons the next, so the buttons
  // always follow the last field on the same row while it fits.
  const fieldCount = 1 + [showGenreFilter, showBandFilter, showAudienceFilter, showStatusFilter].filter(Boolean).length;
  const count = shown === total ? `${total} ${nounPlural}` : `${shown} daripada ${total} ${nounPlural}`;

  // One item (or none): there is nothing to sort or filter, so the bar would only be noise.
  if (total < 2 && !filtered) return <p className="search-count list-count" role="status">{count}</p>;

  const id = (name: string) => `senarai-${type}-${name}`;
  return (
    <section className="list-controls" aria-label={`Susun dan tapis senarai ${nounPlural}`}>
      <form id={id("borang")} className="search-form list-controls-form" method="get" action={base} style={{ "--medan": fieldCount } as CSSProperties}>
        <div className="search-filters">
          <div className="list-field">
            <label htmlFor={id("susun")}>Susun</label>
            <select id={id("susun")} name="susun" defaultValue={query.susun}>
              {(Object.keys(SORTS) as ListSort[]).map((key) => (
                <option key={key} value={key}>{SORTS[key]}</option>
              ))}
            </select>
          </div>
          {showGenreFilter ? (
            <div className="list-field">
              <label htmlFor={id("genre")} className="list-field-quiet">Genre</label>
              <select id={id("genre")} name="genre" defaultValue={query.genre}>
                <option value="">Semua genre</option>
                {facets.genres.map((genre) => (
                  <option key={genre.value} value={genre.value}>{genre.value}</option>
                ))}
              </select>
            </div>
          ) : null}
          {showBandFilter ? (
            <div className="list-field">
              <label htmlFor={id("bacaan")} className="list-field-quiet">Tempoh bacaan</label>
              <select id={id("bacaan")} name="bacaan" defaultValue={query.bacaan}>
                <option value="">Mana-mana tempoh</option>
                {facets.bands.map((band) => (
                  <option key={band.value} value={band.value}>{band.label}</option>
                ))}
              </select>
            </div>
          ) : null}
          {showAudienceFilter ? (
            <div className="list-field">
              <label htmlFor={id("umur")} className="list-field-quiet">Sesuai untuk</label>
              <select id={id("umur")} name="umur" defaultValue={query.umur}>
                <option value="">Semua pembaca</option>
                {facets.audiences.map((band) => (
                  <option key={band.code} value={band.code}>{band.label}</option>
                ))}
              </select>
            </div>
          ) : null}
          {showStatusFilter ? (
            <div className="list-field">
              <label htmlFor={id("status")} className="list-field-quiet">Status siri</label>
              <select id={id("status")} name="status" defaultValue={query.status}>
                <option value="">Semua status</option>
                {facets.statuses.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
        <div className="search-actions">
          <button type="submit" className="search-apply">Tapis</button>
          {filtered ? <a className="search-clear" href={base}>Kosongkan</a> : null}
        </div>
      </form>
      <CategoryControlsAutoApply formId={id("borang")} />
      <p className="search-count list-count" role="status">{count}</p>
    </section>
  );
}
