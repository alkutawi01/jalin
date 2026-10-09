"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { deviceInfo, type DeviceId } from "../../lib/reader/typography-devices";
import styles from "./ReaderTypographyPreview.module.css";

/**
 * A mock-up of one reader's screen (a phone, a tablet held upright or on its side, a laptop, a wide monitor) showing a story page the way
 * Jalin draws it at that width: the same header, column, rails and sizes, with the editor's text and sub-heading sizes where they are set and
 * Jalin's own where they are empty. Only one screen is shown at a time (the editor chooses which): there is no room for them all.
 *
 * The page is drawn at the real size of that screen and then scaled down to fit (or shown at its real size, scrolling, on request), so line breaks
 * and proportions are what a reader gets. Everything that depends on the screen is handed to the stylesheet as a CSS variable.
 */

const SAMPLE = {
  eyebrow: "Cerpen",
  title: "Hujan di Beranda",
  dek: "Sebuah cerita pendek tentang pulang, dan tentang apa yang tinggal selepas hujan.",
  before: [
    "Hujan turun sejak selepas Asar. Di beranda, Mak Cik Salmah menyusun semula pasu-pasu kecil di tepi tangga, sementara anak-anak jiran berlari mencari tempat berteduh.",
    "Dia tidak berkata apa-apa kepada sesiapa. Bunyi air di atas bumbung zink sudah cukup untuk menenggelamkan segala yang belum sempat diucapkan sepanjang hari itu."
  ],
  heading: "Selepas Asar",
  after: [
    "Apabila langit akhirnya reda, jalan di hadapan rumah berkilat seperti kaca. Seseorang menolak pagar dan melangkah masuk dengan beg yang sudah terlalu lama dibawa.",
    "Mak Cik Salmah mengangkat muka. Dia mengenali langkah itu sebelum dia mengenali wajahnya."
  ]
};

const FRAME = {
  phone: { bezel: 12, radius: 36, screenRadius: 26, foot: 0, style: "isPhone" },
  tablet: { bezel: 14, radius: 26, screenRadius: 12, foot: 0, style: "isTablet" },
  laptop: { bezel: 12, radius: 16, screenRadius: 6, foot: 14, style: "isLaptop" },
  monitor: { bezel: 10, radius: 12, screenRadius: 4, foot: 30, style: "isMonitor" }
} as const;

/** The tallest the mock-up is drawn when it is made to fit: a phone is taller than it is wide, and the page should not become a long scroll. */
const MAX_HEIGHT = 520;

export default function ReaderTypographyPreview({ device, bodyPx, headingEm }: { device: DeviceId; bodyPx: number | null; headingEm: number | null }) {
  const info = deviceInfo(device);
  const stage = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);
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
    const { layout, defaults } = info;
    const columns = [layout.left, layout.column, layout.right].filter((width, index) => index === 1 || width > 0).map((width) => `${width}px`).join(" ");
    const set = (target: HTMLElement, values: Record<string, string>) => Object.entries(values).forEach(([name, value]) => target.style.setProperty(name, value));
    set(frame, { "--rt-bezel": `${bezel}px`, "--rt-radius": `${radius}px`, "--rt-screen-radius": `${screenRadius}px`, "--rt-foot": `${foot}px` });
    view.style.width = `${info.screen.w * scale}px`;
    view.style.height = `${info.screen.h * scale}px`;
    page.style.transform = `scale(${scale})`;
    set(page, {
      "--rt-w": `${info.screen.w}px`,
      "--rt-h": `${info.screen.h}px`,
      "--rt-header": `${layout.headerHeight}px`,
      "--rt-logo": `${layout.logo}px`,
      "--rt-shell": `${layout.shell}px`,
      "--rt-cols": columns,
      "--rt-justify": layout.left > 0 ? "space-between" : "center",
      "--rt-title": `${defaults.titlePx}px`,
      "--rt-dek": `${defaults.dekPx}px`,
      "--rt-body": `${body}px`,
      "--rt-lh": String(defaults.lineHeight),
      "--rt-gap": `${defaults.paragraphGapEm}em`,
      "--rt-h2": `${heading}em`,
      "--rt-h2lh": String(defaults.headingLineHeight),
      "--rt-h2m": `${defaults.headingMarginEm[0]}em 0 ${defaults.headingMarginEm[1]}em`,
      "--rt-ui": "15px",
      "--rt-small": "12px"
    });
  }, [info, scale, body, heading, bezel, radius, screenRadius, foot]);

  const percent = Math.round(scale * 100);
  return (
    <figure className={styles.figure}>
      <div ref={stage} className={`${styles.stage}${real ? ` ${styles.stageReal}` : ""}`}>
        <div ref={frameRef} className={`${styles.device} ${styles[FRAME[info.frame].style]}`} role="img" aria-label={`Pratonton ${info.label}: teks ${body} px, tajuk bahagian ${heading} em`}>
          <div ref={viewport} className={styles.viewport}>
            <div ref={screen} className={styles.screen} aria-hidden="true">
              <div className={styles.header}>
                <img src="/brand/jalin-wordmark.svg" alt="" />
                {info.layout.nav ? <span className={styles.nav}><span>Utama</span><span>Cerpen</span><span>Novela</span><span>Bersiri</span><span>Fragmen</span></span> : <span className={styles.menu}>Menu</span>}
              </div>
              <div className={styles.head}>
                <p className={styles.eyebrow}>{SAMPLE.eyebrow}</p>
                <h1>{SAMPLE.title}</h1>
                <p className={styles.dek}>{SAMPLE.dek}</p>
              </div>
              <div className={styles.page}>
                {info.layout.left > 0 ? <Rail /> : null}
                <article className={styles.body}>
                  {SAMPLE.before.map((text) => <p key={text}>{text}</p>)}
                  <h2>{SAMPLE.heading}</h2>
                  {SAMPLE.after.map((text) => <p key={text}>{text}</p>)}
                </article>
                {info.layout.right > 0 ? <Rail /> : null}
              </div>
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

/** The side column of a story page (details of the work), drawn as quiet lines: it is there to show the layout, not to be read. */
function Rail() {
  return (
    <aside className={styles.rail}>
      <span /><span /><span /><span />
    </aside>
  );
}
