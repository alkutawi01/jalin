/**
 * The five kinds of screen Jalin's story pages are sized for, and the sizes Jalin uses on each when nothing is set in Tetapan.
 *
 * Tetapan > Saiz teks karya (Izzat, 9 Okt 2026): one number for every width was a trap (21px on a phone is bigger than Jalin's own 17.5px), and
 * "Asal Jalin" told the editor nothing. Each kind of screen has its own boxes, the boxes show Jalin's own size, and a mock-up of that screen
 * shows the result. The widths below are the breakpoints of src/app/globals.css; __tests__/reader-typography-devices.test.ts reads that file
 * and fails if this table and the stylesheet ever disagree.
 */

export const DEVICE_IDS = ["phone", "tabPortrait", "tabLandscape", "laptop", "wide"] as const;
export type DeviceId = (typeof DEVICE_IDS)[number];

export interface DeviceInfo {
  id: DeviceId;
  label: string;
  /** In words, for the editor. */
  range: string;
  /** The media query of the stylesheet for exactly this kind of screen. */
  media: string;
  /** The screen of a typical device of this kind, in CSS px, for the mock-up. */
  screen: { w: number; h: number };
  /** The look of the device drawn around the screen. */
  frame: "phone" | "tablet" | "laptop" | "monitor";
  /** The width of the page's content box at that screen, the column of the story, and the rails beside it (0 = none). */
  layout: { shell: number; column: number; left: number; right: number; headerHeight: number; logo: number; nav: boolean };
  /** Jalin's own sizes at this screen. */
  defaults: {
    bodyPx: number;
    lineHeight: number;
    /** The gap under a paragraph, in em of the text. */
    paragraphGapEm: number;
    headingEm: number;
    headingLineHeight: number;
    /** Above and below a sub-heading, in em: as in the stylesheet, the em of the sub-heading itself. */
    headingMarginEm: [number, number];
    titlePx: number;
    /** The italic line under the title. */
    dekPx: number;
  };
}

export const DEVICES: readonly DeviceInfo[] = [
  {
    id: "phone",
    label: "Telefon",
    range: "lebar skrin hingga 600px",
    media: "(max-width: 600px)",
    screen: { w: 375, h: 812 },
    frame: "phone",
    layout: { shell: 335, column: 335, left: 0, right: 0, headerHeight: 76, logo: 108, nav: false },
    defaults: { bodyPx: 17.5, lineHeight: 1.78, paragraphGapEm: 1.55, headingEm: 1.2, headingLineHeight: 1.3, headingMarginEm: [1.7, 0.5], titlePx: 45, dekPx: 18 }
  },
  {
    id: "tabPortrait",
    label: "Tab menegak",
    range: "601 hingga 820px",
    media: "(min-width: 601px) and (max-width: 820px)",
    screen: { w: 768, h: 1024 },
    frame: "tablet",
    layout: { shell: 700, column: 700, left: 0, right: 0, headerHeight: 76, logo: 108, nav: false },
    defaults: { bodyPx: 17.5, lineHeight: 1.78, paragraphGapEm: 1.55, headingEm: 1.3, headingLineHeight: 1.3, headingMarginEm: [1.7, 0.5], titlePx: 52, dekPx: 18 }
  },
  {
    id: "tabLandscape",
    label: "Tab mendatar",
    range: "821 hingga 1050px",
    media: "(min-width: 821px) and (max-width: 1050px)",
    screen: { w: 1024, h: 768 },
    frame: "tablet",
    layout: { shell: 960, column: 700, left: 0, right: 190, headerHeight: 84, logo: 112, nav: true },
    defaults: { bodyPx: 21, lineHeight: 1.84, paragraphGapEm: 1.55, headingEm: 1.2, headingLineHeight: 1.3, headingMarginEm: [1.7, 0.5], titlePx: 66, dekPx: 20 }
  },
  {
    id: "laptop",
    label: "Laptop",
    range: "1051 hingga 1600px",
    media: "(min-width: 1051px) and (max-width: 1600px)",
    screen: { w: 1440, h: 900 },
    frame: "laptop",
    layout: { shell: 1180, column: 690, left: 180, right: 180, headerHeight: 84, logo: 120, nav: true },
    defaults: { bodyPx: 19, lineHeight: 1.75, paragraphGapEm: 1.25, headingEm: 1.32, headingLineHeight: 1.3, headingMarginEm: [1.9, 0.6], titlePx: 58, dekPx: 18 }
  },
  {
    id: "wide",
    label: "Skrin lebar",
    range: "1601px ke atas",
    media: "(min-width: 1601px)",
    screen: { w: 1920, h: 1080 },
    frame: "monitor",
    layout: { shell: 1180, column: 720, left: 180, right: 180, headerHeight: 84, logo: 120, nav: true },
    defaults: { bodyPx: 21, lineHeight: 1.84, paragraphGapEm: 1.55, headingEm: 1.5, headingLineHeight: 1.84, headingMarginEm: [0.83, 0.83], titlePx: 84, dekPx: 20 }
  }
];

export function deviceInfo(id: DeviceId): DeviceInfo {
  return DEVICES.find((device) => device.id === id)!;
}
