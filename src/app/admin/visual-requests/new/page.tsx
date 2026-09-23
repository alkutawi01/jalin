"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const VISUAL_ROLES = [
  { value: "hero", label: "Hero" },
  { value: "inline", label: "Inline" },
  { value: "section", label: "Section" },
];

const PLACES = [
  { value: "before", label: "Before" },
  { value: "after", label: "After" },
];

export default function NewVisualRequestPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    workId: "",
    submissionId: "",
    visualRole: "inline",
    prompt: "",
    provider: "magnific",
    altText: "",
    anchor: "",
    place: "after",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/visual-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          submissionId: form.submissionId ? Number(form.submissionId) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal mencipta visual request.");
      }

      const vr = await res.json();
      router.push(`/admin/visual-requests/${vr.id}`);
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
            <h1>Visual Request Baharu</h1>
            <p className="admin-page-sub">Cipta permintaan visual baru</p>
          </div>
          <a href="/admin/visual-requests" className="admin-btn admin-btn-outline">Kembali</a>
        </div>
      </header>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="workId">Work ID</label>
            <input
              id="workId"
              type="text"
              value={form.workId}
              onChange={(e) => setForm((prev) => ({ ...prev, workId: e.target.value }))}
              placeholder="JLN-CER-XXXX"
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="submissionId">Submission ID</label>
            <input
              id="submissionId"
              type="number"
              value={form.submissionId}
              onChange={(e) => setForm((prev) => ({ ...prev, submissionId: e.target.value }))}
            />
          </div>
        </div>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="visualRole">Role Visual *</label>
            <select
              id="visualRole"
              value={form.visualRole}
              onChange={(e) => setForm((prev) => ({ ...prev, visualRole: e.target.value }))}
            >
              {VISUAL_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="admin-form-group">
            <label htmlFor="provider">Provider</label>
            <input
              id="provider"
              type="text"
              value={form.provider}
              onChange={(e) => setForm((prev) => ({ ...prev, provider: e.target.value }))}
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="place">Tempat</label>
            <select
              id="place"
              value={form.place}
              onChange={(e) => setForm((prev) => ({ ...prev, place: e.target.value }))}
            >
              {PLACES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="admin-form-group">
          <label htmlFor="prompt">Prompt *</label>
          <textarea
            id="prompt"
            required
            value={form.prompt}
            onChange={(e) => setForm((prev) => ({ ...prev, prompt: e.target.value }))}
            rows={6}
            className="admin-textarea"
          />
        </div>

        <div className="admin-form-group">
          <label htmlFor="altText">Alt Text</label>
          <input
            id="altText"
            type="text"
            value={form.altText}
            onChange={(e) => setForm((prev) => ({ ...prev, altText: e.target.value }))}
          />
        </div>

        <div className="admin-form-group">
          <label htmlFor="anchor">Anchor</label>
          <input
            id="anchor"
            type="text"
            value={form.anchor}
            onChange={(e) => setForm((prev) => ({ ...prev, anchor: e.target.value }))}
            placeholder="Teks anchor dalam manuskrip"
          />
        </div>

        <div className="admin-form-actions">
          <a href="/admin/visual-requests" className="admin-btn admin-btn-outline">Kembali</a>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? "Mencipta..." : "Cipta Visual Request"}
          </button>
        </div>
      </form>
    </div>
  );
}
