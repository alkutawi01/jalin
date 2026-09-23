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

export default function EditWorkPage() {
  const router = useRouter();
  const params = useParams();
  const workId = params.id as string;

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
  }, [workId]);

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
    </div>
  );
}
