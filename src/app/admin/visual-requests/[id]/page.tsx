"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

const VISUAL_ROLES = [
  { value: "hero", label: "Hero" },
  { value: "inline", label: "Inline" },
  { value: "section", label: "Section" },
];

const PLACES = [
  { value: "before", label: "Before" },
  { value: "after", label: "After" },
];

const STATUSES = [
  { value: "pending", label: "Menunggu" },
  { value: "generating", label: "Menjana" },
  { value: "generated", label: "Dijana" },
  { value: "approved", label: "Diluluskan" },
  { value: "rejected", label: "Ditolak" },
];

const APPROVAL_STATES = [
  { value: "pending", label: "Menunggu" },
  { value: "approved", label: "Diluluskan" },
  { value: "rejected", label: "Ditolak" },
];

interface VisualRequestData {
  id: number;
  work_id: string | null;
  submission_id: number | null;
  visual_role: string;
  prompt: string;
  provider: string;
  provider_request_id: string | null;
  provider_creation_id: string | null;
  status: string;
  source_asset_url: string | null;
  source_asset_path: string | null;
  alt_text: string | null;
  anchor: string | null;
  place: string;
  approval_state: string;
  created_at: string;
  updated_at: string;
}

export default function EditVisualRequestPage() {
  const params = useParams();
  const requestId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    workId: "",
    submissionId: "",
    visualRole: "inline",
    prompt: "",
    provider: "magnific",
    providerRequestId: "",
    providerCreationId: "",
    status: "pending",
    sourceAssetUrl: "",
    sourceAssetPath: "",
    altText: "",
    anchor: "",
    place: "after",
    approvalState: "pending",
  });

  useEffect(() => {
    async function loadRequest() {
      try {
        const res = await fetch(`/api/admin/visual-requests/${requestId}`);
        if (!res.ok) throw new Error("Visual request tidak ditemui.");
        const r: VisualRequestData = await res.json();

        setForm({
          workId: r.work_id || "",
          submissionId: r.submission_id?.toString() || "",
          visualRole: r.visual_role,
          prompt: r.prompt,
          provider: r.provider,
          providerRequestId: r.provider_request_id || "",
          providerCreationId: r.provider_creation_id || "",
          status: r.status,
          sourceAssetUrl: r.source_asset_url || "",
          sourceAssetPath: r.source_asset_path || "",
          altText: r.alt_text || "",
          anchor: r.anchor || "",
          place: r.place,
          approvalState: r.approval_state,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ralat memuatkan visual request.");
      } finally {
        setLoading(false);
      }
    }

    loadRequest();
  }, [requestId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/visual-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          submissionId: form.submissionId ? Number(form.submissionId) : undefined,
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

  async function handleDelete() {
    if (!confirm("Pasti ingin memadam visual request ini?")) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/visual-requests/${requestId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal memadam.");
      }
      window.location.href = "/admin/visual-requests";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="admin-loading"><p>Memuatkan visual request...</p></div>;
  }

  return (
    <div className="admin-form-page">
      <header className="admin-page-header">
        <div className="admin-page-header-row">
          <div>
            <h1>Edit Visual Request</h1>
            <p className="admin-page-sub">ID: {requestId}</p>
          </div>
          <div className="admin-page-header-actions">
            <a href="/admin/visual-requests" className="admin-btn admin-btn-outline">Kembali</a>
            <button type="button" onClick={handleDelete} className="admin-btn admin-btn-danger" disabled={deleting}>
              {deleting ? "Memadam..." : "Padam"}
            </button>
          </div>
        </div>
      </header>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}
      {success && <div className="admin-alert admin-alert-success">{success}</div>}

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
            <label htmlFor="visualRole">Role Visual</label>
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

        <div className="admin-form-row">
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
            <label htmlFor="approvalState">Kelulusan</label>
            <select
              id="approvalState"
              value={form.approvalState}
              onChange={(e) => setForm((prev) => ({ ...prev, approvalState: e.target.value }))}
            >
              {APPROVAL_STATES.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="providerRequestId">Provider Request ID</label>
            <input
              id="providerRequestId"
              type="text"
              value={form.providerRequestId}
              onChange={(e) => setForm((prev) => ({ ...prev, providerRequestId: e.target.value }))}
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="providerCreationId">Provider Creation ID</label>
            <input
              id="providerCreationId"
              type="text"
              value={form.providerCreationId}
              onChange={(e) => setForm((prev) => ({ ...prev, providerCreationId: e.target.value }))}
            />
          </div>
        </div>

        <div className="admin-form-group">
          <label htmlFor="sourceAssetUrl">Source Asset URL</label>
          <input
            id="sourceAssetUrl"
            type="text"
            value={form.sourceAssetUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, sourceAssetUrl: e.target.value }))}
          />
        </div>

        <div className="admin-form-group">
          <label htmlFor="sourceAssetPath">Source Asset Path</label>
          <input
            id="sourceAssetPath"
            type="text"
            value={form.sourceAssetPath}
            onChange={(e) => setForm((prev) => ({ ...prev, sourceAssetPath: e.target.value }))}
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
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
}
