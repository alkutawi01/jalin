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

const SCOPES = [
  { value: "global", label: "Global" },
  { value: "category", label: "Kategori" },
  { value: "work", label: "Karya" },
];

export default function NewPromptPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    promptText: "",
    scope: "global",
    workType: "",
    workId: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal mencipta template.");
      }

      const template = await res.json();
      router.push(`/admin/prompts/${template.id}`);
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
            <h1>Prompt Template Baharu</h1>
            <p className="admin-page-sub">Cipta template prompt baru</p>
          </div>
          <a href="/admin/prompts" className="admin-btn admin-btn-outline">Kembali</a>
        </div>
      </header>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="admin-form-group">
          <label htmlFor="name">Nama *</label>
          <input
            id="name"
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="scope">Skop</label>
            <select
              id="scope"
              value={form.scope}
              onChange={(e) => setForm((prev) => ({ ...prev, scope: e.target.value }))}
            >
              {SCOPES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="admin-form-group">
            <label htmlFor="workType">Jenis Karya</label>
            <select
              id="workType"
              value={form.workType}
              onChange={(e) => setForm((prev) => ({ ...prev, workType: e.target.value }))}
            >
              <option value="">— Tiada —</option>
              {WORK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="admin-form-group">
          <label htmlFor="workId">Work ID (pilihan)</label>
          <input
            id="workId"
            type="text"
            value={form.workId}
            onChange={(e) => setForm((prev) => ({ ...prev, workId: e.target.value }))}
            placeholder="JLN-CER-XXXX"
          />
        </div>

        <div className="admin-form-group">
          <label htmlFor="promptText">Teks Prompt *</label>
          <textarea
            id="promptText"
            required
            value={form.promptText}
            onChange={(e) => setForm((prev) => ({ ...prev, promptText: e.target.value }))}
            rows={15}
            className="admin-textarea"
          />
        </div>

        <div className="admin-form-actions">
          <a href="/admin/prompts" className="admin-btn admin-btn-outline">Kembali</a>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? "Mencipta..." : "Cipta Template"}
          </button>
        </div>
      </form>
    </div>
  );
}
