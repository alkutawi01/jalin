import { LanggananNav } from "../../../../components/admin/langganan-ui";
import SampleManager from "./SampleManager";

export const dynamic = "force-dynamic";

export default function SamplesPage() {
  return (
    <div className="admin-langganan">
      <header className="admin-page-header">
        <h1>Cerita contoh</h1>
        <p className="admin-page-sub">Pilih cerita yang boleh dibaca oleh sesiapa sebagai contoh. Selebihnya memerlukan percubaan atau langganan apabila dinding bayar dihidupkan.</p>
      </header>
      <LanggananNav current="/admin/langganan/contoh" />
      <SampleManager />
    </div>
  );
}
