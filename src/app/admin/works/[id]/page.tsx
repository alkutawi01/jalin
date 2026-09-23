"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

const WORK_TYPES = [
  { value: "cerpen", label: "Cerpen" },
  { value: "novela", label: "Novela" },
  { value: "bersiri", label: "Bersiri" },
  { value: "terjemahan", label: "Terjemahan" },
  { value: "fragmen", label: "Fragmen" },
  { value: "sinopsis", label: "Sinopsis" },
];

const STATUSES = [
  { value: "draft", label: "Draf" },
  { value: "review", label: "Semakan" },
  { value: "ready", label: "Sedia" },
  { value: "published", label: "Diterbitkan" },
  { value: "archived", label: "Arkib" },
];

interface WorkData {
  id: string;
  slug: string;
  title: string;
  type: string;
  status: string;
  body: string;
  genre: string | null;
  audience: string | null;
  dek: string | null;
  reading_minutes: number | null;
  version: string;
  published_at: string | null;
  updated_at: string;
}

interface CreditData {
  id: number;
  work_id: string;
  contributor_slug: string | null;
  guest_name: string | null;
  role_label: string;
  byline: boolean;
  sort_order: number;
}

interface ContributorOption {
  slug: string;
  display_name: string;
}

interface VisualData {
  id: number;
  work_id: string;
  role: string;
  src: string;
  alt: string | null;
  provider: string | null;
  creation_id: string | null;
  anchor: string | null;
  place: string;
  sort_order: number;
}

interface GlossaryData {
  id: number;
  work_id: string;
  term: string;
  meaning: string;
  source: string;
  sort_order: number;
}

type Tab = "content" | "metadata" | "credits" | "visuals" | "glossary";

export default function EditWorkPage() {
  const router = useRouter();
  const params = useParams();
  const workId = params.id as string;

  const [activeTab, setActiveTab] = useState<Tab>("content");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    type: "cerpen",
    status: "draft",
    body: "",
    genre: "",
    audience: "",
    dek: "",
    readingMinutes: "",
    version: "v0.1",
    publishedAt: "",
  });

  const [credits, setCredits] = useState<CreditData[]>([]);
  const [contributors, setContributors] = useState<ContributorOption[]>([]);
  const [editingCredit, setEditingCredit] = useState<Partial<CreditData> | null>(null);
  const [creditError, setCreditError] = useState<string | null>(null);

  const [visuals, setVisuals] = useState<VisualData[]>([]);
  const [editingVisual, setEditingVisual] = useState<Partial<VisualData> | null>(null);
  const [visualError, setVisualError] = useState<string | null>(null);

  const [glossaryTerms, setGlossaryTerms] = useState<GlossaryData[]>([]);
  const [editingGlossary, setEditingGlossary] = useState<Partial<GlossaryData> | null>(null);
  const [glossaryError, setGlossaryError] = useState<string | null>(null);

  const [publishPreview, setPublishPreview] = useState<{
    isNew: boolean;
    currentExists: boolean;
    metadataChanged: boolean;
    bodyChanged: boolean;
  } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadWork() {
      try {
        const res = await fetch(`/api/admin/works/${workId}`);
        if (!res.ok) throw new Error("Karya tidak ditemui.");
        const work: WorkData = await res.json();

        setForm({
          title: work.title,
          slug: work.slug,
          type: work.type,
          status: work.status,
          body: work.body || "",
          genre: work.genre || "",
          audience: work.audience || "",
          dek: work.dek || "",
          readingMinutes: work.reading_minutes?.toString() || "",
          version: work.version,
          publishedAt: work.published_at ? work.published_at.split("T")[0] : "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ralat memuatkan karya.");
      } finally {
        setLoading(false);
      }
    }

    loadWork();
    loadCredits();
    loadContributors();
    loadVisuals();
    loadGlossary();
  }, [workId]);

  async function loadCredits() {
    try {
      const res = await fetch(`/api/admin/credits?workId=${workId}`);
      if (res.ok) {
        setCredits(await res.json());
      }
    } catch {
      // Ignore credit loading errors
    }
  }

  async function loadContributors() {
    try {
      const res = await fetch("/api/admin/contributors");
      if (res.ok) {
        const data = await res.json();
        setContributors(data.map((c: { slug: string; display_name: string }) => ({
          slug: c.slug,
          display_name: c.display_name,
        })));
      }
    } catch {
      // Ignore contributor loading errors
    }
  }

  async function loadVisuals() {
    try {
      const res = await fetch(`/api/admin/visuals?workId=${workId}`);
      if (res.ok) {
        setVisuals(await res.json());
      }
    } catch {
      // Ignore visual loading errors
    }
  }

  async function loadGlossary() {
    try {
      const res = await fetch(`/api/admin/glossary?workId=${workId}`);
      if (res.ok) {
        setGlossaryTerms(await res.json());
      }
    } catch {
      // Ignore glossary loading errors
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/works/${workId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          readingMinutes: form.readingMinutes ? Number(form.readingMinutes) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menyimpan.");
      }

      setSuccess("Berjaya disimpan.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCredit() {
    if (!editingCredit) return;

    setCreditError(null);

    try {
      if (editingCredit.id) {
        // Update existing credit
        const res = await fetch(`/api/admin/credits/${editingCredit.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingCredit),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Gagal menyimpan kredit.");
        }
      } else {
        // Create new credit
        const res = await fetch("/api/admin/credits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...editingCredit,
            workId,
            sortOrder: credits.length + 1,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Gagal mencipta kredit.");
        }
      }

      setEditingCredit(null);
      loadCredits();
    } catch (err) {
      setCreditError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function handleDeleteCredit(id: number) {
    if (!confirm("Pasti ingin memadam kredit ini?")) return;

    try {
      const res = await fetch(`/api/admin/credits/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal memadam kredit.");
      }

      loadCredits();
    } catch (err) {
      setCreditError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function handleSaveVisual() {
    if (!editingVisual) return;

    setVisualError(null);

    try {
      if (editingVisual.id) {
        // Update existing visual
        const res = await fetch(`/api/admin/visuals/${editingVisual.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingVisual),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Gagal menyimpan visual.");
        }
      } else {
        // Create new visual
        const res = await fetch("/api/admin/visuals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...editingVisual,
            workId,
            sortOrder: visuals.length + 1,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Gagal mencipta visual.");
        }
      }

      setEditingVisual(null);
      loadVisuals();
    } catch (err) {
      setVisualError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function handleDeleteVisual(id: number) {
    if (!confirm("Pasti ingin memadam visual ini?")) return;

    try {
      const res = await fetch(`/api/admin/visuals/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal memadam visual.");
      }

      loadVisuals();
    } catch (err) {
      setVisualError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function handleSaveGlossary() {
    if (!editingGlossary) return;

    setGlossaryError(null);

    try {
      if (editingGlossary.id) {
        // Update existing term
        const res = await fetch(`/api/admin/glossary/${editingGlossary.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingGlossary),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Gagal menyimpan glossary.");
        }
      } else {
        // Create new term
        const res = await fetch("/api/admin/glossary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...editingGlossary,
            workId,
            sortOrder: glossaryTerms.length + 1,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Gagal mencipta glossary.");
        }
      }

      setEditingGlossary(null);
      loadGlossary();
    } catch (err) {
      setGlossaryError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function handleDeleteGlossary(id: number) {
    if (!confirm("Pasti ingin memadam glossary ini?")) return;

    try {
      const res = await fetch(`/api/admin/glossary/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal memadam glossary.");
      }

      loadGlossary();
    } catch (err) {
      setGlossaryError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function loadPublishPreview() {
    try {
      const res = await fetch(`/api/admin/publish?action=preview&workId=${workId}`);
      if (res.ok) {
        setPublishPreview(await res.json());
      }
    } catch {
      // Ignore preview loading errors
    }
  }

  async function handlePublish() {
    if (!confirm("Pasti ingin menerbitkan karya ini ke Markdown?")) return;

    setPublishing(true);
    setPublishError(null);
    setPublishSuccess(null);

    try {
      const res = await fetch("/api/admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish",
          workId,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal menerbitkan.");
      }

      setPublishSuccess(`Berjaya diterbitkan ke ${result.filePath}`);
      setTimeout(() => setPublishSuccess(null), 5000);
      loadPublishPreview();
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setPublishing(false);
    }
  }

  useEffect(() => {
    loadPublishPreview();
  }, [workId]);

  async function handleArchive() {
    if (!confirm("Pasti ingin mengarkibkan karya ini?")) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/works/${workId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });

      if (!res.ok) throw new Error("Gagal mengarkibkan.");
      router.push("/admin/works");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <p>Memuatkan karya...</p>
      </div>
    );
  }

  return (
    <div className="admin-form-page">
      <header className="admin-page-header">
        <div className="admin-page-header-row">
          <div>
            <h1>Edit Karya</h1>
            <p className="admin-page-sub">ID: {workId}</p>
          </div>
          <div className="admin-page-header-actions">
            <a href={`/admin/works/${workId}/preview`} className="admin-btn admin-btn-outline">
              Preview
            </a>
            {publishPreview && (
              <button
                type="button"
                onClick={handlePublish}
                className="admin-btn admin-btn-primary"
                disabled={publishing}
              >
                {publishing ? "Menerbitkan..." : "Publish to Markdown"}
              </button>
            )}
            <button
              type="button"
              onClick={handleArchive}
              className="admin-btn admin-btn-danger"
              disabled={saving}
            >
              Arkib
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="admin-alert admin-alert-error">{error}</div>
      )}

      {success && (
        <div className="admin-alert admin-alert-success">{success}</div>
      )}

      {publishError && (
        <div className="admin-alert admin-alert-error">{publishError}</div>
      )}

      {publishSuccess && (
        <div className="admin-alert admin-alert-success">{publishSuccess}</div>
      )}

      {publishPreview && (
        <div className="admin-publish-preview">
          <h3>Sinkronisasi</h3>
          {publishPreview.isNew ? (
            <p className="admin-sync-status admin-sync-new">MARKDOWN MISSING — Karya ini belum ada sebagai Markdown.</p>
          ) : publishPreview.metadataChanged || publishPreview.bodyChanged ? (
            <p className="admin-sync-status admin-sync-changed">DB CHANGED — Perubahan dalam database belum diterbitkan ke Markdown.</p>
          ) : (
            <p className="admin-sync-status admin-sync-ok">IN SYNC — Database dan Markdown adalah selari.</p>
          )}
        </div>
      )}

      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === "content" ? "admin-tab-active" : ""}`}
          onClick={() => setActiveTab("content")}
        >
          Kandungan
        </button>
        <button
          className={`admin-tab ${activeTab === "metadata" ? "admin-tab-active" : ""}`}
          onClick={() => setActiveTab("metadata")}
        >
          Metadata
        </button>
        <button
          className={`admin-tab ${activeTab === "credits" ? "admin-tab-active" : ""}`}
          onClick={() => setActiveTab("credits")}
        >
          Kredit ({credits.length})
        </button>
        <button
          className={`admin-tab ${activeTab === "visuals" ? "admin-tab-active" : ""}`}
          onClick={() => setActiveTab("visuals")}
        >
          Visual ({visuals.length})
        </button>
        <button
          className={`admin-tab ${activeTab === "glossary" ? "admin-tab-active" : ""}`}
          onClick={() => setActiveTab("glossary")}
        >
          Glosari ({glossaryTerms.length})
        </button>
      </div>

      {activeTab === "content" && (
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-form-group">
            <label htmlFor="title">Tajuk *</label>
            <input
              id="title"
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="dek">Dek</label>
            <input
              id="dek"
              type="text"
              value={form.dek}
              onChange={(e) => setForm((prev) => ({ ...prev, dek: e.target.value }))}
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="body">Manuskrip (Markdown) *</label>
            <textarea
              id="body"
              required
              value={form.body}
              onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
              rows={25}
              className="admin-textarea"
            />
            <span className="admin-form-hint">Gunakan Markdown. Ganti baris kosong untuk perenggan baharu.</span>
          </div>

          <div className="admin-form-actions">
            <a href="/admin/works" className="admin-btn admin-btn-outline">
              Kembali
            </a>
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={saving}
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      )}

      {activeTab === "metadata" && (
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-form-group">
            <label htmlFor="slug">Slug *</label>
            <input
              id="slug"
              type="text"
              required
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
            />
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label htmlFor="type">Jenis *</label>
              <select
                id="type"
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              >
                {WORK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="admin-form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="admin-form-group">
              <label htmlFor="version">Versi</label>
              <input
                id="version"
                type="text"
                value={form.version}
                onChange={(e) => setForm((prev) => ({ ...prev, version: e.target.value }))}
              />
            </div>
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label htmlFor="genre">Genre</label>
              <input
                id="genre"
                type="text"
                value={form.genre}
                onChange={(e) => setForm((prev) => ({ ...prev, genre: e.target.value }))}
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="audience">Audiens</label>
              <input
                id="audience"
                type="text"
                value={form.audience}
                onChange={(e) => setForm((prev) => ({ ...prev, audience: e.target.value }))}
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="readingMinutes">Minit Bacaan</label>
              <input
                id="readingMinutes"
                type="number"
                value={form.readingMinutes}
                onChange={(e) => setForm((prev) => ({ ...prev, readingMinutes: e.target.value }))}
              />
            </div>
          </div>

          <div className="admin-form-actions">
            <a href="/admin/works" className="admin-btn admin-btn-outline">
              Kembali
            </a>
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={saving}
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      )}

      {activeTab === "credits" && (
        <div className="admin-credits">
          {creditError && (
            <div className="admin-alert admin-alert-error">{creditError}</div>
          )}

          <div className="admin-credits-header">
            <h3>Kredit Karya</h3>
            <button
              type="button"
              className="admin-btn admin-btn-sm admin-btn-primary"
              onClick={() => setEditingCredit({
                contributor_slug: "",
                guest_name: "",
                role_label: "",
                byline: false,
              })}
            >
              + Tambah Kredit
            </button>
          </div>

          {editingCredit && (
            <div className="admin-credit-form">
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Penyumbang</label>
                  <select
                    value={editingCredit.contributor_slug || ""}
                    onChange={(e) => setEditingCredit((prev) => ({
                      ...prev,
                      contributor_slug: e.target.value || undefined,
                      guest_name: e.target.value ? undefined : prev?.guest_name,
                    }))}
                  >
                    <option value="">-- Pilih --</option>
                    {contributors.map((c) => (
                      <option key={c.slug} value={c.slug}>{c.display_name}</option>
                    ))}
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>Atau Nama Tetamu</label>
                  <input
                    type="text"
                    value={editingCredit.guest_name || ""}
                    onChange={(e) => setEditingCredit((prev) => ({
                      ...prev,
                      guest_name: e.target.value || undefined,
                      contributor_slug: e.target.value ? undefined : prev?.contributor_slug,
                    }))}
                    placeholder="Nama tetamu"
                  />
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Peranan *</label>
                  <input
                    type="text"
                    value={editingCredit.role_label || ""}
                    onChange={(e) => setEditingCredit((prev) => ({
                      ...prev,
                      role_label: e.target.value,
                    }))}
                    placeholder="Contoh: Penulis, Penyunting"
                  />
                </div>

                <div className="admin-form-group">
                  <label>&nbsp;</label>
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      checked={editingCredit.byline || false}
                      onChange={(e) => setEditingCredit((prev) => ({
                        ...prev,
                        byline: e.target.checked,
                      }))}
                    />
                    Byline
                  </label>
                </div>
              </div>

              <div className="admin-form-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-outline"
                  onClick={() => setEditingCredit(null)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={handleSaveCredit}
                >
                  Simpan Kredit
                </button>
              </div>
            </div>
          )}

          {credits.length === 0 ? (
            <p className="admin-table-empty">Tiada kredit untuk karya ini.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Penyumbang</th>
                    <th>Peranan</th>
                    <th>Byline</th>
                    <th>Order</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {credits.map((credit) => (
                    <tr key={credit.id}>
                      <td>
                        {credit.contributor_slug
                          ? contributors.find((c) => c.slug === credit.contributor_slug)?.display_name || credit.contributor_slug
                          : credit.guest_name || "—"}
                      </td>
                      <td>{credit.role_label}</td>
                      <td>{credit.byline ? "Ya" : "Tidak"}</td>
                      <td>{credit.sort_order}</td>
                      <td>
                        <div className="admin-table-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => setEditingCredit(credit)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-danger"
                            onClick={() => handleDeleteCredit(credit.id)}
                          >
                            Padam
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "visuals" && (
        <div className="admin-visuals">
          {visualError && (
            <div className="admin-alert admin-alert-error">{visualError}</div>
          )}

          <div className="admin-credits-header">
            <h3>Visual Karya</h3>
            <button
              type="button"
              className="admin-btn admin-btn-sm admin-btn-primary"
              onClick={() => setEditingVisual({
                role: "inline",
                src: "",
                alt: "",
                place: "after",
              })}
            >
              + Tambah Visual
            </button>
          </div>

          {editingVisual && (
            <div className="admin-credit-form">
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Role *</label>
                  <select
                    value={editingVisual.role || "inline"}
                    onChange={(e) => setEditingVisual((prev) => ({
                      ...prev,
                      role: e.target.value,
                    }))}
                  >
                    <option value="hero">Hero</option>
                    <option value="inline">Inline</option>
                    <option value="section">Section</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>Place</label>
                  <select
                    value={editingVisual.place || "after"}
                    onChange={(e) => setEditingVisual((prev) => ({
                      ...prev,
                      place: e.target.value,
                    }))}
                  >
                    <option value="before">Before</option>
                    <option value="after">After</option>
                  </select>
                </div>
              </div>

              <div className="admin-form-group">
                <label>Src *</label>
                <input
                  type="text"
                  value={editingVisual.src || ""}
                  onChange={(e) => setEditingVisual((prev) => ({
                    ...prev,
                    src: e.target.value,
                  }))}
                  placeholder="/visuals/work-name/hero.png"
                />
              </div>

              <div className="admin-form-group">
                <label>Alt</label>
                <input
                  type="text"
                  value={editingVisual.alt || ""}
                  onChange={(e) => setEditingVisual((prev) => ({
                    ...prev,
                    alt: e.target.value,
                  }))}
                  placeholder="Deskripsi visual"
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Provider</label>
                  <input
                    type="text"
                    value={editingVisual.provider || ""}
                    onChange={(e) => setEditingVisual((prev) => ({
                      ...prev,
                      provider: e.target.value,
                    }))}
                    placeholder="magnific"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Creation ID</label>
                  <input
                    type="text"
                    value={editingVisual.creation_id || ""}
                    onChange={(e) => setEditingVisual((prev) => ({
                      ...prev,
                      creation_id: e.target.value,
                    }))}
                    placeholder="Xm5ZOkMBfo"
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label>Anchor</label>
                <input
                  type="text"
                  value={editingVisual.anchor || ""}
                  onChange={(e) => setEditingVisual((prev) => ({
                    ...prev,
                    anchor: e.target.value,
                  }))}
                  placeholder="Teks anchor dalam manuskrip"
                />
              </div>

              <div className="admin-form-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-outline"
                  onClick={() => setEditingVisual(null)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={handleSaveVisual}
                >
                  Simpan Visual
                </button>
              </div>
            </div>
          )}

          {visuals.length === 0 ? (
            <p className="admin-table-empty">Tiada visual untuk karya ini.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Src</th>
                    <th>Alt</th>
                    <th>Provider</th>
                    <th>Order</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {visuals.map((visual) => (
                    <tr key={visual.id}>
                      <td>
                        <span className={`admin-kind admin-kind-${visual.role}`}>
                          {visual.role}
                        </span>
                      </td>
                      <td><code>{visual.src.substring(0, 30)}...</code></td>
                      <td>{visual.alt || "—"}</td>
                      <td>{visual.provider || "—"}</td>
                      <td>{visual.sort_order}</td>
                      <td>
                        <div className="admin-table-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => setEditingVisual(visual)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-danger"
                            onClick={() => handleDeleteVisual(visual.id)}
                          >
                            Padam
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "glossary" && (
        <div className="admin-glossary">
          {glossaryError && (
            <div className="admin-alert admin-alert-error">{glossaryError}</div>
          )}

          <div className="admin-credits-header">
            <h3>Glosari Karya</h3>
            <button
              type="button"
              className="admin-btn admin-btn-sm admin-btn-primary"
              onClick={() => setEditingGlossary({
                term: "",
                meaning: "",
                source: "",
              })}
            >
              + Tambah Term
            </button>
          </div>

          {editingGlossary && (
            <div className="admin-credit-form">
              <div className="admin-form-group">
                <label>Term *</label>
                <input
                  type="text"
                  value={editingGlossary.term || ""}
                  onChange={(e) => setEditingGlossary((prev) => ({
                    ...prev,
                    term: e.target.value,
                  }))}
                  placeholder="Istilah"
                />
              </div>

              <div className="admin-form-group">
                <label>Definisi *</label>
                <textarea
                  value={editingGlossary.meaning || ""}
                  onChange={(e) => setEditingGlossary((prev) => ({
                    ...prev,
                    meaning: e.target.value,
                  }))}
                  rows={3}
                  placeholder="Maksud istilah"
                />
              </div>

              <div className="admin-form-group">
                <label>Sumber</label>
                <input
                  type="text"
                  value={editingGlossary.source || ""}
                  onChange={(e) => setEditingGlossary((prev) => ({
                    ...prev,
                    source: e.target.value,
                  }))}
                  placeholder="Sumber rujukan"
                />
              </div>

              <div className="admin-form-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-outline"
                  onClick={() => setEditingGlossary(null)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={handleSaveGlossary}
                >
                  Simpan Term
                </button>
              </div>
            </div>
          )}

          {glossaryTerms.length === 0 ? (
            <p className="admin-table-empty">Tiada glosari untuk karya ini.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Term</th>
                    <th>Definisi</th>
                    <th>Sumber</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {glossaryTerms.map((term) => (
                    <tr key={term.id}>
                      <td className="admin-table-title">{term.term}</td>
                      <td>{term.meaning}</td>
                      <td>{term.source || "—"}</td>
                      <td>
                        <div className="admin-table-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => setEditingGlossary(term)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-danger"
                            onClick={() => handleDeleteGlossary(term.id)}
                          >
                            Padam
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
