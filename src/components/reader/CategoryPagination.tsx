import { pageQueryString, type ListQuery } from "../../lib/reader/category-list";

/**
 * Page links of a category list: plain links (a crawler follows them, and they work without JavaScript), the current page marked,
 * "Sebelumnya" and "Seterusnya" with rel prev/next. Nothing is shown for a list that fits on one page.
 */
export default function CategoryPagination({ base, query, page, pages }: { base: string; query: Partial<ListQuery>; page: number; pages: number }) {
  if (pages <= 1) return null;
  const href = (target: number) => `${base}${pageQueryString(query, target)}`;
  const numbers = Array.from({ length: pages }, (_, index) => index + 1);
  return (
    <nav className="list-pagination" aria-label="Halaman senarai">
      {page > 1 ? <a href={href(page - 1)} rel="prev">‹ Sebelumnya</a> : <span aria-disabled="true">‹ Sebelumnya</span>}
      <ol>
        {numbers.map((number) => (
          <li key={number}>
            {number === page ? (
              <span aria-current="page">{number}</span>
            ) : (
              <a href={href(number)} aria-label={`Halaman ${number}`}>{number}</a>
            )}
          </li>
        ))}
      </ol>
      {page < pages ? <a href={href(page + 1)} rel="next">Seterusnya ›</a> : <span aria-disabled="true">Seterusnya ›</span>}
    </nav>
  );
}
