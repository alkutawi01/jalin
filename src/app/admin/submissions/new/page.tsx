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

const SUBMITTER_TYPES = [
  { value: "human", label: "Manusia" },
  { value: "ai", label: "AI" },
  { value: "guest", label: "Tetamu" },
];

export default function NewSubmissionPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    proposedType: "",
    proposedTitle: "",
    proposedSlug: "",
    manuscript: "",
    dek: "",
    submitterType: "human",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal mencipta submission.");
      }

      const sub = await res.json();
      router.push(`/admin/submissions/${sub.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
      setSaving(false);
    }
  }

  return (
    <div className="admin-form-page">
      <header className="admin-page-header">
        <div className="admin-page-header-row">
          <div>
            <h1>Submission Baharu</h1>
            <p className="admin-page-sub">Cipta submission baru</p>
          </div>
          <a href="/admin/submissions" className="admin-btn admin-btn-outline">Kembali</a>
        </div>
      </header>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="proposedType">Jenis Karya</label>
            <select
              id="proposedType"
              value={form.proposedType}
              onChange={(e) => setForm((prev) => ({ ...prev, proposedType: e.target.value }))}
            >
              <option value="">— Pilih —</option>
              {WORK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="admin-form-group">
            <label htmlFor="submitterType">Penyerah</label>
            <select
              id="submitterType"
              value={form.submitterType}
              onChange={(e) => setForm((prev) => ({ ...prev, submitterType: e.target.value }))}
            >
              {SUBMITTER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="admin-form-group">
          <label htmlFor="proposedTitle">Tajuk</label>
          <input
            id="proposedTitle"
            type="text"
            value={form.proposedTitle}
            onChange={(e) => setForm((prev) => ({ ...prev, proposedTitle: e.target.value }))}
          />
        </div>

        <div className="admin-form-group">
          <label htmlFor="proposedSlug">Slug</label>
          <input
            id="proposedSlug"
            type="text"
            value={form.proposedSlug}
            onChange={(e) => setForm((prev) => ({ ...prev, proposedSlug: e.target.value }))}
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
          <label htmlFor="manuscript">Manuskrip</label>
          <textarea
            id="manuscript"
            value={form.manuscript}
            onChange={(e) => setForm((prev) => ({ ...prev, manuscript: e.target.value }))}
            rows={20}
            className="admin-textarea"
          />
        </div>

        <div className="admin-form-actions">
          <a href="/admin/submissions" className="admin-btn admin-btn-outline">Kembali</a>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? "Mencipta..." : "Cipta Submission"}
          </button>
        </div>
      </form>
    </div>
  );
}
