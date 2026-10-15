import { getDb, hasDb } from "../../../lib/db";
import { getCurrentAdmin } from "../../../lib/admin/auth";
import { ACTIVITY_PAGE_SIZE, listActivity, listActors, type ActivityRow } from "../../../lib/admin/activity";
import type { Role } from "../../../lib/admin/permissions";
import { notFound } from "next/navigation";
import { parsePage } from "../../../lib/reader/category-list";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<Role, string> = { owner: "Pemilik", chief_editor: "Ketua penyunting", editor: "Penyunting" };

const when = (iso: string) => new Date(iso).toLocaleString("ms-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" });

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) || undefined;

/** Aktiviti: who changed what, newest first. Only the owner and the chief editor open it (permissions.ts). */
export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ orang?: string | string[]; karya?: string | string[]; halaman?: string | string[] }> }) {
  const query = await searchParams;
  const admin = await getCurrentAdmin();
  if (!admin || (admin.role !== "admin" && admin.role !== "chief_editor")) notFound();
  const isOwner = admin?.role === "admin";
  const actorId = one(query.orang);
  const workId = one(query.karya);
  const page = parsePage({ halaman: one(query.halaman) });
  let hasOlder = false;
  const pageHref = (target: number) => {
    const params = new URLSearchParams({ ...(actorId ? { orang: actorId } : {}), ...(workId ? { karya: workId } : {}), ...(target > 1 ? { halaman: String(target) } : {}) });
    const qs = params.toString();
    return qs ? `/admin/aktiviti?${qs}` : "/admin/aktiviti";
  };

  let rows: ActivityRow[] = [];
  let actors: { id: string; name: string }[] = [];
  const titles = new Map<string, string>();
  let problem: string | null = null;
  if (!hasDb()) {
    problem = "Pangkalan data tidak tersedia.";
  } else {
    try {
      [rows, actors] = await Promise.all([listActivity({ actorId, workId, includeSubscription: isOwner, limit: ACTIVITY_PAGE_SIZE + 1, offset: (page - 1) * ACTIVITY_PAGE_SIZE }), listActors()]);
      // One more than a page was asked for: that is how we know there is an older page.
      hasOlder = rows.length > ACTIVITY_PAGE_SIZE;
      rows = rows.slice(0, ACTIVITY_PAGE_SIZE);
      const ids = [...new Set(rows.map((row) => row.workId).filter((id): id is string => Boolean(id)))];
      if (ids.length > 0) {
        for (const work of await getDb().selectFrom("works").select(["id", "title"]).where("id", "in", ids).execute()) titles.set(work.id, work.title);
      }
    } catch {
      // Most likely migration 026 has not been applied on this database yet.
      problem = "Jadual aktiviti belum wujud. Migration 026 perlu dijalankan dahulu.";
    }
  }

  return (
    <div className="admin-activity">
      <header className="admin-page-header">
        <h1>Aktiviti</h1>
        <p className="admin-page-sub">Siapa mengubah apa: kredit, karya, bahagian dan gambar. Catatan bermula dari hari ia dihidupkan; {ACTIVITY_PAGE_SIZE} setiap halaman, yang terkini dahulu.</p>
      </header>
      {problem ? (
        <div className="admin-alert admin-alert-error" role="alert">{problem}</div>
      ) : (
        <>
          <form method="get" className="admin-activity-filter">
            <div className="admin-form-group">
              <label htmlFor="aktiviti-orang">Orang</label>
              <select id="aktiviti-orang" name="orang" defaultValue={actorId ?? ""}>
                <option value="">Semua orang</option>
                {actors.map((actor) => <option key={actor.id} value={actor.id}>{actor.name}</option>)}
              </select>
            </div>
            {workId ? <input type="hidden" name="karya" value={workId} /> : null}
            <button type="submit" className="admin-btn">Tapis</button>
            {actorId || workId ? <a className="admin-btn" href="/admin/aktiviti">Semua aktiviti</a> : null}
          </form>
          {rows.length === 0 ? (
            <p className="admin-form-hint">Belum ada aktiviti{actorId || workId ? " untuk tapisan ini" : ""}.</p>
          ) : (
            <ul className="admin-user-list">
              {rows.map((row) => (
                <li key={row.id} className="admin-user-card">
                  <div className="admin-user-main">
                    <strong>{row.actionLabel}</strong>: {row.summary}
                    <div className="admin-form-hint">
                      {row.actorName} ({ROLE_LABELS[row.actorRole]}) · {when(row.at)}
                      {row.workId ? <> · <a href={`/admin/works/${row.workId}`}>{titles.get(row.workId) ?? row.workId}</a> · <a href={`/admin/aktiviti?karya=${encodeURIComponent(row.workId)}`}>Semua tentang karya ini</a></> : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {page > 1 || hasOlder ? (
            <nav className="admin-pagination" aria-label="Halaman aktiviti">
              {page > 1 ? <a className="admin-btn admin-btn-sm admin-btn-outline" href={pageHref(page - 1)} rel="prev">‹ Lebih baharu</a> : <span />}
              <span className="admin-pagination-where" role="status">Halaman {page}</span>
              {hasOlder ? <a className="admin-btn admin-btn-sm admin-btn-outline" href={pageHref(page + 1)} rel="next">Lebih lama ›</a> : <span />}
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
