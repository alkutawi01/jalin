"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewSeriesPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    dek: "",
    genre: "",
    audience: "",
    mode: "continuous",
    status: "ongoing",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mencipta siri.");
      router.push(`/admin/series/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
      setSaving(false);
    }
  }

  return (
    <div className="admin-form-page">
      <header className="admin-page-header">
        <div>
          <h1>Siri Baharu</h1>
          <p className="admin-page-sub">Bekas editorial untuk episod Bersiri</p>
        </div>
      </header>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="admin-form-group">
          <label htmlFor="title">Tajuk *</label>
          <input
            id="title"
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />
        </div>
        <div className="admin-form-group">
          <label htmlFor="slug">Slug *</label>
          <input
            id="slug"
            type="text"
            required
            value={form.slug}
            onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
            placeholder="siri-contoh"
          />
        </div>
        <div className="admin-form-group">
          <label htmlFor="dek">Dek</label>
          <input
            id="dek"
            type="text"
            value={form.dek}
            onChange={(e) => setForm((p) => ({ ...p, dek: e.target.value }))}
          />
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="genre">Genre</label>
            <input
              id="genre"
              type="text"
              value={form.genre}
              onChange={(e) => setForm((p) => ({ ...p, genre: e.target.value }))}
            />
          </div>
          <div className="admin-form-group">
            <label htmlFor="audience">Audiens</label>
            <input
              id="audience"
              type="text"
              value={form.audience}
              onChange={(e) => setForm((p) => ({ ...p, audience: e.target.value }))}
            />
          </div>
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="mode">Mode</label>
            <select
              id="mode"
              value={form.mode}
              onChange={(e) => setForm((p) => ({ ...p, mode: e.target.value }))}
            >
              <option value="continuous">Bersambung (continuous)</option>
              <option value="anthology">Antologi (anthology)</option>
            </select>
          </div>
          <div className="admin-form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            >
              <option value="ongoing">Berterusan</option>
              <option value="completed">Tamat</option>
            </select>
          </div>
        </div>
        <div className="admin-form-actions">
          <a href="/admin/series" className="admin-btn admin-btn-outline">Kembali</a>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? "Mencipta..." : "Cipta Siri"}
          </button>
        </div>
      </form>
    </div>
  );
}
