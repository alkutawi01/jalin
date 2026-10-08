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
  { id: "alat-lain", label: "Alat lain" }
] as const;

/**
 * Parts that used to be a tab of Tetapan and now live elsewhere. "Status sistem" is the state of the system, not a setting, so it is on
 * the dashboard; an old link or bookmark to the tab goes there.
 */
export const MOVED_TABS: Record<string, string> = { "status-sistem": "/admin#status-sistem" };

export function movedTabTarget(value: string | string[] | undefined): string | null {
  const one = Array.isArray(value) ? value[0] : value;
  return one && Object.hasOwn(MOVED_TABS, one) ? MOVED_TABS[one]! : null;
}

export type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];
export const DEFAULT_SETTINGS_TAB: SettingsTabId = SETTINGS_TABS[0].id;

/** The tab an address asks for; anything unknown (or nothing) is the first tab. */
export function settingsTabOf(value: string | string[] | undefined): SettingsTabId {
  const one = Array.isArray(value) ? value[0] : value;
  return SETTINGS_TABS.find((tab) => tab.id === one)?.id ?? DEFAULT_SETTINGS_TAB;
}

export const settingsTabHref = (id: SettingsTabId) => (id === DEFAULT_SETTINGS_TAB ? "/admin/settings" : `/admin/settings?tab=${id}`);
