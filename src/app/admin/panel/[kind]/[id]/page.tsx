import { notFound } from "next/navigation";
import { getDb, hasDb } from "../../../../../lib/db";
import { NOT_READY_MESSAGE, panelReady } from "../../../../../lib/panel/ready";
import { panelView } from "../../../../../lib/panel/view";
import PanelCompare from "../../../../../components/admin/PanelCompare";
import PanelRatingCard from "../../../../../components/admin/PanelRatingCard";

export const dynamic = "force-dynamic";

const dateText = (iso: string) => new Date(iso).toLocaleString("ms-MY", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

/** The full view of one piece's assessment, in the Penilaian AI module: summary, comparison between reviewers, history. Rating itself happens on the piece. */
export default async function PanelPieceDetail({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind: rawKind, id: rawId } = await params;
  const kind = rawKind === "work" || rawKind === "submission" ? rawKind : null;
  if (!kind || !hasDb()) notFound();
  const id = decodeURIComponent(rawId);
  if (!(await panelReady(getDb()))) {
    return <div className="admin-panel-ai"><header className="admin-page-header"><h1>Penilaian AI</h1><p className="admin-page-sub">{NOT_READY_MESSAGE}</p></header></div>;
  }
  const view = await panelView(getDb(), kind, id);
  const editHref = kind === "work" ? `/admin/works/${encodeURIComponent(id)}#panel` : `/admin/submissions/${encodeURIComponent(id)}`;
  const active = view.active;
  const threshold = Number(view.settings.thresholdText);

  return (
    <div className="admin-panel-ai">
      <header className="admin-page-header">
        <p><a href="/admin/panel?tab=karya">&larr; Penilaian AI</a></p>
        <h1>{view.title || "Penilaian AI"}</h1>
        <p className="admin-page-sub">
          Penilai rasmi: <strong>{view.settings.referenceName}</strong>. Syarat skor: min lebih daripada {view.settings.thresholdText}. Untuk menyediakan penilaian atau menampal jawapan, buka{" "}
          <a href={editHref}>tab Penilaian AI pada karya</a>.
        </p>
      </header>

      {view.problem ? <div className="admin-alert admin-alert-info" role="status">{view.problem}</div> : null}
      {!active && view.eligible ? <p>Teks semasa belum dinilai. <a href={editHref}>Sediakan penilaian pada karya</a>.</p> : null}

      {active?.compare ? <PanelCompare compare={active.compare} threshold={threshold} /> : null}
      {active && !active.compare ? <p>Belum ada penilaian sah untuk teks ini.</p> : null}

      {active && active.timeline.length > 0 ? (
        <section>
          <h3>Sejarah keputusan</h3>
          <p className="admin-form-hint">Setiap penambahan atau pembatalan, dengan min sejurus selepasnya. Rekod ini tidak boleh diubah.</p>
          <ol>{active.timeline.map((t, i) => <li key={i}>{dateText(t.at)}: {t.what}{t.by ? ` oleh ${t.by}` : ""}; min {t.meanText} daripada {t.count}, {t.meets ? "melepasi" : "tidak melepasi"} syarat skor.</li>)}</ol>
        </section>
      ) : null}

      {active && active.ratings.length > 0 ? (
        <section>
          <h3>Semua jawapan penilai</h3>
          {active.ratings.map((r) => <PanelRatingCard key={r.id} r={r} />)}
        </section>
      ) : null}

      {view.history.length > 0 ? (
        <section>
          <h3>Versi teks yang lebih lama</h3>
          <p className="admin-form-hint">Penilaian ini benar untuk teks lama sahaja.</p>
          {view.history.map((h) => (
            <details key={h.snapshotId}>
              <summary>{h.refCode} · {dateText(h.createdAt)} · rubrik {h.rubric} · {h.result.count === 0 ? "tiada penilaian dikira" : `min ${h.result.meanText} (${h.result.count})`}</summary>
              {h.ratings.map((r) => <PanelRatingCard key={r.id} r={r} />)}
            </details>
          ))}
        </section>
      ) : null}
    </div>
  );
}
