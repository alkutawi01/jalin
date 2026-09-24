import { listSeries } from "../../../lib/admin/series-service";
import { hasDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

const MODE_LABELS: Record<string, string> = {
  continuous: "Bersambung",
  anthology: "Antologi",
};

const STATUS_LABELS: Record<string, string> = {
  ongoing: "Berterusan",
  completed: "Tamat",
};

export default async function AdminSeriesPage() {
  if (!hasDb()) {
    return (
      <div className="admin-placeholder">
        <header className="admin-page-header">
          <h1>Siri</h1>
          <p className="admin-page-sub">Pengurusan Siri Bersiri</p>
        </header>
        <div className="admin-placeholder-content">
          <p>Database tidak tersedia. Set <code>DATABASE_URL</code> untuk mengaktifkan ciri admin.</p>
        </div>
      </div>
    );
  }

  const series = await listSeries();

  return (
    <div className="admin-works">
      <header className="admin-page-header">
        <div className="admin-page-header-row">
          <div>
            <h1>Siri</h1>
            <p className="admin-page-sub">{series.length} siri dalam database</p>
          </div>
          <a href="/admin/series/new" className="admin-btn admin-btn-primary">
            + Siri Baharu
          </a>
        </div>
      </header>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tajuk</th>
              <th>Slug</th>
              <th>Mode</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {series.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-table-empty">
                  Tiada siri dalam database.
                </td>
              </tr>
            ) : (
              series.map((s) => (
                <tr key={s.id}>
                  <td className="admin-table-title">{s.title}</td>
                  <td><code>{s.slug}</code></td>
                  <td>{MODE_LABELS[s.mode] ?? s.mode}</td>
                  <td>
                    <span className={`admin-status admin-status-${s.status === "completed" ? "ready" : "draft"}`}>
                      {STATUS_LABELS[s.status] ?? s.status}
                    </span>
                  </td>
                  <td>
                    <div className="admin-table-actions">
                      <a href={`/admin/series/${s.id}`} className="admin-btn admin-btn-sm">
                        Edit
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
