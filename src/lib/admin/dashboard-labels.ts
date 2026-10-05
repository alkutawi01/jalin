import type { EditorialHealth, HealthItem } from "./editorial-health";

/** What the administrator reads on the dashboard: plain Malay for every check, status and issue state. */

export const CHECK_LABELS: Record<keyof EditorialHealth, { title: string; about: string; fix: string }> = {
  authors: { title: "Nama penulis", about: "Setiap karya terbit mesti ada sekurang-kurangnya seorang penulis awam.", fix: "Tambah kredit penulis" },
  revisions: { title: "Versi terbit", about: "Karya terbit mesti ada salinan versi yang dibaca pembaca.", fix: "Terbitkan semula" },
  visuals: { title: "Asal imej", about: "Setiap imej mesti direkod daripada mana datangnya (alat penjana atau muat naik manual).", fix: "Rekod asal imej" },
  translations: { title: "Jenis lama", about: "Karya yang masih berjenis \"terjemahan\" (jenis ini sudah dihentikan).", fix: "Tukar jenis" }
};

export const STATUS_LABELS: Record<string, string> = { pass: "Lulus", warning: "Perlu perhatian", fail: "Perlu dibaiki" };
export const ISSUE_STATE_LABELS: Record<string, string> = { all: "Semua", open: "Terbuka", resolved: "Selesai", ignored: "Diabaikan" };
export const SEVERITY_LABELS: Record<string, string> = { high: "Penting", medium: "Sederhana", low: "Rendah" };

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export interface CheckRow {
  key: keyof EditorialHealth;
  title: string;
  about: string;
  fix: string;
  status: string;
  statusLabel: string;
  total: number;
  /** The first few affected works, each with the address of the tab that fixes it. */
  shown: Array<{ title: string; message: string; href: string }>;
  hidden: number;
}

export const CHECKS_SHOWN = 5;

export function hrefFor(item: HealthItem): string {
  return `/admin/works/${item.workId}#${item.tab}`;
}

/** The dashboard's "Semakan kandungan": the checks that need attention first, then the ones that passed. */
export function buildContentChecks(health: EditorialHealth): { needAttention: CheckRow[]; passed: string[] } {
  const order = Object.keys(CHECK_LABELS) as Array<keyof EditorialHealth>;
  const rows: CheckRow[] = order.map((key) => {
    const category = health[key];
    return {
      key,
      ...CHECK_LABELS[key],
      status: category.status,
      statusLabel: statusLabel(category.status),
      total: category.items.length,
      shown: category.items.slice(0, CHECKS_SHOWN).map((item) => ({ title: item.title, message: item.message, href: hrefFor(item) })),
      hidden: Math.max(0, category.items.length - CHECKS_SHOWN)
    };
  });
  const severity = (status: string) => (status === "fail" ? 0 : status === "warning" ? 1 : 2);
  const needAttention = rows.filter((row) => row.status !== "pass").sort((a, b) => severity(a.status) - severity(b.status));
  return { needAttention, passed: rows.filter((row) => row.status === "pass").map((row) => row.title) };
}
