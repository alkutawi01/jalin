"use client";

/**
 * Top of a work's admin page: what it is, where it stands (a status stepper),
 * the ONE next step, and a compact publishing checklist whose chips jump to the
 * tab that fixes them. Replaces the long "Publication Readiness" block.
 */

interface Issue {
  code: string;
  message: string;
}
interface Gate {
  pass: boolean;
  blockers: Issue[];
}
export interface ReadinessLike {
  ready: boolean;
  checkedAt: string;
  gates: Record<"content" | "credits" | "visuals" | "privacy" | "rights" | "structure" | "workflow", Gate>;
  blockers: Issue[];
  warnings: Issue[];
}

const STEPS: { value: string; label: string }[] = [
  { value: "draft", label: "Draf" },
  { value: "review", label: "Semakan" },
  { value: "ready", label: "Sedia" },
  { value: "published", label: "Diterbitkan" }
];

const GATES: { key: keyof ReadinessLike["gates"]; label: string; tab: string }[] = [
  { key: "content", label: "Kandungan", tab: "content" },
  { key: "credits", label: "Kredit", tab: "credits" },
  { key: "visuals", label: "Gambar", tab: "content" },
  { key: "privacy", label: "Privasi", tab: "content" },
  { key: "rights", label: "Hak", tab: "source" },
  { key: "structure", label: "Struktur", tab: "sections" },
  { key: "workflow", label: "Aliran kerja", tab: "metadata" }
];

const TYPE_LABEL: Record<string, string> = {
  cerpen: "Cerpen",
  novela: "Novela",
  bersiri: "Bersiri",
  fragmen: "Fragmen",
  sinopsis: "Sinopsis"
};

const STATUS_ONLY = "status_not_publishable";

export default function WorkStatusPanel({
  workId,
  title,
  type,
  slug,
  status,
  readiness,
  loading,
  error,
  busy,
  onRecheck,
  onChangeStatus,
  onPublish,
  onPublishNow,
  onGoTab
}: {
  workId: string;
  title: string;
  type: string;
  slug: string;
  status: string;
  readiness: ReadinessLike | null;
  loading: boolean;
  error: string | null;
  busy: boolean;
  onRecheck: () => void;
  onChangeStatus: (next: string) => void;
  onPublish: () => void;
  /** Moves the work to Sedia and publishes it in one step. */
  onPublishNow: () => void;
  onGoTab: (tab: string) => void;
}) {
  const stepIndex = STEPS.findIndex((s) => s.value === status);
  // The stepper already shows the status, so a work that is merely still "Draf" is not a checklist problem.
  const realBlockers = readiness ? readiness.blockers.filter((b) => b.code !== STATUS_ONLY) : [];
  const gatePasses = (key: keyof ReadinessLike["gates"]) =>
    !readiness || readiness.gates[key]?.blockers.every((b) => b.code === STATUS_ONLY) !== false;
  const failing = readiness ? GATES.filter((g) => !gatePasses(g.key)) : [];
  const issueCount = realBlockers.length;
  const allClear = !!readiness && realBlockers.length === 0;

  let next: { label: string; run: () => void; disabled?: boolean; hint?: string } | null = null;
  if ((status === "draft" || status === "review") && allClear) {
    next = { label: "Terbitkan", run: onPublishNow };
  } else if (status === "draft") {
    next = { label: "Hantar untuk semakan", run: () => onChangeStatus("review") };
  } else if (status === "review") {
    next = {
      label: "Tandakan sedia",
      run: () => onChangeStatus("ready"),
      disabled: !allClear,
      hint: allClear ? undefined : "Selesaikan senarai semak di bawah dahulu."
    };
  } else if (status === "ready") {
    next = { label: "Terbitkan", run: onPublish, disabled: !allClear };
  }

  return (
    <section className="a-status" aria-label="Status karya">
      <div className="a-status-top">
        <div>
          <p className="a-status-kicker">
            {TYPE_LABEL[type] ?? type} · <code>{slug}</code> · {workId}
          </p>
          <h1>{title || "(belum bertajuk)"}</h1>
        </div>
        <div className="a-status-actions">
          <a href={`/admin/works/${workId}/preview`} className="a-btn">
            Pratonton
          </a>
          {status === "published" ? (
            <a href={`/kategori/${type}/${slug}`} className="a-btn" target="_blank" rel="noreferrer">
              Lihat di laman
            </a>
          ) : null}
          {next ? (
            <button
              type="button"
              className="a-btn a-btn-primary"
              onClick={next.run}
              disabled={busy || next.disabled}
              title={next.hint}
            >
              {busy ? "Sebentar…" : next.label}
            </button>
          ) : null}
        </div>
      </div>

      <ol className="a-steps" aria-label="Peringkat">
        {STEPS.map((step, index) => (
          <li
            key={step.value}
            className={`a-step${index < stepIndex ? " is-done" : ""}${index === stepIndex ? " is-current" : ""}`}
            aria-current={index === stepIndex ? "step" : undefined}
          >
            <span className="a-step-dot">{index < stepIndex ? "✓" : index + 1}</span>
            {step.label}
          </li>
        ))}
        {status === "archived" ? <li className="a-step is-current">Diarkibkan</li> : null}
      </ol>
      {next?.hint && status === "review" ? <p className="a-status-hint">{next.hint}</p> : null}

      {status !== "published" && status !== "archived" ? (
        <div className="a-check">
          <div className="a-check-head">
            <strong>Sedia untuk diterbitkan?</strong>
            {loading ? (
              <span className="a-check-state">Menyemak…</span>
            ) : readiness ? (
              <span className={`a-check-state ${allClear ? "is-ok" : "is-bad"}`}>
                {allClear ? "Semua lulus" : `${failing.length} bahagian belum lulus`}
              </span>
            ) : null}
            <button type="button" className="a-btn a-btn-quiet" onClick={onRecheck} disabled={loading}>
              Semak semula
            </button>
          </div>
          {error ? <p className="a-status-hint">{error}</p> : null}
          {readiness ? (
            <>
              <div className="a-chips">
                {GATES.map((gate) => {
                  const pass = gatePasses(gate.key);
                  return (
                    <button
                      type="button"
                      key={gate.key}
                      className={`a-chip ${pass ? "is-ok" : "is-bad"}`}
                      onClick={() => onGoTab(gate.tab)}
                      title={pass ? "Lulus" : "Klik untuk ke tab berkaitan"}
                    >
                      {pass ? "✓" : "!"} {gate.label}
                    </button>
                  );
                })}
              </div>
              {issueCount + readiness.warnings.length > 0 ? (
                <details className="a-check-details">
                  <summary>
                    Lihat butiran ({issueCount} perlu dibetulkan, {readiness.warnings.length} amaran)
                  </summary>
                  <ul>
                    {realBlockers.map((b) => (
                      <li key={b.code + b.message} className="is-bad">
                        {b.message}
                      </li>
                    ))}
                    {readiness.warnings.map((w) => (
                      <li key={w.code + w.message}>{w.message}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
