import { COMPONENTS } from "../../lib/panel/rubric";
import type { CompareView } from "../../lib/panel/view";

/**
 * The comparison between reviewers: summary, bar chart per component, table with the difference, and a map of where in the work each
 * reviewer drew on. Plain markup and SVG (no client code), so a server page renders it. Series colours are the admin tokens.
 */

const SERIES = ["panel-s1", "panel-s2", "panel-s3", "panel-s4"] as const;
const seriesOf = (i: number) => SERIES[i % SERIES.length];

const W = 640, H = 260, PAD_L = 36, PAD_R = 8, PAD_T = 10, PAD_B = 34;
const Y_MIN = 7, Y_MAX = 10;
const y = (v: number) => PAD_T + (1 - (Math.min(Y_MAX, Math.max(Y_MIN, v)) - Y_MIN) / (Y_MAX - Y_MIN)) * (H - PAD_T - PAD_B);

export default function PanelCompare({ compare, threshold }: { compare: CompareView; threshold: number }) {
  const { models } = compare;
  const groupW = (W - PAD_L - PAD_R) / COMPONENTS.length;
  const barW = Math.min(22, (groupW - 12) / Math.max(1, models.length));
  const yTicks = [7, 7.5, 8, 8.5, 9, 9.5, 10];
  const spread = (k: string) => { const v = models.map((m) => m.scores[k]).filter((x): x is number => x !== undefined); return v.length ? Math.max(...v) - Math.min(...v) : 0; };

  return (
    <div className="admin-panel-compare">
      <div className="admin-panel-kpis">
        {models.map((m, i) => (
          <div key={m.name} className="admin-panel-kpi">
            <div className="admin-panel-label"><span className={`admin-panel-swatch ${seriesOf(i)}`} aria-hidden="true" /> {m.name}</div>
            <div className="admin-panel-big">{m.mean}</div>
            <div className="admin-panel-label">{m.official ? "Penilai rasmi, dikira" : "Tambahan, tidak dikira"}{m.runs > 1 ? `, purata ${m.runs} sesi` : ""}</div>
          </div>
        ))}
      </div>

      <div className="admin-panel-summary">
        <div className="admin-panel-label">Rumusan</div>
        {compare.summary.map((line, i) => <p key={i}>{line}</p>)}
      </div>

      <h3>Skor setiap komponen</h3>
      <div className="admin-panel-legend">
        {models.map((m, i) => <span key={m.name}><span className={`admin-panel-swatch ${seriesOf(i)}`} aria-hidden="true" /> {m.name}</span>)}
        <span><span className="admin-panel-dash" aria-hidden="true" /> ambang {threshold}</span>
      </div>
      <svg className="admin-panel-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Graf bar skor K1 hingga K6 bagi ${models.map((m) => m.name).join(", ")}, dengan garis ambang ${threshold}`}>
        {yTicks.map((t) => (
          <g key={t}>
            <line className="admin-panel-grid" x1={PAD_L} x2={W - PAD_R} y1={y(t)} y2={y(t)} />
            <text className="admin-panel-axis" x={PAD_L - 6} y={y(t) + 4} textAnchor="end">{t}</text>
          </g>
        ))}
        {COMPONENTS.map((c, gi) => {
          const gx = PAD_L + gi * groupW + (groupW - barW * models.length) / 2;
          return (
            <g key={c.key}>
              {models.map((m, mi) => {
                const v = m.scores[c.key];
                if (v === undefined) return null;
                return <rect key={m.name} className={seriesOf(mi)} x={gx + mi * barW} y={y(v)} width={barW - 2} height={y(Y_MIN) - y(v)} rx={3}><title>{`${m.name}, ${c.code}: ${v}`}</title></rect>;
              })}
              <text className="admin-panel-axis" x={PAD_L + gi * groupW + groupW / 2} y={H - 12} textAnchor="middle">{c.code}</text>
            </g>
          );
        })}
        <line className="admin-panel-threshold" x1={PAD_L} x2={W - PAD_R} y1={y(threshold)} y2={y(threshold)} />
      </svg>

      <h3>Perbandingan, dengan beza antara penilai</h3>
      <div className="admin-panel-matrix-wrap">
        <table className="admin-panel-matrix">
          <thead>
            <tr><th>Komponen</th><th>Wajaran</th>{models.map((m) => <th key={m.name}>{m.name}</th>)}{models.length > 1 ? <th>Beza</th> : null}</tr>
          </thead>
          <tbody>
            {COMPONENTS.map((c) => (
              <tr key={c.key}>
                <td>{c.code} {c.title}</td>
                <td>{c.weight}%</td>
                {models.map((m) => <td key={m.name}>{m.scores[c.key] !== undefined ? m.scores[c.key]!.toFixed(1) : "tiada"}</td>)}
                {models.length > 1 ? <td className={spread(c.key) >= 0.5 ? "admin-panel-wide" : ""}>{spread(c.key).toFixed(1)}</td> : null}
              </tr>
            ))}
            <tr>
              <th scope="row">Min berwajaran</th><td>100%</td>
              {models.map((m) => <td key={m.name}><strong>{m.mean}</strong></td>)}
              {models.length > 1 ? <td><strong>{(Math.max(...models.map((m) => Number(m.mean))) - Math.min(...models.map((m) => Number(m.mean)))).toFixed(3)}</strong></td> : null}
            </tr>
          </tbody>
        </table>
      </div>

      <h3>Dari bahagian mana karya rujukan diambil</h3>
      {models.map((m, mi) => {
        const placed = COMPONENTS.map((c, i) => ({ code: c.code, n: i + 1, p: m.positions[c.key] })).filter((x): x is { code: string; n: number; p: number } => x.p !== null && x.p !== undefined);
        return (
          <div key={m.name}>
            <div className="admin-panel-label">{m.name}: {placed.length ? `rujukan dari ${Math.min(...placed.map((x) => x.p))}% hingga ${Math.max(...placed.map((x) => x.p))}% karya` : "tiada rujukan harfiah yang dapat dikesan"}</div>
            <svg className="admin-panel-map" viewBox="0 0 640 28" role="img" aria-label={`Lokasi rujukan ${m.name} dalam karya`}>
              <rect className="admin-panel-track" x={0} y={4} width={640} height={20} rx={4} />
              {placed.map((x) => (
                <g key={x.code}>
                  <circle className={seriesOf(mi)} cx={Math.min(632, Math.max(8, (x.p / 100) * 640))} cy={14} r={8}><title>{`${x.code} pada ${x.p}%`}</title></circle>
                  <text className="admin-panel-onseries" x={Math.min(632, Math.max(8, (x.p / 100) * 640))} y={18} textAnchor="middle">{x.n}</text>
                </g>
              ))}
            </svg>
          </div>
        );
      })}
      <p className="admin-form-hint">Nombor 1 hingga 6 ialah K1 hingga K6. Jalur ialah seluruh karya, dari permulaan (kiri) hingga akhir (kanan). Penilai AI biasanya menilai seluruh karya tetapi mengutip maknanya, bukan hurufnya, jadi rujukan yang diolah semula tidak dapat diletakkan pada peta.</p>
      {compare.notes.map((n, i) => <p key={i} className="admin-form-hint">{n}</p>)}

      <h3>Verdik setiap penilai</h3>
      <div className="admin-panel-kpis">
        {models.map((m, i) => (
          <div key={m.name} className="admin-panel-kpi">
            <div className="admin-panel-label"><span className={`admin-panel-swatch ${seriesOf(i)}`} aria-hidden="true" /> {m.name}</div>
            <p>{m.verdict ?? "Tiada verdik."}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
