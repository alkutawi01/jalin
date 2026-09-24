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

interface SectionData {
  id: number;
  work_id: string;
  slug: string;
  title: string | null;
  position: number;
  body: string;
  reading_minutes: number | null;
}

interface SeriesEntryData {
  id: number;
  series_id: string;
  work_id: string;
  position: number;
}

interface SeriesData {
  id: string;
  slug: string;
  title: string;
  dek: string | null;
  genre: string | null;
  mode: string;
  status: string;
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
  const [sections, setSections] = useState<SectionData[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null);
  const [series, setSeries] = useState<SeriesData | null>(null);
  const [seriesEntries, setSeriesEntries] = useState<SeriesEntryData[]>([]);

  useEffect(() => {
    async function loadWork() {
      try {
        const res = await fetch(`/api/admin/works/${workId}`);
        if (!res.ok) throw new Error("Karya tidak ditemui.");
        const w: WorkData = await res.json();
        setWork(w);
        const [cr, gl, vs, secs] = await Promise.all([
          fetch(`/api/admin/credits?workId=${workId}`).then((r) => (r.ok ? r.json() : [])),
          fetch(`/api/admin/glossary?workId=${workId}`).then((r) => (r.ok ? r.json() : [])),
          fetch(`/api/admin/visuals?workId=${workId}`).then((r) => (r.ok ? r.json() : [])),
          fetch(`/api/admin/works/${workId}/sections`).then((r) => (r.ok ? r.json() : [])),
        ]);
        setCredits(Array.isArray(cr) ? cr : []);
        setGlossary(Array.isArray(gl) ? gl : []);
        setVisuals(Array.isArray(vs) ? vs : []);
        const secList: SectionData[] = Array.isArray(secs) ? secs : [];
        setSections(secList);
        if (secList.length > 0) setActiveSectionId(secList[0]!.id);

        // Bersiri: load Series context + adjacent entries (editorial orientation only).
        if (w.type === "bersiri") {
          try {
            const listRes = await fetch(`/api/admin/series`);
            if (listRes.ok) {
              const allSeries: SeriesData[] = await listRes.json();
              for (const s of allSeries) {
                const entRes = await fetch(`/api/admin/series/${s.id}/entries`);
                if (!entRes.ok) continue;
                const ents: SeriesEntryData[] = await entRes.json();
                if (ents.some((e) => e.work_id === workId)) {
                  setSeries(s);
                  setSeriesEntries(ents);
                  break;
                }
              }
            }
          } catch {
            // Series context optional for preview
          }
        }
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

        {work.type === "bersiri" && series && (
          <div style={{
            margin: "1rem 0",
            padding: "0.75rem 1rem",
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: "6px",
            fontSize: "0.9rem"
          }}>
            <strong>Siri:</strong> {series.title}{" "}
            <span style={{ opacity: 0.7 }}>
              · {series.mode === "anthology" ? "Antologi" : "Bersambung"} ·{" "}
              {series.status === "completed" ? "Tamat" : "Berterusan"}
            </span>
            {seriesEntries.length > 0 && (
              <div style={{ marginTop: "0.5rem", opacity: 0.85 }}>
                <strong>Keahlian (orientasi editorial):</strong>{" "}
                {seriesEntries.map((e, i) => (
                  <span key={e.id}>
                    #{e.position}
                    {e.work_id === workId ? " (ini)" : ""}
                    {i < seriesEntries.length - 1 ? " · " : ""}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="admin-preview-body">
          {sections.length > 0 ? (
            <>
              <nav style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                marginBottom: "1rem",
                fontSize: "0.9rem"
              }} aria-label="Navigasi bahagian preview">
                {sections.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSectionId(s.id)}
                    style={{
                      padding: "0.35rem 0.75rem",
                      border: "1px solid rgba(0,0,0,0.2)",
                      borderRadius: "4px",
                      background: activeSectionId === s.id ? "rgba(0,0,0,0.08)" : "transparent",
                      cursor: "pointer",
                      fontWeight: activeSectionId === s.id ? 600 : 400,
                    }}
                  >
                    {s.position}. {s.title || s.slug}
                  </button>
                ))}
              </nav>
              {(() => {
                const active = sections.find((s) => s.id === activeSectionId) ?? sections[0]!;
                return (
                  <>
                    {active.title ? (
                      <h2 style={{ fontSize: "1.15rem", marginBottom: "0.75rem" }}>
                        {active.title}
                      </h2>
                    ) : null}
                    <StoryMarkdown
                      glossary={Object.fromEntries(
                        glossary.map((g) => [g.term, { meaning: g.meaning, source: g.source }])
                      )}
                    >
                      {active.body || ""}
                    </StoryMarkdown>
                  </>
                );
              })()}
            </>
          ) : (
            <StoryMarkdown
              glossary={Object.fromEntries(
                glossary.map((g) => [g.term, { meaning: g.meaning, source: g.source }])
              )}
            >
              {work.body || ""}
            </StoryMarkdown>
          )}
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
