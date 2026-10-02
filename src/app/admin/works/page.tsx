import { listWorks } from "../../../lib/admin/work-service";
import { getDb, hasDb } from "../../../lib/db";
import { summarizeReadiness } from "../../../lib/admin/publication-service";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  cerpen: "Cerpen",
  novela: "Novela",
  bersiri: "Bersiri",
  fragmen: "Fragmen",
  sinopsis: "Sinopsis",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draf",
  review: "Semakan",
  ready: "Sedia",
  published: "Diterbitkan",
  archived: "Arkib",
};

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("ms-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminWorksPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; q?: string; type?: string }>;
}) {
  const { status, q, type } = await searchParams;
  if (!hasDb()) {
    return (
      <div className="admin-placeholder">
        <header className="admin-page-header">
          <h1>Karya</h1>
          <p className="admin-page-sub">Pengurusan karya</p>
        </header>
        <div className="admin-placeholder-content">
          <p>Pangkalan data tidak tersedia. Ciri admin tidak dapat digunakan buat masa ini; hubungi pentadbir teknikal.</p>
        </div>
      </div>
    );
  }

  const allWorks = await listWorks();
  // Credited names per work (registered contributors and guests), so a work can be found by its author.
  const authorsByWork = new Map<string, string>();
  try {
    const db = getDb();
    const rows = await db
      .selectFrom("credits")
      .leftJoin("contributors", "contributors.slug", "credits.contributor_slug")
      .select(["credits.work_id as work_id", "credits.guest_name as guest_name", "contributors.display_name as display_name"])
      .execute();
    for (const row of rows) {
      const name = row.display_name || row.guest_name;
      if (!name) continue;
      const key = String(row.work_id);
      authorsByWork.set(key, `${authorsByWork.get(key) ?? ""} ${name}`.trim());
    }
  } catch {
    /* the list still works without author search */
  }
  const filter = status && ["draft", "review", "ready", "published", "archived"].includes(status) ? status : "";
  const query = (q ?? "").trim().toLowerCase();
  const typeFilter = type && TYPE_LABELS[type] ? type : "";
  const matchingWorks = allWorks.filter(
    (w) =>
      (!typeFilter || w.type === typeFilter) &&
      (!query ||
        [w.id, w.title, w.slug, authorsByWork.get(w.id) ?? ""].some((field) => field.toLowerCase().includes(query)))
  );
  const works = matchingWorks.filter((w) => !filter || w.status === filter);
  const verdicts = await summarizeReadiness(works.filter((w) => w.status === "ready").map((w) => w.id));
  const resetHref = filter ? `/admin/works?status=${filter}` : "/admin/works";
  const tabs: { key: string; label: string }[] = [
    { key: "", label: "Semua" },
    { key: "draft", label: "Draf" },
    { key: "review", label: "Menunggu semakan" },
    { key: "ready", label: "Sedia" },
    { key: "published", label: "Diterbitkan" },
    { key: "archived", label: "Arkib" }
  ];

  return (
    <div className="admin-works">
      <header className="admin-page-header">
        <div className="admin-page-header-row">
          <div>
            <h1>Karya</h1>
            <p className="admin-page-sub">{works.length} karya{filter ? ` (${STATUS_LABELS[filter]})` : ""}</p>
          </div>
          <div className="admin-page-header-actions">
            <a href="/admin/visual-requests" className="admin-btn admin-btn-outline">
              Permintaan gambar
            </a>
            <a href="/admin/pilihan-editor" className="admin-btn admin-btn-outline">
              Pilihan Editor
            </a>
            <a href="/admin/works/add" className="admin-btn admin-btn-primary">
              + Tambah Karya
            </a>
          </div>
        </div>
      </header>

      <form method="get" action="/admin/works" className="a-filterbar">
        {filter ? <input type="hidden" name="status" value={filter} /> : null}
        <input type="search" name="q" defaultValue={q ?? ""} placeholder="Cari ID, tajuk, alamat pautan atau pengarang…" aria-label="Cari karya" />
        <select name="type" defaultValue={typeFilter} aria-label="Jenis karya">
          <option value="">Semua jenis</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button type="submit" className="a-btn a-btn-primary">Cari</button>
        {query || typeFilter || filter ? <a href="/admin/works" className="a-btn">Kosongkan semua penapis</a> : null}
      </form>

      {query || typeFilter || filter ? (
        <p className="admin-form-hint" role="status">
          Penapis aktif:{filter ? ` status ${STATUS_LABELS[filter]}` : ""}{typeFilter ? `${filter ? "," : ""} jenis ${TYPE_LABELS[typeFilter]}` : ""}{query ? `${filter || typeFilter ? "," : ""} carian "${q}"` : ""}.
        </p>
      ) : null}

      <nav className="admin-form-actions" aria-label="Tapis status">
        {tabs.map((t) => (
          <a
            key={t.key}
            href={`/admin/works?${new URLSearchParams({ ...(t.key ? { status: t.key } : {}), ...(query ? { q: query } : {}), ...(typeFilter ? { type: typeFilter } : {}) }).toString()}`}
            className={`admin-btn admin-btn-sm ${filter === t.key ? "admin-btn-primary" : "admin-btn-outline"}`}
            aria-current={filter === t.key ? "page" : undefined}
          >
            {t.label} ({t.key ? matchingWorks.filter((w) => w.status === t.key).length : matchingWorks.length})
          </a>
        ))}
      </nav>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tajuk</th>
              <th>Alamat pautan</th>
              <th>Jenis</th>
              <th>Status</th>
              <th>Versi</th>
              <th>Dikemas kini</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {works.length === 0 ? (
              <tr>
                <td colSpan={7} className="admin-table-empty">
                  {query || typeFilter || filter ? "Tiada karya yang sepadan. Kosongkan carian atau pilih status lain." : "Belum ada karya. Pilih Tambah Karya untuk bermula."}
                </td>
              </tr>
            ) : (
              works.map((work) => (
                <tr key={work.id}>
                  <td className="admin-table-title">
                    <a href={`/admin/works/${work.id}`} className="a-work-title-link">{work.title}</a>
                    <span className="admin-form-hint" style={{ display: "block", margin: 0 }}>{work.id}{authorsByWork.get(work.id) ? ` · ${authorsByWork.get(work.id)}` : ""}</span>
                  </td>
                  <td><code>{work.slug}</code></td>
                  <td>{TYPE_LABELS[work.type] ?? work.type}</td>
                  <td>
                    <span className={`admin-status admin-status-${work.status}`}>
                      {STATUS_LABELS[work.status] ?? work.status}
                    </span>
                    {work.status === "ready" && verdicts.get(work.id)?.ready === false ? (
                      <a
                        href={`/admin/works/${work.id}#${verdicts.get(work.id)?.firstTab ?? "content"}`}
                        className="admin-form-hint"
                        style={{ display: "block", margin: "4px 0 0" }}
                        title={verdicts.get(work.id)?.firstBlocker ?? undefined}
                      >
                        Disekat: {verdicts.get(work.id)?.firstBlocker}
                      </a>
                    ) : null}
                  </td>
                  <td>{work.version_label || work.version}</td>
                  <td>{formatDate(work.updated_at)}</td>
                  <td>
                    <div className="admin-table-actions">
                      <a href={`/admin/works/${work.id}`} className="admin-btn admin-btn-sm">
                        Sunting
                      </a>
                      <a href={`/admin/works/${work.id}/preview`} className="admin-btn admin-btn-sm admin-btn-outline">
                        Pratonton
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
