import type { ReactNode } from "react";

/** The small line icons of the /mula page: one 24x24 grid, a 1.7 stroke, the colour of the text around them. Decorative (aria-hidden). */
const PATHS: Record<string, ReactNode> = {
  cerpen: <><path d="M6 3h9l3 3v15H6z" /><path d="M14 3v4h4" /><path d="M9 12h6M9 16h6" /></>,
  novela: <><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5C4.7 20 4 19.3 4 18.5z" /><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5z" /></>,
  bersiri: <><rect x="4" y="4" width="13" height="16" rx="1.5" /><path d="M7 2.5h12.5a1.5 1.5 0 0 1 1.5 1.5v14" /><path d="M8 9h5M8 13h5" /></>,
  fragmen: <><path d="M5 8c0-1.7 1.3-3 3-3v3H5z" /><path d="M5 8v4c0 2 1 3.5 3 4" /><path d="M14 8c0-1.7 1.3-3 3-3v3h-3z" /><path d="M14 8v4c0 2 1 3.5 3 4" /></>,
  sinopsis: <><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  spark: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="m6.5 6.5 2.5 2.5M15 15l2.5 2.5M17.5 6.5 15 9M9 15l-2.5 2.5" /></>,
  card: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  device: <><rect x="8" y="3" width="9" height="15" rx="2" /><path d="M3 9h3M3 9v7a1 1 0 0 0 1 1h2" /><path d="M11.5 15.5h.01" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m4 18 5-5 4 4 3-3 4 4" /></>,
  bookmark: <><path d="M7 3h10v18l-5-4-5 4z" /></>,
  type: <><path d="M5 19 10 5l5 14" /><path d="M7 14h6" /><path d="M17 8h3M18.5 8v8" /></>,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
  key: <><circle cx="8" cy="12" r="3.5" /><path d="M11.5 12H21M17 12v3M20 12v2" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  check: <><path d="m5 12.5 4.5 4.5L19 7.5" /></>,
};

export default function StartIcon({ name, size = 24 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg className="start-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[name] ?? null}
    </svg>
  );
}
