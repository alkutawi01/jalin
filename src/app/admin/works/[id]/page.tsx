"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

const WORK_TYPES = [
  { value: "cerpen", label: "Cerpen" },
  { value: "novela", label: "Novela" },
  { value: "bersiri", label: "Bersiri" },
  { value: "terjemahan", label: "Terjemahan" },
  { value: "fragmen", label: "Fragmen" },
  { value: "sinopsis", label: "Sinopsis" },
];

const STATUSES = [
  { value: "draft", label: "Draf" },
  { value: "review", label: "Semakan" },
  { value: "ready", label: "Sedia" },
  { value: "published", label: "Diterbitkan" },
  { value: "archived", label: "Arkib" },
];

interface WorkData {
  id: string;
  slug: string;
  title: string;
  type: string;
  status: string;
  body: string;
  genre: string | null;
  audience: string | null;
  dek: string | null;
  reading_minutes: number | null;
  version: string;
  published_at: string | null;
  updated_at: string;
}

interface CreditData {
  id: number;
  work_id: string;
  contributor_slug: string | null;
  guest_name: string | null;
  role_label: string;
  byline: boolean;
  sort_order: number;
}

interface ContributorOption {
  slug: string;
  display_name: string;
}

type Tab = "content" | "metadata" | "credits";

export default function EditWorkPage() {
  const router = useRouter();
  const params = useParams();
  const workId = params.id as string;

  const [activeTab, setActiveTab] = useState<Tab>("content");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    publishedAt: "",
  });

  const [credits, setCredits] = useState<CreditData[]>([]);
  const [contributors, setContributors] = useState<ContributorOption[]>([]);
  const [editingCredit, setEditingCredit] = useState<Partial<CreditData> | null>(null);
  const [creditError, setCreditError] = useState<string | null>(null);

  useEffect(() => {
    async function loadWork() {
      try {
        const res = await fetch(`/api/admin/works/${workId}`);
        if (!res.ok) throw new Error("Karya tidak ditemui.");
        const work: WorkData = await res.json();

        setForm({
          title: work.title,
          slug: work.slug,
          type: work.type,
          status: work.status,
          body: work.body || "",
          genre: work.genre || "",
          audience: work.audience || "",
          dek: work.dek || "",
          readingMinutes: work.reading_minutes?.toString() || "",
          version: work.version,
          publishedAt: work.published_at ? work.published_at.split("T")[0] : "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ralat memuatkan karya.");
      } finally {
        setLoading(false);
      }
    }

    loadWork();
    loadCredits();
    loadContributors();
  }, [workId]);

  async function loadCredits() {
    try {
      const res = await fetch(`/api/admin/credits?workId=${workId}`);
      if (res.ok) {
        setCredits(await res.json());
      }
    } catch {
      // Ignore credit loading errors
    }
  }

  async function loadContributors() {
    try {
      const res = await fetch("/api/admin/contributors");
      if (res.ok) {
        const data = await res.json();
        setContributors(data.map((c: { slug: string; display_name: string }) => ({
          slug: c.slug,
          display_name: c.display_name,
        })));
      }
    } catch {
      // Ignore contributor loading errors
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/works/${workId}`, {
        method: "PATCH",
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

      setSuccess("Berjaya disimpan.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCredit() {
    if (!editingCredit) return;

    setCreditError(null);

    try {
      if (editingCredit.id) {
        // Update existing credit
        const res = await fetch(`/api/admin/credits/${editingCredit.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingCredit),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Gagal menyimpan kredit.");
        }
      } else {
        // Create new credit
        const res = await fetch("/api/admin/credits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...editingCredit,
            workId,
            sortOrder: credits.length + 1,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Gagal mencipta kredit.");
        }
      }

      setEditingCredit(null);
      loadCredits();
    } catch (err) {
      setCreditError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function handleDeleteCredit(id: number) {
    if (!confirm("Pasti ingin memadam kredit ini?")) return;

    try {
      const res = await fetch(`/api/admin/credits/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal memadam kredit.");
      }

      loadCredits();
    } catch (err) {
      setCreditError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function handleArchive() {
    if (!confirm("Pasti ingin mengarkibkan karya ini?")) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/works/${workId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });

      if (!res.ok) throw new Error("Gagal mengarkibkan.");
      router.push("/admin/works");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <p>Memuatkan karya...</p>
      </div>
    );
  }

  return (
    <div className="admin-form-page">
      <header className="admin-page-header">
        <div className="admin-page-header-row">
          <div>
            <h1>Edit Karya</h1>
            <p className="admin-page-sub">ID: {workId}</p>
          </div>
          <div className="admin-page-header-actions">
            <a href={`/admin/works/${workId}/preview`} className="admin-btn admin-btn-outline">
              Preview
            </a>
            <button
              type="button"
              onClick={handleArchive}
              className="admin-btn admin-btn-danger"
              disabled={saving}
            >
              Arkib
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="admin-alert admin-alert-error">{error}</div>
      )}

      {success && (
        <div className="admin-alert admin-alert-success">{success}</div>
      )}

      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === "content" ? "admin-tab-active" : ""}`}
          onClick={() => setActiveTab("content")}
        >
          Kandungan
        </button>
        <button
          className={`admin-tab ${activeTab === "metadata" ? "admin-tab-active" : ""}`}
          onClick={() => setActiveTab("metadata")}
        >
          Metadata
        </button>
        <button
          className={`admin-tab ${activeTab === "credits" ? "admin-tab-active" : ""}`}
          onClick={() => setActiveTab("credits")}
        >
          Kredit ({credits.length})
        </button>
      </div>

      {activeTab === "content" && (
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-form-group">
            <label htmlFor="title">Tajuk *</label>
            <input
              id="title"
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
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
            <label htmlFor="body">Manuskrip (Markdown) *</label>
            <textarea
              id="body"
              required
              value={form.body}
              onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
              rows={25}
              className="admin-textarea"
            />
            <span className="admin-form-hint">Gunakan Markdown. Ganti baris kosong untuk perenggan baharu.</span>
          </div>

          <div className="admin-form-actions">
            <a href="/admin/works" className="admin-btn admin-btn-outline">
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
      )}

      {activeTab === "metadata" && (
        <form onSubmit={handleSubmit} className="admin-form">
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
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="admin-form-group">
              <label htmlFor="version">Versi</label>
              <input
                id="version"
                type="text"
                value={form.version}
                onChange={(e) => setForm((prev) => ({ ...prev, version: e.target.value }))}
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
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="audience">Audiens</label>
              <input
                id="audience"
                type="text"
                value={form.audience}
                onChange={(e) => setForm((prev) => ({ ...prev, audience: e.target.value }))}
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="readingMinutes">Minit Bacaan</label>
              <input
                id="readingMinutes"
                type="number"
                value={form.readingMinutes}
                onChange={(e) => setForm((prev) => ({ ...prev, readingMinutes: e.target.value }))}
              />
            </div>
          </div>

          <div className="admin-form-actions">
            <a href="/admin/works" className="admin-btn admin-btn-outline">
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
      )}

      {activeTab === "credits" && (
        <div className="admin-credits">
          {creditError && (
            <div className="admin-alert admin-alert-error">{creditError}</div>
          )}

          <div className="admin-credits-header">
            <h3>Kredit Karya</h3>
            <button
              type="button"
              className="admin-btn admin-btn-sm admin-btn-primary"
              onClick={() => setEditingCredit({
                contributor_slug: "",
                guest_name: "",
                role_label: "",
                byline: false,
              })}
            >
              + Tambah Kredit
            </button>
          </div>

          {editingCredit && (
            <div className="admin-credit-form">
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Penyumbang</label>
                  <select
                    value={editingCredit.contributor_slug || ""}
                    onChange={(e) => setEditingCredit((prev) => ({
                      ...prev,
                      contributor_slug: e.target.value || undefined,
                      guest_name: e.target.value ? undefined : prev?.guest_name,
                    }))}
                  >
                    <option value="">-- Pilih --</option>
                    {contributors.map((c) => (
                      <option key={c.slug} value={c.slug}>{c.display_name}</option>
                    ))}
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>Atau Nama Tetamu</label>
                  <input
                    type="text"
                    value={editingCredit.guest_name || ""}
                    onChange={(e) => setEditingCredit((prev) => ({
                      ...prev,
                      guest_name: e.target.value || undefined,
                      contributor_slug: e.target.value ? undefined : prev?.contributor_slug,
                    }))}
                    placeholder="Nama tetamu"
                  />
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Peranan *</label>
                  <input
                    type="text"
                    value={editingCredit.role_label || ""}
                    onChange={(e) => setEditingCredit((prev) => ({
                      ...prev,
                      role_label: e.target.value,
                    }))}
                    placeholder="Contoh: Penulis, Penyunting"
                  />
                </div>

                <div className="admin-form-group">
                  <label>&nbsp;</label>
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      checked={editingCredit.byline || false}
                      onChange={(e) => setEditingCredit((prev) => ({
                        ...prev,
                        byline: e.target.checked,
                      }))}
                    />
                    Byline
                  </label>
                </div>
              </div>

              <div className="admin-form-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-outline"
                  onClick={() => setEditingCredit(null)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={handleSaveCredit}
                >
                  Simpan Kredit
                </button>
              </div>
            </div>
          )}

          {credits.length === 0 ? (
            <p className="admin-table-empty">Tiada kredit untuk karya ini.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Penyumbang</th>
                    <th>Peranan</th>
                    <th>Byline</th>
                    <th>Order</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {credits.map((credit) => (
                    <tr key={credit.id}>
                      <td>
                        {credit.contributor_slug
                          ? contributors.find((c) => c.slug === credit.contributor_slug)?.display_name || credit.contributor_slug
                          : credit.guest_name || "—"}
                      </td>
                      <td>{credit.role_label}</td>
                      <td>{credit.byline ? "Ya" : "Tidak"}</td>
                      <td>{credit.sort_order}</td>
                      <td>
                        <div className="admin-table-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => setEditingCredit(credit)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-danger"
                            onClick={() => handleDeleteCredit(credit.id)}
                          >
                            Padam
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
