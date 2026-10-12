"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A "Kongsi" pill at the corner of a work: the phone's own share sheet where there is one, otherwise the address copied to the
 * clipboard with a short confirmation. It shares the page the reader is on (a novela chapter shares that chapter), without the
 * query string, so a reading position or a tracking tag never travels with the link.
 */
export default function ShareWorkButton({ title }: { title: string }) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function confirm() {
    setDone(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(false), 2200);
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      // An old browser or an insecure frame: the textarea route still copies.
      const box = document.createElement("textarea");
      box.value = url;
      box.setAttribute("readonly", "");
      box.style.position = "fixed";
      box.style.opacity = "0";
      document.body.appendChild(box);
      box.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch { ok = false; }
      box.remove();
      return ok;
    }
  }

  async function share() {
    const url = window.location.origin + window.location.pathname;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        // Closing the sheet is not a failure; anything else falls back to copying.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    if (await copy(url)) confirm();
  }

  return (
    <button
      type="button"
      className={"share-work" + (done ? " is-done" : "")}
      aria-label={done ? "Pautan disalin" : `Kongsi ${title}`}
      title="Kongsi pautan karya ini"
      onClick={share}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 15V4" />
        <path d="M8 8l4-4 4 4" />
        <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
      </svg>
      <span aria-live="polite">{done ? "Pautan disalin" : "Kongsi"}</span>
    </button>
  );
}
