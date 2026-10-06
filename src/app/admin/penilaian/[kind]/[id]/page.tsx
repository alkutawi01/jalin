"use client";

import { use, useCallback, useEffect, useState } from "react";
import LoadingBlock from "../../../../../components/admin/LoadingBlock";
import { confirmAction, toast } from "../../../../../lib/admin/dialogs";

interface Evidence { quote: string; verified: boolean }
interface Rating {
  id: string;
  reviewer: string;
  scores: Record<string, number>;
  reasons: Record<string, string>;
  evidence: Record<string, Evidence>;
  overall: number;
  label: string;
  audience: string;
  verdict: string;
  review: string;
  strengths: string[];
  weaknesses: string[];
  contentWarnings: string;
  status: string;
  isCurrent: boolean;
  stale: boolean;
  createdAt: string;
}
interface State {
  target: { kind: string; id: string; slug: string; title: string; type: string; eligible: boolean; reason: string | null; words: number; code: string; fileName: string };
  components: Array<{ key: string; label: string }>;
  prompt: string;
  promptWithFile: string;
  ratings: Rating[];
  consensus: { value: number; label: string; count: number } | null;
}
type Preview =
  | { ok: true; warnings: string[]; rating: Omit<Rating, "id" | "label" | "status" | "isCurrent" | "stale" | "createdAt"> }
  | { ok: false; errors: string[] };

const STATUS_LABEL: Record<string, string> = { accepted: "Diterima (belum disiarkan)", published: "Disiarkan", rejected: "Ditolak" };
const one = (value: number) => (Math.round(value * 10) / 10).toFixed(1);
const number = (value: number) => value.toLocaleString("ms-MY");

async function copy(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast(done, "success");
  } catch {
    // The clipboard API is refused in some browsers and frames: fall back to selecting the text in a hidden box.
    const box = document.createElement("textarea");
    box.value = text;
    box.setAttribute("readonly", "");
    box.style.position = "fixed";
    box.style.opacity = "0";
    document.body.appendChild(box);
    box.select();
    const ok = document.execCommand("copy");
    box.remove();
    toast(ok ? done : "Tidak dapat menyalin. Benarkan akses papan klip dan cuba lagi.", ok ? "success" : "error");
  }
}

function Parts({ components, rating }: { components: State["components"]; rating: Pick<Rating, "scores" | "reasons" | "evidence"> }) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr><th>Komponen</th><th>Skor</th><th>Sebab</th><th>Bukti</th></tr>
        </thead>
        <tbody>
          {components.map((c) => (
            <tr key={c.key}>
              <td>{c.label}</td>
              <td><strong>{rating.scores[c.key]}</strong>/10</td>
              <td>{rating.reasons[c.key]}</td>
              <td>
                “{rating.evidence[c.key]?.quote}”{" "}
                <span title={rating.evidence[c.key]?.verified ? "Petikan ditemui dalam teks" : "Petikan tidak ditemui dalam teks"}>
                  {rating.evidence[c.key]?.verified ? "✓ disahkan" : "✗ tidak disahkan"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Words({ rating }: { rating: Pick<Rating, "reviewer" | "verdict" | "review" | "strengths" | "weaknesses" | "audience" | "contentWarnings"> }) {
  return (
    <>
      <blockquote style={{ margin: "12px 0", paddingLeft: 14, borderLeft: "3px solid currentColor" }}>
        <p style={{ margin: 0, fontSize: 18 }}>“{rating.verdict}”</p>
        <footer className="admin-form-hint">— {rating.reviewer}</footer>
      </blockquote>
      <p style={{ whiteSpace: "pre-wrap" }}>{rating.review}</p>
      <p><strong>Kekuatan:</strong> {rating.strengths.join(" · ")}</p>
      <p><strong>Kelemahan:</strong> {rating.weaknesses.join(" · ")}</p>
      <p><strong>Sesuai untuk:</strong> {rating.audience}</p>
      {rating.contentWarnings ? <p><strong>Amaran kandungan:</strong> {rating.contentWarnings}</p> : null}
    </>
  );
}

export default function RatingPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = use(params);
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const query = `kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}`;

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/ratings?${query}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal memuatkan penilaian.");
      setState(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyFullText() {
    const res = await fetch(`/api/admin/full-text?${query}`);
    if (!res.ok) return toast("Gagal mengambil teks penuh.", "error");
    await copy(await res.text(), "Teks penuh disalin.");
  }

  async function submit(dryRun: boolean) {
    if (busy || !raw.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/ratings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, id, raw, dryRun }) });
      const data = await res.json().catch(() => ({}));
      if (dryRun) {
        if (data.ok === true || Array.isArray(data.errors)) setPreview(data);
        else setPreview({ ok: false, errors: [data.error || "Gagal menyemak jawapan."] });
        return;
      }
      if (!res.ok || data.ok !== true) {
        setPreview({ ok: false, errors: data.errors ?? [data.error || "Gagal menyimpan penilaian."] });
        return;
      }
      setState(data.state);
      setRaw("");
      setPreview(null);
      toast("Penilaian disimpan.", "success");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(rating: Rating, status: string) {
    if (status === "rejected" && !(await confirmAction(`Tolak penilaian ${rating.reviewer}? Ia kekal dalam sejarah tetapi tidak dikira dan tidak disiarkan.`, { danger: true, confirmLabel: "Ya, tolak" }))) return;
    const res = await fetch(`/api/admin/ratings/${rating.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (!res.ok) return toast((await res.json().catch(() => ({}))).error || "Gagal mengemas kini penilaian.", "error");
    await load();
  }

  if (error) return <div className="admin-form-page"><div className="admin-alert admin-alert-error" role="alert">{error}</div></div>;
  if (!state) return <LoadingBlock />;
  const { target } = state;
  const back = target.kind === "series" ? `/admin/series/${target.id}` : `/admin/works/${target.id}`;
  const current = state.ratings.filter((r) => r.isCurrent);
  const history = state.ratings.filter((r) => !r.isCurrent);

  return (
    <div className="admin-form-page">
      <header className="admin-page-header">
        <div className="admin-page-header-row">
          <div>
            <h1>Penilaian: {target.title}</h1>
            <p className="admin-page-sub">
              {target.type.charAt(0).toUpperCase() + target.type.slice(1)} · {number(target.words)} patah perkataan · <a href={back}>Kembali ke {target.kind === "series" ? "siri" : "karya"}</a>
            </p>
          </div>
        </div>
      </header>

      <section className="admin-section" aria-labelledby="rating-text-title">
        <h2 id="rating-text-title" className="admin-form-section-title">1. Teks penuh</h2>
        <p className="admin-form-hint">
          Seluruh teks {target.kind === "series" ? "siri (semua episod mengikut urutan)" : "karya (semua bab mengikut urutan)"} dalam satu fail, untuk dilampirkan atau ditampal ke chatbot.
        </p>
        <div className="admin-form-actions">
          <a className="admin-btn admin-btn-primary" href={`/api/admin/full-text?${query}`} download={target.fileName}>Muat turun teks penuh (.txt)</a>
          <button type="button" className="admin-btn admin-btn-outline" onClick={() => void copyFullText()}>Salin teks penuh</button>
        </div>
      </section>

      {!target.eligible ? (
        <div className="admin-alert admin-alert-warning" role="status">{target.reason}</div>
      ) : (
        <>
          <section className="admin-section" aria-labelledby="rating-prompt-title">
            <h2 id="rating-prompt-title" className="admin-form-section-title">2. Arahan untuk chatbot</h2>
            <p className="admin-form-hint">
              Arahan yang sama untuk semua chatbot. Buka sesi baharu bagi setiap chatbot, tampal arahan, kemudian salin seluruh jawapannya ke kotak di bawah.
              Kod rujukan teks sekarang: <strong>{target.code}</strong> (berubah apabila teks karya berubah).
            </p>
            <div className="admin-form-actions">
              <button type="button" className="admin-btn admin-btn-primary" onClick={() => void copy(state.prompt, "Arahan (bersama teks penuh) disalin.")}>Salin arahan bersama teks</button>
              <button type="button" className="admin-btn admin-btn-outline" onClick={() => void copy(state.promptWithFile, "Arahan disalin. Lampirkan fail teks penuh dalam chatbot.")}>Salin arahan sahaja (lampirkan fail)</button>
            </div>
            <p className="admin-form-hint">Untuk karya panjang, gunakan “arahan sahaja” dan lampirkan fail .txt yang dimuat turun; sesetengah chatbot memotong tampalan yang panjang.</p>
          </section>

          <section className="admin-section" aria-labelledby="rating-paste-title">
            <h2 id="rating-paste-title" className="admin-form-section-title">3. Tampal jawapan chatbot</h2>
            <div className="admin-form-group">
              <label htmlFor="rating-raw">Jawapan chatbot (seluruh blok [PENILAIAN_JALIN])</label>
              <textarea id="rating-raw" className="admin-textarea" rows={10} value={raw} onChange={(e) => { setRaw(e.target.value); setPreview(null); }} placeholder="[PENILAIAN_JALIN] … [/PENILAIAN_JALIN]" />
            </div>
            <div className="admin-form-actions">
              <button type="button" className="admin-btn admin-btn-outline" disabled={busy || !raw.trim()} onClick={() => void submit(true)}>Semak</button>
              <button type="button" className="admin-btn admin-btn-primary" disabled={busy || !raw.trim() || !preview || !preview.ok} onClick={() => void submit(false)}>Simpan penilaian</button>
            </div>
            {preview && !preview.ok ? (
              <div className="admin-alert admin-alert-error" role="alert">
                <strong>Jawapan ini tidak diterima:</strong>
                <ul>{preview.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
              </div>
            ) : null}
            {preview && preview.ok ? (
              <div data-testid="rating-preview">
                <div className="admin-alert admin-alert-success" role="status">
                  Dibaca: <strong>{preview.rating.reviewer}</strong> · keseluruhan <strong>{one(preview.rating.overall)}/10</strong>. Semak di bawah, kemudian tekan “Simpan penilaian”. Skor dan ayat tidak boleh disunting; jika tidak setuju, nilai semula.
                </div>
                {preview.warnings.length > 0 ? (
                  <div className="admin-alert admin-alert-warning" role="status"><ul>{preview.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></div>
                ) : null}
                <Words rating={preview.rating} />
                <Parts components={state.components} rating={preview.rating} />
              </div>
            ) : null}
          </section>
        </>
      )}

      <section className="admin-section" aria-labelledby="rating-list-title">
        <h2 id="rating-list-title" className="admin-form-section-title">Penilaian yang ada</h2>
        {state.consensus ? (
          <p>
            Konsensus: <strong>{one(state.consensus.value)}/10</strong> ({state.consensus.label}) daripada {state.consensus.count} penilai.
            {state.consensus.value < 8 ? " Di bawah 8: mengikut prinsip editorial, karya ini belum sedia diterbitkan." : ""}
          </p>
        ) : (
          <p className="admin-form-hint">Belum ada penilaian. Penilaian tidak wajib.</p>
        )}
        {current.map((rating) => (
          <article key={rating.id} className="admin-section" data-testid="rating-card">
            <h3>
              {rating.reviewer}: {one(rating.overall)}/10 <span className="admin-form-hint">({rating.label})</span>
            </h3>
            <p className="admin-form-hint">
              {STATUS_LABEL[rating.status] ?? rating.status} · {new Date(rating.createdAt).toLocaleDateString("ms-MY")}
              {rating.stale ? " · LAPUK: teks karya telah berubah sejak penilaian ini. Nilai semula." : ""}
            </p>
            <Words rating={rating} />
            <details>
              <summary>Komponen, sebab dan bukti</summary>
              <Parts components={state.components} rating={rating} />
            </details>
            <div className="admin-form-actions">
              {rating.status !== "published" && rating.status !== "rejected" && !rating.stale ? (
                <button type="button" className="admin-btn admin-btn-primary" onClick={() => void setStatus(rating, "published")}>Tandakan untuk disiarkan</button>
              ) : null}
              {rating.status === "published" ? (
                <button type="button" className="admin-btn admin-btn-outline" onClick={() => void setStatus(rating, "accepted")}>Tarik balik siaran</button>
              ) : null}
              {rating.status === "rejected" ? (
                <button type="button" className="admin-btn admin-btn-outline" onClick={() => void setStatus(rating, "accepted")}>Terima semula</button>
              ) : (
                <button type="button" className="admin-btn admin-btn-danger" onClick={() => void setStatus(rating, "rejected")}>Tolak</button>
              )}
            </div>
          </article>
        ))}
        {history.length > 0 ? (
          <details>
            <summary>Sejarah ({history.length} penilaian terdahulu)</summary>
            <ul>
              {history.map((rating) => (
                <li key={rating.id}>{rating.reviewer}: {one(rating.overall)}/10 · {new Date(rating.createdAt).toLocaleDateString("ms-MY")} · “{rating.verdict}”</li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>
    </div>
  );
}
