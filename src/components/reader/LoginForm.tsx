"use client";

import { useEffect, useRef, useState } from "react";

type Device = { id: string; label: string; lastSeenAt: string };
type Step = "email" | "code" | "device";

const RESEND_AFTER_SECONDS = 60;
const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = { render: (el: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "error-callback"?: () => void; "expired-callback"?: () => void }) => string; reset: (id?: string) => void; remove: (id?: string) => void };
declare global { interface Window { turnstile?: TurnstileApi } }

/** The Cloudflare script, loaded once and only when the server asks for the challenge. */
function loadTurnstile(): Promise<TurnstileApi> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) { resolve(window.turnstile); return; }
    let script = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SRC}"]`);
    if (!script) { script = document.createElement("script"); script.src = TURNSTILE_SRC; script.async = true; document.head.appendChild(script); }
    script.addEventListener("load", () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile"))));
    script.addEventListener("error", () => reject(new Error("turnstile")));
  });
}

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
  // Unticked by default. Needed before a code is sent, and sent again with the code so the account records it.
  const [agreed, setAgreed] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  // The bot challenge: the server answers "challenge: true" only when it is needed; the widget then gives a token and the request is sent again.
  const [challengeKey, setChallengeKey] = useState("");
  const challengeRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  // The widget's callback runs later than the render that made it: it must send the e-mail and consent as they are THEN.
  const sendCodeRef = useRef<(event?: React.FormEvent, token?: string) => Promise<void>>(async () => {});

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

  useEffect(() => {
    if (!challengeKey || !challengeRef.current) return;
    let cancelled = false;
    loadTurnstile().then((api) => {
      if (cancelled || !challengeRef.current) return;
      if (widgetId.current !== undefined) api.remove(widgetId.current);
      widgetId.current = api.render(challengeRef.current, {
        sitekey: challengeKey,
        callback: (token) => { void sendCodeRef.current(undefined, token); },
        "error-callback": () => setError("Pengesahan keselamatan tidak dapat dimuatkan. Muat semula halaman dan cuba lagi."),
      });
    }).catch(() => setError("Pengesahan keselamatan tidak dapat dimuatkan. Semak sambungan anda dan cuba lagi."));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeKey]);

  async function sendCode(event?: React.FormEvent, turnstileToken?: string) {
    event?.preventDefault();
    if (busy) return;
    setError(""); setNotice("");
    if (!email.trim()) { setError("Masukkan e-mel anda."); return; }
    if (!agreed) { setError("Tandakan pengesahan umur dan persetujuan untuk meneruskan."); return; }
    setBusy(true);
    try {
      const { ok, data } = await post("/api/akaun/kod", { email, turnstileToken });
      if (data.challenge && typeof data.siteKey === "string") {
        // Needed now: show the widget (it asks nothing of most readers), then it sends the request again with its token.
        if (data.error) setError(String(data.error));
        if (turnstileToken && widgetId.current !== undefined) window.turnstile?.reset(widgetId.current);
        setChallengeKey(data.siteKey);
        return;
      }
      if (!ok) { setError(String(data.error ?? "Kod tidak dapat dihantar. Cuba lagi.")); return; }
      setChallengeKey("");
      setCode("");
      setStep("code");
      setWait(RESEND_AFTER_SECONDS);
    } catch {
      setError("Tiada sambungan. Semak internet anda dan cuba lagi.");
    } finally {
      setBusy(false);
    }
  }

  sendCodeRef.current = sendCode;

  async function verify(event?: React.FormEvent, replaceDeviceId?: string) {
    event?.preventDefault();
    if (busy) return;
    setError(""); setNotice("");
    if (!/^\d{6}$/.test(code.replace(/[\s-]/g, ""))) { setError("Masukkan kod enam digit."); return; }
    setBusy(true);
    try {
      const { ok, status, data } = await post("/api/akaun/sahkan", { email, code, label: deviceLabel(), replaceDeviceId, consent: agreed });
      if (ok && data.needsDeviceChoice) {
        setDevices((data.devices as Device[]) ?? []);
        setStep("device");
        return;
      }
      if (ok && data.ok) {
        window.location.href = next;
        return;
      }
      setError(status === 429 ? "Terlalu banyak cubaan. Cuba lagi kemudian." : String(data.error ?? "Kod tidak sah atau telah tamat tempoh. Semak kod atau minta kod baharu."));
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
          {compact ? null : <p className="auth-intro">Masukkan e-mel anda. Kami hantar kod enam digit. Tiada kata laluan.</p>}
          <label className="auth-label" htmlFor="auth-email">E-mel</label>
          <input id="auth-email" className="auth-input" type="email" inputMode="email" autoComplete="email" placeholder="nama@contoh.my" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} aria-describedby={error ? "auth-error" : undefined} />
          <label className="auth-consent" htmlFor="auth-consent">
            <input id="auth-consent" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span>
              Saya mengesahkan bahawa saya berumur 18 tahun atau lebih, dan bersetuju dengan <a href="/terma" target="_blank" rel="noopener">Terma penggunaan</a> serta
              telah membaca <a href="/privasi" target="_blank" rel="noopener">Dasar privasi</a> Jalin.
            </span>
          </label>
          {error ? <p id="auth-error" className="auth-error" role="alert">{error}</p> : null}
          {challengeKey ? (
            <div className="auth-challenge">
              <p className="auth-fine">Satu semakan keselamatan ringkas diperlukan sebelum kod dihantar.</p>
              <div ref={challengeRef} />
            </div>
          ) : null}
          <button className="auth-button" type="submit" disabled={busy}>{busy ? "Menghantar…" : "Hantar kod"}</button>
          <p className="auth-fine">Percubaan percuma 14 hari bermula apabila anda memilih untuk memulakannya.</p>
        </form>
      ) : null}

      {step === "code" ? (
        <form onSubmit={(e) => verify(e)} noValidate>
          <h1 className="auth-title">Masukkan kod</h1>
          <p className="auth-intro">Kod telah dihantar ke <strong>{email.trim()}</strong>. Kod ini sah selama 5 minit. Jika tiada dalam peti masuk, semak folder spam.</p>
          <label className="auth-label" htmlFor="auth-code">Kod enam digit</label>
          <input id="auth-code" ref={codeRef} className="auth-input auth-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d\s-]/g, ""))} aria-invalid={!!error} aria-describedby={error ? "auth-error" : undefined} />
          {error ? <p id="auth-error" className="auth-error" role="alert">{error}</p> : null}
          {notice ? <p className="auth-notice" role="status">{notice}</p> : null}
          <button className="auth-button" type="submit" disabled={busy}>{busy ? "Mengesahkan…" : "Sahkan"}</button>
          <div className="auth-links">
            <button type="button" className="auth-link" disabled={wait > 0 || busy} onClick={() => sendCode().then(() => setNotice("Kod baharu dihantar."))}>
              {wait > 0 ? `Hantar semula kod (${wait} saat)` : "Hantar semula kod"}
            </button>
            <button type="button" className="auth-link" onClick={() => { setStep("email"); setError(""); setNotice(""); }}>Tukar e-mel</button>
          </div>
        </form>
      ) : null}

      {step === "device" ? (
        <div>
          <h1 className="auth-title">Pilih peranti untuk dilog keluar</h1>
          <p className="auth-intro">Akaun ini sudah digunakan pada dua peranti. Untuk log masuk pada peranti ini, anda perlu mengeluarkan salah satu peranti yang sedia ada.</p>
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
