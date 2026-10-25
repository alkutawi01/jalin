import { getDb, hasDb } from "../../../../lib/db";
import { LanggananNav } from "../../../../components/admin/langganan-ui";
import { listOrders, type OrderRow } from "../../../../lib/reader-auth/orders";
import { purchaseStatus } from "../../../../lib/subscription/prices";
import OrdersTable from "./OrdersTable";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  let orders: OrderRow[] = [];
  let problem: string | null = null;
  if (!hasDb()) problem = "Pangkalan data tidak tersedia.";
  else {
    try {
      orders = await listOrders(getDb());
    } catch {
      problem = "Jadual pesanan belum wujud pada pangkalan data ini. Migrasi 036 dan 037 perlu dijalankan dahulu.";
    }
  }
  const status = purchaseStatus();
  const plain = orders.map((o) => ({ ...o, createdAt: o.createdAt.toISOString(), paidAt: o.paidAt ? o.paidAt.toISOString() : null, deliveredAt: o.deliveredAt ? o.deliveredAt.toISOString() : null }));
  return (
    <div className="admin-langganan">
      <header className="admin-page-header">
        <h1>Pesanan dalam talian</h1>
        <p className="admin-page-sub">Kod yang dibeli melalui laman. Kod dihantar ke e-mel pembeli selepas bayaran disahkan; di sini awak boleh menghantar semula e-mel yang gagal.</p>
      </header>
      <LanggananNav current="/admin/langganan/pesanan" />
      <p className="admin-form-hint">Jualan dalam talian: <strong>{status.enabled ? "dibuka" : `ditutup (${status.reason})`}</strong>.</p>
      {problem ? <div className="admin-alert admin-alert-error" role="alert">{problem}</div> : <OrdersTable initialOrders={plain} />}
    </div>
  );
}
