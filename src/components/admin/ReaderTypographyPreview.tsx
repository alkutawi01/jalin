"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { deviceInfo, type DeviceId } from "../../lib/reader/typography-devices";
import type { TypographySample } from "../../lib/reader/typography-sample";
import styles from "./ReaderTypographyPreview.module.css";

/**
 * A mock-up of one reader's screen (a phone, a tablet held upright or on its side, a laptop, a wide monitor) showing a REAL published story:
 * Jalin's own page is opened in a frame as wide as that screen, so the header, picture, byline, columns and rails are exactly what a reader
 * gets, and the text and sub-heading sizes typed in the boxes are put on that page as they are typed (Jalin's own size where a box is empty).
 * Only one screen is shown at a time (the editor chooses which): there is no room for them all.
 *
 * The frame is as large as the real screen and is scaled down to fit (or shown at its real size, scrolling, on request), so line breaks and
 * proportions are what a reader gets. Everything that depends on the screen is handed to the stylesheet as a CSS variable.
 */

const FRAME = {
  phone: { bezel: 12, radius: 36, screenRadius: 26, foot: 0, style: "isPhone" },
  tablet: { bezel: 14, radius: 26, screenRadius: 12, foot: 0, style: "isTablet" },
  laptop: { bezel: 12, radius: 16, screenRadius: 6, foot: 14, style: "isLaptop" },
  monitor: { bezel: 10, radius: 12, screenRadius: 4, foot: 30, style: "isMonitor" }
} as const;

/** The tallest the mock-up is drawn when it is made to fit: a phone is taller than it is wide, and the page should not become a long scroll. */
const MAX_HEIGHT = 520;

export default function ReaderTypographyPreview({ device, bodyPx, headingEm, sample }: { device: DeviceId; bodyPx: number | null; headingEm: number | null; sample?: TypographySample | null }) {
  const info = deviceInfo(device);
  const stage = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const frameDoc = useRef<HTMLIFrameElement>(null);
  const [available, setAvailable] = useState(0);
  const [real, setReal] = useState(false);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => setAvailable(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { bezel, radius, screenRadius, foot } = FRAME[info.frame];
  const body = bodyPx ?? info.defaults.bodyPx;
  const heading = headingEm ?? info.defaults.headingEm;
  const fit = Math.min((available - bezel * 2 - 8) / info.screen.w, (MAX_HEIGHT - bezel * 2) / info.screen.h);
  const scale = real ? 1 : Math.max(0.05, Math.min(1, available > 0 ? fit : 0.4));

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const view = viewport.current;
    const page = screen.current;
    if (!frame || !view || !page) return;
    const set = (target: HTMLElement, values: Record<string, string>) => Object.entries(values).forEach(([name, value]) => target.style.setProperty(name, value));
    set(frame, { "--rt-bezel": `${bezel}px`, "--rt-radius": `${radius}px`, "--rt-screen-radius": `${screenRadius}px`, "--rt-foot": `${foot}px` });
    view.style.width = `${info.screen.w * scale}px`;
    view.style.height = `${info.screen.h * scale}px`;
    page.style.transform = `scale(${scale})`;
    set(page, { "--rt-w": `${info.screen.w}px`, "--rt-h": `${info.screen.h}px` });
  }, [info, scale, bezel, radius, screenRadius, foot]);

  // The two sizes are put on the real page inside the frame. Both are always written (a cleared box shows Jalin's own size), so a size saved
  // earlier on the site does not show through while the editor is trying another.
  const applySizes = useCallback(() => {
    const doc = frameDoc.current?.contentDocument;
    if (!doc || !doc.head) return;
    let style = doc.getElementById("rt-preview") as HTMLStyleElement | null;
    if (!style) {
      style = doc.createElement("style");
      style.id = "rt-preview";
      doc.head.appendChild(style);
    }
    style.textContent = `body .story-body{font-size:${body}px!important}body .story-body h2{font-size:${heading}em!important}`;
  }, [body, heading]);

  useEffect(() => {
    applySizes();
  }, [applySizes, sample?.href, device]);

  const percent = Math.round(scale * 100);
  return (
    <figure className={styles.figure}>
      <div ref={stage} className={`${styles.stage}${real ? ` ${styles.stageReal}` : ""}`}>
        <div ref={frameRef} className={`${styles.device} ${styles[FRAME[info.frame].style]}`} role="img" aria-label={`Pratonton ${info.label}: teks ${body} px, tajuk bahagian ${heading} em`}>
          <div ref={viewport} className={styles.viewport}>
            <div ref={screen} className={styles.screen}>
              {sample ? (
                <iframe
                  ref={frameDoc}
                  key={`${sample.href}|${device}`}
                  className={styles.page}
                  src={sample.href}
                  title={`${sample.title}, ${info.label}`}
                  width={info.screen.w}
                  height={info.screen.h}
                  onLoad={applySizes}
                />
              ) : (
                <p className={styles.empty}>Tiada karya yang sudah terbit untuk dijadikan contoh.</p>
              )}
            </div>
          </div>
        </div>
      </div>
      <figcaption className={styles.caption}>
        <span>
          {info.label} · {info.screen.w} × {info.screen.h} px · teks {body} px{bodyPx === null ? " (asal Jalin)" : ""}, tajuk bahagian {heading} em{headingEm === null ? " (asal Jalin)" : ""}
        </span>
        <button type="button" className="admin-btn admin-btn-sm admin-btn-outline" aria-pressed={real} onClick={() => setReal((value) => !value)}>
          {real ? "Muat dalam ruang" : "Saiz sebenar"}
        </button>
        <span className={styles.scale}>{real ? "Saiz sebenar skrin; skrol untuk melihat" : `Dipaparkan pada ${percent}% saiz sebenar`}</span>
      </figcaption>
    </figure>
  );
}
