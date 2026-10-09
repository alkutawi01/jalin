"use client";

import type { ReactNode } from "react";

/** Shared bits of the Langganan admin pages: a call to the API that says what went wrong, dates in Malaysian time, and the sub-menu. */

export async function api<T = Record<string, unknown>>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error((data as { error?: string }).error || "Tindakan tidak berjaya.") as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return data as T;
}

export function fmtDate(value: string | Date | null | undefined, withTime = false): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ms-MY", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}) });
}

const TABS = [
  { href: "/admin/langganan", label: "Ringkasan" },
  { href: "/admin/langganan/kad", label: "Kad dan kelompok" },
  { href: "/admin/langganan/kod-kongsi", label: "Kod kongsi" },
  { href: "/admin/langganan/pembaca", label: "Pembaca" },
];

export function LanggananNav({ current }: { current: string }) {
  return (
    <nav className="admin-sub-nav" aria-label="Langganan">
      {TABS.map((tab) => (
        <a key={tab.href} href={tab.href} className={`admin-btn admin-btn-sm${tab.href === current ? " admin-btn-primary" : " admin-btn-outline"}`} aria-current={tab.href === current ? "page" : undefined}>
          {tab.label}
        </a>
      ))}
    </nav>
  );
}

export function Notice({ kind, children }: { kind: "error" | "success" | "warning" | "info"; children: ReactNode }) {
  return <div className={`admin-alert admin-alert-${kind}`} role={kind === "error" ? "alert" : "status"}>{children}</div>;
}
