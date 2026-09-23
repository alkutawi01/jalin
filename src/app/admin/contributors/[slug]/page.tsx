"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

const CONTRIBUTOR_TYPES = [
  { value: "human", label: "Manusia" },
  { value: "virtual", label: "Maya (AI)" },
  { value: "organization", label: "Organisasi" },
];

interface ContributorData {
  slug: string;
  display_name: string;
  kind: string;
  bio: string | null;
  disclosure: string | null;
  is_visible: boolean;
  created_at: string;
}

export default function EditContributorPage() {
  const router = useRouter();
  const params = useParams();
  const contributorSlug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    displayName: "",
    slug: "",
    kind: "human",
    bio: "",
    disclosure: "",
    isVisible: true,
  });

  useEffect(() => {
    async function loadContributor() {
      try {
        const res = await fetch(`/api/admin/contributors/${contributorSlug}`);
        if (!res.ok) throw new Error("Penyumbang tidak ditemui.");
        const contributor: ContributorData = await res.json();

        setForm({
          displayName: contributor.display_name,
          slug: contributor.slug,
          kind: contributor.kind,
          bio: contributor.bio || "",
          disclosure: contributor.disclosure || "",
          isVisible: contributor.is_visible,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ralat memuatkan penyumbang.");
      } finally {
        setLoading(false);
      }
    }

    loadContributor();
  }, [contributorSlug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/contributors/${contributorSlug}`, {
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

  if (loading) {
    return (
      <div className="admin-loading">
        <p>Memuatkan penyumbang...</p>
      </div>
    );
  }

  return (
    <div className="admin-form-page">
      <header className="admin-page-header">
        <h1>Edit Penyumbang</h1>
        <p className="admin-page-sub">Slug: {contributorSlug}</p>
      </header>

      {error && (
        <div className="admin-alert admin-alert-error">{error}</div>
      )}

      {success && (
        <div className="admin-alert admin-alert-success">{success}</div>
      )}

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="admin-form-group">
          <label htmlFor="displayName">Nama *</label>
          <input
            id="displayName"
            type="text"
            required
            value={form.displayName}
            onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
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
          />
          <span className="admin-form-hint">Disclosure awam untuk penyumbang maya/AI.</span>
        </div>

        <div className="admin-form-group">
          <label className="admin-checkbox-label">
            <input
              type="checkbox"
              checked={form.isVisible}
              onChange={(e) => setForm((prev) => ({ ...prev, isVisible: e.target.checked }))}
            />
            Visible on public pages
          </label>
          <span className="admin-form-hint">Sembunyikan penyumbang ini daripada senarai awam.</span>
        </div>

        <div className="admin-form-actions">
          <a href="/admin/contributors" className="admin-btn admin-btn-outline">
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
