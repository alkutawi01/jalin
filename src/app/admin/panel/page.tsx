import { getDb, hasDb } from "../../../lib/db";
import { panelSummary, type SummaryView } from "../../../lib/panel/view";
import { ANCHORS_SUMMARY } from "./anchors";
import { BETWEEN_ANCHORS, COMPONENTS, FORMAT_NAME, GENERAL_ANCHORS, RUBRIC_VERSION } from "../../../lib/panel/rubric";
import PanelSettingsForm from "../../../components/admin/PanelSettingsForm";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "ringkasan", label: "Ringkasan" },
  { id: "karya", label: "Karya" },
  { id: "kaedah", label: "Kaedah" },
  { id: "rubrik", label: "Rubrik" },
  { id: "tetapan", label: "Tetapan" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const TYPE = { cerpen: "Cerpen", novela: "Novela", bersiri: "Bersiri" } as Record<string, string>;

function Summary({ data }: { data: SummaryView }) {
  const t = data.settings.thresholdText;
  const peak = Math.max(1, ...data.distribution.map((d) => d.count));
  return (
    <>
      <div className="admin-panel-tiles">
        <div className="admin-panel-tile"><div className="admin-panel-big">{data.works.eligible}</div><div className="admin-panel-label">karya boleh dinilai</div></div>
        <div className="admin-panel-tile"><div className="admin-panel-big">{data.works.rated}</div><div className="admin-panel-label">sudah dinilai{data.works.stale > 0 ? `, ${data.works.stale} teks sudah berubah` : ""}</div></div>
        <div className="admin-panel-tile"><div className="admin-panel-big">{data.works.notRated}</div><div className="admin-panel-label">belum dinilai</div></div>
        <div className="admin-panel-tile"><div className="admin-panel-big">{data.works.meets}</div><div className="admin-panel-label">melepasi (&gt; {t})</div></div>
        <div className="admin-panel-tile"><div className="admin-panel-big">{data.works.notMeets}</div><div className="admin-panel-label">tidak melepasi</div></div>
      </div>

      <h3>Taburan min karya yang dinilai</h3>
      {data.works.rated === 0 ? <p className="admin-form-hint">Belum ada karya dinilai.</p> : (
        <ul className="admin-panel-bars">
          {data.distribution.map((d) => (
            <li key={d.label}><span className="admin-panel-bar-label">{d.label}</span> <meter className="admin-panel-bar" min={0} max={peak} value={d.count} aria-label={`${d.label}: ${d.count} karya`} /> <strong>{d.count}</strong></li>
          ))}
        </ul>
      )}

      <h3>Purata setiap komponen (penilaian rasmi)</h3>
      <div className="admin-panel-matrix-wrap">
        <table className="admin-panel-matrix">
          <thead><tr><th>Komponen</th><th>Wajaran</th><th>Purata skor</th><th>Graf (1 hingga 10)</th><th>Bilangan</th></tr></thead>
          <tbody>
            {data.components.map((c) => (
              <tr key={c.code}>
                <td>{c.code} {c.title}</td><td>{c.weight}%</td><td><strong>{c.average ?? "tiada"}</strong></td>
                <td>{c.average ? <meter className="admin-panel-bar" min={1} max={10} value={Number(c.average)} aria-label={`${c.code}: ${c.average}`} /> : null}</td>
                <td>{c.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="admin-form-hint">Komponen yang purata skornya paling rendah ialah tempat paling lemah merentas karya yang dinilai.</p>

      <h3>Kualiti jawapan</h3>
      <div className="admin-panel-tiles">
        <div className="admin-panel-tile"><div className="admin-panel-big">{data.quality.countedRatings}</div><div className="admin-panel-label">penilaian rasmi dikira</div></div>
        <div className="admin-panel-tile"><div className="admin-panel-big">{data.quality.supplementaryRatings}</div><div className="admin-panel-label">tambahan (model lain, tidak dikira)</div></div>
        <div className="admin-panel-tile"><div className="admin-panel-big">{data.quality.invalidAnswers}</div><div className="admin-panel-label">jawapan ditolak</div></div>
        <div className="admin-panel-tile"><div className="admin-panel-big">{data.quality.flaggedRatings}</div><div className="admin-panel-label">dengan rujukan diolah semula</div></div>
      </div>
    </>
  );
}

function Works({ data }: { data: SummaryView }) {
  if (data.rows.length === 0) return <p className="admin-form-hint">Tiada cerpen, novela atau bersiri.</p>;
  return (
    <div className="admin-panel-matrix-wrap">
      <table className="admin-panel-matrix">
        <thead><tr><th>Tajuk</th><th>Jenis</th><th>Status</th><th>Penilaian AI</th><th></th></tr></thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={`${r.kind}-${r.id}`}>
              <td><strong>{r.title}</strong>{r.kind === "submission" ? <div className="admin-form-hint">Kiriman</div> : null}</td>
              <td>{TYPE[r.workType] ?? r.workType}</td>
              <td>{r.status}</td>
              <td>
                {r.mean === null ? "Belum dinilai" : `Min ${r.mean}: ${r.meets ? "melepasi" : "tidak melepasi"}`}
                {r.stale && r.mean !== null ? <div className="admin-form-hint">Teks sudah berubah sejak penilaian terakhir.</div> : null}
                {r.flagged > 0 ? <div className="admin-form-hint">{r.flagged} dengan petikan tidak disahkan</div> : null}
              </td>
              <td><a className="admin-btn admin-btn-sm admin-btn-outline" href={`/admin/panel/${r.kind}/${encodeURIComponent(r.id)}`}>Lihat penilaian</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Method({ data }: { data: SummaryView }) {
  const t = data.settings.thresholdText;
  return (
    <>
      <p>Panel Bacaan AI ialah syarat skor dalaman. Ia tidak menerbitkan, tidak menerima kiriman dan tidak menggantikan semakan hak, privasi, kredit atau keputusan editor. Pembaca tidak melihat apa-apa daripadanya.</p>
      <h3>Aliran, daripada halaman karya</h3>
      <ol>
        <li>Buka karya (cerpen, novela atau bersiri) dan pilih tab <strong>Penilaian AI</strong>. Untuk kiriman luar, bahagian yang sama ada pada halaman kiriman.</li>
        <li><strong>Sediakan penilaian</strong>: sistem menyimpan salinan tepat teks yang akan dinilai, dan kod rujukan. Jika teks diubah kemudian, ia menjadi versi baharu dan perlu dinilai semula.</li>
        <li><strong>Salin arahan penuh</strong> dan tampal dalam sesi baharu yang bersih pada {data.settings.referenceName}. Arahan mengandungi rubrik, sauh skor, format jawapan dan teks karya.</li>
        <li>Salin jawapannya, kemudian tekan <strong>Tampal jawapan</strong>. Skor, petikan, sebab dan verdik terisi sendiri.</li>
      </ol>
      <h3>Peraturan</h3>
      <ul>
        <li>Skor bagi setiap enam komponen ialah 1.0 hingga 10.0 (langkah 0.5). Skor komposit dikira oleh sistem sebagai purata berwajaran; penilai tidak menulis jumlah.</li>
        <li>Hanya penilaian <strong>{data.settings.referenceName}</strong> dikira dalam min. Model lain disimpan sebagai tambahan.</li>
        <li>Satu penilaian sudah cukup. Penilaian tambahan daripada {data.settings.referenceName} dalam sesi lain dimasukkan ke dalam min.</li>
        <li>Karya melepasi syarat skor hanya apabila min <strong>lebih daripada {t}</strong>. Tepat {t} tidak melepasi.</li>
        <li>Jawapan mesti mengulang kod rujukan, mengikut format tetap, dan menyalin awal dan akhir teks. Jawapan yang tidak mematuhinya ditolak dan disimpan sebagai ditolak.</li>
        <li>Petikan bukti disemak terhadap teks. Petikan yang tidak ditemui ditanda pada penilaian tetapi tidak menolaknya.</li>
        <li>Penilaian tidak diubah atau dipadam. Ia boleh dibatalkan dengan sebab; pembatalan tidak mengubah rekod asal.</li>
      </ul>
      <h3>Had yang perlu diingat</h3>
      <ul>
        <li>Skor model yang sama berubah sedikit antara sesi (kira-kira 0.1 hingga 0.3). Untuk karya hampir ambang, nilai sekali lagi dan baca min.</li>
        <li>Sebahagian model memotong kotak input pada kira-kira 32,000 aksara. Untuk karya yang lebih panjang, guna model yang menerima teks panjang atau muat naik fail, dan tampal jawapannya; ia disimpan sebagai tambahan jika bukan penilai rasmi.</li>
      </ul>
    </>
  );
}

function Rubric() {
  return (
    <>
      <p>Rubrik <strong>{RUBRIC_VERSION}</strong>, format jawapan <strong>{FORMAT_NAME}</strong>. Semua enam komponen wajib bagi setiap karya; tiada N/A. Wajaran sama untuk cerpen, novela dan bersiri. Menukar apa-apa di sini ialah versi rubrik baharu; penilaian lama kekal untuk versinya.</p>
      <div className="admin-panel-matrix-wrap">
        <table className="admin-panel-matrix">
          <thead><tr><th>Komponen</th><th>Wajaran</th><th>Dinilai</th><th>Tidak dinilai di sini</th></tr></thead>
          <tbody>
            {COMPONENTS.map((c) => <tr key={c.code}><td><strong>{c.code} {c.title}</strong></td><td>{c.weight}%</td><td className="wrap">{c.judged}</td><td className="wrap">{c.notJudged}</td></tr>)}
          </tbody>
        </table>
      </div>
      <h3>Sauh skor</h3>
      <ul>{GENERAL_ANCHORS.map(([s, text]) => <li key={s}><strong>{s}</strong>: {text}</li>)}</ul>
      <p>{BETWEEN_ANCHORS}</p>
      <h3>Sauh khusus setiap komponen</h3>
      <div className="admin-panel-matrix-wrap">
        <table className="admin-panel-matrix">
          <thead><tr><th>Komponen</th><th>3</th><th>5</th><th>7</th><th>8.5</th><th>10</th></tr></thead>
          <tbody>
            {COMPONENTS.map((c) => <tr key={c.code}><td>{c.code}</td><td className="wrap">{c.anchors[3]}</td><td className="wrap">{c.anchors[5]}</td><td className="wrap">{c.anchors[7]}</td><td className="wrap">{c.anchors[8.5]}</td><td className="wrap">{c.anchors[10]}</td></tr>)}
          </tbody>
        </table>
      </div>
      <p className="admin-form-hint">{ANCHORS_SUMMARY}</p>
    </>
  );
}

/** Panel Bacaan AI: the module itself. Rating a piece happens on the piece (its Penilaian AI tab); this is overview, method, rubric and settings. */
export default async function PanelModulePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const asked = (await searchParams).tab;
  const tab: TabId = TABS.find((t) => t.id === asked)?.id ?? "ringkasan";
  let data: SummaryView | null = null;
  let problem: string | null = null;
  if (!hasDb()) problem = "Pangkalan data tidak tersedia.";
  else {
    try {
      data = await panelSummary(getDb());
    } catch (error) {
      console.error("[panel]", error);
      problem = "Jadual panel belum wujud pada pangkalan data ini. Migrasi 032 perlu dijalankan dahulu.";
    }
  }
  return (
    <div className="admin-panel-ai">
      <header className="admin-page-header">
        <h1>Penilaian AI</h1>
        <p className="admin-page-sub">Panel Bacaan AI: penilaian dalaman cerpen, novela dan bersiri oleh model AI. Penilaian dibuat pada halaman karya, tab <strong>Penilaian AI</strong>. Di sini: ringkasan, perbandingan, kaedah, rubrik dan tetapan.</p>
      </header>
      <nav className="admin-sub-nav" aria-label="Panel Bacaan AI">
        {TABS.map((t) => (
          <a key={t.id} href={t.id === "ringkasan" ? "/admin/panel" : `/admin/panel?tab=${t.id}`} className={`admin-btn admin-btn-sm${t.id === tab ? " admin-btn-primary" : " admin-btn-outline"}`} aria-current={t.id === tab ? "page" : undefined}>{t.label}</a>
        ))}
      </nav>
      {problem ? <div className="admin-alert admin-alert-error" role="alert">{problem}</div> : null}
      {data && tab === "ringkasan" ? <Summary data={data} /> : null}
      {data && tab === "karya" ? <Works data={data} /> : null}
      {data && tab === "kaedah" ? <Method data={data} /> : null}
      {tab === "rubrik" ? <Rubric /> : null}
      {tab === "tetapan" ? <PanelSettingsForm /> : null}
    </div>
  );
}
