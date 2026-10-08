"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { errorText } from "../../../lib/admin/error-text";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
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
        body: JSON.stringify({ current, next })
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
          <p>Pilih kata laluan anda</p>
        </header>
        <p className="admin-form-hint">Kata laluan sementara hanya untuk kali pertama. Pilih satu yang hanya anda tahu: sekurang-kurangnya 10 aksara, dengan huruf dan nombor.</p>
        {error ? <div className="admin-alert admin-alert-error" role="alert">{error}</div> : null}
        <form onSubmit={submit} className="admin-login-form">
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
          <button type="submit" className="admin-btn admin-btn-primary admin-btn-full" disabled={loading}>{loading ? "Menyimpan…" : "Simpan kata laluan"}</button>
        </form>
      </div>
    </div>
  );
}
