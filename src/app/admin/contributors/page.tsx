import { listContributors } from "../../../lib/admin/contributor-service";
import { hasDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

const KIND_LABELS: Record<string, string> = {
  human: "Manusia",
  virtual: "Maya",
  organization: "Organisasi",
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

export default async function AdminContributorsPage() {
  if (!hasDb()) {
    return (
      <div className="admin-placeholder">
        <header className="admin-page-header">
          <h1>Penyumbang</h1>
          <p className="admin-page-sub">Admin contributors management</p>
        </header>
        <div className="admin-placeholder-content">
          <p>Database tidak tersedia. Set <code>DATABASE_URL</code> untuk mengaktifkan ciri admin.</p>
        </div>
      </div>
    );
  }

  const contributors = await listContributors();

  return (
    <div className="admin-contributors">
      <header className="admin-page-header">
        <div className="admin-page-header-row">
          <div>
            <h1>Penyumbang</h1>
            <p className="admin-page-sub">{contributors.length} penyumbang dalam database</p>
          </div>
          <a href="/admin/contributors/new" className="admin-btn admin-btn-primary">
            + Penyumbang Baharu
          </a>
        </div>
      </header>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Slug</th>
              <th>Jenis</th>
              <th>Dicipta</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {contributors.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-table-empty">
                  Tiada penyumbang dalam database.
                </td>
              </tr>
            ) : (
              contributors.map((contributor) => (
                <tr key={contributor.slug}>
                  <td className="admin-table-title">{contributor.display_name}</td>
                  <td><code>{contributor.slug}</code></td>
                  <td>
                    <span className={`admin-kind admin-kind-${contributor.kind}`}>
                      {KIND_LABELS[contributor.kind] ?? contributor.kind}
                    </span>
                  </td>
                  <td>{formatDate(contributor.created_at)}</td>
                  <td>
                    <div className="admin-table-actions">
                      <a href={`/admin/contributors/${contributor.slug}`} className="admin-btn admin-btn-sm">
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
