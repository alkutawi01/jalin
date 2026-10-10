"use client";

import { useState } from "react";

/** Redeem a card code (code and batch number, both printed on the card) or a shared code (the code alone). */
export default function RedeemForm({ embedded = false }: { embedded?: boolean }) {
  const [code, setCode] = useState("");
  const [batch, setBatch] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);

  const looksShared = /^\s*jln[\s-]*[a-z0-9]/i.test(code);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(""); setDone("");
    if (!code.trim()) { setError("Masukkan kod."); return; }
    if (!looksShared && !batch.trim()) { setError("Masukkan nombor batch yang tercetak pada kad."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/akaun/tebus", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, batch: looksShared ? "" : batch }) });
      let data: Record<string, unknown> = {};
      try { data = await response.json(); } catch { /* not JSON */ }
      if (response.status === 401) { window.location.href = embedded ? window.location.pathname : "/log-masuk"; return; }
      if (response.ok && data.ok) {
        setDone(String(data.message)); setCode(""); setBatch("");
        // Inside the lock dialog the page behind it is the work the reader wanted: show it now that there is access.
        if (embedded) window.setTimeout(() => window.location.reload(), 900);
        return;
      }
      setError(String(data.error ?? "Kod tidak dapat ditebus. Semak kod dan nombor batch, jika berkenaan, kemudian cuba lagi."));
    } catch {
      setError("Tiada sambungan. Semak internet anda dan cuba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <form onSubmit={submit} noValidate>
        <h1 className="auth-title">Tebus kod langganan</h1>
        <p className="auth-intro">Jika menggunakan kad langganan, kikis bahagian yang menutupi kod. Masukkan juga nombor batch yang tercetak pada kad.</p>
        <label className="auth-label" htmlFor="redeem-code">Kod langganan</label>
        <input id="redeem-code" className="auth-input auth-code auth-code--long" type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="XXXX-XXXX-XXXX-XXXX-X" value={code} onChange={(e) => setCode(e.target.value)} aria-invalid={!!error} aria-describedby={error ? "redeem-error" : undefined} />
        {!looksShared ? (
          <>
            <label className="auth-label auth-label--gap" htmlFor="redeem-batch">Nombor batch</label>
            <input id="redeem-batch" className="auth-input" type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="Contoh: B2610-001" value={batch} onChange={(e) => setBatch(e.target.value)} />
          </>
        ) : (
          <p className="auth-fine">Jika menggunakan kod kongsi, biarkan ruangan nombor batch kosong.</p>
        )}
        {error ? <p id="redeem-error" className="auth-error" role="alert">{error}</p> : null}
        {done ? <p className="auth-notice auth-notice--ok" role="status">{done}</p> : null}
        <button className="auth-button" type="submit" disabled={busy}>{busy ? "Menebus…" : "Tebus kod"}</button>
        {embedded ? null : <div className="auth-links"><a className="auth-link" href="/akaun">Kembali ke akaun</a></div>}
      </form>
    </div>
  );
}
