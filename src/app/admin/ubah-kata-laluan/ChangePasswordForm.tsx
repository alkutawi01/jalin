"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { errorText } from "../../../lib/admin/error-text";

/**
 * Choosing one's own password. At the very first sign-in (an invitation with a temporary username and password) this is also where the
 * person gives their own name, keeps or changes the temporary username, and may add an e-mail, so the owner never has to know any of it.
 */
export default function ChangePasswordForm({
  firstTime,
  initialUsername,
  initialEmail
}: {
  firstTime: boolean;
  initialUsername: string;
  initialEmail: string;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState(initialUsername);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next !== again) {
      setError("Kata laluan baharu tidak sepadan. Taip semula.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(firstTime ? { current, next, displayName, username, email } : { current, next })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Kata laluan tidak dapat ditukar.");
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <header className="admin-login-header">
          <img className="a-login-logo" src="/brand/jalin-wordmark.svg" alt="Jalin" />
          <p>{firstTime ? "Selamat datang ke Jalin" : "Pilih kata laluan anda"}</p>
        </header>
        <p className="admin-form-hint">
          {firstTime
            ? "Kata nama dan kata laluan sementara hanya untuk kali pertama. Isi nama anda, pilih kata nama dan kata laluan kekal: sekurang-kurangnya 10 aksara, dengan huruf dan nombor."
            : "Kata laluan sementara hanya untuk kali pertama. Pilih satu yang hanya anda tahu: sekurang-kurangnya 10 aksara, dengan huruf dan nombor."}
        </p>
        {error ? <div className="admin-alert admin-alert-error" role="alert">{error}</div> : null}
        <form onSubmit={submit} className="admin-login-form">
          {firstTime ? (
            <>
              <div className="admin-form-group">
                <label htmlFor="displayName">Nama anda</label>
                <input id="displayName" autoComplete="name" required maxLength={80} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                <p className="admin-form-hint">Nama yang dilihat oleh pasukan Jalin.</p>
              </div>
              <div className="admin-form-group">
                <label htmlFor="username">Kata nama kekal</label>
                <input id="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={username} onChange={(e) => setUsername(e.target.value)} />
                <p className="admin-form-hint">Biarkan yang sementara, atau tukar: huruf kecil, nombor, titik, sengkang atau garis bawah (3 hingga 30 aksara).</p>
              </div>
              <div className="admin-form-group">
                <label htmlFor="email">E-mel (tidak wajib)</label>
                <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </>
          ) : null}
          <div className="admin-form-group">
            <label htmlFor="current">Kata laluan sementara</label>
            <input id="current" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div className="admin-form-group">
            <label htmlFor="next">Kata laluan baharu</label>
            <input id="next" type="password" autoComplete="new-password" required minLength={10} value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
          <div className="admin-form-group">
            <label htmlFor="again">Taip semula kata laluan baharu</label>
            <input id="again" type="password" autoComplete="new-password" required minLength={10} value={again} onChange={(e) => setAgain(e.target.value)} />
          </div>
          <button type="submit" className="admin-btn admin-btn-primary admin-btn-full" disabled={loading}>{loading ? "Menyimpan…" : firstTime ? "Mula menggunakan Jalin" : "Simpan kata laluan"}</button>
        </form>
      </div>
    </div>
  );
}
