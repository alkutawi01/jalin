import { COMPONENTS } from "../../lib/panel/rubric";
import type { RatingView } from "../../lib/panel/view";
import { Notice } from "./langganan-ui";

const when = (iso: string) => new Date(iso).toLocaleString("ms-MY", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

/** One reviewer's answer, filled in: verdict, K1 to K6 with score, reference and reason. No state, so a server page can render it too. */
export default function PanelRatingCard({ r, open }: { r: RatingView; open?: boolean }) {
  return (
    <details className={`admin-panel-rating${r.voided ? " is-voided" : ""}`} open={open ? true : undefined}>
      <summary>
        <strong>{r.reviewer}</strong>
        {r.status === "valid" ? `: ${r.composite}` : ": jawapan ditolak"}
        {r.status === "valid" && !r.counted ? " · tambahan, tidak dikira" : ""}
        {r.voided ? " · dibatalkan" : ""}
      </summary>
      <div className="admin-panel-rating-body">
        <p className="admin-form-hint">{when(r.createdAt)}{r.createdBy ? ` oleh ${r.createdBy}` : ""}</p>
        {r.voided ? <Notice kind="info">Dibatalkan{r.voidedBy ? ` oleh ${r.voidedBy}` : ""}: {r.voidReason}</Notice> : null}
        {r.status === "invalid" ? <Notice kind="error"><ul>{r.errors.map((e, i) => <li key={i}>{e}</li>)}</ul></Notice> : null}
        {r.verdict ? <p><strong>Verdik:</strong> {r.verdict}</p> : null}
        {r.scores ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Komponen</th><th>Skor</th><th>Rujukan dalam karya</th><th>Sebab</th></tr></thead>
              <tbody>
                {COMPONENTS.filter((c) => r.scores && c.key in r.scores).map((c) => {
                  const s = r.scores![c.key]!;
                  return (
                    <tr key={c.key}>
                      <td>{c.code} {c.title} <span className="admin-form-hint">({c.weight}%)</span></td>
                      <td>{s.score === null ? "N/A" : s.score}</td>
                      <td>{s.evidence ? <>&ldquo;{s.evidence.replace(/^["“]|["”]$/g, "")}&rdquo;{s.evidenceOk === false ? <span className="admin-form-hint"> (diolah semula, bukan petikan harfiah)</span> : null}</> : ""}</td>
                      <td>{s.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </details>
  );
}
