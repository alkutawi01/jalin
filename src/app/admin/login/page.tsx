"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { safeReturnTo } from "../../../lib/admin/return-to";
import { errorText } from "../../../lib/admin/error-text";

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
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Log masuk gagal.");
      }

      const data = await res.json().catch(() => ({} as { mustChangePassword?: boolean }));
      // A temporary password must be replaced before anything else.
      if (data.mustChangePassword) {
        router.push("/admin/ubah-kata-laluan");
        router.refresh();
        return;
      }
      // Back to the page the editor was on when the session ended (a path inside the admin only).
      router.push(safeReturnTo(new URLSearchParams(window.location.search).get("returnTo")));
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
          <p>Admin</p>
        </header>

        {error && (
          <div className="admin-alert admin-alert-error" role="alert">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="admin-form-group">
            <label htmlFor="email">Nama pengguna atau e-mel</label>
            <input
              id="email"
              name="email"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama pengguna atau e-mel"
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
            {loading ? "Menyemak…" : "Log masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
