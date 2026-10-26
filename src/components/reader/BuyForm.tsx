"use client";

import { useState } from "react";

type Plan = { months: 1 | 6 | 12; label: string; price: string };

/** Choose a length, give the address the code is to be sent to, and go to the gateway's payment page. The price is only shown here; the server decides it. */
export default function BuyForm({ plans }: { plans: Plan[] }) {
  const [months, setMonths] = useState<number>(plans[plans.length - 1]?.months ?? 12);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/langganan/beli", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ months, email }) });
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || typeof data.url !== "string" || !data.url.startsWith("https://")) {
        setError(data.error ?? "Pembayaran tidak dapat dimulakan sekarang. Cuba lagi sebentar lagi.");
        setBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Sambungan terputus. Semak sambungan internet anda dan cuba lagi.");
      setBusy(false);
    }
  }

  return (
    <div className="auth-card auth-card--card">
      <h1 className="auth-title">Beli kod langganan</h1>
      <p className="auth-intro">Pilih tempoh langganan dan buat pembayaran. Nombor siri dan kod langganan akan dihantar ke e-mel anda selepas pembayaran disahkan. Kemudian, tebus kod pada halaman <a href="/tebus">Tebus kod</a>.</p>
      <form onSubmit={submit} noValidate>
        <fieldset className="buy-plans">
          <legend className="buy-legend">Tempoh langganan</legend>
          {plans.map((plan) => (
            <label key={plan.months} className={`buy-plan${months === plan.months ? " buy-plan--on" : ""}`}>
              <input type="radio" name="months" value={plan.months} checked={months === plan.months} onChange={() => setMonths(plan.months)} />
              <span className="buy-plan-name">{plan.label}</span>
              <span className="buy-plan-price">{plan.price}</span>
            </label>
          ))}
        </fieldset>
        <label className="auth-label" htmlFor="buy-email">E-mel untuk menerima kod</label>
        <input id="buy-email" className="auth-input" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} aria-describedby={error ? "buy-error" : undefined} />
        {error ? <p id="buy-error" className="auth-error" role="alert">{error}</p> : null}
        <button className="auth-button" type="submit" disabled={busy}>{busy ? "Sedang membuka halaman pembayaran…" : "Teruskan ke pembayaran"}</button>
      </form>
      <p className="auth-fine">Pembayaran dibuat melalui Billplz menggunakan FPX atau kad. Kod dihantar selepas pembayaran disahkan. Ada soalan? Lihat <a href="/soalanlazim">Soalan Lazim</a>.</p>
    </div>
  );
}
