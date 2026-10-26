/**
 * "Salin Arahan AI" for images: the Jalin image protocol, written out for a chatbot that generates pictures (ChatGPT).
 * It folds docs/VISUAL_GENERATION_GUARDRAILS.md, the house style (house-style.ts) and the editor's own rules (faces, women's body shape,
 * one frame, no readable text) into one message, so the editor never has to remember them.
 */
import { JALIN_HOUSE_STYLE } from "./house-style";

export type ImageProtocolRole = "hero" | "inline" | "series";

export interface ImageProtocolInput {
  role: ImageProtocolRole;
  title: string;
  /** "cerpen", "bersiri", "novela", ... (empty for a series). */
  type?: string;
  dek?: string;
  genre?: string;
  /** The manuscript (hero and inline): the scene is taken from it. */
  body?: string;
  /** Inline only: the marker the picture will sit after, e.g. [[gambar:2]]. */
  marker?: string;
}

const MAX_BODY = 24_000;
const MAX_NEAR = 1_800;

/** The text just before an image marker, so a chatbot knows which scene the picture belongs to. */
export function textBeforeMarker(body: string, marker: string): string {
  const at = marker ? body.indexOf(marker) : -1;
  if (at < 0) return "";
  return body.slice(Math.max(0, at - MAX_NEAR), at).trim();
}

const camera = [
  "sudut tinggi dari penjuru (high angle)",
  "melalui celah pintu atau tingkap",
  "dari belakang bahu (over-the-shoulder), tanpa wajah",
  "siluet berlatar cahaya (backlit) pada waktu emas",
  "paras bawah / paras lantai",
  "bingkai dalam bingkai (pintu, gerbang)",
  "foreground kabur dengan subjek di jauh (lampu, daun, kain)",
];

function sceneBlock(input: ImageProtocolInput): string {
  if (input.role === "series") {
    return [
      "JENIS GAMBAR: gambar HALAMAN SIRI (judul siri).",
      "Gambar ini mewakili seluruh siri, BUKAN satu adegan daripada mana-mana episod. Jangan bocorkan jalan cerita. Pilih satu imej simbolik daripada dunia siri (objek, tempat, cahaya) yang tenang dan menarik.",
      `Tajuk siri: ${input.title}`,
      input.genre ? `Genre: ${input.genre}` : "",
      input.dek ? `Blurb siri: ${input.dek}` : "",
    ].filter(Boolean).join("\n");
  }
  const body = (input.body ?? "").trim();
  const clipped = body.length > MAX_BODY ? `${body.slice(0, MAX_BODY)}\n[teks dipotong]` : body;
  if (input.role === "inline") {
    const near = input.marker ? textBeforeMarker(body, input.marker) : "";
    return [
      "JENIS GAMBAR: gambar DALAM TEKS (inline).",
      `Karya: ${input.title}${input.type ? ` (${input.type})` : ""}`,
      near
        ? `Gambar ini diletakkan selepas petikan berikut (adegan MESTI daripada petikan ini, bukan daripada tempat lain dalam karya):\n"""\n${near}\n"""`
        : "Pilih satu adegan yang jelas daripada manuskrip di bawah.",
      clipped ? `MANUSKRIP PENUH (rujukan fakta sahaja):\n"""\n${clipped}\n"""` : "",
    ].filter(Boolean).join("\n");
  }
  return [
    "JENIS GAMBAR: gambar UTAMA (hero) karya.",
    `Karya: ${input.title}${input.type ? ` (${input.type})` : ""}`,
    input.genre ? `Genre: ${input.genre}` : "",
    input.dek ? `Blurb: ${input.dek}` : "",
    "Pilih SATU adegan sebenar daripada manuskrip yang mewakili suasana karya TANPA membocorkan klimaks atau pengakhiran.",
    clipped ? `MANUSKRIP PENUH (rujukan fakta sahaja):\n"""\n${clipped}\n"""` : "",
  ].filter(Boolean).join("\n");
}

export function composeImageProtocolPrompt(input: ImageProtocolInput): string {
  const style = JALIN_HOUSE_STYLE;
  const sceneRule = input.role === "series"
    ? "2. ADEGAN: satu imej simbolik; tidak daripada mana-mana episod."
    : "2. ADEGAN: ambil satu adegan SEBENAR daripada teks. Jangan jana daripada andaian. Jangan menambah watak yang tiada, menukar siapa melakukan apa, atau menukar masa dan tempat. Jika teks tidak menyatakan sesuatu butiran, pilih yang paling neutral.";
  return [
    "Anda pelukis ilustrasi untuk Jalin, platform bacaan sastera berilustrasi dalam Bahasa Melayu. Ikut PROTOKOL IMEJ JALIN di bawah dengan tepat.",
    "",
    sceneBlock(input),
    "",
    "PROTOKOL IMEJ JALIN",
    "1. SATU imej sahaja dalam mesej ini: SATU bingkai tunggal. DILARANG kolaj, grid, panel, montaj, lakaran berbilang bingkai atau beberapa variasi serentak. Nisbah 16:9 landskap (sekitar 1672 x 941).",
    sceneRule,
    "3. WAJAH: tiada wajah manusia yang jelas, lelaki atau perempuan. Guna belakang badan, siluet berlatar cahaya, profil separa, crop pada tangan/bahu/objek, atau halangan di depan (daun, kain, tiang), atau kedalaman medan yang mengaburkan wajah.",
    "4. BENTUK BADAN PEREMPUAN tidak boleh jelas: pakaian longgar, cahaya latar, bayang, atau jarak jauh. Tiada penekanan pada tubuh. PAKAIAN PELAJAR PEREMPUAN sekolah agama: TUDUNG LABUH sentiasa (kain tudung jatuh menutup bahu, dada dan belakang hingga ke paras pinggang atau lebih; tiada rambut, telinga atau leher kelihatan), baju kurung longgar berlengan panjang dan kain labuh hingga ke buku lali. Gaya yang betul: kain putih lebar dan longgar jatuh dari kepala menutup bahu dan seluruh belakang hingga ke paras punggung atau pinggul (bentuk berlapis seperti segi tiga yang jatuh lembut), beg galas di atasnya. Jangan sekali-kali tudung pendek, tudung ringkas atau bawal pendek.",
    "5. TEKS: tiada huruf, perkataan, logo, papan tanda atau tulisan yang boleh dibaca, termasuk tulisan Arab. Papan, buku dan kertas hanya sebagai corak kabur.",
    "6. KANDUNGAN AGAMA: jika ada mushaf atau teks suci, tunjukkan sebagai objek dengan hormat; tulisan tidak boleh dibaca. Tiada imej Nabi atau tokoh suci.",
    "7. ANATOMI: tangan dan jari betul (lima jari, arah ibu jari, pegangan objek logik), tiada anggota berlebihan, prop tidak bercantum dengan badan. Jika ragu, jana semula dan jangan terangkan kecacatan sebagai gaya.",
    `8. GAYA: ${style.styleDirection}. Mesti SEMI-REALISTIK dan SINEMATIK (rupa lukisan digital semi-realistik seperti babak filem), BUKAN kartun, BUKAN lukisan rata atau pastel kanak-kanak, BUKAN fotografi. Cahaya hangat waktu emas atau cahaya tingkap, latar bercahaya, bayang lembut, kedalaman medan, tekstur kertas halus.`,
    `9. ELAK: ${style.avoid.join("; ")}.`,
    `10. SUDUT KAMERA: pilih satu yang tidak lazim dan sesuai dengan adegan, contoh: ${camera.join("; ")}.`,
    "11. LATAR MALAYSIA yang realistik jika berkaitan (rumah, sekolah, surau, kampung); pakaian dan suasana yang sopan. Bilik darjah sekolah biasa: SEMUA meja menghadap ke hadapan (papan putih); tingkap berlangsir nipis atau bidai kerana bilik darjah sebenar perlu mengelak silau dan panas; tiada dinding atau pemisah tambahan; pelajar lelaki dan perempuan di barisan berasingan tetapi semua tetap menghadap ke hadapan.",
    "12. JANGAN TAMBAH apa-apa yang tidak disebut atau tidak ada dalam teks (dinding, pemisah, papan tanda, watak tambahan, hiasan berlebihan). Jika editor memberi teguran, ikut teguran itu SAHAJA dan jangan mereka penyelesaian baharu.",
    "",
    "CARA MENJAWAB",
    "a) Tulis dahulu SATU perenggan pendek (maksimum 4 baris): adegan dipilih, siapa ada dan buat apa, tempat dan masa, objek penting, dan apa yang TIDAK berlaku dalam adegan.",
    "b) Terus jana SATU imej mengikut protokol. Jangan tanya soalan dan jangan tunggu kebenaran.",
    "c) Selepas imej, tulis satu ayat teks alternatif dalam Bahasa Melayu untuk pembaca yang tidak nampak gambar (tanpa menyebut nama alat AI).",
    "d) Semak diri: ada wajah jelas, bentuk badan perempuan jelas, teks boleh dibaca, kolaj, atau anatomi rosak? Jika ya, jana semula SATU imej yang diperbaiki.",
  ].join("\n");
}
