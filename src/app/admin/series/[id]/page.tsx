"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { confirmAction, toast } from "../../../../lib/admin/dialogs";
import LoadingBlock from "../../../../components/admin/LoadingBlock";
import AudiencePicker from "../../../../components/admin/AudiencePicker";

interface SeriesData {
  id: string;
  slug: string;
  title: string;
  dek: string | null;
  genre: string | null;
  audience: string | null;
  mode: string;
  status: string;
  hero_src?: string | null;
  hero_alt?: string | null;
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
  /** One episode action at a time: a second click while the first is still running is ignored. */
  const [actionBusy, setActionBusy] = useState(false);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroAlt, setHeroAlt] = useState("");
  const [heroBusy, setHeroBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    dek: "",
    genre: "",
    audience: "",
    mode: "continuous",
    status: "ongoing",
  });

  /**
   * Reads the series and its episodes. The form is filled from the server only when asked (the first load): adding,
   * removing or moving an episode, or changing the picture, must not replace what the editor has typed and not yet saved.
   */
  const loadSeries = useCallback(async (fillForm = false) => {
    try {
      const res = await fetch(`/api/admin/series/${id}`);
      if (!res.ok) throw new Error("Siri tidak ditemui.");
      const data: SeriesData = await res.json();
      setSeries(data);
      if (fillForm) {
        setForm({
          title: data.title,
          slug: data.slug,
          dek: data.dek || "",
          genre: data.genre || "",
          audience: data.audience || "",
          mode: data.mode,
          status: data.status,
        });
      }
      // The titles and statuses of all episodes in ONE request (not one request per episode).
      const map = new Map<string, WorkOption>();
      if (data.entries.length > 0) {
        const wr = await fetch(`/api/admin/works?ids=${encodeURIComponent(data.entries.map((e) => e.work_id).join(","))}`);
        if (wr.ok) {
          const list: Array<{ id: string; slug: string; title: string; type: string; status: string }> = await wr.json();
          for (const w of list) map.set(w.id, { id: w.id, slug: w.slug, title: w.title, type: w.type, status: w.status });
        }
      }
      setEntryWorks(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat memuatkan siri.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  /** Only episodes that belong to no series at all can be attached; the list is read again after every change. */
  const loadUnattached = useCallback(() => {
    return fetch("/api/admin/works?tanpaSiri=1")
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
  }, []);

  useEffect(() => {
    void loadSeries(true);
    void loadUnattached();
  }, [loadSeries, loadUnattached]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      let res = await fetch(`/api/admin/series/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      let data = await res.json();
      if (res.status === 409 && String(data.error).includes("Perlu disahkan")) {
        // Changing the mode of a series with public episodes changes what readers see at once: say so, then ask again.
        if (!(await confirmAction(`${data.error} Teruskan?`, { danger: true, confirmLabel: "Ya, tukar mod" }))) { setSaving(false); return; }
        res = await fetch(`/api/admin/series/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, confirmModeChange: true }),
        });
        data = await res.json();
      }
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
    if (!attachWorkId || actionBusy) return;
    setActionBusy(true);
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
      await loadUnattached();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDetach(workId: string) {
    if (actionBusy) return;
    if (!(await confirmAction("Keluarkan episod ini daripada Siri? Karya tidak akan dipadam.", { danger: true, confirmLabel: "Ya, teruskan" }))) return;
    setActionBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/series/${id}/entries/${workId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengeluarkan episod.");
      await loadSeries();
      await loadUnattached();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    if (!series || actionBusy) return;
    const ids = series.entries.map((e) => e.work_id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];

    // Confirm if any affected episode is published
    const hasPublished = ids.some((wid) => entryWorks.get(wid)?.status === "published");
    if (hasPublished) {
      if (!(await confirmAction("Susunan semula melibatkan episod terbit. Teruskan?"))) return;
    }

    setActionBusy(true);
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
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDelete() {
    if (!(await confirmAction("Padam Siri ini? Hanya dibenarkan jika tiada episod. Karya episod tidak akan dipadam.", { danger: true, confirmLabel: "Ya, teruskan" }))) return;
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
    return <div className="admin-loading"><LoadingBlock label="siri" /></div>;
  }
  if (!series) {
    return <div className="admin-placeholder"><p>{error || "Siri tidak ditemui."}</p></div>;
  }

  const bersiriWorks = works.filter((w) => w.type === "bersiri");
  const attachedIds = new Set(series.entries.map((e) => e.work_id));
  const attachable = bersiriWorks.filter((w) => !attachedIds.has(w.id));

  async function uploadHero() {
    if (!heroFile) return;
    setHeroBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("file", heroFile);
      body.set("alt", heroAlt);
      const res = await fetch(`/api/admin/series/${id}/hero`, { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal memuat naik gambar siri.");
      setHeroFile(null);
      toast("Gambar siri disimpan.", "success");
      await loadSeries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setHeroBusy(false);
    }
  }

  async function removeHero() {
    if (!(await confirmAction("Buang gambar siri? Siri yang mempunyai episod terbit perlu mengekalkan gambar. Gunakan Ganti gambar jika hanya mahu menukar ilustrasi.", { danger: true, confirmLabel: "Ya, buang" }))) return;
    setHeroBusy(true);
    try {
      const res = await fetch(`/api/admin/series/${id}/hero`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Gagal membuang gambar siri.");
      await loadSeries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setHeroBusy(false);
    }
  }

  return (
    <div className="admin-form-page">
      <header className="admin-page-header">
        <div className="admin-page-header-row">
          <div>
            <h1>Sunting Siri</h1>
            <p className="admin-page-sub">ID: {series.id}</p>
          </div>
          <div className="admin-page-header-actions">
            <button type="button" className="admin-btn admin-btn-danger" onClick={handleDelete}>
              Padam Siri
            </button>
          </div>
        </div>
      </header>

      {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}
      {success && <div className="admin-alert admin-alert-success" role="status">{success}</div>}

      <section className="admin-section" aria-labelledby="series-hero-title">
        <h2 id="series-hero-title" className="admin-form-section-title">Gambar siri</h2>
        <p className="admin-form-hint">
          Ilustrasi untuk halaman judul siri, dibuat khas untuk siri ini. Jangan gunakan adegan daripada sesuatu episod kerana ia boleh membocorkan cerita. Tanpa gambar, halaman siri memaparkan tajuk bertipografi.
        </p>
        {series.hero_src ? (
          <figure style={{ margin: "0 0 12px", maxWidth: 360 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={series.hero_src} alt={series.hero_alt || "Gambar siri"} style={{ width: "100%", borderRadius: 12, display: "block" }} />
            <figcaption className="admin-form-hint">{series.hero_alt || "Tiada teks alternatif"}</figcaption>
          </figure>
        ) : null}
        <div className="admin-form-group">
          <label htmlFor="series-hero-file">Fail imej (PNG, JPEG atau WebP, maksimum 10 MB)</label>
          <input id="series-hero-file" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setHeroFile(e.target.files?.[0] ?? null)} />
        </div>
        <div className="admin-form-group">
          <label htmlFor="series-hero-alt">Teks alternatif (pilihan)</label>
          <input id="series-hero-alt" type="text" value={heroAlt} onChange={(e) => setHeroAlt(e.target.value)} placeholder="Satu ayat yang menerangkan gambar kepada pembaca yang tidak dapat melihatnya" />
        </div>
        <div className="admin-form-actions">
          <button type="button" className="admin-btn admin-btn-primary" disabled={heroBusy || !heroFile} onClick={() => void uploadHero()}>
            {heroBusy ? "Memuat naik…" : series.hero_src ? "Ganti gambar" : "Muat naik gambar"}
          </button>
          {series.hero_src ? (
            <button type="button" className="admin-btn admin-btn-danger" disabled={heroBusy} onClick={() => void removeHero()}>Buang gambar</button>
          ) : null}
        </div>
      </section>

      <form onSubmit={handleSave} className="admin-form">
        <div className="admin-form-group">
          <label htmlFor="title">Tajuk *</label>
          <input id="title" type="text" required value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </div>
        <div className="admin-form-group">
          <label htmlFor="slug">Alamat pautan *</label>
          <input id="slug" type="text" required value={form.slug}
            onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} />
        </div>
        <div className="admin-form-group">
          <label htmlFor="dek">Dek</label>
          <textarea id="dek" className="admin-textarea" rows={4} value={form.dek}
            onChange={(e) => setForm((p) => ({ ...p, dek: e.target.value }))} />
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="genre">Genre</label>
            <input id="genre" type="text" value={form.genre}
              onChange={(e) => setForm((p) => ({ ...p, genre: e.target.value }))} />
          </div>
          <div className="admin-form-group">
            <AudiencePicker value={form.audience} onChange={(next) => setForm((p) => ({ ...p, audience: next }))} />
          </div>
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="mode">Mod</label>
            <select id="mode" value={form.mode}
              onChange={(e) => setForm((p) => ({ ...p, mode: e.target.value }))}>
              <option value="continuous">Bersambung</option>
              <option value="anthology">Antologi</option>
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
              <option value="ongoing">Masih diteruskan</option>
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
          <a className="admin-btn admin-btn-primary" href={`/admin/works/add?jenis=bersiri&siri=${encodeURIComponent(String(id))}`}>
            {series.entries.length === 0 ? "+ Cipta episod pertama" : "+ Cipta episod seterusnya"}
          </a>
        </div>

        {series.entries.length === 0 ? (
          <div className="a-empty-state">
            <strong>Siri ini belum mempunyai episod.</strong>
            <p>Siri hanya kelihatan kepada pembaca selepas satu episodnya diterbitkan. Mulakan dengan episod pertama.</p>
          </div>
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
                            onClick={() => handleMove(index, -1)} disabled={index === 0 || actionBusy}
                            aria-label={`Naikkan episod ${entry.position}`}>↑</button>
                          <button type="button" className="admin-btn admin-btn-sm"
                            onClick={() => handleMove(index, 1)} disabled={index === series.entries.length - 1 || actionBusy}
                            aria-label={`Turunkan episod ${entry.position}`}>↓</button>
                        </div>
                      </td>
                      <td>
                        <button type="button" className="admin-btn admin-btn-sm admin-btn-danger"
                          disabled={actionBusy}
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

        {attachable.length > 0 ? (
          <details className="admin-advanced-field" style={{ marginTop: "1.25rem" }}>
            <summary>Sertakan episod sedia ada ({attachable.length})</summary>
            <p className="admin-form-hint">Karya jenis Bersiri yang belum dimasukkan ke dalam sebarang siri.</p>
            <div className="admin-form-row" style={{ alignItems: "flex-end" }}>
              <div className="admin-form-group" style={{ flex: 1 }}>
                <label htmlFor="attach-existing">Pilih episod</label>
                <select id="attach-existing" value={attachWorkId} onChange={(e) => setAttachWorkId(e.target.value)}>
                  <option value="">-- Pilih episod --</option>
                  {attachable.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.title} ({w.status})
                    </option>
                  ))}
                </select>
              </div>
              <button type="button" className="admin-btn admin-btn-outline" onClick={handleAttach} disabled={!attachWorkId || actionBusy}>
                Sertakan
              </button>
            </div>
          </details>
        ) : null}
      </section>
    </div>
  );
}
