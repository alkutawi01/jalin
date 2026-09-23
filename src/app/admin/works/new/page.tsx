"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const WORK_TYPES = [
  { value: "cerpen", label: "Cerpen" },
  { value: "novela", label: "Novela" },
  { value: "bersiri", label: "Bersiri" },
  { value: "terjemahan", label: "Terjemahan" },
  { value: "fragmen", label: "Fragmen" },
  { value: "sinopsis", label: "Sinopsis" },
];

export default function NewWorkPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  });

  function generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function handleTitleChange(value: string) {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: prev.slug || generateSlug(value),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/works", {
        method: "POST",
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

      const work = await res.json();
      router.push(`/admin/works/${work.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-form-page">
      <header className="admin-page-header">
        <h1>Karya Baharu</h1>
        <p className="admin-page-sub">Cipta karya baharu dalam database</p>
      </header>

      {error && (
        <div className="admin-alert admin-alert-error">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="admin-form-group">
          <label htmlFor="title">Tajuk *</label>
          <input
            id="title"
            type="text"
            required
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Contoh: Kerusi di Beranda"
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
            placeholder="kerusi-di-beranda"
          />
          <span className="admin-form-hint">Unik dalam system. Contoh: kerusi-di-beranda</span>
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
              <option value="draft">Draf</option>
              <option value="review">Semakan</option>
              <option value="ready">Sedia</option>
            </select>
          </div>

          <div className="admin-form-group">
            <label htmlFor="version">Versi</label>
            <input
              id="version"
              type="text"
              value={form.version}
              onChange={(e) => setForm((prev) => ({ ...prev, version: e.target.value }))}
              placeholder="v0.1"
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
              placeholder="Keluarga"
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="audience">Audiens</label>
            <input
              id="audience"
              type="text"
              value={form.audience}
              onChange={(e) => setForm((prev) => ({ ...prev, audience: e.target.value }))}
              placeholder="Remaja 13-17"
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="readingMinutes">Minit Bacaan</label>
            <input
              id="readingMinutes"
              type="number"
              value={form.readingMinutes}
              onChange={(e) => setForm((prev) => ({ ...prev, readingMinutes: e.target.value }))}
              placeholder="15"
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
            placeholder="Ringkasan pendek karya"
          />
        </div>

        <div className="admin-form-group">
          <label htmlFor="body">Manuskrip (Markdown) *</label>
          <textarea
            id="body"
            required
            value={form.body}
            onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
            placeholder="Tulis manuskrip di sini dalam format Markdown..."
            rows={20}
            className="admin-textarea"
          />
          <span className="admin-form-hint">Gunakan Markdown untuk pemformatan. Ganti baris kosong untuk perenggan baharu.</span>
        </div>

        <div className="admin-form-actions">
          <a href="/admin/works" className="admin-btn admin-btn-outline">
            Batal
          </a>
          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={saving}
          >
            {saving ? "Menyimpan..." : "Cipta Karya"}
          </button>
        </div>
      </form>
    </div>
  );
}
