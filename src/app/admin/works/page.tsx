import { listWorks } from "../../../lib/admin/work-service";
import { hasDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  cerpen: "Cerpen",
  novela: "Novela",
  bersiri: "Bersiri",
  terjemahan: "Terjemahan",
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

export default async function AdminWorksPage() {
  if (!hasDb()) {
    return (
      <div className="admin-placeholder">
        <header className="admin-page-header">
          <h1>Karya</h1>
          <p className="admin-page-sub">Admin works management</p>
        </header>
        <div className="admin-placeholder-content">
          <p>Database tidak tersedia. Set <code>DATABASE_URL</code> untuk mengaktifkan ciri admin.</p>
        </div>
      </div>
    );
  }

  const works = await listWorks();

  return (
    <div className="admin-works">
      <header className="admin-page-header">
        <div className="admin-page-header-row">
          <div>
            <h1>Karya</h1>
            <p className="admin-page-sub">{works.length} karya dalam database</p>
          </div>
          <a href="/admin/works/new" className="admin-btn admin-btn-primary">
            + Karya Baharu
          </a>
        </div>
      </header>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tajuk</th>
              <th>Slug</th>
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
                  Tiada karya dalam database.
                </td>
              </tr>
            ) : (
              works.map((work) => (
                <tr key={work.id}>
                  <td className="admin-table-title">{work.title}</td>
                  <td><code>{work.slug}</code></td>
                  <td>{TYPE_LABELS[work.type] ?? work.type}</td>
                  <td>
                    <span className={`admin-status admin-status-${work.status}`}>
                      {STATUS_LABELS[work.status] ?? work.status}
                    </span>
                  </td>
                  <td>{work.version}</td>
                  <td>{formatDate(work.updated_at)}</td>
                  <td>
                    <div className="admin-table-actions">
                      <a href={`/admin/works/${work.id}`} className="admin-btn admin-btn-sm">
                        Edit
                      </a>
                      <a href={`/admin/works/${work.id}/preview`} className="admin-btn admin-btn-sm admin-btn-outline">
                        Preview
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
