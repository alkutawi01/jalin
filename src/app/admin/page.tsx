import { initContentRepository } from "../../lib/content";
import { getAllWorks } from "../../lib/content/workLoader";
import { hasDb } from "../../lib/db";
import { getDb } from "../../lib/db";
import { getEditorialHealth } from "../../lib/admin/editorial-health";

export const dynamic = "force-dynamic";

async function getStats() {
  if (!hasDb()) {
    return {
      contentSource: "markdown",
      totalWorks: getAllWorks().length,
      worksByType: {
        cerpen: getAllWorks().filter((w) => w.type === "cerpen").length,
        novela: getAllWorks().filter((w) => w.type === "novela").length,
        bersiri: getAllWorks().filter((w) => w.type === "bersiri").length,
        terjemahan: getAllWorks().filter((w) => w.type === "terjemahan").length,
        fragmen: getAllWorks().filter((w) => w.type === "fragmen").length,
        sinopsis: getAllWorks().filter((w) => w.type === "sinopsis").length,
      },
      editorialHealth: null,
    };
  }

  const repo = await initContentRepository();
  const useDb = repo.constructor.name === "DatabaseContentRepository";

  const works = useDb ? repo.getWorks() : getAllWorks();
  
  let editorialHealth = null;
  try {
    editorialHealth = await getEditorialHealth();
  } catch (e) {
    // Ignore errors for now
  }

  return {
    contentSource: useDb ? "database" : "markdown",
    totalWorks: works.length,
    worksByType: {
      cerpen: works.filter((w) => w.type === "cerpen").length,
      novela: works.filter((w) => w.type === "novela").length,
      bersiri: works.filter((w) => w.type === "bersiri").length,
      terjemahan: works.filter((w) => w.type === "terjemahan").length,
      fragmen: works.filter((w) => w.type === "fragmen").length,
      sinopsis: works.filter((w) => w.type === "sinopsis").length,
    },
    editorialHealth,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  return (
    <div className="admin-dashboard">
      <header className="admin-page-header">
        <h1>Dashboard</h1>
        <p className="admin-page-sub">Jalin Admin Console</p>
      </header>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Sumber Kandungan</div>
          <div className="admin-stat-value">{stats.contentSource}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Jumlah Karya</div>
          <div className="admin-stat-value">{stats.totalWorks}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Cerpen</div>
          <div className="admin-stat-value">{stats.worksByType.cerpen}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Novela</div>
          <div className="admin-stat-value">{stats.worksByType.novela}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Bersiri</div>
          <div className="admin-stat-value">{stats.worksByType.bersiri}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Terjemahan</div>
          <div className="admin-stat-value">{stats.worksByType.terjemahan}</div>
        </div>
      </div>

      <section className="admin-section">
        <h2>Navigasi Admin</h2>
        <div className="admin-nav-grid">
          <a href="/admin/works" className="admin-nav-card">
            <h3>Karya</h3>
            <p>Urus karya sastera — metadata, status, kredit</p>
          </a>
          <a href="/admin/contributors" className="admin-nav-card">
            <h3>Penyumbang</h3>
            <p>Urus penyumbang — penulis, editor, penyemak</p>
          </a>
          <a href="/admin/submissions" className="admin-nav-card">
            <h3>Submissions</h3>
            <p>Urus submission karya — semakan, kelulusan</p>
          </a>
          <a href="/admin/prompts" className="admin-nav-card">
            <h3>Prompt Templates</h3>
            <p>Urus template prompt editorial</p>
          </a>
          <a href="/admin/visual-requests" className="admin-nav-card">
            <h3>Visual Requests</h3>
            <p>Urus permintaan visual — Magnific pipeline</p>
          </a>
        </div>
      </section>

      <section className="admin-section">
        <h2>Editorial Health</h2>
        {stats.editorialHealth ? (
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="admin-stat-label">Authors</div>
              <div className="admin-stat-value">{stats.editorialHealth.authors.status.toUpperCase()}</div>
              {stats.editorialHealth.authors.issues.length > 0 && (
                <ul className="admin-stat-issues">
                  {stats.editorialHealth.authors.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-label">Revisions</div>
              <div className="admin-stat-value">{stats.editorialHealth.revisions.status.toUpperCase()}</div>
              {stats.editorialHealth.revisions.issues.length > 0 && (
                <ul className="admin-stat-issues">
                  {stats.editorialHealth.revisions.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-label">Visual Credits</div>
              <div className="admin-stat-value">{stats.editorialHealth.visuals.status.toUpperCase()}</div>
              {stats.editorialHealth.visuals.issues.length > 0 && (
                <ul className="admin-stat-issues">
                  {stats.editorialHealth.visuals.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-label">Translations</div>
              <div className="admin-stat-value">{stats.editorialHealth.translations.status.toUpperCase()}</div>
              {stats.editorialHealth.translations.issues.length > 0 && (
                <ul className="admin-stat-issues">
                  {stats.editorialHealth.translations.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <p>Editorial health data not available</p>
        )}
      </section>
    </div>
  );
}
