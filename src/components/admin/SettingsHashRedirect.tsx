"use client";

import { useEffect } from "react";
import { SETTINGS_TABS, settingsTabHref } from "../../lib/admin/settings-tabs";

/**
 * Old links point at a section of the one long page (/admin/settings#nama-samaran). The server never sees the part after "#",
 * so this takes such a visitor to the tab of that name. Nothing is drawn.
 */
export default function SettingsHashRedirect({ current }: { current: string }) {
  useEffect(() => {
    const id = window.location.hash.replace(/^#/, "");
    const tab = SETTINGS_TABS.find((t) => t.id === id);
    if (tab && tab.id !== current) window.location.replace(settingsTabHref(tab.id));
  }, [current]);
  return null;
}
