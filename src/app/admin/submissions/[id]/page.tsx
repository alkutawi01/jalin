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

const STATUSES = [
  { value: "draft", label: "Draf" },
  { value: "submitted", label: "Dihantar" },
  { value: "under_review", label: "Dalam Semakan" },
  { value: "changes_requested", label: "Perubahan Diminta" },
  { value: "approved", label: "Diluluskan" },
  { value: "rejected", label: "Ditolak" },
  { value: "published", label: "Diterbitkan" },
];

const SUBMITTER_TYPES = [
  { value: "human", label: "Manusia" },
  { value: "ai", label: "AI" },
  { value: "guest", label: "Tetamu" },
];

interface SubmissionData {
  id: number;
  proposed_type: string | null;
  proposed_title: string | null;
  proposed_slug: string | null;
  manuscript: string | null;
  dek: string | null;
  status: string;
  submitter_type: string;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  result_work_id: string | null;
}

interface ContributionData {
  id: number;
  submission_id: number;
  contributor_slug: string | null;
  guest_name: string | null;
  role_key: string | null;
  role_label: string;
  sort_order: number;
  suggested_public_credit: string | null;
  ai_provider: string | null;
  ai_model: string | null;
  ai_persona: string | null;
  ai_actual_role: string | null;
  ai_identity_source: string;
}

interface GenerationRequestData {
  id: number;
  submission_id: number;
  prompt_template_id: number | null;
  provider: string;
  model: string;
  status: string;
  requested_by: string;
  provider_request_id: string | null;
  token_input: number | null;
  token_output: number | null;
  token_total: number | null;
  estimated_cost_cents: number | null;
  currency: string;
  error_category: string | null;
  error_message: string | null;
  result_manuscript: string | null;
  idempotency_key: string;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  created_at: string;
}

export default function EditSubmissionPage() {
  const params = useParams();
  const submissionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    proposedType: "",
    proposedTitle: "",
    proposedSlug: "",
    manuscript: "",
    dek: "",
    status: "draft",
    submitterType: "human",
    reviewerNotes: "",
    resultWorkId: "",
  });

  const [contributions, setContributions] = useState<ContributionData[]>([]);
  const [editingContribution, setEditingContribution] = useState<Partial<ContributionData> | null>(null);
  const [contribError, setContribError] = useState<string | null>(null);

  const [genForm, setGenForm] = useState({
    provider: "mock",
    model: "mock-v1",
    submissionBrief: "",
  });
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genSuccess, setGenSuccess] = useState<string | null>(null);
  const [genHistory, setGenHistory] = useState<GenerationRequestData[]>([]);

  useEffect(() => {
    async function loadSubmission() {
      try {
        const res = await fetch(`/api/admin/submissions/${submissionId}`);
        if (!res.ok) throw new Error("Submission tidak ditemui.");
        const sub: SubmissionData = await res.json();

        setForm({
          proposedType: sub.proposed_type || "",
          proposedTitle: sub.proposed_title || "",
          proposedSlug: sub.proposed_slug || "",
          manuscript: sub.manuscript || "",
          dek: sub.dek || "",
          status: sub.status,
          submitterType: sub.submitter_type,
          reviewerNotes: sub.reviewer_notes || "",
          resultWorkId: sub.result_work_id || "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ralat memuatkan submission.");
      } finally {
        setLoading(false);
      }
    }

    loadSubmission();
    loadContributions();
    loadGenerationHistory();
  }, [submissionId]);

  async function loadContributions() {
    try {
      const res = await fetch(`/api/admin/contributions?submissionId=${submissionId}`);
      if (res.ok) {
        setContributions(await res.json());
      }
    } catch {
      // Ignore
    }
  }

  async function loadGenerationHistory() {
    try {
      const res = await fetch(`/api/admin/generate/history?submissionId=${submissionId}`);
      if (res.ok) {
        setGenHistory(await res.json());
      }
    } catch {
      // Ignore
    }
  }

  async function handleGenerate() {
    if (!genForm.submissionBrief.trim()) {
      setGenError("Arahan/brief diperlukan.");
      return;
    }
    setGenerating(true);
    setGenError(null);
    setGenSuccess(null);

    try {
      const res = await fetch("/api/admin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: Number(submissionId),
          provider: genForm.provider,
          model: genForm.model,
          submissionBrief: genForm.submissionBrief,
          submissionTitle: form.proposedTitle,
          workType: form.proposedType || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal menjana.");
      }

      if (data.status === "succeeded") {
        setGenSuccess(`Penjanaan berjaya. ID: ${data.requestId}`);
        // Refresh submission data to show new manuscript
        const subRes = await fetch(`/api/admin/submissions/${submissionId}`);
        if (subRes.ok) {
          const sub = await subRes.json();
          setForm((prev) => ({ ...prev, manuscript: sub.manuscript || prev.manuscript }));
        }
      } else {
        setGenError(`Penjanaan gagal: ${data.errorMessage || "Ralat tidak diketahui."}`);
      }

      loadGenerationHistory();
      loadContributions();
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/submissions/${submissionId}`, {
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

  async function handleSaveContribution() {
    if (!editingContribution) return;
    setContribError(null);

    try {
      if (editingContribution.id) {
        const res = await fetch(`/api/admin/contributions/${editingContribution.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingContribution),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Gagal menyimpan sumbangan.");
        }
      } else {
        const res = await fetch("/api/admin/contributions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...editingContribution,
            submissionId: Number(submissionId),
            sortOrder: contributions.length + 1,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Gagal mencipta sumbangan.");
        }
      }

      setEditingContribution(null);
      loadContributions();
    } catch (err) {
      setContribError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function handleDeleteContribution(id: number) {
    if (!confirm("Pasti ingin memadam sumbangan ini?")) return;

    try {
      const res = await fetch(`/api/admin/contributions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal memadam sumbangan.");
      }
      loadContributions();
    } catch (err) {
      setContribError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <p>Memuatkan submission...</p>
      </div>
    );
  }

  return (
    <div className="admin-form-page">
      <header className="admin-page-header">
        <div className="admin-page-header-row">
          <div>
            <h1>Edit Submission</h1>
            <p className="admin-page-sub">ID: {submissionId}</p>
          </div>
          <a href="/admin/submissions" className="admin-btn admin-btn-outline">
            Kembali
          </a>
        </div>
      </header>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}
      {success && <div className="admin-alert admin-alert-success">{success}</div>}

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

        <div className="admin-form-group">
          <label htmlFor="reviewerNotes">Nota Penyunting</label>
          <textarea
            id="reviewerNotes"
            value={form.reviewerNotes}
            onChange={(e) => setForm((prev) => ({ ...prev, reviewerNotes: e.target.value }))}
            rows={4}
            className="admin-textarea"
          />
        </div>

        <div className="admin-form-group">
          <label htmlFor="resultWorkId">Work ID (selepas kelulusan)</label>
          <input
            id="resultWorkId"
            type="text"
            value={form.resultWorkId}
            onChange={(e) => setForm((prev) => ({ ...prev, resultWorkId: e.target.value }))}
            placeholder="JLN-CER-XXXX"
          />
        </div>

        <div className="admin-form-actions">
          <a href="/admin/submissions" className="admin-btn admin-btn-outline">
            Kembali
          </a>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>

      <section className="admin-section" style={{ marginTop: "2rem" }}>
        <div className="admin-credits-header">
          <h3>Sumbangan</h3>
          <button
            type="button"
            className="admin-btn admin-btn-sm admin-btn-primary"
            onClick={() => setEditingContribution({
              contributor_slug: "",
              guest_name: "",
              role_key: "",
              role_label: "",
              ai_provider: "",
              ai_model: "",
              ai_persona: "",
              ai_actual_role: "",
              ai_identity_source: "unknown",
            })}
          >
            + Tambah Sumbangan
          </button>
        </div>

        {contribError && <div className="admin-alert admin-alert-error">{contribError}</div>}

        {editingContribution && (
          <div className="admin-credit-form">
            <div className="admin-section" style={{ marginBottom: "1rem", padding: "0.75rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px" }}>
              <h4 style={{ margin: "0 0 0.25rem", fontSize: "0.85rem", color: "#166534" }}>Identiti Awam (Paparan kepada pembaca)</h4>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#15803d" }}>
                Bahagian ini menentukan nama dan peranan yang DIPAPARKAN kepada pembaca. Identiti teknikal AI TIDAK akan didedahkan.
              </p>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Persona / Nama Awam</label>
                <input
                  type="text"
                  value={editingContribution.ai_persona || editingContribution.guest_name || ""}
                  onChange={(e) => setEditingContribution((prev) => ({
                    ...prev,
                    ai_persona: e.target.value || undefined,
                    guest_name: e.target.value || undefined,
                  }))}
                  placeholder="Contoh: Rafiq Naim, Nara Zahin, Amir Syafiq"
                />
                <span className="admin-form-hint">Nama yang akan dipaparkan dalam kredit awam</span>
              </div>
              <div className="admin-form-group">
                <label>Peranan Awam</label>
                <input
                  type="text"
                  value={editingContribution.role_label || ""}
                  onChange={(e) => setEditingContribution((prev) => ({
                    ...prev,
                    role_label: e.target.value,
                  }))}
                  placeholder="Contoh: Penulis, Penyunting, Penyemak"
                />
              </div>
              <div className="admin-form-group">
                <label>Kredit Awam (Cadangan)</label>
                <input
                  type="text"
                  value={editingContribution.suggested_public_credit || ""}
                  onChange={(e) => setEditingContribution((prev) => ({
                    ...prev,
                    suggested_public_credit: e.target.value || undefined,
                  }))}
                  placeholder="Teks kredit yang dicadangkan"
                />
                <span className="admin-form-hint" style={{ color: "#b45309" }}>
                  Cadangan sahaja — TIDAK akan menjadi kredit muktamad secara automatik
                </span>
              </div>
            </div>

            <div className="admin-section" style={{ margin: "1rem 0", padding: "0.75rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px" }}>
              <h4 style={{ margin: "0 0 0.25rem", fontSize: "0.85rem", color: "#991b1b" }}>Identiti Dalaman (Admin sahaja — TIDAK didedahkan kepada awam)</h4>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#b91c1c" }}>
                Maklumat teknikal AI hanya untuk rujukan admin. Provider/model/tool TIDAK akan sesekali muncul di laman awam.
              </p>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Penyumbang Slug</label>
                <input
                  type="text"
                  value={editingContribution.contributor_slug || ""}
                  onChange={(e) => setEditingContribution((prev) => ({
                    ...prev,
                    contributor_slug: e.target.value || undefined,
                  }))}
                />
              </div>
              <div className="admin-form-group">
                <label>Peranan Key</label>
                <input
                  type="text"
                  value={editingContribution.role_key || ""}
                  onChange={(e) => setEditingContribution((prev) => ({
                    ...prev,
                    role_key: e.target.value || undefined,
                  }))}
                />
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>AI Provider</label>
                <input
                  type="text"
                  value={editingContribution.ai_provider || ""}
                  onChange={(e) => setEditingContribution((prev) => ({
                    ...prev,
                    ai_provider: e.target.value || undefined,
                  }))}
                />
              </div>
              <div className="admin-form-group">
                <label>AI Model</label>
                <input
                  type="text"
                  value={editingContribution.ai_model || ""}
                  onChange={(e) => setEditingContribution((prev) => ({
                    ...prev,
                    ai_model: e.target.value || undefined,
                  }))}
                />
              </div>
              <div className="admin-form-group">
                <label>AI Peranan Sebenar</label>
                <input
                  type="text"
                  value={editingContribution.ai_actual_role || ""}
                  onChange={(e) => setEditingContribution((prev) => ({
                    ...prev,
                    ai_actual_role: e.target.value || undefined,
                  }))}
                />
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Sumber Identiti</label>
                <select
                  value={editingContribution.ai_identity_source || "unknown"}
                  onChange={(e) => setEditingContribution((prev) => ({
                    ...prev,
                    ai_identity_source: e.target.value,
                  }))}
                >
                  <option value="unknown">Unknown</option>
                  <option value="runtime_verified">Runtime Verified</option>
                  <option value="self_reported">Self Reported</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
            </div>

            <div className="admin-form-actions">
              <button type="button" className="admin-btn admin-btn-outline" onClick={() => setEditingContribution(null)}>
                Batal
              </button>
              <button type="button" className="admin-btn admin-btn-primary" onClick={handleSaveContribution}>
                Simpan Sumbangan
              </button>
            </div>
          </div>
        )}

        {contributions.length === 0 ? (
          <p className="admin-table-empty">Tiada sumbangan untuk submission ini.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Identiti Awam</th>
                  <th>Peranan</th>
                  <th>Kredit Awam</th>
                  <th>Identiti Dalaman</th>
                  <th>Sumber</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {contributions.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.ai_persona || c.guest_name || c.contributor_slug || "—"}</strong>
                    </td>
                    <td>{c.role_label}</td>
                    <td>
                      <span style={{ fontSize: "0.85em", color: "#6b7280" }}>
                        {c.suggested_public_credit || "—"}
                      </span>
                      {c.suggested_public_credit && (
                        <span style={{ fontSize: "0.75em", color: "#b45309", marginLeft: "4px" }}>(cadangan)</span>
                      )}
                    </td>
                    <td>
                      {c.ai_provider ? (
                        <span style={{ fontSize: "0.8em", color: "#6b7280" }}>
                          {c.ai_provider}/{c.ai_model || "?"}
                          {c.ai_actual_role && <span style={{ color: "#9ca3af" }}> ({c.ai_actual_role})</span>}
                        </span>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`admin-kind admin-kind-${c.ai_identity_source === "runtime_verified" ? "human" : c.ai_identity_source === "manual" ? "organization" : "virtual"}`}>
                        {c.ai_identity_source}
                      </span>
                    </td>
                    <td>
                      <div className="admin-table-actions">
                        <button type="button" className="admin-btn admin-btn-sm" onClick={() => setEditingContribution(c)}>
                          Edit
                        </button>
                        <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => handleDeleteContribution(c.id)}>
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
      </section>

      <section className="admin-section" style={{ marginTop: "2rem" }}>
        <div className="admin-credits-header">
          <h3>Penjanaan AI</h3>
        </div>

        <div className="admin-section" style={{ marginBottom: "1rem", padding: "0.75rem", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px" }}>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#1e40af" }}>
            Penjanaan akan mencipta draf submission baharu. Tidak akan mewujudkan Work atau menerbitkan secara automatik.
          </p>
        </div>

        {genError && <div className="admin-alert admin-alert-error">{genError}</div>}
        {genSuccess && <div className="admin-alert admin-alert-success">{genSuccess}</div>}

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="genProvider">Provider</label>
            <select
              id="genProvider"
              value={genForm.provider}
              onChange={(e) => {
                const provider = e.target.value;
                setGenForm((prev) => ({
                  ...prev,
                  provider,
                  model: provider === "openai" ? "gpt-4o-mini" : provider === "mock" ? "mock-v1" : prev.model,
                }));
              }}
            >
              <option value="mock">Mock (Ujian)</option>
              <option value="openai">OpenAI</option>
            </select>
          </div>

          <div className="admin-form-group">
            <label htmlFor="genModel">Model</label>
            <select
              id="genModel"
              value={genForm.model}
              onChange={(e) => setGenForm((prev) => ({ ...prev, model: e.target.value }))}
            >
              {genForm.provider === "mock" && (
                <option value="mock-v1">mock-v1</option>
              )}
              {genForm.provider === "openai" && (
                <>
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gpt-4-turbo">gpt-4-turbo</option>
                </>
              )}
            </select>
          </div>
        </div>

        <div className="admin-form-group">
          <label htmlFor="genBrief">Arahan / Brief</label>
          <textarea
            id="genBrief"
            value={genForm.submissionBrief}
            onChange={(e) => setGenForm((prev) => ({ ...prev, submissionBrief: e.target.value }))}
            rows={4}
            className="admin-textarea"
            placeholder="Nyatakan konsep, tema, atau arahan untuk penjanaan draf..."
          />
        </div>

        <div className="admin-form-actions">
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? "Menjana..." : "Jana Draf"}
          </button>
        </div>

        {genHistory.length > 0 && (
          <div style={{ marginTop: "1.5rem" }}>
            <h4 style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>Sejarah Penjanaan</h4>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Provider</th>
                    <th>Model</th>
                    <th>Status</th>
                    <th>Tokens</th>
                    <th>Masa</th>
                    <th>Ralat</th>
                  </tr>
                </thead>
                <tbody>
                  {genHistory.map((g) => (
                    <tr key={g.id}>
                      <td>{g.id}</td>
                      <td>{g.provider}</td>
                      <td>{g.model}</td>
                      <td>
                        <span className={`admin-kind admin-kind-${g.status === "succeeded" ? "human" : g.status === "failed" ? "organization" : "virtual"}`}>
                          {g.status}
                        </span>
                      </td>
                      <td>{g.token_total ?? "—"}</td>
                      <td>{g.completed_at ? new Date(g.completed_at).toLocaleString("ms-MY") : g.started_at ? "Berjalan..." : "—"}</td>
                      <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {g.error_message || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
