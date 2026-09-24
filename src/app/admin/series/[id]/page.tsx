"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";

interface SeriesData {
  id: string;
  slug: string;
  title: string;
  dek: string | null;
  genre: string | null;
  audience: string | null;
  mode: string;
  status: string;
  entries: { id: number; series_id: string; work_id: string; position: number }[];
}

interface WorkOption {
  id: string;
  slug: string;
  title: string;
  type: string;
  status: string;
}

export default function EditSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [series, setSeries] = useState<SeriesData | null>(null);
  const [works, setWorks] = useState<WorkOption[]>([]);
  const [entryWorks, setEntryWorks] = useState<Map<string, WorkOption>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [attachWorkId, setAttachWorkId] = useState("");
  const [form, setForm] = useState({
    title: "",
    slug: "",
    dek: "",
    genre: "",
    audience: "",
    mode: "continuous",
    status: "ongoing",
  });

  const loadSeries = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/series/${id}`);
      if (!res.ok) throw new Error("Siri tidak ditemui.");
      const data: SeriesData = await res.json();
      setSeries(data);
      setForm({
        title: data.title,
        slug: data.slug,
        dek: data.dek || "",
        genre: data.genre || "",
        audience: data.audience || "",
        mode: data.mode,
        status: data.status,
      });
      // Load entry work details
      const map = new Map<string, WorkOption>();
      for (const entry of data.entries) {
        const wr = await fetch(`/api/admin/works/${entry.work_id}`);
        if (wr.ok) {
          const w = await wr.json();
          map.set(entry.work_id, {
            id: w.id,
            slug: w.slug,
            title: w.title,
            type: w.type,
            status: w.status,
          });
        }
      }
      setEntryWorks(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat memuatkan siri.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadSeries();
    fetch("/api/admin/works")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (Array.isArray(list)) {
          setWorks(list.map((w: any) => ({
            id: w.id,
            slug: w.slug,
            title: w.title,
            type: w.type,
            status: w.status,
          })));
        }
      })
      .catch(() => {});
  }, [loadSeries]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/series/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan.");
      setSuccess("Siri disimpan.");
      await loadSeries();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAttach() {
    if (!attachWorkId) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/series/${id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workId: attachWorkId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyertai episod.");
      setAttachWorkId("");
      setSuccess("Episod disertai.");
      await loadSeries();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function handleDetach(workId: string) {
    if (!confirm("Keluarkan episod ini daripada Siri? Work tidak akan dipadam.")) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/series/${id}/entries/${workId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengeluarkan episod.");
      await loadSeries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    if (!series) return;
    const ids = series.entries.map((e) => e.work_id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];

    // Confirm if any affected episode is published
    const hasPublished = ids.some((wid) => entryWorks.get(wid)?.status === "published");
    if (hasPublished) {
      if (!confirm("Susunan semula melibatkan episod terbit. Teruskan?")) return;
    }

    setError(null);
    try {
      const res = await fetch(`/api/admin/series/${id}/entries/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workIds: ids, confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyusun.");
      await loadSeries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function handleDelete() {
    if (!confirm("Padam Siri ini? Hanya dibenarkan jika tiada episod. Work episod tidak akan dipadam.")) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/series/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memadam siri.");
      router.push("/admin/series");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  if (loading) {
    return <div className="admin-loading"><p>Memuatkan siri...</p></div>;
  }
  if (!series) {
    return <div className="admin-placeholder"><p>{error || "Siri tidak ditemui."}</p></div>;
  }

  const bersiriWorks = works.filter((w) => w.type === "bersiri");
  const attachedIds = new Set(series.entries.map((e) => e.work_id));
  const attachable = bersiriWorks.filter((w) => !attachedIds.has(w.id));

  return (
    <div className="admin-form-page">
      <header className="admin-page-header">
        <div className="admin-page-header-row">
          <div>
            <h1>Edit Siri</h1>
            <p className="admin-page-sub">ID: {series.id}</p>
          </div>
          <div className="admin-page-header-actions">
            <button type="button" className="admin-btn admin-btn-danger" onClick={handleDelete}>
              Padam Siri
            </button>
          </div>
        </div>
      </header>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}
      {success && <div className="admin-alert admin-alert-success">{success}</div>}

      <form onSubmit={handleSave} className="admin-form">
        <div className="admin-form-group">
          <label htmlFor="title">Tajuk *</label>
          <input id="title" type="text" required value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </div>
        <div className="admin-form-group">
          <label htmlFor="slug">Slug *</label>
          <input id="slug" type="text" required value={form.slug}
            onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} />
        </div>
        <div className="admin-form-group">
          <label htmlFor="dek">Dek</label>
          <input id="dek" type="text" value={form.dek}
            onChange={(e) => setForm((p) => ({ ...p, dek: e.target.value }))} />
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="genre">Genre</label>
            <input id="genre" type="text" value={form.genre}
              onChange={(e) => setForm((p) => ({ ...p, genre: e.target.value }))} />
          </div>
          <div className="admin-form-group">
            <label htmlFor="audience">Audiens</label>
            <input id="audience" type="text" value={form.audience}
              onChange={(e) => setForm((p) => ({ ...p, audience: e.target.value }))} />
          </div>
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="mode">Mode</label>
            <select id="mode" value={form.mode}
              onChange={(e) => setForm((p) => ({ ...p, mode: e.target.value }))}>
              <option value="continuous">Bersambung (continuous)</option>
              <option value="anthology">Antologi (anthology)</option>
            </select>
            <span className="admin-form-hint">
              {form.mode === "continuous"
                ? "Episod membentuk satu cerita bersambung — awam menunjukkan prefix terbit bersebelahan."
                : "Episod bebas tetapi berkongsi tema/dunia — semua episod terbit kelihatan."}
            </span>
          </div>
          <div className="admin-form-group">
            <label htmlFor="status">Status</label>
            <select id="status" value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
              <option value="ongoing">Berterusan</option>
              <option value="completed">Tamat</option>
            </select>
            <span className="admin-form-hint">
              Status tidak menerbitkan/membatalkan episod secara automatik.
            </span>
          </div>
        </div>
        <div className="admin-form-actions">
          <a href="/admin/series" className="admin-btn admin-btn-outline">Kembali</a>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Siri"}
          </button>
        </div>
      </form>

      <section className="admin-credits" style={{ marginTop: "1.5rem" }}>
        <div className="admin-credits-header">
          <h3>Episod ({series.entries.length})</h3>
        </div>
        <p className="admin-form-hint">
          Hanya Work type=bersiri boleh disertai. Setiap episod ialah Work berasingan (ID, slug, kredit, visual, status sendiri).
          Penerbitan kekal mengikut pipeline Work eksplisit.
        </p>

        <div className="admin-form-row" style={{ alignItems: "flex-end" }}>
          <div className="admin-form-group" style={{ flex: 1 }}>
            <label>Sertakan episod</label>
            <select value={attachWorkId} onChange={(e) => setAttachWorkId(e.target.value)}>
              <option value="">-- Pilih Work bersiri --</option>
              {attachable.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title} ({w.status})
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="admin-btn admin-btn-primary" onClick={handleAttach} disabled={!attachWorkId}>
            Sertakan
          </button>
        </div>

        {series.entries.length === 0 ? (
          <p className="admin-table-empty">Tiada episod lagi.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tajuk</th>
                  <th>Status</th>
                  <th>Susunan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {series.entries.map((entry, index) => {
                  const work = entryWorks.get(entry.work_id);
                  return (
                    <tr key={entry.id}>
                      <td>Episod {entry.position}</td>
                      <td>
                        {work ? (
                          <a href={`/admin/works/${entry.work_id}`}>{work.title}</a>
                        ) : entry.work_id}
                      </td>
                      <td>
                        <span className={`admin-status admin-status-${work?.status ?? "draft"}`}>
                          {work?.status ?? "—"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-table-actions">
                          <button type="button" className="admin-btn admin-btn-sm"
                            onClick={() => handleMove(index, -1)} disabled={index === 0}
                            aria-label={`Naikkan episod ${entry.position}`}>↑</button>
                          <button type="button" className="admin-btn admin-btn-sm"
                            onClick={() => handleMove(index, 1)} disabled={index === series.entries.length - 1}
                            aria-label={`Turunkan episod ${entry.position}`}>↓</button>
                        </div>
                      </td>
                      <td>
                        <button type="button" className="admin-btn admin-btn-sm admin-btn-danger"
                          onClick={() => handleDetach(entry.work_id)}>
                          Keluarkan
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
