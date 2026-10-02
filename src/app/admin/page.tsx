import { initContentRepository } from "../../lib/content";
import { getAllWorks } from "../../lib/content/workLoader";
import { hasDb } from "../../lib/db";
import { getDb } from "../../lib/db";
import { getEditorialHealth } from "../../lib/admin/editorial-health";
import { ExportReportButton } from "../../components/admin/ExportReportButton";
import { EditorialAuditHistory } from "../../components/admin/EditorialAuditHistory";
import { EditorialIssueQueue } from "../../components/admin/EditorialIssueQueue";
import { EditorialWorkflowDashboard } from "../../components/admin/EditorialWorkflowDashboard";
import { listWorks } from "../../lib/admin/work-service";
import { summarizeReadiness } from "../../lib/admin/publication-service";

export const dynamic = "force-dynamic";

const HEALTH_LABELS: Record<string, string> = { pass: "LULUS", fail: "GAGAL", warning: "AMARAN" };
function healthLabel(status: string): string {
  return HEALTH_LABELS[status] ?? status.toUpperCase();
}

async function getStats() {
  if (!hasDb()) {
    return {
      contentSource: "markdown",
      totalWorks: getAllWorks().length,
      worksByType: {
        cerpen: getAllWorks().filter((w) => w.type === "cerpen").length,
        novela: getAllWorks().filter((w) => w.type === "novela").length,
        bersiri: getAllWorks().filter((w) => w.type === "bersiri").length,
        fragmen: getAllWorks().filter((w) => w.type === "fragmen").length,
        sinopsis: getAllWorks().filter((w) => w.type === "sinopsis").length,
      },
      editorialHealth: null,
    };
  }

  const repo = await initContentRepository();
  const useDb = repo.source === "database";

  // Admin totals include drafts/review/ready, unlike the public repository.
  const works = await listWorks();
  
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
      fragmen: works.filter((w) => w.type === "fragmen").length,
      sinopsis: works.filter((w) => w.type === "sinopsis").length,
    },
    editorialHealth,
  };
}

const TYPE_LABELS: Record<string, string> = { cerpen: "Cerpen", novela: "Novela", bersiri: "Bersiri", fragmen: "Fragmen", sinopsis: "Sinopsis" };

const TODO_GROUPS: { status: string; title: string; hint: string }[] = [
  { status: "draft", title: "Draf untuk disiapkan", hint: "Lengkapkan gambar dan kredit, kemudian hantar untuk semakan." },
  { status: "review", title: "Menunggu semakan", hint: "Semak, kemudian tandakan sedia." },
  { status: "ready", title: "Sedia diterbitkan", hint: "Semua semakan lulus. Tekan Terbitkan bila anda bersedia." },
  { status: "blocked", title: "Bertanda sedia tetapi disekat", hint: "Status Sedia, tetapi satu semakan masih gagal. Buka untuk melihat puncanya." }
];

async function getTodo() {
  if (!hasDb()) return null;
  try {
    return await listWorks();
  } catch {
    return null;
  }
}

export default async function AdminDashboard() {
  const stats = await getStats();
  const works = await getTodo();
  // The same readiness service the Terbitkan button uses decides who is really ready.
  const verdicts = works ? await summarizeReadiness(works.filter((w) => w.status === "ready").map((w) => w.id)) : new Map();
  const inGroup = (w: { id: string; status: string }, g: string) =>
    g === "ready" ? w.status === "ready" && verdicts.get(w.id)?.ready !== false
    : g === "blocked" ? w.status === "ready" && verdicts.get(w.id)?.ready === false
    : w.status === g;

  return (
    <div className="admin-dashboard">
      <header className="admin-page-header">
        <h1>Papan Pemuka</h1>
        <p className="admin-page-sub">Pentadbiran Jalin</p>
      </header>

      <section className="admin-section" aria-label="Yang perlu dibuat">
        <h2>Yang perlu dibuat</h2>
        {works === null ? (
          <p className="admin-form-hint">Senarai kerja belum tersedia.</p>
        ) : TODO_GROUPS.every((g) => !works.some((w) => inGroup(w, g.status))) ? (
          <div className="a-empty">
            <strong>Tiada kerja tertunggak.</strong>
            Mulakan dengan butang Tambah Karya di sebelah kiri.
          </div>
        ) : (
          TODO_GROUPS.map((group) => {
            const items = works.filter((w) => inGroup(w, group.status));
            if (items.length === 0) return null;
            return (
              <div key={group.status} style={{ marginBottom: 18 }}>
                <h3 style={{ margin: "0 0 2px" }}>
                  {group.title} ({items.length})
                </h3>
                <p className="admin-form-hint" style={{ margin: "0 0 8px" }}>{group.hint}</p>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <tbody>
                      {items.slice(0, 6).map((w) => (
                        <tr key={w.id}>
                          <td className="admin-table-title">
                            {w.title}
                            {group.status === "blocked" && verdicts.get(w.id)?.firstBlocker ? (
                              <span className="admin-form-hint" style={{ display: "block", margin: 0 }}>
                                {verdicts.get(w.id)?.firstBlocker}
                              </span>
                            ) : null}
                          </td>
                          <td>{TYPE_LABELS[w.type] ?? w.type}</td>
                          <td style={{ textAlign: "right" }}>
                            <a href={`/admin/works/${w.id}${group.status === "blocked" ? "#" + (verdicts.get(w.id)?.firstTab ?? "content") : ""}`} className="admin-btn admin-btn-sm admin-btn-primary">
                              Buka
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {items.length > 6 ? (
                  <p className="admin-form-hint">
                    <a href={`/admin/works?status=${group.status}`}>Lihat semua {items.length}</a>
                  </p>
                ) : null}
              </div>
            );
          })
        )}
      </section>

      <div className="admin-stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
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
          <div className="admin-stat-label">Fragmen</div>
          <div className="admin-stat-value">{stats.worksByType.fragmen}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Sinopsis</div>
          <div className="admin-stat-value">{stats.worksByType.sinopsis}</div>
        </div>
      </div>

      <details className="admin-section a-tech">
        <summary>Butiran teknikal (untuk pentadbir)</summary>
      <section className="admin-section">
        <h2>Kesihatan Editorial</h2>
        {stats.editorialHealth ? (
          <>
            <p className="admin-section-meta">Disemak: {new Date().toLocaleString("ms-MY")}</p>
            <ExportReportButton />
            <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="admin-stat-label">Penulis</div>
              <div className="admin-stat-value">{healthLabel(stats.editorialHealth.authors.status)}</div>
              {stats.editorialHealth.authors.issues.length > 0 && (
                <ul className="admin-stat-issues">
                  {stats.editorialHealth.authors.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-label">Semakan semula</div>
              <div className="admin-stat-value">{healthLabel(stats.editorialHealth.revisions.status)}</div>
              {stats.editorialHealth.revisions.issues.length > 0 && (
                <ul className="admin-stat-issues">
                  {stats.editorialHealth.revisions.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-label">Kredit visual</div>
              <div className="admin-stat-value">{healthLabel(stats.editorialHealth.visuals.status)}</div>
              {stats.editorialHealth.visuals.issues.length > 0 && (
                <ul className="admin-stat-issues">
                  {stats.editorialHealth.visuals.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-label">Terjemahan</div>
              <div className="admin-stat-value">{healthLabel(stats.editorialHealth.translations.status)}</div>
              {stats.editorialHealth.translations.issues.length > 0 && (
                <ul className="admin-stat-issues">
                  {stats.editorialHealth.translations.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          </>
        ) : (
          <p>Data kesihatan editorial belum tersedia.</p>
        )}
      </section>

      <section className="admin-section">
        <h2>Sejarah Audit</h2>
        <EditorialAuditHistory />
      </section>

      <section className="admin-section">
        <h2>Isu Editorial</h2>
        <EditorialIssueQueue />
      </section>

      <section className="admin-section">
        <h2>Aliran Editorial</h2>
        <EditorialWorkflowDashboard />
      </section>
      </details>
    </div>
  );
}
