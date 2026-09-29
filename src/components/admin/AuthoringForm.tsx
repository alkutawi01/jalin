"use client";

import { useState } from "react";
import CopyButton from "./CopyButton";

type SeriesProp = { kind: "baharu" } | { kind: "sambung"; seriesId: string; title: string } | null;

interface Issue {
  code: string;
  message: string;
}

interface Summary {
  work: { title: string; slug: string; type: string; genre: string | null; dek: string | null; readingMinutes: number };
  stats: { storedWords: number; sectionCount: number };
  credits: { guestName: string; roleLabel: string; byline: boolean }[];
  characters: { name: string }[];
  glossary: string[];
  sections: { slug: string; title: string; words: number }[];
  visuals: { role: string; aspectRatio: string; altText: string }[];
  source: { title: string | null; author: string | null; language: string | null } | null;
  series: { kind: string; title?: string } | null;
}

interface CheckResponse {
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
  plan?: Summary | null;
  canCreate?: boolean;
  error?: string;
}

interface Props {
  recipeKey: string;
  needsManuscript: boolean;
  series: SeriesProp;
}

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export default function AuthoringForm({ recipeKey, needsManuscript, series }: Props) {
  const mode = recipeKey.endsWith(".tulis") ? "tulis" : "data";
  const [material, setMaterial] = useState("");
  const [special, setSpecial] = useState("");
  const [answer, setAnswer] = useState("");
  const [writer, setWriter] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [dek, setDek] = useState("");
  const [genre, setGenre] = useState("");
  const [seriesTitle, setSeriesTitle] = useState("");
  const [busy, setBusy] = useState<"idle" | "prompt" | "check" | "save">("idle");
  const [error, setError] = useState<string | null>(null);
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResponse | null>(null);

  const seriesBody = series
    ? series.kind === "sambung"
      ? { kind: "sambung", seriesId: series.seriesId }
      : { kind: "baharu", title: seriesTitle || undefined }
    : undefined;

  function requestBody(dryRun: boolean, overrideAnswer?: string) {
    return JSON.stringify({
      answer: overrideAnswer ?? answer,
      manuscript: mode === "data" ? material : "",
      mode,
      dryRun,
      writerName: writer || undefined,
      overrides: { title: title || undefined, slug: slug || undefined, dek: dek || undefined, genre: genre || undefined },
      series: seriesBody
    });
  }

  async function copyPrompt() {
    setBusy("prompt");
    setError(null);
    try {
      const response = await fetch("/api/admin/authoring/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipe: recipeKey,
          series: series ? (series.kind === "baharu" ? "baharu" : series.seriesId) : undefined,
          special: special || undefined
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal menyediakan arahan.");
      const heading = needsManuscript ? "TEKS KARYA" : "MAKLUMAT KARYA SUMBER";
      const text = material.trim() ? `${data.prompt}\n\n=== ${heading} ===\n${material.trim()}\n` : data.prompt;
      await navigator.clipboard.writeText(text);
      setCopyNote("Arahan AI disalin. Tampal dalam chatbot (ChatGPT/Claude/Gemini), kemudian salin jawapannya.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyalin arahan.");
    } finally {
      setBusy("idle");
    }
  }

  async function check(overrideAnswer?: string) {
    setBusy("check");
    setError(null);
    try {
      const response = await fetch("/api/admin/works/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody(true, overrideAnswer)
      });
      if (response.status === 401) throw new Error("Sesi tamat. Log masuk semula.");
      const data = (await response.json()) as CheckResponse;
      if (data.error && !data.errors) throw new Error(data.error);
      setResult(data);
      if (data.plan) {
        setTitle((v) => v || data.plan!.work.title);
        setSlug((v) => v || data.plan!.work.slug);
        setDek((v) => v || data.plan!.work.dek || "");
        setGenre((v) => v || data.plan!.work.genre || "");
        if (data.plan.series?.kind === "baharu") setSeriesTitle((v) => v || data.plan!.series?.title || "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setBusy("idle");
    }
  }

  async function paste() {
    setError(null);
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) throw new Error("Papan keratan kosong.");
      setAnswer(text);
      setResult(null);
      setTitle("");
      setSlug("");
      setDek("");
      setGenre("");
      await check(text);
    } catch {
      setError("Peranti tidak membenarkan tampal automatik. Tampal jawapan chatbot dalam kotak di bawah, kemudian tekan Semak.");
    }
  }

  async function save() {
    setBusy("save");
    setError(null);
    try {
      const response = await fetch("/api/admin/works/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody(false)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? data.errors?.[0]?.message ?? "Gagal menyimpan draf.");
      window.location.href = `/admin/works/${data.workId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
      setBusy("idle");
    }
  }

  const plan = result?.plan ?? null;
  const canSave = !!result?.ok && !!result.canCreate && busy === "idle";
  const materialLabel = needsManuscript ? "Teks karya" : "Maklumat karya sumber";
  const materialHint = needsManuscript
    ? "Tampal teks karya yang sudah siap. Teks ini juga disimpan sebagai karya (tidak diubah)."
    : "Tulis tajuk karya sumber, pengarang, dan bahagian yang dimahukan (jika ada).";

  return (
    <>
      {series?.kind === "sambung" ? (
        <div className="admin-alert admin-alert-success">Episod ini menyambung siri: {series.title}</div>
      ) : null}

      <section className="admin-section">
        <h2 className="admin-form-section-title">
          <span className="admin-step-num">1</span>
          {materialLabel}
        </h2>
        <p className="admin-form-hint">
          {materialHint}
          {needsManuscript ? <> <span className="admin-word-count">{wordCount(material)} perkataan</span></> : null}
        </p>
        <textarea
          className="admin-textarea"
          rows={needsManuscript ? 10 : 4}
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
          placeholder={needsManuscript ? "Tampal teks karya di sini…" : "cth. Kafka, Metamorfosis (bahasa Jerman)"}
        />
        <details>
          <summary className="admin-form-hint">Arahan khas untuk karya ini (pilihan)</summary>
          <textarea
            className="admin-textarea"
            rows={3}
            value={special}
            onChange={(e) => setSpecial(e.target.value)}
            placeholder="cth. Fokus pada watak Aina; elakkan gambar di dalam rumah."
          />
        </details>
      </section>

      <section className="admin-section">
        <h2 className="admin-form-section-title">
          <span className="admin-step-num">2</span>Salin arahan AI
        </h2>
        <p className="admin-form-hint">
          Tekan butang, kemudian tampal dalam chatbot pilihan anda{needsManuscript ? " (teks karya turut disertakan)" : ""}.
        </p>
        <div className="admin-form-actions">
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            disabled={busy !== "idle" || (needsManuscript && !material.trim())}
            onClick={copyPrompt}
          >
            {busy === "prompt" ? "Menyediakan…" : "Salin Arahan AI"}
          </button>
        </div>
        {copyNote ? <div className="admin-alert admin-alert-success">{copyNote}</div> : null}
      </section>

      <section className="admin-section">
        <h2 className="admin-form-section-title">
          <span className="admin-step-num">3</span>Tampal jawapan chatbot
        </h2>
        <div className="admin-form-actions">
          <button type="button" className="admin-btn admin-btn-primary" disabled={busy !== "idle"} onClick={paste}>
            {busy === "check" ? "Menyemak…" : "Tampal"}
          </button>
        </div>
        <details>
          <summary className="admin-form-hint">Tampal tidak berfungsi? Tampal secara manual</summary>
          <textarea
            className="admin-textarea"
            rows={6}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Tampal jawapan chatbot di sini…"
          />
          <div className="admin-form-actions">
            <button
              type="button"
              className="admin-btn admin-btn-outline"
              disabled={busy !== "idle" || !answer.trim()}
              onClick={() => check()}
            >
              Semak
            </button>
          </div>
        </details>
      </section>

      {error ? <div className="admin-alert admin-alert-error">{error}</div> : null}

      {result ? (
        <section className="admin-section">
          <h2 className="admin-form-section-title">
            <span className="admin-step-num">4</span>Semak dan simpan
          </h2>
          {result.errors.map((issue, i) => (
            <div key={`e${i}`} className="admin-alert admin-alert-error">
              {issue.message}
            </div>
          ))}
          {result.warnings.map((issue, i) => (
            <div key={`w${i}`} className="admin-alert admin-alert-warning">
              {issue.message}
            </div>
          ))}

          {plan ? (
            <>
              <div className="admin-form-group">
                <label htmlFor="f-title">Tajuk</label>
                <input id="f-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="admin-form-group">
                <label htmlFor="f-slug">Slug (alamat URL)</label>
                <input id="f-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
              </div>
              <div className="admin-form-group">
                <label htmlFor="f-dek">Dek</label>
                <textarea id="f-dek" className="admin-textarea" rows={2} value={dek} onChange={(e) => setDek(e.target.value)} />
              </div>
              <div className="admin-form-group">
                <label htmlFor="f-genre">Genre</label>
                <input id="f-genre" value={genre} onChange={(e) => setGenre(e.target.value)} />
              </div>
              <div className="admin-form-group">
                <label htmlFor="f-writer">Nama penulis (kredit awam)</label>
                <input
                  id="f-writer"
                  value={writer}
                  onChange={(e) => setWriter(e.target.value)}
                  placeholder="Nama penulis sebenar"
                />
              </div>
              {series?.kind === "baharu" ? (
                <div className="admin-form-group">
                  <label htmlFor="f-series">Tajuk siri baharu</label>
                  <input id="f-series" value={seriesTitle} onChange={(e) => setSeriesTitle(e.target.value)} />
                </div>
              ) : null}

              <p className="admin-form-hint">
                {plan.stats.storedWords} perkataan · {plan.work.readingMinutes} minit bacaan
                {plan.sections.length ? ` · ${plan.sections.length} bab` : ""} · {plan.glossary.length} istilah glosari ·{" "}
                {plan.characters.length} watak · {plan.visuals.length} gambar dicadangkan
                {plan.source ? ` · sumber: ${plan.source.title ?? "?"} (${plan.source.author ?? "?"})` : ""}
              </p>
              {plan.sections.length ? (
                <ol className="admin-form-hint">
                  {plan.sections.map((s) => (
                    <li key={s.slug}>
                      {s.title} ({s.words} perkataan)
                    </li>
                  ))}
                </ol>
              ) : null}
            </>
          ) : null}

          <div className="admin-form-actions">
            <button type="button" className="admin-btn admin-btn-outline" disabled={busy !== "idle"} onClick={() => check()}>
              Semak semula
            </button>
            <button type="button" className="admin-btn admin-btn-primary" disabled={!canSave} onClick={save}>
              {busy === "save" ? "Menyimpan…" : "Simpan draf"}
            </button>
          </div>
          <p className="admin-form-hint">Simpan hanya mencipta draf. Karya belum diterbitkan.</p>
        </section>
      ) : null}
    </>
  );
}
