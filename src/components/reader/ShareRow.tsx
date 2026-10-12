"use client";

import { useEffect, useRef, useState } from "react";

const ICON = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: false } as const;

/**
 * "Kongsi" at the end of a work: WhatsApp, Facebook, X and a copy-link button, in one quiet row under the text (not a button that
 * floats over the page). It shares the page the reader is on (a novela chapter shares that chapter), without the query string, so a
 * reading position or a tracking tag never travels with the link. The address is read in the browser, so before the script runs the
 * links carry the title only.
 */
export default function ShareRow({ title }: { title: string }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setUrl(window.location.origin + window.location.pathname);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  async function copy() {
    const link = url || window.location.origin + window.location.pathname;
    let ok = false;
    try {
      await navigator.clipboard.writeText(link);
      ok = true;
    } catch {
      // An old browser or an insecure frame: the textarea route still copies.
      const box = document.createElement("textarea");
      box.value = link;
      box.setAttribute("readonly", "");
      box.style.position = "fixed";
      box.style.opacity = "0";
      document.body.appendChild(box);
      box.select();
      try { ok = document.execCommand("copy"); } catch { ok = false; }
      box.remove();
    }
    if (ok) {
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2200);
    }
  }

  const text = encodeURIComponent(url ? `${title} ${url}` : title);
  const enc = encodeURIComponent(url);
  const links = [
    {
      key: "whatsapp",
      label: "Kongsi di WhatsApp",
      href: `https://wa.me/?text=${text}`,
      icon: <svg {...ICON}><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>,
    },
    {
      key: "facebook",
      label: "Kongsi di Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc}`,
      icon: <svg {...ICON}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>,
    },
    {
      key: "x",
      label: "Kongsi di X",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${enc}`,
      icon: <svg {...ICON}><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>,
    },
  ];

  return (
    <div className="site-shell share-row" role="group" aria-label="Kongsi karya ini">
      <span className="share-row-label">Kongsi</span>
      <div className="share-row-icons">
        {links.map((link) => (
          <a key={link.key} className="share-row-icon" href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label} title={link.label}>
            {link.icon}
          </a>
        ))}
        <button type="button" className={"share-row-icon" + (copied ? " is-done" : "")} onClick={copy} aria-label="Salin pautan" title="Salin pautan">
          <svg {...ICON}>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </button>
      </div>
      <span className="share-row-status" role="status" aria-live="polite">{copied ? "Pautan disalin" : ""}</span>
    </div>
  );
}
