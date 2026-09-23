"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

const VISUAL_ROLES = [
  { value: "hero", label: "Hero" },
  { value: "inline", label: "Inline" },
  { value: "section", label: "Section" },
  { value: "decorative", label: "Decorative" },
];

const ASPECT_RATIOS = [
  { value: "3:2", label: "3:2" },
  { value: "2:3", label: "2:3" },
  { value: "1:1", label: "1:1" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
];

const PLACES = [
  { value: "before", label: "Before" },
  { value: "after", label: "After" },
];

const GENERATION_STATUSES = [
  { value: "draft", label: "Draf" },
  { value: "pending", label: "Menunggu" },
  { value: "queued", label: "Dalam Barisan" },
  { value: "generating", label: "Menjana" },
  { value: "generated", label: "Dijana" },
  { value: "failed", label: "Gagal" },
  { value: "under_review", label: "Semakan" },
  { value: "approved", label: "Diluluskan" },
  { value: "rejected", label: "Ditolak" },
  { value: "attached", label: "Dipaut" },
];

const APPROVAL_STATES = [
  { value: "pending", label: "Menunggu" },
  { value: "approved", label: "Diluluskan" },
  { value: "rejected", label: "Ditolak" },
];

const PROVIDERS = [
  { value: "magnific", label: "Magnific" },
  { value: "mock", label: "Mock (Test)" },
];

const MAGNIFIC_MODELS = [
  { value: "", label: "default (flexible)" },
  { value: "flexible", label: "flexible — illustrations" },
  { value: "fluid", label: "fluid" },
  { value: "realism", label: "realism" },
  { value: "zen", label: "zen" },
  { value: "super_real", label: "super_real" },
  { value: "editorial_portraits", label: "editorial_portraits" },
];

const EXECUTION_MODES: Record<string, string> = {
  magnific_api: "Magnific API",
  magnific_connector: "Magnific Connector",
};

interface VisualAttemptEntry {
  at?: string;
  mode?: string;
  taskId?: string | null;
  status?: string;
  webhookId?: string;
  errorCategory?: string | null;
}

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
  requested_by: string;
  approved_by: string | null;
  error_category: string | null;
  error_message: string | null;
  retry_count: number;
  idempotency_key: string | null;
  aspect_ratio: string;
  model: string | null;
  prompt_composed: string | null;
  asset_width: number | null;
  asset_height: number | null;
  asset_mime_type: string | null;
  asset_finalized: boolean;
  execution_mode: string | null;
  attempt_history: VisualAttemptEntry[] | string | null;
  last_webhook_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
}

function parseAttempts(raw: VisualAttemptEntry[] | string | null): VisualAttemptEntry[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
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
    status: "draft",
    sourceAssetUrl: "",
    sourceAssetPath: "",
    altText: "",
    anchor: "",
    place: "after",
    approvalState: "pending",
    aspectRatio: "3:2",
    model: "",
  });

  const [record, setRecord] = useState<VisualRequestData | null>(null);
  const [genProvider, setGenProvider] = useState("mock");
  const [genModel, setGenModel] = useState("");
  const [genOverride, setGenOverride] = useState("");
  const [generating, setGenerating] = useState(false);
  const [polling, setPolling] = useState(false);
  const [approving, setApproving] = useState(false);
  const [attaching, setAttaching] = useState(false);

  useEffect(() => {
    async function loadRequest() {
      try {
        const res = await fetch(`/api/admin/visual-requests/${requestId}`);
        if (!res.ok) throw new Error("Visual request tidak ditemui.");
        const r: VisualRequestData = await res.json();
        setRecord(r);

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
          aspectRatio: r.aspect_ratio || "3:2",
          model: r.model || "",
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

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/visual-requests/${requestId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: genProvider,
          model: genModel || undefined,
          editorialOverride: genOverride || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menjana visual.");
      if (data.pendingTask) {
        setSuccess(
          `Tugas dihantar (status: ${data.status}, task: ${data.providerRequestId || "-"}). Menunggu completion via webhook/poll/connector.`
        );
      } else {
        setSuccess(
          `Penjanaan selesai — status: ${data.status}.` + (data.errorMessage ? ` ${data.errorMessage}` : "")
        );
      }
      // Reload to get fresh state
      const refreshed = await fetch(`/api/admin/visual-requests/${requestId}`);
      if (refreshed.ok) {
        const r: VisualRequestData = await refreshed.json();
        setRecord(r);
        setForm((prev) => ({
          ...prev,
          status: r.status,
          approvalState: r.approval_state,
          providerRequestId: r.provider_request_id || "",
          providerCreationId: r.provider_creation_id || "",
          sourceAssetUrl: r.source_asset_url || "",
          sourceAssetPath: r.source_asset_path || "",
          model: r.model || "",
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setGenerating(false);
    }
  }

  async function handlePoll() {
    setPolling(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/visual-requests/${requestId}/poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: record?.provider || "magnific" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Poll gagal.");
      if (data.pendingTask || data.status === "generating" || data.status === "queued") {
        setSuccess("Tugas masih dalam proses. Cuba poll semula sebentar lagi.");
      } else {
        setSuccess(`Status kini: ${data.status}.` + (data.errorMessage ? ` ${data.errorMessage}` : ""));
      }
      const refreshed = await fetch(`/api/admin/visual-requests/${requestId}`);
      if (refreshed.ok) {
        const r: VisualRequestData = await refreshed.json();
        setRecord(r);
        setForm((prev) => ({
          ...prev,
          status: r.status,
          approvalState: r.approval_state,
          providerRequestId: r.provider_request_id || "",
          providerCreationId: r.provider_creation_id || "",
          sourceAssetUrl: r.source_asset_url || "",
          sourceAssetPath: r.source_asset_path || "",
          model: r.model || "",
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setPolling(false);
    }
  }

  async function handleApprove() {
    setApproving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/visual-requests/${requestId}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal meluluskan.");
      setSuccess("Visual diluluskan.");
      const refreshed = await fetch(`/api/admin/visual-requests/${requestId}`);
      if (refreshed.ok) {
        const r: VisualRequestData = await refreshed.json();
        setRecord(r);
        setForm((prev) => ({ ...prev, status: r.status, approvalState: r.approval_state }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!confirm("Pasti ingin menolak visual ini?")) return;
    setApproving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/visual-requests/${requestId}/reject`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menolak.");
      setSuccess("Visual ditolak.");
      const refreshed = await fetch(`/api/admin/visual-requests/${requestId}`);
      if (refreshed.ok) {
        const r: VisualRequestData = await refreshed.json();
        setRecord(r);
        setForm((prev) => ({ ...prev, status: r.status, approvalState: r.approval_state }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setApproving(false);
    }
  }

  async function handleAttach() {
    if (!confirm("Pautkan visual ini ke Work? Work TIDAK akan diterbitkan secara automatik.")) return;
    setAttaching(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/visual-requests/${requestId}/attach`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memautkan.");
      setSuccess(`Visual dipautkan (visual ID: ${data.visualId}).`);
      const refreshed = await fetch(`/api/admin/visual-requests/${requestId}`);
      if (refreshed.ok) {
        const r: VisualRequestData = await refreshed.json();
        setRecord(r);
        setForm((prev) => ({ ...prev, status: r.status }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setAttaching(false);
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

      {/* Generation Status vs Editorial Approval — clearly separated */}
      {record && (
        <div className="admin-form" style={{ marginBottom: 24, padding: 16, border: "1px solid var(--border, #ddd)", borderRadius: 8 }}>
          {/* Three clearly separated lifecycle panels */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div>
              <h3 style={{ margin: "0 0 8px", fontSize: 14, textTransform: "uppercase", opacity: 0.7 }}>1. Generation</h3>
              <p style={{ margin: 0 }}>
                <strong>{record.status}</strong>
                {record.error_category && (
                  <span style={{ color: "#c0392b" }}> — {record.error_category}: {record.error_message}</span>
                )}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.7 }}>
                Mode: {EXECUTION_MODES[record.execution_mode || "magnific_api"] || record.execution_mode || "magnific_api"}
              </p>
              {record.provider_request_id && (
                <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.7 }}>Task: {record.provider_request_id}</p>
              )}
              {record.provider_creation_id && (
                <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.7 }}>Creation: {record.provider_creation_id}</p>
              )}
              {record.asset_width && record.asset_height && (
                <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.7 }}>
                  {record.asset_width}×{record.asset_height} {record.asset_mime_type}
                </p>
              )}
              <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.7 }}>
                Asset:{" "}
                {record.asset_finalized
                  ? "Stabil (final)"
                  : "Belum stabil — tidak boleh dipaut"}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.7 }}>
                Percubaan: {record.retry_count}
                {record.last_webhook_id ? " · webhook diterima" : ""}
              </p>
            </div>
            <div>
              <h3 style={{ margin: "0 0 8px", fontSize: 14, textTransform: "uppercase", opacity: 0.7 }}>
                2. Editorial Review
              </h3>
              <p style={{ margin: 0 }}>
                <strong>{record.approval_state}</strong>
              </p>
              {record.approved_by && (
                <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.7 }}>Oleh: {record.approved_by}</p>
              )}
              <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.7 }}>
                {record.status === "under_review"
                  ? "Menunggu kelulusan editor"
                  : record.status === "approved"
                    ? "Diluluskan — belum dipaut"
                    : record.status === "attached"
                      ? "Sudah dipaut"
                      : "Bukan status kelulusan"}
              </p>
            </div>
            <div>
              <h3 style={{ margin: "0 0 8px", fontSize: 14, textTransform: "uppercase", opacity: 0.7 }}>
                3. Attachment
              </h3>
              <p style={{ margin: 0 }}>
                <strong>{record.status === "attached" ? "attached" : "unattached"}</strong>
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.7 }}>
                Work: {record.work_id || "-"}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.7 }}>
                Src kanonik: {record.source_asset_path || "(belum ada)"}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.7 }}>
                Pautan ≠ penerbitan
              </p>
            </div>
          </div>

          {/* Attempt history (internal) */}
          {parseAttempts(record.attempt_history).length > 0 && (
            <details style={{ marginTop: 12 }}>
              <summary style={{ fontSize: 12, opacity: 0.7, cursor: "pointer" }}>
                Sejarah percubaan ({parseAttempts(record.attempt_history).length})
              </summary>
              <ul style={{ fontSize: 12, marginTop: 8 }}>
                {parseAttempts(record.attempt_history).map((a, i) => (
                  <li key={i}>
                    {a.at || "-"} · {a.mode || "-"} · {a.status || "-"}
                    {a.taskId ? ` · task ${a.taskId}` : ""}
                    {a.errorCategory ? ` · ${a.errorCategory}` : ""}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* Preview — stable path preferred; provider URL only as internal fallback display */}
          {(record.source_asset_path || record.source_asset_url) && (
            <div style={{ marginTop: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={record.source_asset_path || record.source_asset_url || ""}
                alt={record.alt_text || "Preview visual"}
                style={{ maxWidth: "100%", maxHeight: 320, borderRadius: 6 }}
              />
              {!record.asset_finalized && (
                <p style={{ fontSize: 12, color: "#c0392b", margin: "6px 0 0" }}>
                  Preview sementara (provider URL) — asset belum final, tidak boleh dipaut.
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            {["draft", "pending", "generated", "failed", "rejected"].includes(record.status) && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <select value={genProvider} onChange={(e) => setGenProvider(e.target.value)} style={{ padding: "6px 10px" }}>
                  {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <select value={genModel} onChange={(e) => setGenModel(e.target.value)} style={{ padding: "6px 10px" }}>
                  {MAGNIFIC_MODELS.map((m) => (
                    <option key={m.value || "default"} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={genOverride}
                  onChange={(e) => setGenOverride(e.target.value)}
                  placeholder="Editorial override (optional)"
                  style={{ padding: "6px 10px", width: 220 }}
                />
                <button type="button" onClick={handleGenerate} className="admin-btn admin-btn-primary" disabled={generating}>
                  {generating ? "Menjana..." : "Generate"}
                </button>
              </div>
            )}

            {["queued", "generating"].includes(record.status) && (
              <button type="button" onClick={handlePoll} className="admin-btn admin-btn-outline" disabled={polling}>
                {polling ? "Polling..." : "Poll Task"}
              </button>
            )}

            {["under_review", "generated"].includes(record.status) && (record.source_asset_url || record.source_asset_path) && (
              <>
                <button type="button" onClick={handleApprove} className="admin-btn admin-btn-primary" disabled={approving}>
                  {approving ? "Memproses..." : "Approve"}
                </button>
                <button type="button" onClick={handleReject} className="admin-btn admin-btn-danger" disabled={approving}>
                  Reject
                </button>
              </>
            )}

            {record.status === "approved" && record.work_id && (
              <button type="button" onClick={handleAttach} className="admin-btn admin-btn-primary" disabled={attaching || !record.asset_finalized}>
                {attaching ? "Memautkan..." : record.asset_finalized ? "Attach to Work" : "Attach (asset belum final)"}
              </button>
            )}
          </div>
        </div>
      )}

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
            <select
              id="provider"
              value={form.provider}
              onChange={(e) => setForm((prev) => ({ ...prev, provider: e.target.value }))}
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="admin-form-group">
            <label htmlFor="aspectRatio">Aspect Ratio</label>
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
            <label htmlFor="status">Status (Generation)</label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            >
              {GENERATION_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="admin-form-group">
            <label htmlFor="approvalState">Kelulusan (Editorial)</label>
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

          <div className="admin-form-group">
            <label htmlFor="model">Model</label>
            <select
              id="model"
              value={form.model || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
            >
              {MAGNIFIC_MODELS.map((m) => (
                <option key={m.value || "default"} value={m.value}>{m.label}</option>
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
        {form.model !== undefined && (
            <div className="admin-form-group">
              <label htmlFor="executionMode">Execution Mode</label>
              <input
                id="executionMode"
                type="text"
                value={EXECUTION_MODES[record?.execution_mode || "magnific_api"] || record?.execution_mode || "magnific_api"}
                readOnly
                style={{ opacity: 0.7 }}
              />
            </div>
          )}
        </div>

        <div className="admin-form-group">
          <label htmlFor="sourceAssetUrl">Source Asset URL (provenance sahaja)</label>
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
