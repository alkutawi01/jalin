"use client";

import { useState } from "react";
import {
  MASTER_PARSER_PROMPT,
  MASTER_PARSER_PROMPT_VERSION
} from "../../../../lib/admin/import/master-parser-prompt";

interface Issue {
  code: string;
  message: string;
}

interface PlanVisual {
  role: "hero" | "inline";
  sectionSlug: string | null;
  place: string;
  aspectRatio: string;
  altText: string;
  anchorStart: string | null;
  finalPrompt: string;
  reason: string | null;
}

interface PlanSummary {
  work: {
    title: string;
    slug: string;
    type: string;
    genre: string | null;
    audience: string;
    dek: string | null;
    readingMinutes: number;
  };
  stats: {
    manuscriptWords: number;
    storedWords: number;
    parserReadingMinutes: number | null;
    readingMinutes: number;
    sectionCount: number;
  };
  credits: { guestName: string; roleLabel: string }[];
  characters: { name: string; role: string; firstAppearanceSection: string | null }[];
  glossary: string[];
  sections: { slug: string; title: string; position: number; words: number; start: string; end: string }[];
  visuals: PlanVisual[];
  source: { title: string | null; author: string | null; language: string | null } | null;
}

interface DryRunResponse {
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
  report?: string;
  plan?: PlanSummary | null;
  canCreate?: boolean;
  error?: string;
}

interface CreatedResponse {
  ok: boolean;
  workId: string;
  slug: string;
  warnings: string[];
  visualRequests: { id: number; role: string; finalPrompt: string; altText: string }[];
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  }
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  return (
    <button
      type="button"
      className="admin-btn admin-btn-outline admin-btn-sm"
      onClick={async () => {
        const ok = await copyText(text);
        setState(ok ? "done" : "failed");
        setTimeout(() => setState("idle"), 2000);
      }}
    >
      {state === "done" ? "Disalin" : state === "failed" ? "Gagal — salin manual" : label}
    </button>
  );
}

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export default function ImportWorkPage() {
  const [answer, setAnswer] = useState("");
  const [manuscript, setManuscript] = useState("");
  const [slugOverride, setSlugOverride] = useState("");
  const [busy, setBusy] = useState<"idle" | "check" | "create">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DryRunResponse | null>(null);
  const [checkedKey, setCheckedKey] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedResponse | null>(null);

  const currentKey = `${answer}\u0000${manuscript}\u0000${slugOverride}`;
  const inputsChanged = checkedKey !== null && checkedKey !== currentKey;
  const canCreate = !!result?.ok && !!result.canCreate && !inputsChanged && !created && busy === "idle";

  async function submit(dryRun: boolean) {
    setBusy(dryRun ? "check" : "create");
    setError(null);
    try {
      const response = await fetch("/api/admin/works/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer, manuscript, dryRun, slugOverride: slugOverride || undefined })
      });
      const data = await response.json();
      if (dryRun) {
        if (response.status === 401) throw new Error("Sesi tamat. Log masuk semula.");
        if (data.error && !data.errors) throw new Error(data.error);
        setResult(data as DryRunResponse);
        setCheckedKey(currentKey);
        setCreated(null);
      } else {
        if (!response.ok) {
          throw new Error(data.error ?? data.errors?.[0]?.message ?? "Gagal mencipta draf.");
        }
        setCreated(data as CreatedResponse);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setBusy("idle");
    }
  }

  const plan = result?.plan ?? null;

  return (
    <div className="admin-form-page">
      <header className="admin-page-header">
        <h1>Import daripada Master Parser</h1>
        <p className="admin-page-sub">
          Manuskrip → chatbot → semakan → draf. Import hanya mencipta draf; penerbitan kekal keputusan editor.
        </p>
      </header>

      <section className="admin-section">
        <h2 className="admin-form-section-title">Langkah 1 — Salin Prompt Master ({MASTER_PARSER_PROMPT_VERSION})</h2>
        <p className="admin-form-hint">
          Tampal prompt ini dalam chatbot (ChatGPT/Claude), kemudian lampirkan atau tampal manuskrip penuh. Satu kali sahaja.
        </p>
        <textarea className="admin-textarea" readOnly rows={6} value={MASTER_PARSER_PROMPT} />
        <div className="admin-form-actions">
          <CopyButton text={MASTER_PARSER_PROMPT} label="Salin prompt" />
        </div>
      </section>

      <section className="admin-section">
        <h2 className="admin-form-section-title">Langkah 2 — Tampal jawapan chatbot</h2>
        <p className="admin-form-hint">Salin keseluruhan jawapan (JSON + Editor Report).</p>
        <textarea
          className="admin-textarea"
          rows={8}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Tampal jawapan chatbot di sini…"
        />
      </section>

      <section className="admin-section">
        <h2 className="admin-form-section-title">Langkah 3 — Tampal manuskrip</h2>
        <p className="admin-form-hint">
          Manuskrip yang sama seperti yang diberi kepada chatbot. Teks tidak diubah; hanya pemisah perenggan diseragamkan.{" "}
          <span className="admin-word-count">{wordCount(manuscript)} perkataan</span>
        </p>
        <textarea
          className="admin-textarea"
          rows={8}
          value={manuscript}
          onChange={(e) => setManuscript(e.target.value)}
          placeholder="Tampal manuskrip di sini…"
        />
        <div className="admin-form-group">
          <label htmlFor="slug-override">Slug (pilihan — kosongkan untuk guna cadangan chatbot)</label>
          <input
            id="slug-override"
            value={slugOverride}
            onChange={(e) => setSlugOverride(e.target.value)}
            placeholder="cth. sekuntum-bunga-untuk-alia"
          />
        </div>
      </section>

      {error ? <div className="admin-alert admin-alert-error">{error}</div> : null}

      <div className="admin-form-actions">
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          disabled={busy !== "idle" || !answer.trim() || !manuscript.trim()}
          onClick={() => submit(true)}
        >
          {busy === "check" ? "Menyemak…" : "Semak (tiada apa disimpan)"}
        </button>
        <button type="button" className="admin-btn admin-btn-outline" disabled={!canCreate} onClick={() => submit(false)}>
          {busy === "create" ? "Mencipta…" : "Cipta draf"}
        </button>
      </div>
      {inputsChanged ? (
        <p className="admin-form-hint">Input telah berubah selepas semakan terakhir; semak semula sebelum mencipta draf.</p>
      ) : null}

      {result ? (
        <section className="admin-section">
          <h2 className="admin-form-section-title">Keputusan semakan</h2>
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
          {result.ok && result.errors.length === 0 ? (
            <div className="admin-alert admin-alert-success">
              Semakan lulus. {result.canCreate ? "Draf boleh dicipta." : "Draf tidak boleh dicipta (pangkalan data tidak tersedia)."}
            </div>
          ) : null}
        </section>
      ) : null}

      {created ? (
        <section className="admin-section">
          <div className="admin-alert admin-alert-success">
            Draf dicipta: <a href={`/admin/works/${created.workId}`}>{created.workId}</a> (<code>{created.slug}</code>). Belum
            diterbitkan.
          </div>
          {created.warnings.map((w, i) => (
            <div key={i} className="admin-alert admin-alert-warning">
              {w}
            </div>
          ))}
          <p className="admin-form-hint">
            Langkah seterusnya: tambah kredit, sediakan gambar daripada arahan di bawah, kemudian naikkan status.
          </p>
        </section>
      ) : null}

      {plan ? (
        <section className="admin-section">
          <h2 className="admin-form-section-title">Ringkasan</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <tbody>
                <tr><th>Tajuk</th><td>{plan.work.title}</td></tr>
                <tr><th>Slug</th><td><code>{plan.work.slug}</code></td></tr>
                <tr><th>Jenis / Genre</th><td>{plan.work.type} / {plan.work.genre ?? "—"}</td></tr>
                <tr><th>Dek</th><td>{plan.work.dek ?? "—"}</td></tr>
                <tr>
                  <th>Bacaan</th>
                  <td>
                    {plan.stats.readingMinutes} minit ({plan.stats.storedWords} perkataan disimpan daripada {plan.stats.manuscriptWords})
                  </td>
                </tr>
                <tr>
                  <th>Kredit</th>
                  <td>{plan.credits.length ? plan.credits.map((c) => `${c.guestName} (${c.roleLabel})`).join(", ") : "Tiada — tambah selepas import"}</td>
                </tr>
                <tr><th>Watak</th><td>{plan.characters.map((c) => c.name).join(", ") || "—"}</td></tr>
                <tr><th>Glosari</th><td>{plan.glossary.join(", ") || "—"}</td></tr>
                {plan.source ? (
                  <tr><th>Sumber asal</th><td>{plan.source.title ?? "—"} · {plan.source.author ?? "—"} · {plan.source.language ?? "—"}</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {plan.sections.length > 0 ? (
            <>
              <h3>Bab ({plan.sections.length})</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>#</th><th>Slug</th><th>Tajuk</th><th>Perkataan</th><th>Bermula</th><th>Berakhir</th></tr>
                  </thead>
                  <tbody>
                    {plan.sections.map((s) => (
                      <tr key={s.slug}>
                        <td>{s.position}</td>
                        <td><code>{s.slug}</code></td>
                        <td>{s.title}</td>
                        <td>{s.words}</td>
                        <td>{s.start}…</td>
                        <td>…{s.end}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          {plan.visuals.length > 0 ? (
            <>
              <h3>Arahan gambar ({plan.visuals.length})</h3>
              <p className="admin-form-hint">
                Arahan penuh (gaya Jalin + adegan). Salin ke penjana imej pilihan anda. Peraturan: muka manusia tidak jelas; satu
                imej dahulu.
              </p>
              {plan.visuals.map((v, i) => (
                <div key={i} className="admin-section">
                  <strong>{v.role === "hero" ? "Hero" : `Inline (${v.sectionSlug ?? "—"})`}</strong> · {v.aspectRatio}
                  {v.anchorStart ? <> · selepas: “{v.anchorStart}…”</> : null}
                  <p className="admin-form-hint">Alt: {v.altText || "—"}</p>
                  <textarea className="admin-textarea" readOnly rows={6} value={v.finalPrompt} />
                  <div className="admin-form-actions">
                    <CopyButton text={v.finalPrompt} label="Salin arahan gambar" />
                  </div>
                </div>
              ))}
            </>
          ) : null}
        </section>
      ) : null}

      {result?.report ? (
        <section className="admin-section">
          <h2 className="admin-form-section-title">Editor Report (daripada chatbot)</h2>
          <pre className="admin-preview-body" style={{ whiteSpace: "pre-wrap" }}>{result.report}</pre>
        </section>
      ) : null}
    </div>
  );
}
