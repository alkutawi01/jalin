import { LanggananNav } from "../../../../components/admin/langganan-ui";
import ReaderLookup from "./ReaderLookup";
import MembersList from "./MembersList";

export const dynamic = "force-dynamic";

export default function ReadersPage() {
  return (
    <div className="admin-langganan">
      <header className="admin-page-header">
        <h1>Pembaca</h1>
        <p className="admin-page-sub">Cari pembaca dengan emel, lihat akses mereka tempoh demi tempoh, beri akses atau batalkan satu tempoh. Setiap tindakan memerlukan sebab dan direkod dalam Aktiviti.</p>
      </header>
      <LanggananNav current="/admin/langganan/pembaca" />
      <MembersList />
      <h2>Cari seorang pembaca</h2>
      <ReaderLookup />
    </div>
  );
}
