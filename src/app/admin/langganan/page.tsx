import { getDb, hasDb } from "../../../lib/db";
import { overview, type Overview } from "../../../lib/reader-auth/admin";
import { readerAccountsEnabled } from "../../../lib/reader-auth/enabled";
import { LanggananNav } from "../../../components/admin/langganan-ui";
import HaltSwitch from "./HaltSwitch";

export const dynamic = "force-dynamic";

/** Langganan: where Izzat sees how many readers, cards and codes there are, and can stop redeeming at once. The owner only (permissions.ts). */
export default async function LanggananPage() {
  let data: Overview | null = null;
  let problem: string | null = null;
  if (!hasDb()) problem = "Pangkalan data tidak tersedia.";
  else {
    try {
      data = await overview(getDb());
    } catch {
      problem = "Jadual langganan belum wujud pada pangkalan data ini. Migrasi 027 hingga 030 perlu dijalankan dahulu.";
    }
  }

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
          <h2>Suis henti penebusan</h2>
          <HaltSwitch initialHalted={data.halted} />
        </>
      )}
    </div>
  );
}
