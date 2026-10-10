"use client";

import { useState } from "react";

type Device = { id: string; label: string; lastSeenAt: string };
type Prefs = { fontSizePx: number; lineHeightX100: number; textWidthCh: number; theme: "cerah" | "sepia" | "gelap"; fontFamily: "serif" | "sans"; dimPercent: number };

const SIZES = [16, 18, 20, 22, 24];
const THEMES: { value: Prefs["theme"]; label: string }[] = [{ value: "cerah", label: "Cerah" }, { value: "sepia", label: "Sepia" }, { value: "gelap", label: "Gelap" }];
const SPACING: { value: number; label: string }[] = [{ value: 150, label: "Rapat" }, { value: 175, label: "Biasa" }, { value: 200, label: "Longgar" }];
const WIDTHS: { value: number; label: string }[] = [{ value: 60, label: "Sempit" }, { value: 68, label: "Biasa" }, { value: 74, label: "Luas" }];
const DIMS = [0, 5, 10, 15, 20];

const THEME_COLOURS: Record<Prefs["theme"], { bg: string; fg: string }> = {
  cerah: { bg: "#fbf8f2", fg: "#18343c" },
  sepia: { bg: "#f1e4cc", fg: "#3b2f1e" },
  gelap: { bg: "#17191a", fg: "#e7e2d8" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("ms-MY", { day: "numeric", month: "long", year: "numeric" });
}

/** The signed-in reader's page: the trial, the name, reading settings with a preview, and the devices. Saved by the account, not the browser. */
export default function AccountPanel(props: {
  email: string;
  displayName: string | null;
  access: { state: "trial" | "subscribed" | "expired" | "none"; endsAt: string | null; currentPeriodEndsAt: string | null };
  thisDeviceId: string;
  devices: Device[];
  prefs: Prefs;
  /** The trial has not been started on this account and this address has not used it. */
  trialAvailable?: boolean;
  history: { id: string; label: string; startsAt: string; endsAt: string; revoked: boolean }[];
  reading: { workId: string; title: string; href: string; kind: string; chapter: string | null; updatedAt: string }[];
  saved: { workId: string; title: string; href: string; kind: string; savedAt: string }[];
}) {
  const [name, setName] = useState(props.displayName ?? "");
  const [savedName, setSavedName] = useState(props.displayName ?? "");
  const [editingName, setEditingName] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(props.prefs);
  const [devices, setDevices] = useState<Device[]>(props.devices);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [reading, setReading] = useState(props.reading);

  async function call(path: string, method: string, body?: unknown) {
    const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    let data: Record<string, unknown> = {};
    try { data = await response.json(); } catch { /* not JSON */ }
    return { ok: response.ok, status: response.status, data };
  }

  async function saveName() {
    setError(""); setMessage("");
    const { ok, data } = await call("/api/akaun/profil", "PATCH", { displayName: name });
    if (!ok) { setError(String(data.error ?? "Nama tidak dapat disimpan.")); return; }
    setSavedName(String(data.displayName ?? ""));
    setName(String(data.displayName ?? ""));
    setEditingName(false);
    setMessage("Nama disimpan.");
  }

  async function savePrefs(change: Partial<Prefs>) {
    const next = { ...prefs, ...change };
    setPrefs(next);
    setError(""); setMessage("");
    const { ok, data } = await call("/api/akaun/tetapan", "PUT", next);
    if (!ok) { setError(String(data.error ?? "Tetapan tidak dapat disimpan.")); return; }
    setPrefs(data.prefs as Prefs);
  }

  async function removeDevice(id: string) {
    setBusy(true); setError(""); setMessage("");
    const { ok, data } = await call("/api/akaun/peranti/keluarkan", "POST", { deviceId: id });
    setBusy(false);
    if (!ok) { setError(String(data.error ?? "Peranti tidak dapat dikeluarkan.")); return; }
    setDevices((list) => list.filter((d) => d.id !== id));
    setMessage("Peranti dikeluarkan.");
  }

  async function startTrial() {
    setBusy(true); setError(""); setMessage("");
    const { ok, data } = await call("/api/akaun/percubaan", "POST", {});
    if (!ok) { setBusy(false); setError(String(data.error ?? "Percubaan tidak dapat dimulakan.")); return; }
    window.location.reload();
  }

  async function signOut(path: string) {
    setBusy(true);
    await call(path, "POST", {});
    window.location.href = "/log-masuk";
  }

  async function clearReading() {
    setBusy(true); setError(""); setMessage("");
    const { ok, data } = await call("/api/akaun/bacaan", "DELETE");
    setBusy(false);
    if (!ok) { setError(String(data.error ?? "Senarai tidak dapat dikosongkan.")); return; }
    setReading([]);
    setMessage("Senarai bacaan dikosongkan.");
  }

  async function deleteAccount() {
    setBusy(true); setError(""); setMessage("");
    const { ok, data } = await call("/api/akaun/padam", "POST", { confirm: "PADAM" });
    if (!ok) { setBusy(false); setError(String(data.error ?? "Akaun tidak dapat dipadam.")); return; }
    window.location.href = "/log-masuk?padam=1";
  }

  const colours = THEME_COLOURS[prefs.theme];
  const previewStyle = {
    background: colours.bg,
    color: colours.fg,
    fontSize: `${prefs.fontSizePx}px`,
    lineHeight: prefs.lineHeightX100 / 100,
    maxWidth: `${prefs.textWidthCh}ch`,
    fontFamily: prefs.fontFamily === "serif" ? 'Georgia, "Times New Roman", serif' : 'var(--font-inter), Inter, ui-sans-serif, sans-serif',
    filter: prefs.dimPercent ? `brightness(${1 - prefs.dimPercent / 100})` : undefined,
  } as const;

  return (
    <div className="auth-account">
      <h1 className="auth-title">Akaun saya</h1>
      <h2 className="auth-subtitle" id="profil">Profil</h2>
      <div className="auth-row">
        <span>{props.email}</span>
      </div>
      <div className="auth-row">
        {editingName ? (
          <span className="auth-inline">
            <input className="auth-input auth-input--small" aria-label="Nama" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama anda" />
            <button type="button" className="auth-link" onClick={saveName}>Simpan</button>
            <button type="button" className="auth-link" onClick={() => { setName(savedName); setEditingName(false); }}>Batal</button>
          </span>
        ) : (
          <>
            <span>{savedName || "Tiada nama"}</span>
            <button type="button" className="auth-link" onClick={() => setEditingName(true)}>{savedName ? "Ubah nama" : "Tambah nama"}</button>
          </>
        )}
      </div>

      <h2 className="auth-subtitle" id="langganan">Langganan</h2>

      {props.access.state === "trial" ? (
        <p className="auth-trial">
          Percubaan percuma tamat pada {formatDate(props.access.currentPeriodEndsAt)}
          {props.access.endsAt && props.access.endsAt !== props.access.currentPeriodEndsAt ? `. Akses langganan anda aktif sehingga ${formatDate(props.access.endsAt)}.` : ""}
        </p>
      ) : null}
      {props.access.state === "subscribed" ? <p className="auth-trial">Langganan aktif sehingga {formatDate(props.access.endsAt)}</p> : null}
      {props.access.state === "expired" ? <p className="auth-trial auth-trial--ended">Akses membaca anda telah tamat pada {formatDate(props.access.endsAt)}.</p> : null}
      {props.access.state === "none" ? <p className="auth-trial auth-trial--ended">Anda belum mempunyai akses membaca.</p> : null}
      {props.trialAvailable ? (
        <button type="button" className="auth-button auth-trial-start" disabled={busy} onClick={startTrial}>Mulakan percubaan percuma 14 hari</button>
      ) : null}
      <a className="auth-button auth-button--ghost auth-redeem-link" href="/tebus">Tebus kod langganan</a>
      {props.history.length > 0 ? (
        <ul className="auth-history" aria-label="Sejarah akses">
          {props.history.map((h) => (
            <li key={h.id} className={h.revoked ? "is-revoked" : undefined}>
              <span className="auth-history-what">{h.label}{h.revoked ? " (dibatalkan)" : ""}</span>
              <span className="auth-history-when">{formatDate(h.startsAt)} hingga {formatDate(h.endsAt)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <h2 className="auth-subtitle" id="bacaan">Bacaan saya</h2>
      {reading.length === 0 ? (
        <p className="auth-fine">Karya dan bab yang anda buka akan muncul di sini supaya mudah untuk menyambung bacaan.</p>
      ) : (
        <>
          <ul className="auth-reading">
            {reading.map((r) => (
              <li key={r.workId}>
                <a href={r.href}>
                  <span className="auth-reading-title">{r.title}</span>
                  <span className="auth-reading-meta">{r.kind}{r.chapter ? " · " + r.chapter : ""} · {formatDate(r.updatedAt)}</span>
                </a>
              </li>
            ))}
          </ul>
          <p><button type="button" className="auth-link" disabled={busy} onClick={clearReading}>Kosongkan senarai</button></p>
        </>
      )}

      <h2 className="auth-subtitle" id="disimpan">Disimpan</h2>
      {props.saved.length === 0 ? (
        <p className="auth-fine">Karya yang anda simpan dengan butang Simpan akan muncul di sini.</p>
      ) : (
        <ul className="auth-reading">
          {props.saved.map((r) => (
            <li key={r.workId}>
              <a href={r.href}>
                <span className="auth-reading-title">{r.title}</span>
                <span className="auth-reading-meta">{r.kind} · disimpan {formatDate(r.savedAt)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <h2 className="auth-subtitle" id="tetapan">Tetapan bacaan</h2>
      <div className="auth-row"><span>Saiz huruf</span>
        <span className="auth-inline">
          <button type="button" className="auth-step" aria-label="Kecilkan huruf" disabled={prefs.fontSizePx === SIZES[0]} onClick={() => savePrefs({ fontSizePx: SIZES[Math.max(0, SIZES.indexOf(prefs.fontSizePx) - 1)] })}>A−</button>
          <span className="auth-value">{prefs.fontSizePx}</span>
          <button type="button" className="auth-step" aria-label="Besarkan huruf" disabled={prefs.fontSizePx === SIZES[SIZES.length - 1]} onClick={() => savePrefs({ fontSizePx: SIZES[Math.min(SIZES.length - 1, SIZES.indexOf(prefs.fontSizePx) + 1)] })}>A+</button>
        </span>
      </div>
      <div className="auth-row"><span>Tema</span>
        <span className="auth-choices" role="group" aria-label="Tema">
          {THEMES.map((t) => <button key={t.value} type="button" className="auth-choice" aria-pressed={prefs.theme === t.value} onClick={() => savePrefs({ theme: t.value })}>{t.label}</button>)}
        </span>
      </div>
      <div className="auth-row"><span>Jenis huruf</span>
        <span className="auth-choices" role="group" aria-label="Jenis huruf">
          <button type="button" className="auth-choice" aria-pressed={prefs.fontFamily === "serif"} onClick={() => savePrefs({ fontFamily: "serif" })}>Serif</button>
          <button type="button" className="auth-choice" aria-pressed={prefs.fontFamily === "sans"} onClick={() => savePrefs({ fontFamily: "sans" })}>Sans</button>
        </span>
      </div>
      <div className="auth-row"><span>Jarak baris</span>
        <span className="auth-choices" role="group" aria-label="Jarak baris">
          {SPACING.map((s) => <button key={s.value} type="button" className="auth-choice" aria-pressed={prefs.lineHeightX100 === s.value} onClick={() => savePrefs({ lineHeightX100: s.value })}>{s.label}</button>)}
        </span>
      </div>
      <div className="auth-row"><span>Lebar teks</span>
        <span className="auth-choices" role="group" aria-label="Lebar teks">
          {WIDTHS.map((w) => <button key={w.value} type="button" className="auth-choice" aria-pressed={prefs.textWidthCh === w.value} onClick={() => savePrefs({ textWidthCh: w.value })}>{w.label}</button>)}
        </span>
      </div>
      <div className="auth-row"><span>Redupkan halaman</span>
        <span className="auth-choices" role="group" aria-label="Redupkan halaman">
          {DIMS.map((d) => <button key={d} type="button" className="auth-choice" aria-pressed={prefs.dimPercent === d} onClick={() => savePrefs({ dimPercent: d })}>{d}%</button>)}
        </span>
      </div>
      <div className="auth-preview" style={previewStyle} aria-label="Contoh teks dengan tetapan ini">
        <p>Hujan turun perlahan sepanjang petang itu. Aina menutup buku lalu mendengar titisan hujan di atas bumbung.</p>
      </div>
      <p className="auth-fine">Tetapan bacaan disimpan dalam akaun dan digunakan apabila anda membaca karya pada mana-mana peranti.</p>

      <h2 className="auth-subtitle">Peranti ({devices.length} daripada 2)</h2>
      {devices.map((device) => (
        <div className="auth-row" key={device.id}>
          <span>{device.label}{device.id === props.thisDeviceId ? " · Peranti ini" : ""}</span>
          {device.id === props.thisDeviceId ? <span /> : <button type="button" className="auth-link" disabled={busy} onClick={() => removeDevice(device.id)}>Keluarkan</button>}
        </div>
      ))}

      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      {message ? <p className="auth-notice" role="status">{message}</p> : null}

      <div className="auth-actions">
        <button type="button" className="auth-button auth-button--ghost" disabled={busy} onClick={() => signOut("/api/akaun/keluar")}>Log keluar daripada peranti ini</button>
        <button type="button" className="auth-button auth-button--ghost" disabled={busy} onClick={() => signOut("/api/akaun/keluar-semua")}>Keluar dari semua peranti</button>
      </div>

      <h2 className="auth-subtitle">Padam akaun</h2>
      {confirmingDelete ? (
        <div className="auth-danger" role="alertdialog" aria-labelledby="padam-title">
          <p id="padam-title"><strong>Padam akaun ini?</strong></p>
          <p className="auth-fine">E-mel, nama, tetapan bacaan dan senarai Bacaan saya akan dipadamkan. Anda juga akan dilog keluar daripada semua peranti.</p>
          <p className="auth-fine">Tindakan ini tidak boleh dibatalkan dan akaun tidak boleh dipulihkan.</p>
          {props.access.state === "trial" || props.access.state === "subscribed" ? <p className="auth-fine">Anda masih mempunyai akses bacaan aktif sehingga {formatDate(props.access.endsAt)}. Baki akses itu akan hilang. Tiada bayaran balik automatik, tertakluk kepada hak anda di bawah undang-undang.</p> : null}
          <p className="auth-fine">Percubaan percuma tidak boleh diaktifkan semula menggunakan e-mel yang sama.</p>
          <div className="auth-actions">
            <button type="button" className="auth-button" disabled={busy} onClick={deleteAccount}>Ya, padam akaun saya</button>
            <button type="button" className="auth-button auth-button--ghost" disabled={busy} onClick={() => setConfirmingDelete(false)}>Batal</button>
          </div>
        </div>
      ) : (
        <p><button type="button" className="auth-link" disabled={busy} onClick={() => setConfirmingDelete(true)}>Padam akaun saya</button></p>
      )}
    </div>
  );
}
