/**
 * Panel Bacaan AI: the rubric. Settled with ChatGPT in six questions on 10 Oct 2026 (thread in docs/PANEL_BACAAN_AI.md): six components,
 * one score each, fixed weights, fixed anchors, one output format (JALIN_PANEL_V2) the same for every model. Versioned, so every rating
 * says which rubric it was made with; changing a weight, a title or an anchor means a new version and old ratings stay what they were.
 *
 * Scores run 1 to 10 in steps of 0.5. There is no N/A and no sub-score: all six components apply to every form (cerpen, novela, one
 * episode of a series); fairness to unconventional forms is stated in the instruction, not by switching components off.
 * The composite is the weighted mean; the system computes it, the reviewer never writes it.
 */
export const RUBRIC_VERSION = "r2-20261009";
export const PROMPT_VERSION = "p2-20261009";
export const FORMAT_NAME = "JALIN_PANEL_V2";

/**
 * The official reviewer (Izzat, 10 Oct 2026): ChatGPT. Models differ in how generous they are (Grok about 0.35 above ChatGPT on the same
 * works), so one official reviewer keeps the >8.0 rule meaning the same thing for every piece. Ratings by other models are kept and shown
 * as supplementary but are NOT counted in the mean. A reviewer counts as ChatGPT when the model name it gave matches this pattern.
 */
export const REFERENCE_MODEL_NAME = "ChatGPT";
export const DEFAULT_REFERENCE_KEYWORDS: readonly string[] = ["gpt", "openai"];
export const isReferenceModel = (label: string | null | undefined, keywords: readonly string[] = DEFAULT_REFERENCE_KEYWORDS): boolean => {
  const name = (label ?? "").toLowerCase();
  return keywords.some((k) => k.length > 0 && name.includes(k.toLowerCase()));
};

/** A piece qualifies on the score only when the mean of its ratings is STRICTLY above this. 8.000 does not qualify. */
export const THRESHOLD = 8;

export const PANEL_WORK_TYPES = ["cerpen", "novela", "bersiri"] as const;
export type PanelWorkType = (typeof PANEL_WORK_TYPES)[number];
export const isPanelWorkType = (value: unknown): value is PanelWorkType => (PANEL_WORK_TYPES as readonly string[]).includes(String(value));

export type ComponentKey = "k1" | "k2" | "k3" | "k4" | "k5" | "k6";

export interface RubricComponent {
  key: ComponentKey;
  /** The number the reviewer writes: K1 to K6. Fixed forever for this rubric version. */
  code: string;
  title: string;
  weight: number;
  /** Kept for the arithmetic: every component is required in this rubric. */
  optional: false;
  judged: string;
  notJudged: string;
  anchors: { 3: string; 5: string; 7: string; 8.5: string; 10: string };
  /** One line of fairness for forms that do not look conventional. */
  fairness?: string;
}

export const COMPONENTS: readonly RubricComponent[] = [
  {
    key: "k1", code: "K1", title: "Bahasa dan Gaya", weight: 20, optional: false,
    judged: "ketepatan tatabahasa, kejelasan ayat, pemilihan kata dan laras; keberkesanan gaya pengucapan: ritma, kepelbagaian ayat, bahasa figuratif",
    notJudged: "keindahan keseluruhan karya, kekuatan tema, fungsi dialog dalam watak",
    anchors: { 3: "Bahasa kerap mengaburkan makna.", 5: "Dapat difahami tetapi banyak gangguan bahasa.", 7: "Jelas, dengan beberapa kelemahan gaya.", 8.5: "Diksi, laras dan ayat sangat terkawal.", 10: "Ketepatan dan keberkesanan bahasa luar biasa sepanjang karya." },
  },
  {
    key: "k2", code: "K2", title: "Plot dan Struktur Naratif", weight: 25, optional: false,
    judged: "susunan peristiwa, hubungan sebab-akibat, perkembangan konflik, koheren dalaman (masa, ruang, maklumat); keberkesanan pembukaan, peralihan, tempo dan pengakhiran mengikut bentuk karya",
    notJudged: "kedalaman psikologi watak, keindahan bahasa, sama ada penilai menyukai pengakhiran",
    anchors: { 3: "Struktur atau hubungan naratif sangat bermasalah.", 5: "Rangka wujud tetapi perkembangan mempunyai jurang ketara.", 7: "Koheren dengan beberapa kelemahan peralihan atau tempo.", 8.5: "Struktur dan perkembangan sangat terkawal.", 10: "Setiap bahagian penting berfungsi secara luar biasa dalam keseluruhan struktur." },
    fairness: "Naratif lirik atau eksperimental: nilai hubungan unsur dan fungsi susunannya; jangan mewajibkan plot sebab-akibat konvensional. Episod bersiri yang tergantung: nilai keberkesanan titik henti, bukan penyelesaian penuh.",
  },
  {
    key: "k3", code: "K3", title: "Watak dan Dialog", weight: 20, optional: false,
    judged: "kejelasan motivasi, kewajaran tindakan, konsistensi dan kedalaman watak; dialog, jika ada, dinilai pada kewajaran suara, subteks dan sumbangannya kepada watak",
    notJudged: "kesempurnaan moral watak, bilangan watak, tatabahasa umum, keindahan prosa",
    anchors: { 3: "Tindakan atau motivasi kerap tidak berasas.", 5: "Watak berfungsi tetapi pembinaannya lemah.", 7: "Watak meyakinkan dengan beberapa kekurangan.", 8.5: "Watak khusus, konsisten dan dibina melalui bukti naratif.", 10: "Pembinaan watak luar biasa tepat, mendalam dan bersepadu." },
    fairness: "Ketiadaan dialog tidak mengurangkan skor. Watak tidak semestinya manusia, realistik, disukai atau berubah besar; nilai melalui tindakan, pemerhatian, pemikiran atau jejak kehadirannya.",
  },
  {
    key: "k4", code: "K4", title: "Sastera dan Teknik Penceritaan", weight: 15, optional: false,
    judged: "keberkesanan sudut pandangan, fokalisasi, imejan, simbolisme, latar dan teknik penceritaan dalam membentuk pengalaman sastera, serta kesepaduannya dengan naratif",
    notJudged: "ketepatan tatabahasa, kecanggihan bahasa semata-mata, populariti teknik, tanggapan umum bahawa karya itu indah",
    anchors: { 3: "Teknik mengganggu atau mengaburkan naratif tanpa fungsi jelas.", 5: "Teknik wujud tetapi kurang berfungsi.", 7: "Teknik umumnya menyokong karya.", 8.5: "Pilihan teknik terkawal dan saling memperkukuh.", 10: "Kesepaduan dan keberkesanan artistik luar biasa." },
    fairness: "Metafora, simbolisme atau banyak teknik tidak diwajibkan; kesederhanaan yang sangat berkesan boleh mendapat skor tinggi.",
  },
  {
    key: "k5", code: "K5", title: "Tema dan Mesej", weight: 15, optional: false,
    judged: "kejelasan, kedalaman dan perkembangan persoalan atau gagasan yang dibina melalui naratif, termasuk apabila karya sengaja mengekalkan ambiguiti",
    notJudged: "persetujuan penilai terhadap ideologi, nilai agama atau pandangan moral karya, dan sama ada cerita memberi pengajaran yang jelas",
    anchors: { 3: "Persoalan tidak berkembang secara bermakna.", 5: "Tema dikenal pasti tetapi kurang diolah.", 7: "Tema dikembangkan dengan beberapa keterbatasan.", 8.5: "Gagasan berlapis dan disokong unsur cerita.", 10: "Pengolahan makna luar biasa mendalam dan bersepadu." },
    fairness: "Mesej moral, jawapan jelas, simbolisme berat atau persetujuan ideologi bukan syarat skor tinggi.",
  },
  {
    key: "k6", code: "K6", title: "Penghayatan dan Kesan Naratif", weight: 5, optional: false,
    judged: "keberkesanan teks membina penglibatan melalui perkembangan emosi, ketegangan, suasana dan penekanan dramatik; nilai mekanisme dalam teks, bukan perasaan peribadi model",
    notJudged: "kesukaan penilai, tahap kesedihan atau kegembiraan semata-mata, kejutan plot itu sendiri, keindahan ungkapan yang sudah dinilai dalam K1 atau K4",
    anchors: { 3: "Pembinaan suasana atau kesan utama sering gagal.", 5: "Kesan wujud tetapi tidak konsisten.", 7: "Penglibatan pembaca dibina dengan beberapa kelemahan.", 8.5: "Kesan dibina kuat melalui teknik yang terkawal.", 10: "Pembinaan kesan luar biasa konsisten dan berkesan." },
    fairness: "Kejutan, kesedihan, kegembiraan dan pengakhiran dramatik tidak diwajibkan; ketenangan, keheningan atau ketidakselesaan yang sengaja dibina boleh sama berkesan.",
  },
];

export const COMPONENT_BY_CODE = new Map(COMPONENTS.map((c) => [c.code, c]));
export const COMPONENT_BY_KEY = new Map(COMPONENTS.map((c) => [c.key, c]));

export const TOTAL_WEIGHT = COMPONENTS.reduce((n, c) => n + c.weight, 0);

/** The general anchors and the rules every reviewer is given. */
export const GENERAL_ANCHORS: readonly [string, string][] = [
  ["3.0", "Kelemahan besar dan berulang; fungsi utama komponen terjejas."],
  ["5.0", "Fungsi asas wujud tetapi kelemahan ketara mengganggu pelaksanaan."],
  ["7.0", "Berfungsi baik, namun kekurangan nyata masih kelihatan."],
  ["8.5", "Sangat berkesan, konsisten dan terkawal; hanya kelemahan kecil."],
  ["10.0", "Pelaksanaan luar biasa menyeluruh tanpa kelemahan bermakna; sangat jarang, bukan mustahil."],
];

export const BETWEEN_ANCHORS =
  "Gunakan skor di antara sauh apabila bukti menunjukkan mutu pertengahan. 7.5 ialah lebih kukuh daripada 7 tetapi belum cukup konsisten untuk 8. 8.0 ialah mutu kuat tetapi belum mencapai konsistensi 8.5. 9.0 memerlukan kekuatan luar biasa yang dibuktikan secara khusus. 9.5 atau 10 memerlukan keberkesanan luar biasa yang konsisten sepanjang karya, bukti positif yang kukuh dan tiada kelemahan bermakna (bukan sekadar ketiadaan kesalahan). 1 hingga 2 untuk kegagalan lebih parah daripada sauh 3; 4 dan 6 untuk mutu pertengahan.";

/** True for 1, 1.5, ... 10. */
export function validScore(value: number): boolean {
  return Number.isFinite(value) && value >= 1 && value <= 10 && Number.isInteger(value * 2);
}

/** Soft limits from the format: longer values are kept but flagged, never silently cut. */
export const LIMITS = { verdict: 250, edge: 160, evidence: 200, reason: 350 } as const;
