"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { safeReturnTo } from "../../../lib/admin/return-to";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login gagal.");
      }

      // Back to the page the editor was on when the session ended (a path inside the admin only).
      router.push(safeReturnTo(new URLSearchParams(window.location.search).get("returnTo")));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <header className="admin-login-header">
          <img className="a-login-logo" src="/brand/jalin-wordmark.svg" alt="Jalin" />
          <p>Admin</p>
        </header>

        {error && (
          <div className="admin-alert admin-alert-error" role="alert">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="admin-form-group">
            <label htmlFor="email">E-mel</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@jalin.adjung.com"
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="password">Kata laluan</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan kata laluan"
            />
          </div>

          <button
            type="submit"
            className="admin-btn admin-btn-primary admin-btn-full"
            disabled={loading}
          >
            {loading ? "Menyemak..." : "Log Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
