"use client";

import { useEffect, useRef, useState } from "react";

type Device = { id: string; label: string; lastSeenAt: string };
type Step = "email" | "code" | "device";

const RESEND_AFTER_SECONDS = 60;

function deviceLabel(): string {
  const ua = navigator.userAgent;
  const kind = /iPhone|iPad|Android|Mobile/i.test(ua) ? "Telefon" : "Komputer";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "Pelayar";
  return `${kind} (${browser})`;
}

function formatSeen(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("ms-MY", { day: "numeric", month: "short", year: "numeric" });
}

/** Sign in or register with one form: an e-mail, then the six-digit code, then (only if two devices are already signed in) which one to remove. */
export default function LoginForm({ next = "/akaun", compact = false }: { next?: string; compact?: boolean }) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  async function post(path: string, body: Record<string, unknown>) {
    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    let data: Record<string, unknown> = {};
    try { data = await response.json(); } catch { /* not JSON */ }
    return { ok: response.ok, status: response.status, data };
  }

  async function sendCode(event?: React.FormEvent) {
    event?.preventDefault();
    if (busy) return;
    setError(""); setNotice("");
    if (!email.trim()) { setError("Masukkan emel anda."); return; }
    setBusy(true);
    try {
      const { ok, data } = await post("/api/akaun/kod", { email });
      if (!ok) { setError(String(data.error ?? "Kod tidak dapat dihantar. Cuba lagi.")); return; }
      setCode("");
      setStep("code");
      setWait(RESEND_AFTER_SECONDS);
    } catch {
      setError("Tiada sambungan. Semak internet anda dan cuba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(event?: React.FormEvent, replaceDeviceId?: string) {
    event?.preventDefault();
    if (busy) return;
    setError(""); setNotice("");
    if (!/^\d{6}$/.test(code.replace(/[\s-]/g, ""))) { setError("Masukkan kod enam digit."); return; }
    setBusy(true);
    try {
      const { ok, status, data } = await post("/api/akaun/sahkan", { email, code, label: deviceLabel(), replaceDeviceId });
      if (ok && data.needsDeviceChoice) {
        setDevices((data.devices as Device[]) ?? []);
        setStep("device");
        return;
      }
      if (ok && data.ok) {
        window.location.href = next;
        return;
      }
      setError(status === 429 ? "Terlalu banyak cubaan. Cuba lagi kemudian." : String(data.error ?? "Kod tidak betul atau sudah tamat."));
    } catch {
      setError("Tiada sambungan. Semak internet anda dan cuba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "auth-card auth-card--compact" : "auth-card"}>
      {step === "email" ? (
        <form onSubmit={sendCode} noValidate>
          {compact ? null : <h1 className="auth-title">Log masuk atau daftar</h1>}
          {compact ? null : <p className="auth-intro">Masukkan emel anda. Kami hantar kod enam digit. Tiada kata laluan.</p>}
          <label className="auth-label" htmlFor="auth-email">Emel</label>
          <input id="auth-email" className="auth-input" type="email" inputMode="email" autoComplete="email" placeholder="nama@contoh.my" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} aria-describedby={error ? "auth-error" : undefined} />
          {error ? <p id="auth-error" className="auth-error" role="alert">{error}</p> : null}
          <button className="auth-button" type="submit" disabled={busy}>{busy ? "Menghantar…" : "Hantar kod"}</button>
          <p className="auth-fine">Selepas log masuk, anda boleh memulakan percubaan percuma 14 hari.</p>
        </form>
      ) : null}

      {step === "code" ? (
        <form onSubmit={(e) => verify(e)} noValidate>
          <h1 className="auth-title">Masukkan kod</h1>
          <p className="auth-intro">Kod dihantar ke <strong>{email.trim()}</strong>. Sah 5 minit. Semak juga folder spam.</p>
          <label className="auth-label" htmlFor="auth-code">Kod enam digit</label>
          <input id="auth-code" ref={codeRef} className="auth-input auth-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d\s-]/g, ""))} aria-invalid={!!error} aria-describedby={error ? "auth-error" : undefined} />
          {error ? <p id="auth-error" className="auth-error" role="alert">{error}</p> : null}
          {notice ? <p className="auth-notice" role="status">{notice}</p> : null}
          <button className="auth-button" type="submit" disabled={busy}>{busy ? "Mengesahkan…" : "Sahkan"}</button>
          <div className="auth-links">
            <button type="button" className="auth-link" disabled={wait > 0 || busy} onClick={() => sendCode().then(() => setNotice("Kod baharu dihantar."))}>
              {wait > 0 ? `Hantar semula kod (${wait}s)` : "Hantar semula kod"}
            </button>
            <button type="button" className="auth-link" onClick={() => { setStep("email"); setError(""); setNotice(""); }}>Tukar emel</button>
          </div>
        </form>
      ) : null}

      {step === "device" ? (
        <div>
          <h1 className="auth-title">Pilih peranti untuk dikeluarkan</h1>
          <p className="auth-intro">Akaun ini sudah digunakan pada 2 peranti. Untuk log masuk di sini, keluarkan satu daripadanya.</p>
          <ul className="auth-devices">
            {devices.map((device) => (
              <li key={device.id} className="auth-device">
                <span>
                  <span className="auth-device-name">{device.label}</span>
                  <span className="auth-device-seen">Terakhir aktif {formatSeen(device.lastSeenAt)}</span>
                </span>
                <button type="button" className="auth-link" disabled={busy} onClick={() => verify(undefined, device.id)}>Keluarkan</button>
              </li>
            ))}
          </ul>
          {error ? <p className="auth-error" role="alert">{error}</p> : null}
          <div className="auth-links">
            <button type="button" className="auth-link" onClick={() => { setStep("email"); setError(""); }}>Batal</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
