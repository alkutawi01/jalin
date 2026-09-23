"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CONTRIBUTOR_TYPES = [
  { value: "human", label: "Manusia" },
  { value: "virtual", label: "Maya (AI)" },
  { value: "organization", label: "Organisasi" },
];

export default function NewContributorPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    displayName: "",
    slug: "",
    kind: "human",
    bio: "",
    disclosure: "",
  });

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function handleNameChange(value: string) {
    setForm((prev) => ({
      ...prev,
      displayName: value,
      slug: prev.slug || generateSlug(value),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/contributors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menyimpan.");
      }

      router.push("/admin/contributors");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-form-page">
      <header className="admin-page-header">
        <h1>Penyumbang Baharu</h1>
        <p className="admin-page-sub">Cipta penyumbang baharu dalam database</p>
      </header>

      {error && (
        <div className="admin-alert admin-alert-error">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="admin-form-group">
          <label htmlFor="displayName">Nama *</label>
          <input
            id="displayName"
            type="text"
            required
            value={form.displayName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Contoh: Rafiq Naim"
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
            placeholder="rafiq-naim"
          />
          <span className="admin-form-hint">Unik dalam system. Contoh: rafiq-naim</span>
        </div>

        <div className="admin-form-group">
          <label htmlFor="kind">Jenis *</label>
          <select
            id="kind"
            value={form.kind}
            onChange={(e) => setForm((prev) => ({ ...prev, kind: e.target.value }))}
          >
            {CONTRIBUTOR_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="admin-form-group">
          <label htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            value={form.bio}
            onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
            placeholder="Bio ringkas penyumbang..."
            rows={4}
          />
        </div>

        <div className="admin-form-group">
          <label htmlFor="disclosure">Disclosure</label>
          <input
            id="disclosure"
            type="text"
            value={form.disclosure}
            onChange={(e) => setForm((prev) => ({ ...prev, disclosure: e.target.value }))}
            placeholder="Contoh: Penulis Maya bekerja di bawah kawal selia editorial manusia."
          />
          <span className="admin-form-hint">Disclosure awam untuk penyumbang maya/AI.</span>
        </div>

        <div className="admin-form-actions">
          <a href="/admin/contributors" className="admin-btn admin-btn-outline">
            Batal
          </a>
          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={saving}
          >
            {saving ? "Menyimpan..." : "Cipta Penyumbang"}
          </button>
        </div>
      </form>
    </div>
  );
}
