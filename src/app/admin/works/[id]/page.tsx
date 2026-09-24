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

/** Statuses selectable in the metadata dropdown (published only via explicit Publish). */
const EDITABLE_STATUSES = STATUSES.filter((s) => s.value !== "published");

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
  published_by?: string | null;
  updated_at: string;
}

interface ReadinessIssue {
  code: string;
  message: string;
}

interface ReadinessGate {
  pass: boolean;
  blockers: ReadinessIssue[];
  warnings: ReadinessIssue[];
}

interface ReadinessData {
  ready: boolean;
  blockers: ReadinessIssue[];
  warnings: ReadinessIssue[];
  gates: Record<"content" | "credits" | "visuals" | "privacy" | "rights" | "workflow", ReadinessGate>;
  checkedAt: string;
}

interface CreditData {
  id: number;
  work_id: string;
  contributor_slug: string | null;
  guest_name: string | null;
  role_label: string;
  byline: boolean;
  is_public: boolean;
  sort_order: number;
}

interface ContributorOption {
  slug: string;
  display_name: string;
}

interface VisualData {
  id: number;
  work_id: string;
  role: string;
  src: string;
  alt: string | null;
  provider: string | null;
  creation_id: string | null;
  anchor: string | null;
  place: string;
  sort_order: number;
}

interface GlossaryData {
  id: number;
  work_id: string;
  term: string;
  meaning: string;
  source: string;
  sort_order: number;
}

type Tab = "content" | "metadata" | "credits" | "visuals" | "glossary" | "source";

const DERIVATIVE_TYPES = new Set(["terjemahan", "fragmen", "sinopsis"]);

const RIGHTS_STATUS_OPTIONS = [
  { value: "unknown", label: "Belum diketahui" },
  { value: "needs_review", label: "Perlu semakan" },
  { value: "public_domain", label: "Domain awam" },
  { value: "licensed", label: "Berlesen" },
  { value: "permission_obtained", label: "Kebenaran diperoleh" },
  { value: "restricted", label: "Disekat" },
  { value: "rejected", label: "Ditolak" },
];

interface SourceRightsData {
  workId: string;
  isDerivative: boolean;
  sourceWork: {
    id: number;
    originalTitle: string | null;
    author: string | null;
    originalLanguage: string | null;
    publicationYear: number | null;
    sourceEdition: string | null;
    sourceUrl: string | null;
    sourceLocator: string | null;
    sourceTextBasis: string | null;
    rightsStatus: string;
    rightsNotes: string | null;
    rightsEvidence: string | null;
    reviewedAt: string | null;
    reviewedBy: string | null;
    updatedAt: string;
  } | null;
  rightsHistory: {
    at: string;
    actor: string;
    action: string;
    rights_status: string;
    note?: string;
  }[];
  rightsReady: boolean;
  rightsBlockers: ReadinessIssue[];
}

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

  const [visuals, setVisuals] = useState<VisualData[]>([]);
  const [editingVisual, setEditingVisual] = useState<Partial<VisualData> | null>(null);
  const [visualError, setVisualError] = useState<string | null>(null);

  const [glossaryTerms, setGlossaryTerms] = useState<GlossaryData[]>([]);
  const [editingGlossary, setEditingGlossary] = useState<Partial<GlossaryData> | null>(null);
  const [glossaryError, setGlossaryError] = useState<string | null>(null);

  const [publishPreview, setPublishPreview] = useState<{
    isNew: boolean;
    currentExists: boolean;
    metadataChanged: boolean;
    bodyChanged: boolean;
  } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessError, setReadinessError] = useState<string | null>(null);

  const [sourceRights, setSourceRights] = useState<SourceRightsData | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [sourceSuccess, setSourceSuccess] = useState<string | null>(null);
  const [sourceSaving, setSourceSaving] = useState(false);
  const [sourceForm, setSourceForm] = useState({
    originalTitle: "",
    author: "",
    originalLanguage: "",
    publicationYear: "",
    sourceEdition: "",
    sourceUrl: "",
    sourceLocator: "",
    sourceTextBasis: "",
    rightsNotes: "",
    rightsEvidence: "",
    rightsStatus: "needs_review",
  });

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
    loadVisuals();
    loadGlossary();
    loadReadiness();
    loadSourceRights();
  }, [workId]);

  async function loadSourceRights() {
    setSourceLoading(true);
    setSourceError(null);
    try {
      const res = await fetch(`/api/admin/works/${workId}/source-rights`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal memuatkan provenance sumber.");
      }
      const data: SourceRightsData = await res.json();
      setSourceRights(data);
      if (data.sourceWork) {
        setSourceForm({
          originalTitle: data.sourceWork.originalTitle || "",
          author: data.sourceWork.author || "",
          originalLanguage: data.sourceWork.originalLanguage || "",
          publicationYear: data.sourceWork.publicationYear?.toString() || "",
          sourceEdition: data.sourceWork.sourceEdition || "",
          sourceUrl: data.sourceWork.sourceUrl || "",
          sourceLocator: data.sourceWork.sourceLocator || "",
          sourceTextBasis: data.sourceWork.sourceTextBasis || "",
          rightsNotes: data.sourceWork.rightsNotes || "",
          rightsEvidence: data.sourceWork.rightsEvidence || "",
          rightsStatus: data.sourceWork.rightsStatus || "needs_review",
        });
      }
    } catch (err) {
      setSourceError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setSourceLoading(false);
    }
  }

  async function handleSaveProvenance() {
    setSourceSaving(true);
    setSourceError(null);
    setSourceSuccess(null);
    try {
      const res = await fetch(`/api/admin/works/${workId}/source-rights`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalTitle: sourceForm.originalTitle || null,
          author: sourceForm.author || null,
          originalLanguage: sourceForm.originalLanguage || null,
          publicationYear: sourceForm.publicationYear ? Number(sourceForm.publicationYear) : null,
          sourceEdition: sourceForm.sourceEdition || null,
          sourceUrl: sourceForm.sourceUrl || null,
          sourceLocator: sourceForm.sourceLocator || null,
          sourceTextBasis: sourceForm.sourceTextBasis || null,
          rightsNotes: sourceForm.rightsNotes || null,
          rightsEvidence: sourceForm.rightsEvidence || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan provenance.");
      setSourceSuccess(
        data.invalidatedApproval
          ? "Provenance disimpan — kelulusan hak direset ke needs_review kerana material berubah."
          : "Provenance disimpan."
      );
      await loadSourceRights();
      await loadReadiness();
      setTimeout(() => setSourceSuccess(null), 5000);
    } catch (err) {
      setSourceError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setSourceSaving(false);
    }
  }

  async function handleRightsReview() {
    setSourceSaving(true);
    setSourceError(null);
    setSourceSuccess(null);
    try {
      const res = await fetch(`/api/admin/works/${workId}/source-rights/rights-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rights_status: sourceForm.rightsStatus,
          rights_notes: sourceForm.rightsNotes || null,
          rights_evidence: sourceForm.rightsEvidence || null,
          originalTitle: sourceForm.originalTitle || null,
          author: sourceForm.author || null,
          originalLanguage: sourceForm.originalLanguage || null,
          publicationYear: sourceForm.publicationYear ? Number(sourceForm.publicationYear) : null,
          sourceEdition: sourceForm.sourceEdition || null,
          sourceUrl: sourceForm.sourceUrl || null,
          sourceLocator: sourceForm.sourceLocator || null,
          sourceTextBasis: sourceForm.sourceTextBasis || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyemak hak.");
      setSourceSuccess(
        `Semakan hak direkod (oleh ${data.sourceWork?.reviewedBy ?? "admin"}).`
      );
      await loadSourceRights();
      await loadReadiness();
      setTimeout(() => setSourceSuccess(null), 5000);
    } catch (err) {
      setSourceError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setSourceSaving(false);
    }
  }

  async function loadReadiness() {
    setReadinessLoading(true);
    setReadinessError(null);
    try {
      const res = await fetch(`/api/admin/works/${workId}/publication-readiness`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal menyemak kesediaan terbit.");
      }
      setReadiness(await res.json());
    } catch (err) {
      setReadinessError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setReadinessLoading(false);
    }
  }

  async function handleExplicitPublish() {
    if (!confirm("Terbitkan karya ini secara eksplisit? Tindakan ini menetapkan status published.")) return;
    setPublishing(true);
    setPublishError(null);
    setPublishSuccess(null);
    try {
      const res = await fetch(`/api/admin/works/${workId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menerbitkan.");
      }
      setPublishSuccess(
        data.alreadyPublished
          ? "Karya ini sudah pun diterbitkan (idempoten)."
          : `Berjaya diterbitkan pada ${data.publishedAt ?? "—"}.`
      );
      const workRes = await fetch(`/api/admin/works/${workId}`);
      if (workRes.ok) {
        const work: WorkData = await workRes.json();
        setForm((prev) => ({ ...prev, status: work.status }));
      }
      await loadReadiness();
      setTimeout(() => setPublishSuccess(null), 5000);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
      await loadReadiness();
    } finally {
      setPublishing(false);
    }
  }

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

  async function loadVisuals() {
    try {
      const res = await fetch(`/api/admin/visuals?workId=${workId}`);
      if (res.ok) {
        setVisuals(await res.json());
      }
    } catch {
      // Ignore visual loading errors
    }
  }

  async function loadGlossary() {
    try {
      const res = await fetch(`/api/admin/glossary?workId=${workId}`);
      if (res.ok) {
        setGlossaryTerms(await res.json());
      }
    } catch {
      // Ignore glossary loading errors
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
      await loadReadiness();
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

  async function handleSaveVisual() {
    if (!editingVisual) return;

    setVisualError(null);

    try {
      if (editingVisual.id) {
        // Update existing visual
        const res = await fetch(`/api/admin/visuals/${editingVisual.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingVisual),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Gagal menyimpan visual.");
        }
      } else {
        // Create new visual
        const res = await fetch("/api/admin/visuals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...editingVisual,
            workId,
            sortOrder: visuals.length + 1,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Gagal mencipta visual.");
        }
      }

      setEditingVisual(null);
      loadVisuals();
    } catch (err) {
      setVisualError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function handleDeleteVisual(id: number) {
    if (!confirm("Pasti ingin memadam visual ini?")) return;

    try {
      const res = await fetch(`/api/admin/visuals/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal memadam visual.");
      }

      loadVisuals();
    } catch (err) {
      setVisualError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function handleSaveGlossary() {
    if (!editingGlossary) return;

    setGlossaryError(null);

    try {
      if (editingGlossary.id) {
        // Update existing term
        const res = await fetch(`/api/admin/glossary/${editingGlossary.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingGlossary),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Gagal menyimpan glossary.");
        }
      } else {
        // Create new term
        const res = await fetch("/api/admin/glossary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...editingGlossary,
            workId,
            sortOrder: glossaryTerms.length + 1,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Gagal mencipta glossary.");
        }
      }

      setEditingGlossary(null);
      loadGlossary();
    } catch (err) {
      setGlossaryError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function handleDeleteGlossary(id: number) {
    if (!confirm("Pasti ingin memadam glossary ini?")) return;

    try {
      const res = await fetch(`/api/admin/glossary/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal memadam glossary.");
      }

      loadGlossary();
    } catch (err) {
      setGlossaryError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function loadPublishPreview() {
    try {
      const res = await fetch(`/api/admin/publish?action=preview&workId=${workId}`);
      if (res.ok) {
        setPublishPreview(await res.json());
      }
    } catch {
      // Ignore preview loading errors
    }
  }

  async function handlePublish() {
    if (!confirm("Pasti ingin menerbitkan karya ini ke Markdown?")) return;

    setPublishing(true);
    setPublishError(null);
    setPublishSuccess(null);

    try {
      const res = await fetch("/api/admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish",
          workId,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal menerbitkan.");
      }

      setPublishSuccess(`Berjaya diterbitkan ke ${result.filePath}`);
      setTimeout(() => setPublishSuccess(null), 5000);
      loadPublishPreview();
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setPublishing(false);
    }
  }

  useEffect(() => {
    loadPublishPreview();
  }, [workId]);

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
            {form.status !== "published" && readiness?.ready && (
              <button
                type="button"
                onClick={handleExplicitPublish}
                className="admin-btn admin-btn-primary"
                disabled={publishing}
              >
                {publishing ? "Menerbitkan..." : "Terbitkan"}
              </button>
            )}
            {form.status === "published" && (
              <span className="admin-btn admin-btn-outline" aria-hidden="true" style={{ opacity: 0.7, cursor: "default" }}>
                Sudah Terbit
              </span>
            )}
            {publishPreview && (
              <button
                type="button"
                onClick={handlePublish}
                className="admin-btn admin-btn-outline"
                disabled={publishing}
              >
                {publishing ? "Menerbitkan..." : "Sync Markdown"}
              </button>
            )}
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

      {publishError && (
        <div className="admin-alert admin-alert-error">{publishError}</div>
      )}

      {publishSuccess && (
        <div className="admin-alert admin-alert-success">{publishSuccess}</div>
      )}

      <section className="admin-publish-preview" aria-label="Publication Readiness">
        <h3>Publication Readiness</h3>
        {readinessLoading && <p>Menyemak kesediaan...</p>}
        {readinessError && (
          <div className="admin-alert admin-alert-error">{readinessError}</div>
        )}
        {readiness && !readinessLoading && (
          <>
            <p>
              <strong>{readiness.ready ? "READY" : "NOT READY"}</strong>
              {" · "}
              <span style={{ opacity: 0.7 }}>
                disemak {new Date(readiness.checkedAt).toLocaleString("ms-MY")}
              </span>
            </p>
            <div className="admin-form-row">
              {(["content", "credits", "visuals", "privacy", "rights", "workflow"] as const).map((name) => {
                const gate = readiness.gates[name];
                const labels: Record<string, string> = {
                  content: "Kandungan",
                  credits: "Kredit",
                  visuals: "Visual",
                  privacy: "Privasi",
                  rights: "Hak",
                  workflow: "Aliran kerja",
                };
                return (
                  <span
                    key={name}
                    className={`admin-status ${gate.pass ? "admin-status-ready" : "admin-status-draft"}`}
                    title={gate.pass ? "Lulus" : `Blocker: ${gate.blockers.length}`}
                  >
                    {labels[name]}: {gate.pass ? "✓" : `✗ (${gate.blockers.length})`}
                  </span>
                );
              })}
            </div>
            {readiness.blockers.length > 0 && (
              <ul className="admin-alert admin-alert-error" style={{ marginBottom: 0 }}>
                {readiness.blockers.map((b) => (
                  <li key={b.code + b.message}>[BLOCKER] {b.message}</li>
                ))}
              </ul>
            )}
            {readiness.warnings.length > 0 && (
              <ul style={{ opacity: 0.85, marginTop: "0.5rem" }}>
                {readiness.warnings.map((w) => (
                  <li key={w.code + w.message}>[AMARAN] {w.message}</li>
                ))}
              </ul>
            )}
            {form.status === "ready" && readiness.ready && (
              <div style={{ marginTop: "0.75rem" }}>
                <button
                  type="button"
                  onClick={handleExplicitPublish}
                  className="admin-btn admin-btn-primary"
                  disabled={publishing}
                >
                  {publishing ? "Menerbitkan..." : "Terbitkan Karya Ini"}
                </button>
              </div>
            )}
            {form.status === "draft" || form.status === "review" ? (
              <p style={{ marginTop: "0.5rem", opacity: 0.8 }}>
                Naikkan status ke <strong>Sedia</strong> selepas semua gate lulus untuk membolehkan butang Terbitkan.
              </p>
            ) : null}
          </>
        )}
        <div style={{ marginTop: "0.5rem" }}>
          <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={loadReadiness} disabled={readinessLoading}>
            Semak Semula
          </button>
        </div>
      </section>

      {publishPreview && (
        <div className="admin-publish-preview">
          <h3>Sinkronisasi</h3>
          {publishPreview.isNew ? (
            <p className="admin-sync-status admin-sync-new">MARKDOWN MISSING — Karya ini belum ada sebagai Markdown.</p>
          ) : publishPreview.metadataChanged || publishPreview.bodyChanged ? (
            <p className="admin-sync-status admin-sync-changed">DB CHANGED — Perubahan dalam database belum diterbitkan ke Markdown.</p>
          ) : (
            <p className="admin-sync-status admin-sync-ok">IN SYNC — Database dan Markdown adalah selari.</p>
          )}
        </div>
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
        <button
          className={`admin-tab ${activeTab === "visuals" ? "admin-tab-active" : ""}`}
          onClick={() => setActiveTab("visuals")}
        >
          Visual ({visuals.length})
        </button>
        <button
          className={`admin-tab ${activeTab === "glossary" ? "admin-tab-active" : ""}`}
          onClick={() => setActiveTab("glossary")}
        >
          Glosari ({glossaryTerms.length})
        </button>
        {DERIVATIVE_TYPES.has(form.type) && (
          <button
            className={`admin-tab ${activeTab === "source" ? "admin-tab-active" : ""}`}
            onClick={() => setActiveTab("source")}
          >
            Sumber &amp; Hak
          </button>
        )}
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
                disabled={form.status === "published"}
              >
                {form.status === "published" ? (
                  <option value="published">Diterbitkan</option>
                ) : (
                  EDITABLE_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))
                )}
              </select>
              {form.status === "published" && (
                <span className="admin-form-hint">
                  Status published ditetapkan melalui butang Terbitkan sahaja.
                </span>
              )}
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
                  <div className="admin-checkbox-group">
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
                    <label className="admin-checkbox-label">
                      <input
                        type="checkbox"
                        checked={editingCredit.is_public !== false}
                        onChange={(e) => setEditingCredit((prev) => ({
                          ...prev,
                          is_public: e.target.checked,
                        }))}
                      />
                      Public
                    </label>
                  </div>
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
                    <th>Public</th>
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
                      <td>{credit.is_public ? "Ya" : "Tidak"}</td>
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

      {activeTab === "visuals" && (
        <div className="admin-visuals">
          {visualError && (
            <div className="admin-alert admin-alert-error">{visualError}</div>
          )}

          <div className="admin-credits-header">
            <h3>Visual Karya</h3>
            <button
              type="button"
              className="admin-btn admin-btn-sm admin-btn-primary"
              onClick={() => setEditingVisual({
                role: "inline",
                src: "",
                alt: "",
                place: "after",
              })}
            >
              + Tambah Visual
            </button>
          </div>

          {editingVisual && (
            <div className="admin-credit-form">
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Role *</label>
                  <select
                    value={editingVisual.role || "inline"}
                    onChange={(e) => setEditingVisual((prev) => ({
                      ...prev,
                      role: e.target.value,
                    }))}
                  >
                    <option value="hero">Hero</option>
                    <option value="inline">Inline</option>
                    <option value="section">Section</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>Place</label>
                  <select
                    value={editingVisual.place || "after"}
                    onChange={(e) => setEditingVisual((prev) => ({
                      ...prev,
                      place: e.target.value,
                    }))}
                  >
                    <option value="before">Before</option>
                    <option value="after">After</option>
                  </select>
                </div>
              </div>

              <div className="admin-form-group">
                <label>Src *</label>
                <input
                  type="text"
                  value={editingVisual.src || ""}
                  onChange={(e) => setEditingVisual((prev) => ({
                    ...prev,
                    src: e.target.value,
                  }))}
                  placeholder="/visuals/work-name/hero.png"
                />
              </div>

              <div className="admin-form-group">
                <label>Alt</label>
                <input
                  type="text"
                  value={editingVisual.alt || ""}
                  onChange={(e) => setEditingVisual((prev) => ({
                    ...prev,
                    alt: e.target.value,
                  }))}
                  placeholder="Deskripsi visual"
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Provider</label>
                  <input
                    type="text"
                    value={editingVisual.provider || ""}
                    onChange={(e) => setEditingVisual((prev) => ({
                      ...prev,
                      provider: e.target.value,
                    }))}
                    placeholder="magnific"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Creation ID</label>
                  <input
                    type="text"
                    value={editingVisual.creation_id || ""}
                    onChange={(e) => setEditingVisual((prev) => ({
                      ...prev,
                      creation_id: e.target.value,
                    }))}
                    placeholder="Xm5ZOkMBfo"
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label>Anchor</label>
                <input
                  type="text"
                  value={editingVisual.anchor || ""}
                  onChange={(e) => setEditingVisual((prev) => ({
                    ...prev,
                    anchor: e.target.value,
                  }))}
                  placeholder="Teks anchor dalam manuskrip"
                />
              </div>

              <div className="admin-form-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-outline"
                  onClick={() => setEditingVisual(null)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={handleSaveVisual}
                >
                  Simpan Visual
                </button>
              </div>
            </div>
          )}

          {visuals.length === 0 ? (
            <p className="admin-table-empty">Tiada visual untuk karya ini.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Src</th>
                    <th>Alt</th>
                    <th>Provider</th>
                    <th>Order</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {visuals.map((visual) => (
                    <tr key={visual.id}>
                      <td>
                        <span className={`admin-kind admin-kind-${visual.role}`}>
                          {visual.role}
                        </span>
                      </td>
                      <td><code>{visual.src.substring(0, 30)}...</code></td>
                      <td>{visual.alt || "—"}</td>
                      <td>{visual.provider || "—"}</td>
                      <td>{visual.sort_order}</td>
                      <td>
                        <div className="admin-table-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => setEditingVisual(visual)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-danger"
                            onClick={() => handleDeleteVisual(visual.id)}
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

      {activeTab === "glossary" && (
        <div className="admin-glossary">
          {glossaryError && (
            <div className="admin-alert admin-alert-error">{glossaryError}</div>
          )}

          <div className="admin-credits-header">
            <h3>Glosari Karya</h3>
            <button
              type="button"
              className="admin-btn admin-btn-sm admin-btn-primary"
              onClick={() => setEditingGlossary({
                term: "",
                meaning: "",
                source: "",
              })}
            >
              + Tambah Term
            </button>
          </div>

          {editingGlossary && (
            <div className="admin-credit-form">
              <div className="admin-form-group">
                <label>Term *</label>
                <input
                  type="text"
                  value={editingGlossary.term || ""}
                  onChange={(e) => setEditingGlossary((prev) => ({
                    ...prev,
                    term: e.target.value,
                  }))}
                  placeholder="Istilah"
                />
              </div>

              <div className="admin-form-group">
                <label>Definisi *</label>
                <textarea
                  value={editingGlossary.meaning || ""}
                  onChange={(e) => setEditingGlossary((prev) => ({
                    ...prev,
                    meaning: e.target.value,
                  }))}
                  rows={3}
                  placeholder="Maksud istilah"
                />
              </div>

              <div className="admin-form-group">
                <label>Sumber</label>
                <input
                  type="text"
                  value={editingGlossary.source || ""}
                  onChange={(e) => setEditingGlossary((prev) => ({
                    ...prev,
                    source: e.target.value,
                  }))}
                  placeholder="Sumber rujukan"
                />
              </div>

              <div className="admin-form-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-outline"
                  onClick={() => setEditingGlossary(null)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={handleSaveGlossary}
                >
                  Simpan Term
                </button>
              </div>
            </div>
          )}

          {glossaryTerms.length === 0 ? (
            <p className="admin-table-empty">Tiada glosari untuk karya ini.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Term</th>
                    <th>Definisi</th>
                    <th>Sumber</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {glossaryTerms.map((term) => (
                    <tr key={term.id}>
                      <td className="admin-table-title">{term.term}</td>
                      <td>{term.meaning}</td>
                      <td>{term.source || "—"}</td>
                      <td>
                        <div className="admin-table-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => setEditingGlossary(term)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-danger"
                            onClick={() => handleDeleteGlossary(term.id)}
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
      {activeTab === "source" && DERIVATIVE_TYPES.has(form.type) && (
        <div className="admin-source-rights">
          <div className="admin-credits-header">
            <h3>Provenance Sumber &amp; Semakan Hak</h3>
            {sourceRights?.sourceWork?.reviewedAt && (
              <span className="admin-status admin-status-ready">
                Direviu {sourceRights.sourceWork.reviewedBy} · {new Date(sourceRights.sourceWork.reviewedAt).toLocaleString("ms-MY")}
              </span>
            )}
          </div>

          {sourceError && <div className="admin-alert admin-alert-error">{sourceError}</div>}
          {sourceSuccess && <div className="admin-alert admin-alert-success">{sourceSuccess}</div>}
          {sourceLoading && <p>Memuatkan provenance...</p>}

          {sourceRights && !sourceLoading && (
            <>
              {!sourceRights.isDerivative && (
                <p className="admin-form-hint">
                  Gate rights hanya aktif untuk terjemahan/fragmen/sinopsis.
                </p>
              )}
              {sourceRights.rightsBlockers.length > 0 && (
                <ul className="admin-alert admin-alert-error" style={{ marginBottom: "0.75rem" }}>
                  {sourceRights.rightsBlockers.map((b) => (
                    <li key={b.code + b.message}>[HAK] {b.message}</li>
                  ))}
                </ul>
              )}

              <div className="admin-form">
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label htmlFor="src-title">Tajuk asal *</label>
                    <input
                      id="src-title"
                      type="text"
                      value={sourceForm.originalTitle}
                      onChange={(e) => setSourceForm((p) => ({ ...p, originalTitle: e.target.value }))}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label htmlFor="src-author">Penulis asal *</label>
                    <input
                      id="src-author"
                      type="text"
                      value={sourceForm.author}
                      onChange={(e) => setSourceForm((p) => ({ ...p, author: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label htmlFor="src-lang">Bahasa asal *</label>
                    <input
                      id="src-lang"
                      type="text"
                      value={sourceForm.originalLanguage}
                      onChange={(e) => setSourceForm((p) => ({ ...p, originalLanguage: e.target.value }))}
                      placeholder="Contoh: Melayu Klasik"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label htmlFor="src-year">Tahun terbit</label>
                    <input
                      id="src-year"
                      type="number"
                      value={sourceForm.publicationYear}
                      onChange={(e) => setSourceForm((p) => ({ ...p, publicationYear: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label htmlFor="src-edition">Edisi/cetakan sumber</label>
                    <input
                      id="src-edition"
                      type="text"
                      value={sourceForm.sourceEdition}
                      onChange={(e) => setSourceForm((p) => ({ ...p, sourceEdition: e.target.value }))}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label htmlFor="src-url">URL sumber (http/https)</label>
                    <input
                      id="src-url"
                      type="url"
                      value={sourceForm.sourceUrl}
                      onChange={(e) => setSourceForm((p) => ({ ...p, sourceUrl: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label htmlFor="src-locator">Locator (muka surat/bab)</label>
                    <input
                      id="src-locator"
                      type="text"
                      value={sourceForm.sourceLocator}
                      onChange={(e) => setSourceForm((p) => ({ ...p, sourceLocator: e.target.value }))}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label htmlFor="src-basis">Asas teks (source_text_basis)</label>
                    <input
                      id="src-basis"
                      type="text"
                      value={sourceForm.sourceTextBasis}
                      onChange={(e) => setSourceForm((p) => ({ ...p, sourceTextBasis: e.target.value }))}
                      placeholder="Contoh: teks asal Melayu 1957 (domain awam)"
                    />
                    <span className="admin-form-hint">
                      Bezakan: domain awam asal + terjemahan moden berhak cipta vs terjemahan Jalin daripada sumber asal yang sah.
                    </span>
                  </div>
                </div>
                <div className="admin-form-group">
                  <label htmlFor="src-notes">Nota hak (rights_notes)</label>
                  <textarea
                    id="src-notes"
                    rows={3}
                    value={sourceForm.rightsNotes}
                    onChange={(e) => setSourceForm((p) => ({ ...p, rightsNotes: e.target.value }))}
                  />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="src-evidence">Bukti/rujukan (rights_evidence — teks)</label>
                  <textarea
                    id="src-evidence"
                    rows={2}
                    value={sourceForm.rightsEvidence}
                    onChange={(e) => setSourceForm((p) => ({ ...p, rightsEvidence: e.target.value }))}
                    placeholder="Petikan katalog, DOI, nota arkib, dsb."
                  />
                </div>

                <div className="admin-form-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-outline"
                    onClick={handleSaveProvenance}
                    disabled={sourceSaving}
                  >
                    {sourceSaving ? "Menyimpan..." : "Simpan Provenance"}
                  </button>
                </div>

                <hr style={{ margin: "1.25rem 0", opacity: 0.3 }} />

                <div className="admin-form-group">
                  <label htmlFor="src-status">Status hak (semakan manusia) *</label>
                  <select
                    id="src-status"
                    value={sourceForm.rightsStatus}
                    onChange={(e) => setSourceForm((p) => ({ ...p, rightsStatus: e.target.value }))}
                  >
                    {RIGHTS_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <span className="admin-form-hint">
                    reviewed_by dan reviewed_at ditetapkan di server daripada sesi admin — bukan daripada klien.
                  </span>
                </div>

                <div className="admin-form-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={handleRightsReview}
                    disabled={sourceSaving}
                  >
                    {sourceSaving ? "Merekod..." : "Rekod Semakan Hak"}
                  </button>
                </div>
              </div>

              {sourceRights.rightsHistory.length > 0 && (
                <div style={{ marginTop: "1.25rem" }}>
                  <h4>Sejarah hak</h4>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Masa</th>
                          <th>Aktor</th>
                          <th>Tindakan</th>
                          <th>Status</th>
                          <th>Nota</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sourceRights.rightsHistory.map((h, i) => (
                          <tr key={`${h.at}-${i}`}>
                            <td>{new Date(h.at).toLocaleString("ms-MY")}</td>
                            <td>{h.actor}</td>
                            <td>{h.action}</td>
                            <td>{h.rights_status}</td>
                            <td>{h.note || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
