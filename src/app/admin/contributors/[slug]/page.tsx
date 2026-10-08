"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { errorText } from "../../../../lib/admin/error-text";

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
        setError(errorText(err, "Ralat memuatkan penyumbang."));
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
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Tidak dapat disimpan.");
      }

      const saved: ContributorData = await res.json();
      if (saved.slug !== contributorSlug) {
        router.replace(`/admin/contributors/${encodeURIComponent(saved.slug)}`);
      }
      setSuccess("Berjaya disimpan.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <p>Memuatkan penyumbang…</p>
      </div>
    );
  }

  if (error && !form.slug) {
    return (
      <div className="admin-form-page">
        <div className="admin-alert admin-alert-error" role="alert">{error} Alamat pautan penyumbang mungkin sudah bertukar.</div>
        <a href="/admin/contributors" className="admin-btn admin-btn-outline">Lihat senarai penyumbang</a>
      </div>
    );
  }

  return (
    <div className="admin-form-page">
      <header className="admin-page-header">
        <h1>Sunting penyumbang</h1>
        <p className="admin-page-sub">Alamat pautan: {contributorSlug}</p>
      </header>

      {error && (
        <div className="admin-alert admin-alert-error" role="alert">{error}</div>
      )}

      {success && (
        <div className="admin-alert admin-alert-success" role="status">{success}</div>
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
          <label htmlFor="slug">Alamat pautan *</label>
          <input
            id="slug"
            type="text"
            required
            value={form.slug}
            onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
          />
          <span className="admin-form-hint">Boleh ditukar kepada alamat pilihan anda (huruf kecil, angka dan sengkang). Pautan profil baharu akan menggunakan alamat ini selepas disimpan.</span>
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
            className="admin-textarea admin-textarea--long"
            value={form.bio}
            onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
            rows={8}
          />
        </div>

        <div className="admin-form-group">
          <label htmlFor="disclosure">Pendedahan</label>
          <textarea
            id="disclosure"
            className="admin-textarea"
            rows={5}
            value={form.disclosure}
            onChange={(e) => setForm((prev) => ({ ...prev, disclosure: e.target.value }))}
          />
          <span className="admin-form-hint">Pendedahan awam untuk penyumbang maya/AI.</span>
        </div>

        <div className="admin-form-group">
          <label className="admin-checkbox-label">
            <input
              type="checkbox"
              checked={form.isVisible}
              onChange={(e) => setForm((prev) => ({ ...prev, isVisible: e.target.checked }))}
            />
            Paparkan di halaman awam
          </label>
          <span className="admin-form-hint">Buang tanda ini untuk menyembunyikan penyumbang daripada senarai awam.</span>
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
            {saving ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
}
