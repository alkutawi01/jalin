import { displayVersion } from "@/lib/admin/version-label";
import { listWorks } from "../../../lib/admin/work-service";
import { getDb, hasDb } from "../../../lib/db";
import { summarizeReadiness } from "../../../lib/admin/publication-service";
import { getPickState } from "../../../lib/admin/editor-picks-service";
import AdminWorksTable, { type AdminWorkRow } from "../../../components/admin/AdminWorksTable";

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
      // Names are separated by commas, and the same person is listed once.
      const names = (authorsByWork.get(key) ?? "").split(", ").filter(Boolean);
      if (!names.includes(name)) names.push(name);
      authorsByWork.set(key, names.join(", "));
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
  const pickState = await getPickState();
  const tableRows: AdminWorkRow[] = works.map((work) => {
    const verdict = verdicts.get(work.id);
    return {
      id: work.id,
      title: work.title,
      slug: work.slug,
      type: work.type,
      status: work.status,
      version: displayVersion(work.version_label || work.version),
      updatedAt: work.updated_at ? new Date(work.updated_at).toISOString() : null,
      authors: authorsByWork.get(work.id) ?? "",
      readiness: verdict ? { ready: verdict.ready, firstTab: verdict.firstTab, firstBlocker: verdict.firstBlocker } : undefined
    };
  });
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
            <a href="/admin/works/add" className="admin-btn admin-btn-primary">
              + Tambah karya
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

      <AdminWorksTable works={tableRows} initialPicks={pickState.picks} />
    </div>
  );
}
