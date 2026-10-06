"use client";

import { useState } from "react";
import { glossaryTermsMissingFromText } from "../../lib/admin/glossary-check";
import CopyButton from "./CopyButton";
import { pasteAsMarkdown } from "./pasteMarkdown";

type SeriesProp = { kind: "baharu" } | { kind: "sambung"; seriesId: string; title: string } | null;

interface Issue {
  code: string;
  message: string;
}

interface SummaryVisual {
  originalIndex: number;
  role: string;
  sectionSlug: string | null;
  place: string;
  aspectRatio: string;
  altText: string;
  scenePrompt: string;
  anchorStart: string | null;
  finalPrompt: string;
  reason: string | null;
}

interface Summary {
  work: { title: string; slug: string; type: string; genre: string | null; dek: string | null; readingMinutes: number };
  stats: { storedWords: number; sectionCount: number };
  credits: { guestName: string; roleLabel: string; byline: boolean }[];
  characters: { name: string; role: string }[];
  places?: { name: string; description?: string }[];
  times?: { name: string; description?: string }[];
  glossary: { term: string; meaning: string }[];
  sections: { slug: string; title: string; words: number }[];
  visuals: SummaryVisual[];
  source: { title: string | null; author: string | null; language: string | null; provenance: string | null } | null;
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

/** Everything the chatbot filled in, editable by the editor before saving. */
interface Review {
  readingMinutes: string;
  source: { title: string; author: string; language: string; provenance: string } | null;
  glossary: { term: string; meaning: string }[];
  characters: { name: string; role: string }[];
  places: { name: string; description: string }[];
  times: { name: string; description: string }[];
  visuals: {
    originalIndex: number;
    role: string;
    place: "before" | "after";
    aspectRatio: string;
    altText: string;
    scene: string;
    anchorStart: string | null;
    sectionSlug: string | null;
    finalPrompt: string;
    removed: boolean;
  }[];
}

interface Props {
  recipeKey: string;
  needsManuscript: boolean;
  series: SeriesProp;
}

const RATIOS = ["3:2", "2:3", "1:1", "16:9", "9:16", "4:3", "3:4"];

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function toReview(plan: Summary): Review {
  return {
    readingMinutes: String(plan.work.readingMinutes),
    source: plan.source
      ? {
          title: plan.source.title ?? "",
          author: plan.source.author ?? "",
          language: plan.source.language ?? "",
          provenance: plan.source.provenance ?? ""
        }
      : null,
    glossary: plan.glossary.map((g) => ({ ...g })),
    characters: plan.characters.map((c) => ({ ...c })),
    places: (plan.places ?? []).map((p) => ({ name: p.name, description: p.description ?? "" })),
    times: (plan.times ?? []).map((p) => ({ name: p.name, description: p.description ?? "" })),
    visuals: plan.visuals.map((v) => ({
      originalIndex: v.originalIndex,
      role: v.role,
      place: v.place === "before" ? "before" : "after",
      aspectRatio: v.aspectRatio,
      altText: v.altText,
      scene: v.scenePrompt,
      anchorStart: v.anchorStart,
      sectionSlug: v.sectionSlug,
      finalPrompt: v.finalPrompt,
      removed: false
    }))
  };
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
  /** Set when the draft was created but something was lost on the way; the editor must see it before leaving. */
  const [saved, setSaved] = useState<{ workId: string; problems: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [review, setReview] = useState<Review | null>(null);

  const seriesBody = series
    ? series.kind === "sambung"
      ? { kind: "sambung", seriesId: series.seriesId }
      : { kind: "baharu", title: seriesTitle || undefined }
    : undefined;

  function editsBody(current: Review | null) {
    if (!current) return undefined;
    const minutes = Number(current.readingMinutes);
    const visuals: (null | { altText: string; scene: string; place: "before" | "after"; aspectRatio: string })[] = [];
    for (const v of current.visuals) {
      visuals[v.originalIndex] = v.removed
        ? null
        : { altText: v.altText, scene: v.scene, place: v.place, aspectRatio: v.aspectRatio };
    }
    return {
      readingMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : undefined,
      source: current.source ?? undefined,
      glossary: current.glossary,
      characters: current.characters,
      places: current.places,
      times: current.times,
      visuals
    };
  }

  function requestBody(dryRun: boolean, overrideAnswer?: string, current: Review | null = review) {
    return JSON.stringify({
      answer: overrideAnswer ?? answer,
      manuscript: mode === "data" ? material : "",
      mode,
      expectedType: recipeKey.split(".")[0],
      dryRun,
      writerName: writer || undefined,
      overrides: { title: title || undefined, slug: slug || undefined, dek: dek || undefined, genre: genre || undefined },
      series: seriesBody,
      edits: editsBody(current)
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

  /** fresh = a newly pasted answer: fill every field from it. Otherwise keep the editor's edits. */
  async function check(opts: { answerText?: string; fresh?: boolean } = {}) {
    setBusy("check");
    setError(null);
    try {
      const response = await fetch("/api/admin/works/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody(true, opts.answerText, opts.fresh ? null : review)
      });
      if (response.status === 401) throw new Error("Sesi tamat. Log masuk semula.");
      const data = (await response.json()) as CheckResponse;
      if (data.error && !data.errors) throw new Error(data.error);
      setResult(data);
      if (data.plan) {
        const p = data.plan;
        setTitle((v) => v || p.work.title);
        setSlug((v) => v || p.work.slug);
        setDek((v) => v || p.work.dek || "");
        setGenre((v) => v || p.work.genre || "");
        const byline = p.credits.find((c) => c.byline);
        if (byline) setWriter((v) => v || byline.guestName);
        if (p.series?.kind === "baharu") setSeriesTitle((v) => v || p.series?.title || "");
        if (opts.fresh || !review) {
          setReview(toReview(p));
        } else {
          // Keep the editor's edits; only refresh the composed image prompts.
          setReview((r) =>
            r
              ? {
                  ...r,
                  visuals: r.visuals.map((v) => ({
                    ...v,
                    finalPrompt: p.visuals.find((x) => x.originalIndex === v.originalIndex)?.finalPrompt ?? v.finalPrompt
                  }))
                }
              : r
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setBusy("idle");
    }
  }

  async function paste() {
    setError(null);
    let text = "";
    try {
      text = await navigator.clipboard.readText();
    } catch {
      setError("Peranti tidak membenarkan tampal automatik. Tampal jawapan chatbot dalam kotak di bawah, kemudian tekan Semak.");
      return;
    }
    if (!text.trim()) {
      setError("Papan keratan kosong. Salin jawapan chatbot dahulu.");
      return;
    }
    setAnswer(text);
    setResult(null);
    setReview(null);
    setTitle("");
    setSlug("");
    setDek("");
    setGenre("");
    await check({ answerText: text, fresh: true });
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
      if (Array.isArray(data.postWarnings) && data.postWarnings.length > 0) {
        setSaved({ workId: data.workId, problems: data.postWarnings });
        setBusy("idle");
        return;
      }
      window.location.href = `/admin/works/${data.workId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
      setBusy("idle");
    }
  }

  function loadFile(file: File | undefined) {
    if (!file) return;
    if (!/\.(txt|md)$/i.test(file.name)) {
      setError("Hanya fail teks .txt atau .md boleh digunakan.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Fail teks melebihi 2 MB. Tampal bahagian yang diperlukan atau kecilkan fail.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { setMaterial(String(reader.result ?? "")); setError(null); };
    reader.onerror = () => setError("Fail tidak dapat dibaca. Cuba fail .txt atau .md yang lain.");
    reader.readAsText(file);
  }

  function patchVisual(index: number, patch: Partial<Review["visuals"][number]>) {
    setReview((r) => (r ? { ...r, visuals: r.visuals.map((v, i) => (i === index ? { ...v, ...patch } : v)) } : r));
  }

  const plan = result?.plan ?? null;
  // Only checkable when the editor pasted the text (when the chatbot writes it, the text is not here yet).
  const glossaryProblems = review && needsManuscript ? glossaryTermsMissingFromText(review.glossary.map((g) => g.term), material) : [];
  const canSave = !!result?.ok && !!result.canCreate && busy === "idle";
  const materialLabel = needsManuscript ? "Teks karya" : "Maklumat karya sumber";
  const materialHint = needsManuscript
    ? "Tampal teks karya yang sudah siap, atau pilih fail teks (.txt/.md). Teks ini juga disimpan sebagai karya (tidak diubah)."
    : "Tulis tajuk karya sumber, pengarang, dan bahagian yang dimahukan (jika ada).";

  return (
    <>
      {series?.kind === "sambung" ? (
        <div className="admin-alert admin-alert-success" role="status">Episod ini menyambung siri: {series.title}</div>
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
          onPaste={needsManuscript ? pasteAsMarkdown : undefined}
          placeholder={needsManuscript ? "Tampal teks karya di sini…" : "cth. Kafka, Metamorfosis (bahasa Jerman)"}
        />
        {needsManuscript ? (
          <p className="admin-form-hint">
            <label>
              Atau pilih fail: <input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={(e) => loadFile(e.target.files?.[0])} />
            </label>
            <br />
            Fail teks sahaja (.txt atau .md), maksimum 2 MB. Fail Word (.docx) dan PDF tidak boleh dibaca terus: salin teksnya dan tampal di atas.
          </p>
        ) : null}
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
        {copyNote ? <div className="admin-alert admin-alert-success" role="status">{copyNote}</div> : null}
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
              onClick={() => {
                setReview(null);
                setTitle("");
                setSlug("");
                setDek("");
                setGenre("");
                check({ fresh: true });
              }}
            >
              Semak
            </button>
          </div>
        </details>
      </section>

      {error ? <div className="admin-alert admin-alert-error" role="alert">{error}</div> : null}

      {saved ? (
        <div className="admin-alert admin-alert-warning" role="alert">
          <strong>Draf sudah dicipta, tetapi ada perkara yang tidak berjaya disimpan:</strong>
          <ul>
            {saved.problems.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
          <a className="admin-btn admin-btn-primary" href={`/admin/works/${saved.workId}`}>
            Buka karya dan betulkan
          </a>
        </div>
      ) : null}

      {result ? (
        <section className="admin-section">
          <h2 className="admin-form-section-title">
            <span className="admin-step-num">4</span>Semak dan simpan
          </h2>
          {result.errors.map((issue, i) => (
            <div key={`e${i}`} className="admin-alert admin-alert-error" role="alert">
              {issue.message}
            </div>
          ))}
          {result.warnings.map((issue, i) => (
            <div key={`w${i}`} className="admin-alert admin-alert-warning">
              {issue.message}
            </div>
          ))}

          {!plan && result.errors.some((e) => e.code === "title_missing" || e.code === "slug_missing") ? (
            <div className="admin-form-group">
              <label htmlFor="f-title-missing">Karya ini belum bertajuk. Taipkan tajuk, kemudian tekan Semak semula.</label>
              <input id="f-title-missing" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          ) : null}

          {plan && review ? (
            <>
              <h3>Pratonton kad</h3>
              <p className="admin-form-hint">Begini karya ini kelihatan pada halaman utama dan senarai. Gambar hero dimuat naik selepas draf disimpan.</p>
              <div style={{ maxWidth: 340 }}>
                <article className="latest-card">
                  <div className="latest-card-cover">
                    <div className="work-cover work-cover--placeholder">
                      <span className="work-cover-monogram" aria-hidden="true">
                        {(title || "?").trim().charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="latest-card-body">
                    <div className="latest-card-meta">
                      <span className="latest-card-type">
                        {plan.work.type}
                        {genre ? ` · ${genre}` : ""}
                      </span>
                      <span className="latest-card-reading">± {review.readingMinutes || "?"} minit</span>
                    </div>
                    <h3 className="latest-card-title">{title || "(belum bertajuk)"}</h3>
                    {dek ? <p className="latest-card-dek">{dek}</p> : null}
                    <div className="latest-card-footer">
                      <span className="latest-card-cta">Baca →</span>
                    </div>
                  </div>
                </article>
              </div>

              <h3>Maklumat karya</h3>
              <div className="admin-form-group">
                <label htmlFor="f-title">Tajuk</label>
                <input
                  id="f-title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setSlug(""); // the slug follows the title unless typed afterwards
                  }}
                />
              </div>
              <div className="admin-form-group">
                <label htmlFor="f-slug">Alamat pautan</label>
                <input id="f-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="(dijana daripada tajuk)" />
              </div>
              <div className="admin-form-group">
                <label htmlFor="f-dek">Dek</label>
                <textarea id="f-dek" className="admin-textarea" rows={4} value={dek} onChange={(e) => setDek(e.target.value)} />
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label htmlFor="f-genre">Genre</label>
                  <input id="f-genre" value={genre} onChange={(e) => setGenre(e.target.value)} />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="f-min">Tempoh bacaan (minit) — dikira daripada {plan.stats.storedWords} perkataan</label>
                  <input
                    id="f-min"
                    type="number"
                    min={1}
                    value={review.readingMinutes}
                    onChange={(e) => setReview({ ...review, readingMinutes: e.target.value })}
                  />
                </div>
              </div>
              <div className="admin-form-group">
                <label htmlFor="f-writer">Nama penulis (dipaparkan kepada pembaca; boleh nama pena atau persona)</label>
                <input
                  id="f-writer"
                  value={writer}
                  onChange={(e) => setWriter(e.target.value)}
                  placeholder="cth. Nara Zahin"
                />
              </div>
              {series?.kind === "baharu" ? (
                <div className="admin-form-group">
                  <label htmlFor="f-series">Tajuk siri baharu</label>
                  <input id="f-series" value={seriesTitle} onChange={(e) => setSeriesTitle(e.target.value)} />
                </div>
              ) : null}

              {review.source ? (
                <>
                  <h3>Karya asal</h3>
                  {(["title", "author", "language", "provenance"] as const).map((key) => (
                    <div className="admin-form-group" key={key}>
                      <label>
                        {{ title: "Tajuk asal", author: "Pengarang asal", language: "Bahasa asal", provenance: "Asal-usul teks" }[key]}
                      </label>
                      <input
                        value={review.source![key]}
                        onChange={(e) => setReview({ ...review, source: { ...review.source!, [key]: e.target.value } })}
                      />
                    </div>
                  ))}
                  <p className="admin-form-hint">Status hak karya asal ditetapkan kemudian di tab Sumber.</p>
                </>
              ) : null}

              {plan.sections.length ? (
                <>
                  <h3>Bab ({plan.sections.length})</h3>
                  <ol className="admin-form-hint">
                    {plan.sections.map((s) => (
                      <li key={s.slug}>
                        {s.title} ({s.words} perkataan)
                      </li>
                    ))}
                  </ol>
                </>
              ) : null}

              <h3>Watak ({review.characters.length})</h3>
              {review.characters.length === 0 ? <p className="admin-form-hint">Tiada watak.</p> : null}
              {review.characters.map((c, i) => (
                <div className="admin-form-row" key={i}>
                  <div className="admin-form-group">
                    <input
                      aria-label="Nama watak"
                      value={c.name}
                      onChange={(e) =>
                        setReview({ ...review, characters: review.characters.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })
                      }
                    />
                  </div>
                  <div className="admin-form-group">
                    <input
                      aria-label="Peranan"
                      value={c.role}
                      onChange={(e) =>
                        setReview({ ...review, characters: review.characters.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)) })
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className="admin-btn admin-btn-sm admin-btn-outline"
                    onClick={() => setReview({ ...review, characters: review.characters.filter((_, j) => j !== i) })}
                  >
                    Buang
                  </button>
                </div>
              ))}

              <h3>Latar tempat ({review.places.length})</h3>
              {review.places.length === 0 ? <p className="admin-form-hint">Tiada latar tempat.</p> : null}
              {review.places.map((c, i) => (
                <div className="admin-form-row" key={i}>
                  <div className="admin-form-group">
                    <input
                      aria-label="Latar tempat"
                      value={c.name}
                      onChange={(e) => setReview({ ...review, places: review.places.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
                    />
                  </div>
                  <div className="admin-form-group">
                    <input
                      aria-label="Keterangan latar tempat"
                      value={c.description}
                      onChange={(e) => setReview({ ...review, places: review.places.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })}
                    />
                  </div>
                  <button
                    type="button"
                    className="admin-btn admin-btn-sm admin-btn-outline"
                    onClick={() => setReview({ ...review, places: review.places.filter((_, j) => j !== i) })}
                  >
                    Buang
                  </button>
                </div>
              ))}

              <h3>Latar masa ({review.times.length})</h3>
              {review.times.length === 0 ? <p className="admin-form-hint">Tiada latar masa.</p> : null}
              {review.times.map((c, i) => (
                <div className="admin-form-row" key={i}>
                  <div className="admin-form-group">
                    <input
                      aria-label="Latar masa"
                      value={c.name}
                      onChange={(e) => setReview({ ...review, times: review.times.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
                    />
                  </div>
                  <div className="admin-form-group">
                    <input
                      aria-label="Keterangan latar masa"
                      value={c.description}
                      onChange={(e) => setReview({ ...review, times: review.times.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })}
                    />
                  </div>
                  <button
                    type="button"
                    className="admin-btn admin-btn-sm admin-btn-outline"
                    onClick={() => setReview({ ...review, times: review.times.filter((_, j) => j !== i) })}
                  >
                    Buang
                  </button>
                </div>
              ))}

              <h3>Glosari ({review.glossary.length})</h3>
              <p className="admin-form-hint">Tooltip hanya muncul pada kemunculan pertama setiap istilah dalam halaman bacaan.</p>
              {review.glossary.length === 0 ? <p className="admin-form-hint">Tiada istilah glosari.</p> : null}
              {review.glossary.map((g, i) => (
                <div key={i}>
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <input
                      aria-label="Istilah"
                      value={g.term}
                      onChange={(e) =>
                        setReview({ ...review, glossary: review.glossary.map((x, j) => (j === i ? { ...x, term: e.target.value } : x)) })
                      }
                    />
                  </div>
                  <div className="admin-form-group" style={{ flex: 2 }}>
                    <input
                      aria-label="Maksud"
                      value={g.meaning}
                      onChange={(e) =>
                        setReview({ ...review, glossary: review.glossary.map((x, j) => (j === i ? { ...x, meaning: e.target.value } : x)) })
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className="admin-btn admin-btn-sm admin-btn-outline"
                    onClick={() => setReview({ ...review, glossary: review.glossary.filter((_, j) => j !== i) })}
                  >
                    Buang
                  </button>
                </div>
                {glossaryProblems.filter((p) => p.term === g.term.trim()).map((p) => (
                  <p key={p.term} className="admin-form-hint" role="alert" style={{ color: "var(--a-warn, #8a5a00)" }}>
                    "{p.term}" tidak ditemui sebagai perkataan penuh dalam teks, jadi tooltipnya tidak akan muncul.
                    {p.suggestion ? ` Teks menulis "${p.suggestion}": eja istilah sama seperti dalam teks.` : " Eja istilah sama seperti dalam teks, atau buangnya."}
                  </p>
                ))}
                </div>
              ))}
              <button
                type="button"
                className="admin-btn admin-btn-sm admin-btn-outline"
                onClick={() => setReview({ ...review, glossary: [...review.glossary, { term: "", meaning: "" }] })}
              >
                + Tambah istilah
              </button>

              <h3>Gambar ({review.visuals.filter((v) => !v.removed).length})</h3>
              <p className="admin-form-hint">
                Arahan gambar disediakan oleh chatbot. Anda boleh ubah sebelum menyimpan; selepas disimpan, arahan penuh boleh
                disalin dan imej dimuat naik di editor karya. Gambar dalam teks akan mendapat penanda bernombor yang boleh dialihkan dalam manuskrip.
              </p>
              {review.visuals.map((v, i) => (
                <div className="admin-section" key={v.originalIndex} style={v.removed ? { opacity: 0.45 } : undefined}>
                  <strong>{v.role === "hero" ? "Hero" : "Inline"}</strong> · {v.aspectRatio}
                  {v.sectionSlug ? <> · {v.sectionSlug}</> : null}
                  {v.role === "inline" ? (
                    <p className="admin-form-hint">
                      {v.anchorStart ? <>Selepas draf disimpan, gambar ini mendapat penanda berhampiran petikan: “{v.anchorStart}…”</> : "Kedudukan belum ditetapkan (petikan tidak ditemui)."}
                    </p>
                  ) : null}
                  {v.removed ? (
                    <button type="button" className="admin-btn admin-btn-sm admin-btn-outline" onClick={() => patchVisual(i, { removed: false })}>
                      Pulihkan
                    </button>
                  ) : (
                    <>
                      <div className="admin-form-group">
                        <label>Adegan (arahan untuk penjana imej)</label>
                        <textarea className="admin-textarea" rows={4} value={v.scene} onChange={(e) => patchVisual(i, { scene: e.target.value })} />
                      </div>
                      <div className="admin-form-row">
                        <div className="admin-form-group" style={{ flex: 2 }}>
                          <label>Teks alternatif</label>
                          <input value={v.altText} onChange={(e) => patchVisual(i, { altText: e.target.value })} />
                        </div>
                        <div className="admin-form-group">
                          <label>Nisbah</label>
                          <select value={v.aspectRatio} onChange={(e) => patchVisual(i, { aspectRatio: e.target.value })}>
                            {RATIOS.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                        {v.role === "inline" ? (
                          <div className="admin-form-group">
                            <label>Letak</label>
                            <select value={v.place} onChange={(e) => patchVisual(i, { place: e.target.value as "before" | "after" })}>
                              <option value="after">Selepas perenggan</option>
                              <option value="before">Sebelum perenggan</option>
                            </select>
                          </div>
                        ) : null}
                      </div>
                      <div className="admin-form-actions">
                        <CopyButton text={v.finalPrompt} label="Salin arahan gambar penuh" />
                        <button type="button" className="admin-btn admin-btn-sm admin-btn-outline" onClick={() => patchVisual(i, { removed: true })}>
                          Buang gambar ini
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              <p className="admin-form-hint">
                {plan.stats.storedWords} perkataan
                {plan.credits.length ? ` · kredit: ${plan.credits.map((c) => `${c.guestName} (${c.roleLabel})`).join(", ")}` : ""}
              </p>
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
