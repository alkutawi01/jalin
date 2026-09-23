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

export default function PreviewWorkPage() {
  const params = useParams();
  const workId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [work, setWork] = useState<WorkData | null>(null);

  useEffect(() => {
    async function loadWork() {
      try {
        const res = await fetch(`/api/admin/works/${workId}`);
        if (!res.ok) throw new Error("Karya tidak ditemui.");
        setWork(await res.json());
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

        <div className="admin-preview-body">
          <StoryMarkdown glossary={{}}>{work.body || ""}</StoryMarkdown>
        </div>
      </article>
    </div>
  );
}
