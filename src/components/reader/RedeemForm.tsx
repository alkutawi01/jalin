"use client";

import { useState } from "react";

/**
 * Redeem a code. The box is drawn as the back of the card ("kad maya"): the code goes where the scratch sticker is on a real card. A code that
 * came by e-mail (bought in Jalin) is the code alone; a printed card also has a batch number, which the reader adds with the link under the card.
 */
export default function RedeemForm({ embedded = false }: { embedded?: boolean }) {
  const [code, setCode] = useState("");
  const [serial, setSerial] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);
  const [physical, setPhysical] = useState(false);

  const looksShared = /^\s*jln[\s-]*[a-z0-9]/i.test(code);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(""); setDone("");
    if (!code.trim()) { setError("Masukkan kod."); return; }
    if (physical && !looksShared && !serial.trim()) { setError("Masukkan nombor siri yang tercetak pada label di kad."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/akaun/tebus", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, serial: looksShared || !physical ? "" : serial }) });
      let data: Record<string, unknown> = {};
      try { data = await response.json(); } catch { /* not JSON */ }
      if (response.status === 401) { window.location.href = embedded ? window.location.pathname : "/log-masuk"; return; }
      if (response.ok && data.ok) {
        setDone(String(data.message)); setCode(""); setSerial("");
        // Inside the lock dialog the page behind it is the work the reader wanted: show it now that there is access.
        if (embedded) window.setTimeout(() => window.location.reload(), 900);
        return;
      }
      // A card code needs its batch number: if the reader did not open that box, open it now so the way forward is in front of them.
      if (!physical && !looksShared) setPhysical(true);
      setError(String(data.error ?? "Kod tidak dapat ditebus. Semak kod dan nombor siri, jika berkenaan, kemudian cuba lagi."));
    } catch {
      setError("Tiada sambungan. Semak internet anda dan cuba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`auth-card${embedded ? "" : " auth-card--card"}`}>
      <form onSubmit={submit} noValidate>
        <h1 className="auth-title">Tebus kod langganan</h1>
        <p className="auth-intro">Masukkan kod yang dihantar ke e-mel anda selepas pembayaran. Jika anda ada kad fizikal, tekan pautan di bawah kad.</p>

        <div className="vcard-wrap">
        <div className={`vcard${embedded ? " vcard--stack" : ""}`}>
          <div className="vcard-left">
            <h2 className="vcard-h">Kaedah penebusan</h2>
            <ol className="vcard-steps">
              <li>Daftar atau log masuk ke akaun Jalin</li>
              <li>Pergi ke <strong>jalin.adjung.com/tebus</strong></li>
              <li>Masukkan nombor siri dan kod</li>
              <li>Langganan diaktifkan selepas penebusan berjaya</li>
            </ol>
            <h2 className="vcard-h vcard-h--sub">Maklumat penting</h2>
            <ul className="vcard-notes">
              <li>Kod hanya boleh ditebus sekali.</li>
              <li>Tempoh langganan bermula sebaik kod berjaya ditebus.</li>
              <li>Simpan kad ini di tempat selamat.</li>
            </ul>
          </div>
          <div className="vcard-divider" aria-hidden="true" />
          <div className="vcard-right">
            <p className="vcard-help">Jika terdapat sebarang masalah berkaitan langganan dan penebusan, sila hubungi <strong>editorial@adjung.com</strong> atau layari <a href="/soalanlazim"><strong>jalin.adjung.com/soalanlazim</strong></a>.</p>
            <div className="vcard-panel">
              {physical && !looksShared ? (
                <div className="vcard-row">
                  <label className="vcard-label" htmlFor="redeem-serial">NO. SIRI:</label>
                  <input id="redeem-serial" className="vcard-batch" type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="JLN-12B0126-01" value={serial} onChange={(e) => setSerial(e.target.value)} />
                </div>
              ) : null}
              <label className="vcard-label vcard-label--code" htmlFor="redeem-code">KOD:</label>
              <div className="vcard-codebox">
                <input id="redeem-code" className="vcard-code" type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder={physical ? "Taip kod di sini" : "Taip atau tampal kod"} value={code} onChange={(e) => setCode(e.target.value)} aria-invalid={!!error} aria-describedby={error ? "redeem-error" : undefined} />
              </div>
            </div>
          </div>
          <p className="vcard-copy" aria-hidden="true">© {new Date().getFullYear()} Adjung Press Platform (202603277981 (PG0594995-P))</p>
        </div>
        </div>
        <button type="button" className="auth-link vcard-toggle" aria-pressed={physical} onClick={() => setPhysical((v) => !v)}>
          {physical ? "Saya tiada kad fizikal (kod daripada e-mel)" : "Saya ada kad fizikal (masukkan nombor siri juga)"}
        </button>
        {looksShared && physical ? <p className="auth-fine">Kod kongsi tidak memerlukan nombor siri.</p> : null}

        {error ? <p id="redeem-error" className="auth-error" role="alert">{error}</p> : null}
        {done ? <p className="auth-notice auth-notice--ok" role="status">{done}</p> : null}
        <button className="auth-button" type="submit" disabled={busy}>{busy ? "Menebus…" : "Tebus kod"}</button>
        {embedded ? null : <div className="auth-links"><a className="auth-link" href="/akaun">Kembali ke akaun</a></div>}
      </form>
    </div>
  );
}
