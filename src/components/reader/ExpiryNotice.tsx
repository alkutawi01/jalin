"use client";

import { useEffect, useState } from "react";
import { loadWho } from "./HeaderAccount";

const DAY = 86400000;
const KEY = "jalin-expiry-notice";

function whenText(days: number): string {
  if (days <= 0) return "hari ini";
  if (days === 1) return "esok";
  return "dalam " + days + " hari";
}

/**
 * A quiet line under the header for a reader whose access ends within a week: when, and the way to extend it. It can be closed;
 * it comes back the next day. A visitor and a reader with plenty of time left see nothing.
 */
export default function ExpiryNotice() {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadWho().then((who) => {
      if (!alive || !who.signedIn || !who.endsAt) return;
      if (who.state !== "trial" && who.state !== "subscribed") return;
      const days = Math.ceil((new Date(who.endsAt).getTime() - Date.now()) / DAY);
      if (Number.isNaN(days) || days > 7) return;
      const today = new Date().toISOString().slice(0, 10);
      try { if (window.localStorage.getItem(KEY) === today) return; } catch { /* shown anyway */ }
      setText("Akses membaca anda tamat " + whenText(days) + ". Tebus kod langganan untuk terus membaca.");
    });
    return () => { alive = false; };
  }, []);

  if (!text) return null;
  return (
    <div className="expiry-notice" role="status">
      <span>{text}</span>
      <a href="/tebus">Tebus kod</a>
      <button
        type="button"
        aria-label="Tutup peringatan"
        onClick={() => {
          try { window.localStorage.setItem(KEY, new Date().toISOString().slice(0, 10)); } catch { /* it just comes back */ }
          setText(null);
        }}
      >
        ×
      </button>
    </div>
  );
}
