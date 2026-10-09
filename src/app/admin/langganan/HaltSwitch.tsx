"use client";

import { useState } from "react";
import { confirmAction, toast } from "../../../lib/admin/dialogs";
import { api, Notice } from "../../../components/admin/langganan-ui";

/** The stop switch for redeeming. While it is on nobody can redeem a card or shared code; it takes effect on the next attempt. */
export default function HaltSwitch({ initialHalted }: { initialHalted: boolean }) {
  const [halted, setHalted] = useState(initialHalted);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    const next = !halted;
    if (next && !(await confirmAction("Hentikan semua penebusan kod? Pembaca akan diberitahu cuba lagi nanti.", { confirmLabel: "Ya, hentikan", danger: true }))) return;
    setBusy(true); setError("");
    try {
      await api("/api/admin/langganan/suis", "POST", { halted: next });
      setHalted(next);
      toast(next ? "Penebusan dihentikan." : "Penebusan disambung semula.", next ? "info" : "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tidak berjaya.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-halt">
      {halted ? <Notice kind="warning">Penebusan sedang <strong>dihentikan</strong>. Tiada kod boleh ditebus.</Notice> : <p className="admin-form-hint">Penebusan berjalan seperti biasa.</p>}
      {error ? <Notice kind="error">{error}</Notice> : null}
      <button type="button" className={`admin-btn ${halted ? "admin-btn-primary" : "admin-btn-danger"}`} disabled={busy} onClick={toggle}>
        {halted ? "Sambung semula penebusan" : "Hentikan penebusan"}
      </button>
    </div>
  );
}
