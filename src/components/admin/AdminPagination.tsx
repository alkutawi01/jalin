/**
 * Previous/next for an admin list that is cut into pages. Plain links (they work without script and keep the filters in the address);
 * "Halaman 2 daripada 3" and which rows are shown, so the editor knows where they are in a long list.
 */
export default function AdminPagination({ page, pages, total, size, hrefFor }: { page: number; pages: number; total: number; size: number; hrefFor: (page: number) => string }) {
  if (pages <= 1) return null;
  const first = (page - 1) * size + 1;
  const last = Math.min(total, page * size);
  return (
    <nav className="admin-pagination" aria-label="Halaman senarai">
      {page > 1 ? <a className="admin-btn admin-btn-sm admin-btn-outline" href={hrefFor(page - 1)} rel="prev">‹ Sebelumnya</a> : <span className="admin-btn admin-btn-sm admin-btn-outline is-disabled" aria-disabled="true">‹ Sebelumnya</span>}
      <span className="admin-pagination-where" role="status">Halaman {page} daripada {pages} · {first}–{last} daripada {total}</span>
      {page < pages ? <a className="admin-btn admin-btn-sm admin-btn-outline" href={hrefFor(page + 1)} rel="next">Seterusnya ›</a> : <span className="admin-btn admin-btn-sm admin-btn-outline is-disabled" aria-disabled="true">Seterusnya ›</span>}
    </nav>
  );
}
