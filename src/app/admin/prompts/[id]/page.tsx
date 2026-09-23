"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

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

const STATUSES = [
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Tidak Aktif" },
];

interface PromptTemplateData {
  id: number;
  name: string;
  prompt_text: string;
  scope: string;
  work_type: string | null;
  work_id: string | null;
  version: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function EditPromptPage() {
  const params = useParams();
  const promptId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    promptText: "",
    scope: "global",
    workType: "",
    workId: "",
    version: 1,
    status: "active",
  });

  useEffect(() => {
    async function loadTemplate() {
      try {
        const res = await fetch(`/api/admin/prompts/${promptId}`);
        if (!res.ok) throw new Error("Template tidak ditemui.");
        const t: PromptTemplateData = await res.json();

        setForm({
          name: t.name,
          promptText: t.prompt_text,
          scope: t.scope,
          workType: t.work_type || "",
          workId: t.work_id || "",
          version: t.version,
          status: t.status,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ralat memuatkan template.");
      } finally {
        setLoading(false);
      }
    }

    loadTemplate();
  }, [promptId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/prompts/${promptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

  async function handleDelete() {
    if (!confirm("Pasti ingin memadam template ini?")) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/prompts/${promptId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal memadam.");
      }
      window.location.href = "/admin/prompts";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="admin-loading"><p>Memuatkan template...</p></div>;
  }

  return (
    <div className="admin-form-page">
      <header className="admin-page-header">
        <div className="admin-page-header-row">
          <div>
            <h1>Edit Prompt Template</h1>
            <p className="admin-page-sub">ID: {promptId}</p>
          </div>
          <div className="admin-page-header-actions">
            <a href="/admin/prompts" className="admin-btn admin-btn-outline">Kembali</a>
            <button type="button" onClick={handleDelete} className="admin-btn admin-btn-danger" disabled={deleting}>
              {deleting ? "Memadam..." : "Padam"}
            </button>
          </div>
        </div>
      </header>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}
      {success && <div className="admin-alert admin-alert-success">{success}</div>}

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
              type="number"
              value={form.version}
              onChange={(e) => setForm((prev) => ({ ...prev, version: Number(e.target.value) }))}
            />
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
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
}
