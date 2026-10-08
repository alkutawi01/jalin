import { listSeries } from "../../../lib/admin/series-service";
import { hasDb } from "../../../lib/db";
import { getCurrentAdmin } from "../../../lib/admin/auth";
import { can, roleFromClaim } from "../../../lib/admin/permissions";

export const dynamic = "force-dynamic";

const MODE_LABELS: Record<string, string> = {
  continuous: "Bersambung",
  anthology: "Antologi",
};

const STATUS_LABELS: Record<string, string> = {
  ongoing: "Masih diteruskan",
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
          <p>Pangkalan data tidak tersedia. Set <code>DATABASE_URL</code> untuk mengaktifkan ciri admin.</p>
        </div>
      </div>
    );
  }

  const series = await listSeries();
  // Only the chief editor and the owner manage series; an editor sees the list but is not offered what the server would refuse.
  const admin = await getCurrentAdmin();
  const canManage = can((admin && roleFromClaim(admin.role)) || "owner", "series.manage");

  return (
    <div className="admin-works">
      <header className="admin-page-header">
        <div className="admin-page-header-row">
          <div>
            <h1>Siri</h1>
            <p className="admin-page-sub">{series.length} siri dalam pangkalan data</p>
          </div>
          {canManage ? (
            <a href="/admin/series/new" className="admin-btn admin-btn-primary">
              + Tambah siri
            </a>
          ) : null}
        </div>
      </header>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tajuk</th>
              <th>Alamat pautan</th>
              <th>Mod</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {series.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-table-empty">
                  Tiada siri dalam pangkalan data.
                </td>
              </tr>
            ) : (
              series.map((s) => (
                <tr key={s.id}>
                  <td className="admin-table-title">{canManage ? <a href={`/admin/series/${s.id}`} className="a-work-title-link">{s.title}</a> : s.title}</td>
                  <td><code>{s.slug}</code></td>
                  <td>{MODE_LABELS[s.mode] ?? s.mode}</td>
                  <td>
                    <span className={`admin-status admin-status-${s.status === "completed" ? "ready" : "draft"}`}>
                      {STATUS_LABELS[s.status] ?? s.status}
                    </span>
                  </td>
                  <td>
                    {canManage ? (
                      <div className="admin-table-actions">
                        <a href={`/admin/series/${s.id}`} className="admin-btn admin-btn-sm">
                          Edit
                        </a>
                      </div>
                    ) : null}
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
