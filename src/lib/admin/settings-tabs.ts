/**
 * The tabs of Tetapan. Each tab is its own address (/admin/settings?tab=audiens), so it can be bookmarked, reloaded and linked to;
 * only the chosen tab's panel is on the page. The ids are the old section anchors, so an old link (/admin/settings#nama-samaran)
 * still means the same place.
 */
export const SETTINGS_TABS = [
  { id: "teks-awam", label: "Teks halaman awam" },
  { id: "warna-blok", label: "Warna blok laman utama" },
  { id: "saiz-teks", label: "Saiz teks karya" },
  { id: "audiens", label: "Audiens" },
  { id: "nama-samaran", label: "Nama samaran AI" },
  { id: "arahan-ai", label: "Arahan AI" },
  { id: "alat-lain", label: "Alat lain" },
  { id: "status-sistem", label: "Status sistem" }
] as const;

export type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];
export const DEFAULT_SETTINGS_TAB: SettingsTabId = SETTINGS_TABS[0].id;

/** The tab an address asks for; anything unknown (or nothing) is the first tab. */
export function settingsTabOf(value: string | string[] | undefined): SettingsTabId {
  const one = Array.isArray(value) ? value[0] : value;
  return SETTINGS_TABS.find((tab) => tab.id === one)?.id ?? DEFAULT_SETTINGS_TAB;
}

export const settingsTabHref = (id: SettingsTabId) => (id === DEFAULT_SETTINGS_TAB ? "/admin/settings" : `/admin/settings?tab=${id}`);
