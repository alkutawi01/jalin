"use client";

import { useState } from "react";
import { confirmAction, toast } from "../../../lib/admin/dialogs";
import { errorText } from "../../../lib/admin/error-text";
import { api, Notice } from "../../../components/admin/langganan-ui";

/** The paywall switch. On: the text of every work that is not a sample is kept for readers with a trial or a subscription. */
export default function PaywallSwitch({ initialOn, accountsEnabled, samples }: { initialOn: boolean; accountsEnabled: boolean; samples: number }) {
  const [on, setOn] = useState(initialOn);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    const next = !on;
    const question = next
      ? `Hidupkan dinding bayar? Semua cerita kecuali ${samples} cerita contoh akan memerlukan log masuk dan percubaan atau langganan.`
      : "Matikan dinding bayar? Semua cerita kembali terbuka kepada semua orang.";
    if (!(await confirmAction(question, { confirmLabel: next ? "Ya, hidupkan" : "Ya, matikan", danger: next }))) return;
    setBusy(true); setError("");
    try {
      await api("/api/admin/langganan/dinding-bayar", "POST", { on: next });
      setOn(next);
      toast(next ? "Dinding bayar dihidupkan." : "Dinding bayar dimatikan.", next ? "info" : "success");
    } catch (e) {
      setError(errorText(e, "Tidak berjaya."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-halt">
      {!accountsEnabled ? <Notice kind="warning">Akaun pembaca belum dihidupkan pada laman ini (READER_ACCOUNTS_ENABLED), jadi dinding bayar tidak berkuat kuasa walaupun suis ini hidup.</Notice> : null}
      {on ? <Notice kind="info">Dinding bayar <strong>hidup</strong>. Teks cerita disimpan untuk pembaca yang ada percubaan atau langganan. {samples} cerita contoh terbuka kepada semua.</Notice> : <p className="admin-form-hint">Dinding bayar <strong>mati</strong>: semua cerita terbuka kepada semua orang.</p>}
      {error ? <Notice kind="error">{error}</Notice> : null}
      <button type="button" className={`admin-btn ${on ? "admin-btn-outline" : "admin-btn-primary"}`} disabled={busy} onClick={toggle}>
        {on ? "Matikan dinding bayar" : "Hidupkan dinding bayar"}
      </button>
    </div>
  );
}
