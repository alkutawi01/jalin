"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, fmtDate, Notice } from "../../../../components/admin/langganan-ui";
import { confirmAction, toast } from "../../../../lib/admin/dialogs";
import { ORDER_REPLACEMENT_COPY as COPY } from "../../../../lib/subscription/order-replacement-copy";

type Order = {
  id: string; reference: string; months: number; amountSen: number; email: string; status: string; deliveryStatus: string; deliveryAttempts: number;
  lastDeliveryError: string | null; serial: string | null; createdAt: string; paidAt: string | null; deliveredAt: string | null; note: string | null; canReplace: boolean;
};

const STATUS: Record<string, string> = { PENDING: "Menunggu bayaran", PAID: "Dibayar", CANCELLED: "Dibatalkan" };
const DELIVERY: Record<string, string> = { NONE: "-", PENDING: "E-mel belum dihantar", SENT: "Diterima penyedia e-mel" };

/** Only eligible orders offer replacement; the server rechecks every condition under row locks. */
export default function OrdersTable({ initialOrders }: { initialOrders: Order[] }) {
  const orders = initialOrders;
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  async function replace(order: Order) {
    if (busy || !reason.trim() || !order.serial) return;
    setBusy(order.id); setError(""); setMessage("");
    try {
      if (!(await confirmAction(COPY.confirmation, { title: COPY.action, confirmLabel: COPY.confirm, danger: true }))) return;
      const data = await api<{ message: string; delivery: string }>(`/api/admin/langganan/pesanan/${order.id}`, "POST", { action: "replace", expectedSerial: order.serial, reason });
      setMessage(data.message);
      toast(data.message, data.delivery === "sent" ? "success" : "info");
      setEditing(""); setReason("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message || "Penggantian tidak berjaya.");
      router.refresh();
    } finally { setBusy(""); }
  }

  async function resend(order: Order) {
    if (busy) return;
    setError(""); setMessage(""); setBusy(order.id);
    try {
      const data = await api<{ result: string }>(`/api/admin/langganan/pesanan/${order.id}`, "POST", { action: "resend" });
      toast(data.result === "sent" ? "E-mel telah diterima oleh penyedia perkhidmatan e-mel untuk penghantaran." : "E-mel masih gagal dihantar. Lihat sebab pada baris pesanan.", data.result === "sent" ? "success" : "error");
      router.refresh();
    } catch (e) {
      setError((e as Error).message || "Tidak berjaya.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="admin-batches">
      {error ? <Notice kind="error">{error}</Notice> : null}
      {message ? <Notice kind="info">{message}</Notice> : null}
      {busy ? <p role="status">Memproses pesanan…</p> : null}
      {orders.length === 0 ? <p className="admin-form-hint">Belum ada pesanan.</p> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Pesanan</th><th>Tempoh</th><th>Jumlah</th><th>Status</th><th>E-mel kod</th><th>Tindakan</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td data-label="Pesanan"><strong>{o.reference}</strong><div className="admin-form-hint">{o.email} · {fmtDate(o.createdAt)}</div>{o.serial ? <div className="admin-form-hint">{o.serial}</div> : null}</td>
                  <td data-label="Tempoh">{o.months} bulan</td>
                  <td data-label="Jumlah">RM{(o.amountSen / 100).toFixed(2)}</td>
                  <td data-label="Status">{STATUS[o.status] ?? o.status}{o.paidAt ? <div className="admin-form-hint">{fmtDate(o.paidAt)}</div> : null}{o.note ? <div className="admin-form-hint">{o.note}</div> : null}</td>
                  <td data-label="E-mel kod">{DELIVERY[o.deliveryStatus] ?? o.deliveryStatus}{o.deliveryAttempts > 0 ? <div className="admin-form-hint">{o.deliveryAttempts} percubaan</div> : null}{o.lastDeliveryError ? <div className="admin-form-hint">{o.lastDeliveryError}</div> : null}</td>
                  <td data-label="Tindakan">{o.deliveryStatus === "PENDING" ? <button type="button" className="admin-btn admin-btn-sm admin-btn-primary" disabled={!!busy} onClick={() => void resend(o)}>Hantar semula e-mel</button> : null}
                    {o.canReplace ? editing === o.id ? (
                      <form className="admin-order-replacement" onSubmit={(event) => { event.preventDefault(); void replace(o); }}>
                        <label htmlFor={`reason-${o.id}`}>{COPY.reason}</label>
                        <input id={`reason-${o.id}`} className="admin-input" required maxLength={160} value={reason} disabled={!!busy} onChange={(event) => setReason(event.target.value)} aria-describedby={`help-${o.id}`} autoFocus />
                        <p id={`help-${o.id}`} className="admin-form-hint">{COPY.help}</p>
                        <div className="admin-order-actions"><button type="submit" className="admin-btn admin-btn-sm admin-btn-danger" disabled={!!busy || !reason.trim()}>{COPY.action}</button>
                        <button type="button" className="admin-btn admin-btn-sm admin-btn-quiet" disabled={!!busy} onClick={() => { setEditing(""); setReason(""); }}>Tutup</button>
                        </div>
                      </form>
                    ) : <button type="button" className="admin-btn admin-btn-sm admin-btn-outline" disabled={!!busy} onClick={() => { setEditing(o.id); setReason(""); setError(""); setMessage(""); }}>{COPY.action}</button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
