/**
 * The rubric of a rating ("Penilaian"): seven parts of equal weight, each a whole number from 0 to 10.
 *
 * Written anchors sit at 2, 4, 6, 8 and 10; an odd number is for a work between two anchors. 6 is where a work that simply
 * works lands ("no great fault, nothing that stands out"), so that 8 means something: Izzat does not publish below 8.
 * The chatbot gives the seven numbers; the overall number and its label are worked out here, never by the chatbot.
 *
 * Pure data and arithmetic: used by the prompt, the parser, the service and the tests.
 */

export const RUBRIC_VERSION = "JALIN-PENILAIAN-1";
export const SCORE_MIN = 0;
export const SCORE_MAX = 10;
export const VERDICT_MAX_WORDS = 30;
export const REVIEW_MIN_WORDS = 100;
export const REVIEW_MAX_WORDS = 300;

/** Only these are rated. A synopsis or a fragment is not a whole work of our own. */
export const RATED_TYPES = ["cerpen", "novela", "bersiri"] as const;
export const isRatedType = (type: string) => (RATED_TYPES as readonly string[]).includes(type);

export interface RubricComponent {
  key: string;
  /** The label in the chatbot's answer and in the admin. */
  label: string;
  /** What is looked at. */
  about: string;
  /** What a work at 2, 4, 6, 8 and 10 looks like, each something that can be seen in the text. */
  anchors: Record<2 | 4 | 6 | 8 | 10, string>;
}

export const COMPONENTS: RubricComponent[] = [
  {
    key: "plot",
    label: "Plot & Struktur",
    about: "susunan peristiwa, perkembangan konflik, rentak dan penyelesaian",
    anchors: {
      2: "Peristiwa utama sukar diikuti kerana hubungan sebab-akibat terputus, konflik tidak terbina, atau bahagian penting bercanggah.",
      4: "Jalan cerita dapat diikuti tetapi ada kelemahan ketara: perkembangan tergesa-gesa, bahagian meleret, kebetulan yang memaksa, atau penyelesaian yang tidak cukup dibina.",
      6: "Peristiwa tersusun, konflik berkembang dan penyelesaian berasas dalam cerita tanpa cacat struktur besar, tetapi pembinaan dan rentaknya tidak menonjol.",
      8: "Susunan adegan secara konsisten mengembangkan konflik, maklumat dan ketegangan; peralihan dan penyelesaian terasa dipersiapkan.",
      10: "Hampir setiap bahagian ada fungsi yang jelas, unsur awal terbayar kemudian, dan kesan cerita akan berkurang jika susunannya diubah."
    }
  },
  {
    key: "watak",
    label: "Watak",
    about: "motivasi, konsistensi, kedalaman dan perkembangan watak",
    anchors: {
      2: "Tindakan penting watak bercanggah dengan sifat atau motivasi yang ditunjukkan, tanpa penjelasan dalam teks.",
      4: "Watak ada tujuan yang dapat dikenal pasti tetapi banyak tindakan, perubahan atau hubungannya kurang dibina.",
      6: "Motivasi dan tindakan watak dapat difahami dan konsisten tanpa cacat besar, tetapi perkembangan atau kerumitannya tidak menonjol.",
      8: "Pilihan, konflik dalaman dan hubungan watak berkembang melalui tindakan dan akibat yang dapat dikesan sepanjang cerita.",
      10: "Perubahan atau keteguhan watak dibina melalui banyak butiran yang saling menguatkan, sehingga keputusan penting terasa mengejutkan dan sekaligus tidak dapat dielakkan."
    }
  },
  {
    key: "bahasa",
    label: "Bahasa & Gaya",
    about: "ketepatan Bahasa Melayu, diksi, ritma ayat, imejan dan suara naratif",
    anchors: {
      2: "Kesalahan atau ayat janggal berulang sehingga mengganggu pemahaman.",
      4: "Makna umumnya jelas tetapi pilihan kata, sintaksis, sudut pandang atau nada kerap tidak konsisten.",
      6: "Bahasa jelas, terkawal dan sesuai dengan cerita tanpa masalah besar, tetapi tiada kekuatan gaya yang ketara.",
      8: "Diksi, ritma ayat, imejan dan suara naratif secara konsisten menguatkan adegan dan suasana.",
      10: "Pilihan bahasa sangat tepat dan tersendiri, sehingga bentuk ayat dan imejnya sendiri membawa makna yang tidak mudah diganti."
    }
  },
  {
    key: "dialog",
    label: "Dialog",
    about: "kewajaran, fungsi, suara watak dan subteks dalam dialog (jika karya hampir tanpa dialog, nilai ucapan dan monolog yang ada)",
    anchors: {
      2: "Dialog kerap berbunyi seperti penerangan untuk pembaca, tidak sepadan dengan situasi atau watak, atau tidak boleh dipercayai.",
      4: "Dialog menyampaikan maksud asas tetapi banyak baris terasa generik, berlebihan, terlalu terus terang, atau tidak membezakan suara watak.",
      6: "Dialog jelas, sesuai dengan watak dan situasi dan menjalankan fungsinya tanpa cacat besar, tetapi tidak menonjol dari segi subteks atau suara.",
      8: "Dialog secara konsisten membezakan watak, membawa subteks, mengubah hubungan atau konflik, dan jarang menerangkan perkara yang sudah jelas.",
      10: "Pilihan kata, jeda, pengelakan dan tindak balas dalam dialog serentak mendedahkan watak, memajukan konflik dan menghasilkan makna yang tidak dinyatakan."
    }
  },
  {
    key: "tema",
    label: "Tema & Makna",
    about: "kedalaman idea dan cara ia lahir daripada cerita (bukan sama ada mesejnya baik)",
    anchors: {
      2: "Tema sukar dikenal pasti, bercanggah dengan perkembangan cerita, atau hanya dinyatakan sebagai mesej tanpa sokongan peristiwa.",
      4: "Tema dapat dikenal pasti tetapi kebanyakannya diterangkan secara langsung, kurang dibina melalui pilihan watak, konflik, imej atau akibat.",
      6: "Tema lahir dengan jelas daripada peristiwa dan keputusan watak tanpa percanggahan besar, tetapi pengolahannya tidak berlapis.",
      8: "Tema berkembang melalui beberapa unsur cerita yang saling menguatkan dan membuka lebih daripada satu tafsiran yang munasabah.",
      10: "Makna karya terbina melalui hubungan yang kompleks antara tindakan, imej, konflik dan akibat, sehingga bacaan semula mendedahkan kaitan baharu yang disokong teks."
    }
  },
  {
    key: "emosi",
    label: "Kesan Emosi",
    about: "sejauh mana cerita membina rasa, ketegangan, empati atau renungan",
    anchors: {
      2: "Adegan yang dimaksudkan kuat tidak berkesan kerana reaksi watak, binaan atau akibatnya tidak cukup disediakan dalam teks.",
      4: "Beberapa adegan menghasilkan emosi yang jelas tetapi kesannya tidak konsisten, atau terlalu bergantung pada pernyataan langsung dan dramatik.",
      6: "Cerita menghasilkan respons emosi yang sesuai pada titik penting tanpa manipulasi atau cacat besar, tetapi kesannya tidak mendalam atau berpanjangan.",
      8: "Emosi dibina beransur-ansur melalui butiran, pilihan dan akibat, sehingga beberapa adegan kuat tanpa perlu diterangkan berlebihan.",
      10: "Kesan emosi lahir daripada himpunan unsur cerita dan kekal selepas adegan berakhir: pembaca faham serentak apa yang berlaku, apa yang hilang dan apa yang tidak terucap."
    }
  },
  {
    key: "keaslian",
    label: "Keaslian",
    about: "kesegaran pendekatan dan identiti karya (bentuk tradisional yang diolah dengan baik tidak dihukum)",
    anchors: {
      2: "Karya sangat bergantung pada pola, imej atau penyelesaian yang biasa, tanpa sudut pandang, suara atau pengolahan sendiri.",
      4: "Ada beberapa unsur tersendiri tetapi kebanyakan pendekatan mengikuti konvensi secara rutin.",
      6: "Karya menggunakan bentuk atau konvensi dengan cekap dan ada beberapa pilihan yang segar.",
      8: "Sudut pandang, gabungan unsur, suara atau cara mengolah konvensi memberi identiti yang jelas dan sukar ditukar ganti dengan karya lain yang serupa.",
      10: "Pendekatan karya sangat tersendiri: ia menggunakan atau memperbaharui konvensi dengan cara yang membuka makna, pengalaman atau struktur yang tidak terasa rutin."
    }
  }
];

export const COMPONENT_KEYS = COMPONENTS.map((c) => c.key);
export type Scores = Record<string, number>;

/** A valid score is a whole number from 0 to 10. */
export function isValidScore(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= SCORE_MIN && value <= SCORE_MAX;
}

/** The mean of the seven numbers, kept exact (to two places); shown to one place. */
export function overallScore(scores: Scores): number {
  const values = COMPONENT_KEYS.map((key) => scores[key]);
  if (values.some((v) => !isValidScore(v))) throw new Error("Skor tidak lengkap.");
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

export const formatScore = (value: number) => (Math.round(value * 10) / 10).toFixed(1);

/** The middle of the raters' overall numbers (the mean of the two middle ones when their count is even). */
export function consensus(overalls: number[]): number | null {
  if (overalls.length === 0) return null;
  const sorted = [...overalls].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(value * 100) / 100;
}

export const PUBLISH_FLOOR = 8;

/** A word for the number, worked out mechanically. */
export function scoreLabel(overall: number): string {
  if (overall >= 9) return "Sangat disyorkan";
  if (overall >= 8) return "Disyorkan";
  if (overall >= 6) return "Baik";
  if (overall >= 4) return "Lemah";
  return "Tidak disyorkan";
}

/** The rubric as the chatbot reads it. */
export function rubricText(): string {
  return COMPONENTS.map((c, i) => {
    const anchors = ([2, 4, 6, 8, 10] as const).map((n) => `   ${n} = ${c.anchors[n]}`).join("\n");
    return `${i + 1}. ${c.label} (${c.about})\n${anchors}`;
  }).join("\n\n");
}

export const countWords = (text: string) => (text.trim().match(/\S+/g) ?? []).length;
