import { getDb, hasDb } from "../../../lib/db";
import { overview, type Overview } from "../../../lib/reader-auth/admin";
import { readerAccountsEnabled } from "../../../lib/reader-auth/enabled";
import { LanggananNav } from "../../../components/admin/langganan-ui";
import { readLastExport, type LastExport } from "../../../lib/reader-auth/maintenance";
import HaltSwitch from "./HaltSwitch";
import PaywallSwitch from "./PaywallSwitch";
import { isPaywallSwitchOn, countSamples } from "../../../lib/reader-auth/switches";

export const dynamic = "force-dynamic";

/** Langganan: where Izzat sees how many readers, cards and codes there are, and can stop redeeming at once. The owner only (permissions.ts). */
export default async function LanggananPage() {
  let data: Overview | null = null;
  let problem: string | null = null;
  let last: LastExport | null = null;
  let paywall = false;
  let samples = 0;
  if (!hasDb()) problem = "Pangkalan data tidak tersedia.";
  else {
    try {
      data = await overview(getDb());
      last = await readLastExport(getDb());
      paywall = await isPaywallSwitchOn(getDb());
      samples = await countSamples(getDb());
    } catch {
      problem = "Jadual langganan belum wujud pada pangkalan data ini. Migrasi 027 hingga 030 perlu dijalankan dahulu.";
    }
  }
  const lastSuccessAt = last?.stored === "blob" ? last.at : last?.lastSuccessfulAt;
  const exportWarning = last?.error
    ? `Eksport terakhir gagal: ${last.error}`
    : !lastSuccessAt
      ? "Belum ada eksport terenkripsi yang berjaya disimpan. Semak BACKUP_ENC_KEY dan storan Blob."
      : Date.now() - new Date(lastSuccessAt).getTime() > 36 * 60 * 60 * 1000
        ? "Eksport berjaya terakhir melebihi 36 jam. Semak cron dan storan Blob."
        : null;

  return (
    <div className="admin-langganan">
      <header className="admin-page-header">
        <h1>Langganan</h1>
        <p className="admin-page-sub">Pembaca, kad berkod dan kod kongsi. Hanya pemilik boleh membuka bahagian ini.</p>
      </header>
      <LanggananNav current="/admin/langganan" />
      {!readerAccountsEnabled() ? (
        <div className="admin-alert admin-alert-info" role="status">Akaun pembaca belum dihidupkan pada laman ini (READER_ACCOUNTS_ENABLED). Pembaca belum boleh mendaftar atau menebus kod.</div>
      ) : null}
      {problem || !data ? (
        <div className="admin-alert admin-alert-error" role="alert">{problem}</div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <tbody>
                <tr><th scope="row">Pembaca berdaftar</th><td>{data.accounts}</td></tr>
                <tr><th scope="row">Dalam percubaan percuma</th><td>{data.inTrial}</td></tr>
                <tr><th scope="row">Melanggan sekarang</th><td>{data.subscribed}</td></tr>
                <tr><th scope="row">Kelompok kad</th><td>{data.batches.confirmed} disahkan, {data.batches.pending} menunggu cetakan, {data.batches.voided} dibatalkan</td></tr>
                <tr><th scope="row">Kod kad</th><td>{data.codes.redeemed} ditebus · {data.codes.issued} diaktifkan · {data.codes.generated} belum diaktifkan · {data.codes.revoked} dibatalkan</td></tr>
                <tr><th scope="row">Kod kongsi</th><td>{data.shared.active} aktif, {data.shared.paused} dijeda, {data.shared.revoked} dibatalkan · {data.shared.redemptions} penebusan</td></tr>
              </tbody>
            </table>
          </div>
          <h2>Dinding bayar</h2>
          <PaywallSwitch initialOn={paywall} accountsEnabled={readerAccountsEnabled()} samples={samples} />
          <h2>Suis henti penebusan</h2>
          <HaltSwitch initialHalted={data.halted} />
          <h2>Salinan kod di luar pangkalan data</h2>
          <p>Setiap malam, satu fail disulitkan dan bertandatangan berisi semua kod dan penebusan disimpan di luar pangkalan data. Jika pangkalan data dipulihkan ke masa lampau, fail inilah yang menghalang kad yang sudah digunakan daripada digunakan semula.</p>
          {exportWarning ? <div className="admin-alert admin-alert-error" role="alert">{exportWarning}</div> : null}
          {lastSuccessAt ? <p>Eksport terakhir yang berjaya: {new Date(lastSuccessAt).toLocaleString("ms-MY", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}{last?.stored === "blob" ? ` (${last.lines} baris)` : ""}.</p> : null}
          <p><a className="admin-btn admin-btn-sm admin-btn-outline" href="/api/admin/langganan/eksport">Muat turun fail eksport sekarang</a></p>
        </>
      )}
    </div>
  );
}
