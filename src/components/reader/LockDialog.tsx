"use client";

import { useEffect, useRef, useState } from "react";
import LoginForm from "./LoginForm";
import RedeemForm from "./RedeemForm";

type Gate = "sign_in" | "start_trial" | "subscribe";

/**
 * What a reader meets when a work is kept for readers with access. It opens by itself on the locked page and can be closed (the page
 * behind it shows what the work is about). Visitors sign in here and come back to this very page; a signed-in reader starts the free
 * trial here, or redeems a code.
 */
export default function LockDialog({ gate, next, email }: { gate: Gate; next: string; email?: string | null }) {
  const [open, setOpen] = useState(true);
  const [showRedeem, setShowRedeem] = useState(gate === "subscribe");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus?.();
    };
  }, [open]);

  async function startTrial() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/akaun/percubaan", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(String(data.error ?? "Percubaan tidak dapat dimulakan."));
        setBusy(false);
        return;
      }
      window.location.href = next;
    } catch {
      setError("Tiada sambungan. Semak internet anda dan cuba lagi.");
      setBusy(false);
    }
  }

  const title = gate === "sign_in" ? "Log masuk untuk membaca" : gate === "start_trial" ? "Mulakan percubaan percuma" : "Akses anda belum aktif";

  return (
    <>
      <button ref={openerRef} type="button" className="lock-open" onClick={() => setOpen(true)}>
        {gate === "sign_in" ? "Log masuk untuk membaca" : gate === "start_trial" ? "Mulakan percubaan percuma 14 hari" : "Tebus kod untuk membaca"}
      </button>
      {open ? (
        <div className="lock-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <div className="lock-dialog" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={panelRef}>
            <button type="button" className="lock-close" aria-label="Tutup" onClick={() => setOpen(false)}>×</button>

            {gate === "sign_in" ? (
              <>
                <p className="lock-lead">Cerita ini untuk pembaca yang log masuk. Daftar dengan e-mel sahaja, kemudian mulakan percubaan percuma 14 hari.</p>
                <LoginForm next={next} />
              </>
            ) : null}

            {gate === "start_trial" ? (
              <div className="auth-card">
                <h1 className="auth-title">Mulakan percubaan percuma</h1>
                <p className="auth-intro">{email ? <>Anda log masuk sebagai <strong>{email}</strong>. </> : null}Baca semua cerita di Jalin selama 14 hari, tanpa kad dan tanpa bayaran.</p>
                {error ? <p className="auth-error" role="alert">{error}</p> : null}
                <button type="button" className="auth-button" disabled={busy} onClick={startTrial}>{busy ? "Memulakan…" : "Mulakan percubaan 14 hari"}</button>
                {showRedeem ? (
                  <div className="lock-redeem"><RedeemForm embedded /></div>
                ) : (
                  <div className="auth-links"><button type="button" className="auth-link" onClick={() => setShowRedeem(true)}>Saya ada kod langganan</button></div>
                )}
              </div>
            ) : null}

            {gate === "subscribe" ? (
              <div className="auth-card">
                <h1 className="auth-title">Akses anda belum aktif</h1>
                <p className="auth-intro">{email ? <>Anda log masuk sebagai <strong>{email}</strong>. </> : null}Percubaan percuma anda sudah digunakan atau tamat. Tebus kod langganan daripada kad untuk terus membaca.</p>
                <div className="lock-redeem"><RedeemForm embedded /></div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
