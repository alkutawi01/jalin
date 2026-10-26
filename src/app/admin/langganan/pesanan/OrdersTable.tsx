"use client";

import { useState } from "react";
import { api, fmtDate, Notice } from "../../../../components/admin/langganan-ui";
import { toast } from "../../../../lib/admin/dialogs";

type Order = {
  id: string; reference: string; months: number; amountSen: number; email: string; status: string; deliveryStatus: string; deliveryAttempts: number;
  lastDeliveryError: string | null; serial: string | null; createdAt: string; paidAt: string | null; deliveredAt: string | null; note: string | null;
};

const STATUS: Record<string, string> = { PENDING: "Menunggu bayaran", PAID: "Dibayar", CANCELLED: "Dibatalkan" };
const DELIVERY: Record<string, string> = { NONE: "-", PENDING: "E-mel belum dihantar", SENT: "E-mel dihantar" };

/** The orders, newest first. A paid order whose e-mail has not gone can be sent again from here. */
export default function OrdersTable({ initialOrders }: { initialOrders: Order[] }) {
  const [orders] = useState(initialOrders);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function resend(order: Order) {
    setError(""); setBusy(order.id);
    try {
      const data = await api<{ result: string }>(`/api/admin/langganan/pesanan/${order.id}`, "POST", { action: "resend" });
      toast(data.result === "sent" ? "E-mel dihantar." : "E-mel masih gagal; lihat sebab pada baris pesanan.", data.result === "sent" ? "success" : "error");
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setError((e as Error).message || "Tidak berjaya.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="admin-batches">
      {error ? <Notice kind="error">{error}</Notice> : null}
      {orders.length === 0 ? <p className="admin-form-hint">Belum ada pesanan.</p> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Pesanan</th><th>Tempoh</th><th>Jumlah</th><th>Status</th><th>E-mel kod</th><th>Tindakan</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><strong>{o.reference}</strong><div className="admin-form-hint">{o.email} · {fmtDate(o.createdAt)}</div>{o.serial ? <div className="admin-form-hint">{o.serial}</div> : null}</td>
                  <td>{o.months} bulan</td>
                  <td>RM{(o.amountSen / 100).toFixed(2)}</td>
                  <td>{STATUS[o.status] ?? o.status}{o.paidAt ? <div className="admin-form-hint">{fmtDate(o.paidAt)}</div> : null}{o.note ? <div className="admin-form-hint">{o.note}</div> : null}</td>
                  <td>{DELIVERY[o.deliveryStatus] ?? o.deliveryStatus}{o.deliveryAttempts > 0 ? <div className="admin-form-hint">{o.deliveryAttempts} percubaan</div> : null}{o.lastDeliveryError ? <div className="admin-form-hint">{o.lastDeliveryError}</div> : null}</td>
                  <td>{o.deliveryStatus === "PENDING" ? <button type="button" className="admin-btn admin-btn-sm admin-btn-primary" disabled={busy === o.id} onClick={() => void resend(o)}>{busy === o.id ? "Menghantar…" : "Hantar semula e-mel"}</button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
