"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KIND_DESCRIPTIONS, KIND_LABELS, WORK_KINDS, type WorkKind } from "../../../../lib/admin/authoring/recipes";

interface SeriesChoice { id: string; title: string; mode: string }

export default function AddWorkPage() {
  const router = useRouter();
  const [series, setSeries] = useState<SeriesChoice[]>([]);
  const [chooseSeries, setChooseSeries] = useState(false);
  const [seriesId, setSeriesId] = useState("");
  const [newSeriesTitle, setNewSeriesTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/series").then((res) => res.ok ? res.json() : []).then(setSeries).catch(() => setSeries([]));
  }, []);

  async function start(type: WorkKind) {
    if (type === "bersiri" && !chooseSeries) {
      setChooseSeries(true);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/works/start-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, seriesId: type === "bersiri" ? seriesId || undefined : undefined, newSeriesTitle: type === "bersiri" && !seriesId ? newSeriesTitle : undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Draf gagal dibuat.");
      router.push(`/admin/works/${data.id}#content`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draf gagal dibuat.");
      setBusy(false);
    }
  }

  return (
    <div className="admin-form-page">
      <header className="admin-page-header">
        <h1>Tambah Karya</h1>
        <p className="admin-page-sub">Pilih jenis karya untuk membuka editor lengkap. Draf tidak diterbitkan secara automatik.</p>
      </header>
      {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}
      {!chooseSeries ? <div className="admin-choice-grid">
        {WORK_KINDS.map((kind) => <button key={kind} type="button" className="admin-choice" disabled={busy} onClick={() => void start(kind)}>
          <strong>{KIND_LABELS[kind]}</strong><span>{KIND_DESCRIPTIONS[kind]}</span>
        </button>)}
      </div> : <div className="admin-form">
        <h2 className="admin-form-section-title">Siri untuk episod baharu</h2>
        <p className="admin-form-hint">Setiap episod ialah karya sendiri tetapi mesti dipautkan kepada siri yang sama. Pilih satu siri sedia ada atau namakan siri baharu.</p>
        <div className="admin-form-group">
          <label htmlFor="series-choice">Siri sedia ada</label>
          <select id="series-choice" value={seriesId} onChange={(event) => setSeriesId(event.target.value)}>
            <option value="">Buat siri baharu</option>
            {series.map((item) => <option key={item.id} value={item.id}>{item.title} ({item.mode === "anthology" ? "antologi" : "bersambung"})</option>)}
          </select>
        </div>
        {!seriesId && <div className="admin-form-group"><label htmlFor="new-series-title">Tajuk siri baharu *</label><input id="new-series-title" value={newSeriesTitle} onChange={(event) => setNewSeriesTitle(event.target.value)} placeholder="Contoh: Di Hujung Lorong" /></div>}
        <div className="admin-form-actions">
          <button type="button" className="admin-btn admin-btn-outline" disabled={busy} onClick={() => setChooseSeries(false)}>Kembali</button>
          <button type="button" className="admin-btn admin-btn-primary" disabled={busy || (!seriesId && !newSeriesTitle.trim())} onClick={() => void start("bersiri")}>{busy ? "Membuka draf…" : "Buka editor episod"}</button>
        </div>
      </div>}
      <details className="admin-advanced-field"><summary>Import karya menggunakan chatbot</summary><p className="admin-form-hint">Aliran ini membuat draf baharu daripada jawapan chatbot; ia tidak mengisi draf yang sedang terbuka.</p><div className="admin-form-actions">{WORK_KINDS.map((kind) => <a key={kind} className="admin-btn admin-btn-outline admin-btn-sm" href={`/admin/works/add/${kind}`}>{KIND_LABELS[kind]}</a>)}</div></details>
    </div>
  );
}
