"use client";

import { useEffect, useRef } from "react";
import { NAV_LINKS, SiteNavLinks } from "./nav-links";

export default function MobileNavMenu({ active }: { active?: string }) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && detailsRef.current?.open) {
        detailsRef.current.open = false;
        detailsRef.current.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <details className="header-mobile-nav" ref={detailsRef}>
      <summary>Menu</summary>
      <SiteNavLinks active={active} className="header-mobile-nav-links" links={NAV_LINKS} label="Menu mudah alih" variant="list" />
    </details>
  );
}
