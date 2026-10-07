"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { errorText } from "../../../../lib/admin/error-text";

const VISUAL_ROLES = [
  { value: "hero", label: "Utama" },
  { value: "inline", label: "Dalam teks" },
  { value: "section", label: "Bahagian" },
  { value: "decorative", label: "Hiasan" },
];

const ASPECT_RATIOS = [
  { value: "3:2", label: "3:2 (Landskap)" },
  { value: "2:3", label: "2:3 (Potret)" },
  { value: "1:1", label: "1:1 (Segi Empat)" },
  { value: "16:9", label: "16:9 (lebar)" },
  { value: "9:16", label: "9:16 (Tegak)" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
];

const PLACES = [
  { value: "before", label: "Sebelum" },
  { value: "after", label: "Selepas" },
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
    aspectRatio: "3:2",
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
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Permintaan gambar tidak dapat dibuat.");
      }

      const vr = await res.json();
      router.push(`/admin/visual-requests/${vr.id}`);
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  }

  return (
    <div className="admin-form-page">
      <header className="admin-page-header">
        <div className="admin-page-header-row">
          <div>
            <h1>Permintaan gambar baharu</h1>
            <p className="admin-page-sub">Cipta permintaan visual baharu</p>
          </div>
          <a href="/admin/visual-requests" className="admin-btn admin-btn-outline">Kembali</a>
        </div>
      </header>

      {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="workId">ID Karya</label>
            <input
              id="workId"
              type="text"
              value={form.workId}
              onChange={(e) => setForm((prev) => ({ ...prev, workId: e.target.value }))}
              placeholder="JLN-CER-XXXX"
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="submissionId">ID Penghantaran</label>
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
            <label htmlFor="visualRole">Jenis Visual *</label>
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
            <label htmlFor="provider">Penyedia</label>
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

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="aspectRatio">Nisbah imej</label>
            <select
              id="aspectRatio"
              value={form.aspectRatio}
              onChange={(e) => setForm((prev) => ({ ...prev, aspectRatio: e.target.value }))}
            >
              {ASPECT_RATIOS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="admin-form-group">
          <label htmlFor="prompt">Arahan *</label>
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
          <label htmlFor="altText">Teks alternatif</label>
          <input
            id="altText"
            type="text"
            value={form.altText}
            onChange={(e) => setForm((prev) => ({ ...prev, altText: e.target.value }))}
          />
        </div>

        <div className="admin-form-group">
          <label htmlFor="anchor">Petikan penanda</label>
          <input
            id="anchor"
            type="text"
            value={form.anchor}
            onChange={(e) => setForm((prev) => ({ ...prev, anchor: e.target.value }))}
            placeholder="Petikan daripada manuskrip untuk menandakan kedudukan"
          />
        </div>

        <div className="admin-form-actions">
          <a href="/admin/visual-requests" className="admin-btn admin-btn-outline">Kembali</a>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? "Menambah…" : "Tambah permintaan"}
          </button>
        </div>
      </form>
    </div>
  );
}
