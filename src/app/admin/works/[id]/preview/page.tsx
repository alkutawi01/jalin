"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import StoryMarkdown from "../../../../../components/reader/StoryMarkdown";

const TYPE_LABELS: Record<string, string> = {
  cerpen: "Cerpen",
  novela: "Novela",
  bersiri: "Bersiri",
  terjemahan: "Terjemahan",
  fragmen: "Fragmen",
  sinopsis: "Sinopsis",
};

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
}

interface CreditData {
  role_label: string;
  byline: boolean;
  is_public: boolean;
  contributor_slug: string | null;
  guest_name: string | null;
}

interface GlossaryData {
  term: string;
  meaning: string;
  source: string;
}

interface VisualData {
  role: string;
  src: string;
  alt: string | null;
  anchor: string | null;
}

export default function PreviewWorkPage() {
  const params = useParams();
  const workId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [work, setWork] = useState<WorkData | null>(null);
  const [credits, setCredits] = useState<CreditData[]>([]);
  const [glossary, setGlossary] = useState<GlossaryData[]>([]);
  const [visuals, setVisuals] = useState<VisualData[]>([]);

  useEffect(() => {
    async function loadWork() {
      try {
        const res = await fetch(`/api/admin/works/${workId}`);
        if (!res.ok) throw new Error("Karya tidak ditemui.");
        setWork(await res.json());
        const [cr, gl, vs] = await Promise.all([
          fetch(`/api/admin/credits?workId=${workId}`).then((r) => (r.ok ? r.json() : [])),
          fetch(`/api/admin/glossary?workId=${workId}`).then((r) => (r.ok ? r.json() : [])),
          fetch(`/api/admin/visuals?workId=${workId}`).then((r) => (r.ok ? r.json() : [])),
        ]);
        setCredits(Array.isArray(cr) ? cr : []);
        setGlossary(Array.isArray(gl) ? gl : []);
        setVisuals(Array.isArray(vs) ? vs : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ralat memuatkan karya.");
      } finally {
        setLoading(false);
      }
    }

    loadWork();
  }, [workId]);

  if (loading) {
    return (
      <div className="admin-loading">
        <p>Memuatkan preview...</p>
      </div>
    );
  }

  if (error || !work) {
    return (
      <div className="admin-placeholder">
        <p>{error || "Karya tidak ditemui."}</p>
        <a href={`/admin/works/${workId}`} className="admin-btn">
          Kembali ke Editor
        </a>
      </div>
    );
  }

  return (
    <div className="admin-preview">
      <header className="admin-page-header">
        <div className="admin-page-header-row">
          <div>
            <h1>Preview: {work.title}</h1>
            <p className="admin-page-sub">
              {TYPE_LABELS[work.type] ?? work.type} · {work.version} ·{" "}
              <span className={`admin-status admin-status-${work.status}`}>
                {work.status}
              </span>
            </p>
          </div>
          <a href={`/admin/works/${workId}`} className="admin-btn admin-btn-outline">
            Kembali ke Editor
          </a>
        </div>
      </header>

      <article className="admin-preview-content">
        <div className="admin-preview-meta">
          {work.genre && <span>Genre: {work.genre}</span>}
          {work.audience && <span>Audiens: {work.audience}</span>}
          {work.reading_minutes && <span>± {work.reading_minutes} min</span>}
        </div>

        {work.dek && (
          <p className="admin-preview-dek">{work.dek}</p>
        )}

        {visuals.filter((v) => v.role === "hero").map((v) => (
          <figure key={v.src} style={{ margin: "1rem 0" }}>
            <img src={v.src} alt={v.alt || ""} style={{ maxWidth: "100%", height: "auto" }} />
          </figure>
        ))}

        <div className="admin-preview-body">
          <StoryMarkdown
            glossary={Object.fromEntries(
              glossary.map((g) => [g.term, { meaning: g.meaning, source: g.source }])
            )}
          >
            {work.body || ""}
          </StoryMarkdown>
        </div>

        {credits.filter((c) => c.is_public && c.byline).length > 0 && (
          <footer style={{ marginTop: "1.5rem", opacity: 0.85 }}>
            <strong>Kredit byline:</strong>{" "}
            {credits
              .filter((c) => c.is_public && c.byline)
              .map((c) => c.guest_name || c.contributor_slug || c.role_label)
              .join(" · ")}
          </footer>
        )}
      </article>
    </div>
  );
}
