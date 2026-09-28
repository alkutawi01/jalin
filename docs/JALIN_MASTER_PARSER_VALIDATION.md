# JALIN Master Content Parser — Laporan Validasi (Fasa Ujian)

| | |
| --- | --- |
| **Versi** | v1.0 |
| **Status** | 3 ujian LULUS — menunggu kelulusan Director untuk cadangan v2 |
| **Tarikh** | 2026-09-28 |
| **Skop** | Ujian manual `docs/JALIN_MASTER_CONTENT_PARSER_PROMPT.md` (v1) ke atas manuskrip sebenar + audit medan pra-v2 |
| **Berkaitan** | `docs/JALIN_MASTER_CONTENT_PARSER_PROMPT.md`, `docs/CONTENT_MODEL.md`, `AGENTS.md` |

## Metodologi

- Prompt v1 (blok salin) dilaksanakan ke atas **empat manuskrip sebenar** dari repo: 2 cerpen ujian (1 untuk Ujian 1), 1 novela penuh, 1 fragmen, 1 sinopsis. Semua manuskrip = karya terbitan sedia ada, maka **metadata terbitan (ditetapkan manusia) dijadikan rujukan bebas** untuk mengukur sama ada output parser boleh dipetakan tanpa menambah fakta.
- Setiap output disimpan sebagai fail JSON dan disahkan dengan `JSON.parse` (4/4 PASS).
- Semakan automatik: carian string `body`, `rights*`, `quality*` dalam setiap JSON — **semuanya TIADA**.
- Prinsip ujian mengikut arahan Director: **output parser mesti ikut keperluan sistem, bukan sistem ikut output AI.**

---

## Ujian 1 — Cerpen: `Kerusi di Beranda` (2,291 kata)

| Semakan | Keputusan | Bukti |
| --- | --- | --- |
| JSON valid? | ✅ LULUS | `JSON.parse` PASS; tiada `body`, `rights`, `quality` |
| `title`, `slug`, `dek`, `genre`, `readingMinutes` terus dipetakan? | ✅ LULUS | Lihat jadual pemetaan di bawah |
| Watak diekstrak tanpa menambah fakta? | ✅ LULUS | Semua watak/peranan wujud dalam teks (contoh: "tiga puluh empat tahun" ✅, "lapan tahun" ✅) |
| Glosari sesuai pembaca 13–17? | ✅ LULUS | 9/10 istilah terbitan dihasilkan semula daripada teks; semua makna disokong konteks |
| `visualSuggestions` berdasarkan adegan teks? | ✅ LULUS | 2 daripada 3 cadangan = **tepat** visual yang dipilih editor terbitan (kerusi rotan; tangan+pen) |
| Editor Report membantu keputusan manusia? | ✅ LULUS | 4 tajuk tepat; menghasilkan semakan fakta konkrit (kronologi banjir, istilah perubatan) + penanda kredit |

### Pemetaan JSON → metadata terbitan

| Medan | Output parser | Terbitan (rujukan manusia) | Nota |
| --- | --- | --- | --- |
| title | Kerusi di Beranda | Kerusi di Beranda | Sama tepat |
| slug | kerusi-di-beranda | kerusi-di-beranda | Sama tepat |
| dek | Cadangan 1 ayat, tanpa spoiler | Dek terpoles editor | Boleh terus dipetak; editor boleh poles |
| genre | Keluarga | Keluarga | Sama tepat |
| readingMinutes | 11 (2,291 ÷ 200, bulat terdekat) | 12 | Δ−1; boleh dilaras di Metadata (medan admin boleh sunting) |
| characters | 3 (Pak Long Rashid/Bapa, Along/Anak, arwah isteri) | 2 (dua pertama = sama tepat) | Watak ketiga cadangan; editor trim ikut keperluan |
| glossary | 9 istilah in-text | 10 (9 in-text + `saban`) | `saban` = **0 kejadian dalam teks** → parser betul tidak menghasilkannya; penyunting menambah kemudian |

### Editor Report (Ujian 1)

```
Kekuatan: konflik jelas (kehilangan ingatan vs pemulihan catatan); watak berkembang;
objek simbolik konsisten (kerusi, kain, buku nota); prosa tidak mengandungi unsur sensitif.

Perkara perlu semakan: dek cadangan perlu polesan editor; metadata watak terbitan
hanya 2 watak (parser cadang 3) — editor pilih; 1 glosari terbitan di luar teks.

Risiko fakta/hak: kronologi banjir 1979 vs "tiga tahun tidak ditoreh"; rujukan
"Kerian" dalam dialog; istilah perubatan ("kemerosotan kognitif") semak ringkas;
PENULIS TIDAK DINYATAKAN dalam manuskrip — kredit perlu pengesahan editor
(jangan auto-assign).

Cadangan penerbitan: syor sahaja — lanjutkan semakan editorial; tiada halangan
metadata yang dikesan. Kelulusan tetap milik editor.
```

---

## Ujian 2 — Novela: `Waktu Sebenar` (26,822 kata, 31 bahagian)

| Semakan | Keputusan | Bukti |
| --- | --- | --- |
| `sections[]` berjaya dihasilkan? | ✅ LULUS | 31 entri (BAB 1–30 + EPILOG) — sepadan tepat import kanonik (`waktu-sebenar-structure-test` = PASS) |
| Turutan bab betul? | ✅ LULUS | `order` 1..31 mengikut turutan manuskrip |
| Tiada ringkasan bab menjadi spoiler? | ✅ LULUS | Setiap summary pada tahap **premis/perkara dalam bab** — tiada penyelesaian, tiada akhir cerita, tiada identiti didedah |
| Watak utama/sampingan tidak bercampur? | ✅ LULUS | Hanya **Wardah** dan **Abah** bertanda `Utama`; 14 watak `Sampingan`/`Disebut` berasingan |
| Tempoh bacaan munasabah? | ✅ LULUS | 134 minit (26,822 ÷ 200) vs 135 terbitan — Δ1 |

### Ringkasan 31 bab (output parser — tiada spoiler)

| # | slug | Tajuk | Ringkasan |
| --- | --- | --- | --- |
| 1 | bab-1 | BAB 1 | Wardah pulang ke kedai jam warisan ayahnya; menemui rutin yang mula goyah dan satu catatan ganjil dalam buku log. |
| 2 | bab-2 | BAB 2 | Dua lagi catatan serupa ditemui; Wardah turut menemui notis klinik yang terlepas dan mula sebuah buku nota kecil. |
| 3 | bab-3 | BAB 3 | Sistem bernombor dan label pertama dipasang di kedai — dan bertembung buat pertama kali dengan ruang kerja abah. |
| 4 | bab-4 | BAB 4 | Wardah menziarahi Cikgu Rohana; mendapati ingatan kampung disimpan dalam cerita, bukan tarikh. |
| 5 | bab-5 | BAB 5 | Pagi yang lebih tenang; abah menerima bantuan tanpa kata, dan Wardah menyimpan satu ayat mudah di buku notanya. |
| 6 | bab-6 | BAB 6 | Jam Pak Long ditemui dalam kotak tanpa label; senarai lama abah yang terhenti turut ditemui. |
| 7 | bab-7 | BAB 7 | Pelanggan datang tanpa rekod; Wardah menambah kategori maklumat tambahan dan mula merekod siapa yang membawa cerita. |
| 8 | bab-8 | BAB 8 | Hari Sabtu yang sibuk; pelanggan lama mengingati abah lebih daripada mana-mana rekod. |
| 9 | bab-9 | BAB 9 | Semakin banyak dicatat, semakin banyak ruang kelihatan; Wardah mula memerhati sebelum mencatat. |
| 10 | bab-10 | BAB 10 | Nama-nama lama muncul kembali — Salmah, Pak Din — dan abah mengenali sebelum sistem berbuat demikian. |
| 11 | bab-11 | BAB 11 | Kotak pensel milik Wardah sendiri ditemui; satu rekod yang sengaja dibiarkan tidak lengkap. |
| 12 | bab-12 | BAB 12 | Senarai lama abah yang berhenti lapan tahun lalu dibuka semula; soalan tentang emak ditangguhkan, bukan diselesaikan. |
| 13 | bab-13 | BAB 13 | Dua orang mendakwa memiliki jam poket yang sama; Wardah belajar menyimpan pertikaian tanpa memilih cerita. |
| 14 | bab-14 | BAB 14 | Seorang wanita datang membawa kenangan tentang arwah kawannya, Aina — cerita pertama yang tiada barangnya langsung. |
| 15 | bab-15 | BAB 15 | Wardah menemui dirinya sendiri dalam buku log lama sebagai satu entri pelanggan kecil. |
| 16 | bab-16 | BAB 16 | Insiden dua Hashim mendedahkan had sistem; abah membezakan orang tanpa perlu rekod. |
| 17 | bab-17 | BAB 17 | Rutin tiga jam pagi abah akhirnya dijelaskan — asal-usul setiap jam dan sempadan cerita yang belum bersedia. |
| 18 | bab-18 | BAB 18 | Susulan klinik: had kerja selamat dibincangkan; abah dan Wardah bersetuju membahagikan bahagian berisiko. |
| 19 | bab-19 | BAB 19 | Abah mula kehilangan nama alat — cerangkang — dan Wardah menyimpannya di luar sistem. |
| 20 | bab-20 | BAB 20 | Panduan bertulis gagal menangkap rasa tangan abah; pembelajaran kembali kepada cara lama: perhati dan cuba. |
| 21 | bab-21 | BAB 21 | Abah pening seketika; Wardah menyiapkan kerja pelanggan sendiri buat kali pertama, dengan bimbingan bila perlu. |
| 22 | bab-22 | BAB 22 | Rakaman video menunjukkan gerakan tetapi bukan keputusan; seorang kawan lama mengingati peristiwa yang abah tidak lagi simpan. |
| 23 | bab-23 | BAB 23 | Susunan rak sebenarnya mengikut tubuh abah; sistem Wardah menyelamatkan sebuah jam yang hampir hilang. |
| 24 | bab-24 | BAB 24 | Wardah sedar dia mengambil ruang abah terlalu awal; esoknya dia menunggu — dan abah menjawab kami. |
| 25 | bab-25 | BAB 25 | Pertama kali abah menyerahkan keputusan teknikal kepada Wardah; pilihannya disahkan dengan satu perkataan. |
| 26 | bab-26 | BAB 26 | Pelanggan lama mengingati kisah yang abah lupa; Wardah menjadi jambatan di antara mereka. |
| 27 | bab-27 | BAB 27 | Kerja rumit dijalankan berdua; abah sendiri yang meminta bantuan tanpa menyerahkan pemilikan kerja. |
| 28 | bab-28 | BAB 28 | Kotak besar koleksi keluarga diterima dengan syarat baharu — bukan aku seorang — dan menjadi kerja bersama. |
| 29 | bab-29 | BAB 29 | Hari terlepas sebuah jam mendedahkan keperluan memilih; waktu operasi kedai dikurangkan sehari. |
| 30 | bab-30 | BAB 30 | Wardah kini mendengar dahulu sebelum memeriksa; sebuah laman lama dalam buku rekod abah ditemui semasa mengemas rak. |
| 31 | epilog | EPILOG | Beberapa bulan kemudian sebuah jam mainan datang kembali — kali ini di tangan Wardah. |

Pemisahan watak (ujian "utama/sampingan tidak bercampur"): `Utama` = Wardah, Abah sahaja. `Sampingan` = Cikgu Rohana, Kak Timah, Cikgu Yusof, Pak Leman, Luqman, Salmah, Pak Din, Pak Rahman, Azman, Faridah, Pak Hashim, doktor, wanita sahabat Aina. `Disebut` = Aina.

---

## Ujian 3 — Fragmen & Sinopsis

### 3a. Fragmen: `The Great Gatsby: Kapal Melawan Arus` (279 kata)

| Semakan | Keputusan | Bukti |
| --- | --- | --- |
| Metadata sumber tidak bercampur dengan metadata karya? | ✅ LULUS | Semua rujukan sumber dalam objek `source` berasingan; medan karya (title/dek/genre/locations) dari teks petikan sahaja |
| Author asal tidak dianggap penyunting Jalin? | ✅ LULUS | `author.name` = "tidak dinyatakan" (tiada nama penulis dalam teks); tiada medan kredit dihasilkan; pengarang asal hanya dalam `source.author` — tiada silang-golok |
| `rightsStatus` kekal keputusan manusia? | ✅ LULUS | Semakan automatik: tiada sebarang medan `rights*` dalam JSON; `source` = title/author/language/provenance sahaja |
| Tiada dakwaan domain awam automatik? | ✅ LULUS | Walaupun terbitan mempunyai `public_domain` (ditetapkan manusia), parser **tidak** menghasilkan sebarang dakwaan hak — Editor Report menandakan hak untuk gerbang semakan manusia |

```json
{
  "type": "fragmen",
  "title": "The Great Gatsby: Kapal Melawan Arus",
  "slug": "gatsby-kapal-melawan-arus",
  "dek": "Petikan akhir The Great Gatsby — suara pertama merenung teluk yang sunyi dan cahaya hijau di hujung dermaga Daisy.",
  "genre": "drama",
  "audience": "13-17",
  "readingMinutes": 1,
  "author": { "name": "tidak dinyatakan", "credit": "author" },
  "glossary": [
    { "term": "shore", "meaning": "Tepi laut; kawasan pantai." },
    { "term": "ferryboat", "meaning": "Bot penumpang yang membawa orang merentasi sungai atau teluk." },
    { "term": "Sound", "meaning": "Selat yang luas antara dua pulau; di sini merujuk perairan teluk tempat bot penumpang bergerak." },
    { "term": "inessential", "meaning": "Yang bukan keperluan; kelihatan tidak penting." },
    { "term": "pandered", "meaning": "Melayani atau memujuk demi memuaskan keinginan orang lain." },
    { "term": "commensurate", "meaning": "Setanding; sepadan pada ukuran atau tarafnya." },
    { "term": "eluded", "meaning": "Terlepas daripada genggaman; gagal dicapai atau dikejar." },
    { "term": "borne", "meaning": "Dibawa oleh arus atau daya; bentuk lampau bagi perkataan bear." }
  ],
  "source": {
    "title": "The Great Gatsby",
    "author": "tidak dinyatakan",
    "language": "Inggeris",
    "provenance": "Petikan daripada novel The Great Gatsby (dirujuk dalam tajuk manuskrip); teks asal dalam bahasa Inggeris."
  },
  "editorialNotes": {
    "factsToVerify": [
      "Pengarang sumber tidak dinyatakan dalam teks manuskrip — editor perlu isi 'Penulis asal' di Karya → Sumber dan Kredit",
      "Status hak cipta sengaja TIDAK diisi oleh parser — tetapkan oleh editor melalui gerbang semakan hak"
    ],
    "notes": "Glosari: 8/8 istilah terbitan dihasilkan semula, semuanya wujud dalam teks."
  }
}
```

### 3b. Sinopsis: `Di Hadapan Singgahsana` (577 kata)

Empat semakan **3a diulang: semua LULUS** dengan bukti serupa. Penemuan khusus:

- **Manuskrip sinopsis ini mengandungi TIADA baris atribusi** (tiada tajuk asal, pengarang atau bahasa asal dalam teks). Mengikut peraturan "jangan cipta fakta", output parser menghasilkan `source` = semuanya "tidak dnyatakan" — **betul** (terbitan mengisi `Before the Throne` / `Naguib Mahfouz` / `Arab` secara manusia).
- Editor Report menandakan perkara ini sebagai **WAJIB isi manual** di Karya → Sumber.
- Nilai `public_domain`/`needs_review` pada terbitan = ditetapkan manusia; parser tidak menyentuhnya.

```json
{
  "type": "sinopsis",
  "title": "Di Hadapan Singgahsana",
  "slug": "di-hadapan-singgahsana",
  "genre": "Sejarah",
  "readingMinutes": 3,
  "author": { "name": "tidak dinyatakan", "credit": "author" },
  "source": { "title": "tidak dinyatakan", "author": "tidak dinyatakan", "language": "tidak dinyatakan", "provenance": "tidak dinyatakan" },
  "editorialNotes": {
    "factsToVerify": [
      "Sumber asal TIADA dalam teks manuskrip — editor WAJIB isi di Karya → Sumber sebelum terbit",
      "Status hak cipta TIDAK ditetapkan parser — kekal keputusan manusia"
    ],
    "notes": "Amalan disyorkan: sertakan satu baris atribusi (tajuk asal + pengarang + bahasa) dalam manuskrip sebelum tampal ke parser."
  }
}
```

*(Potongan; output penuh mengandungi characters/locations/themes/glossary/visualSuggestions yang sama berstruktur.)*

---

## Audit medan pra-v2

Prinsip: **tambah hanya jika Jalin Admin memerlukannya.** Setiap keputusan disokong bukti kod sistem.

| Medan cadangan | Adakah Admin perlukannya? | Bukti sistem | Keputusan |
| --- | --- | --- | --- |
| `language` | ❌ Tiada medan bahasa peringkat karya; **ADA** pada sumber (`source_works.original_language` = "Bahasa asal *") | Borang admin Metadata tiada medan bahasa; source tab ada | **Tiada tambahan** — v1 sudah ada `source.language` ✓ |
| `version` | Medan "Versi" ADA (admin [id] baris 1171) tetapi ia **state seni kerja kerja** (AGENTS #22 living text; default v0.1) | `revision-service`, editorialHistory | **TIDAK** — AI tidak tahu rekod semakan; tiada fakta boleh diekstrak |
| `status` | Medan "Status" ADA (admin [id] baris 1148) tetapi menukar status = **keputusan terbitan** | AGENTS #4 (tiada penerbitan autonomi) | **TIDAK** — kerja editorial manusia; kerja baru sedia default `draft` |
| `sourceWork` | ADA penuh (Karya → Sumber: Tajuk asal*, Penulis asal*, Bahasa asal*, …) | `source_works` cols | **Kekal v1** sebagai `source`; **cadangan v2**: samakan nama sub-medan dalam Jadual Import → `original_title` / `original_language` / `source_text_basis` |
| `copyrightNotes` | ❌ Tiada medan; ruang hak = `rights_notes` + `rights_status` (label admin: "Status hak (semakan manusia) *") | admin [id] baris 2026–2059 | **TIDAK** — melanggar mandatori v1 "jangan tentukan hak cipta secara automatik" |
| `contentWarnings` | ❌ Tiada medan di mana-mana (grep repo: 0 hasil) | — | **TIDAK** |
| `qualityAssessment` | **DILARANG** arahan Director | v1 sedia ada hanya `editorialNotes` | **Kekal TIADA** ✓ (disahkan: 0 hasil dalam semua JSON ujian) |
| `sections[].readingMinutes` per bab | API `section-service` menyokong, tetapi **UI admin dan reader tidak memaparkan/mengedit** (0 hasil `readingMinutes` pada borang bahagian; DB null) | `section-service.ts:38`, borang admin [id] | **TIDAK** — tiada pengguna sistem; v1 sections = order/slug/title/summary kekal betul |

---

## Pemerhatian tambahan (bukan kegagalan)

1. **`readingMinutes` Δ1–2 vs nilai terbitan** (11/12, 134/135, 1/3, 3/4). Kontrak v1 = ÷200 bulat terdekat; nilai terbitan ditetapkan/indahterjemahkan oleh editor (formula berbeza-beza antara karya). Medan admin boleh disunting — tiada perubahan prompt diperlukan; Editor Report boleh menandakan anggaran ini.
2. **Glosari terbitan mempunyai medan `source`** (contoh: "Kamus Dewan / PRPM") — sengaja tiada dalam v1 (parser tidak merujuk kamus luar); nilai ditambah penyunting.
3. **`saban` (glosari cerpen) = 0 kejadian dalam teks** — membuktikan amalan terbitan kadang menambah istilah luar-teks; parser mengikut peraturan in-text dan mengeluarkan9/10 — jurang ini milik kerja penyunting, bukan parser.
4. **Atribusi sumber** tidak semestinya wujud dalam manuskrip (kes sinopsis) — amalan disyorkan: editor sertakan **satu baris atribusi** dalam manuskrip fragmen/sinopsis sebelum tampal.

## Kesimpulan ujian

| Ujian | Keputusan |
| --- | --- |
| Ujian 1 — Cerpen | ✅ **LULUS** |
| Ujian 2 — Novela | ✅ **LULUS** |
| Ujian 3 — Fragmen/Sinopsis | ✅ **LULUS** (bersyarat amalan atribusi baris untuk sumber) |
| Audit medan pra-v2 | ✅ **Tiada medan perlu ditambah**; 2 penjelasan Jadual Import dicadangkan |
| `qualityAssessment` | ✅ **Disahkan TIADA** — hanya `editorialNotes` |

## Cadangan v2 (menunggu kelulusan Director — tiada suntingan dibuat lagi)

1. **Jadual Import `source`** diperhalus: `source.title` → *Tajuk asal*, `source.language` → *Bahasa asal*, `source.provenance` → *Asas teks* (`source_text_basis`). (Penjelasan jadual sahaja — bukan perubahan kontrak JSON.)
2. **Nota "Cara guna"**: cadangkan editor sertakan satu baris atribusi dalam manuskrip fragmen/sinopsis supaya medan sumber diekstrak automatik.
3. **Nota Editor Report**: maklumkan `readingMinutes` ialah anggaran ÷200 — nilai terbitan boleh berbeza dan boleh dilaras di Metadata.

## Fasa seterusnya (mengikut urutan Director)

1. ✅ Ujian 3 manuskrip — **selesai** (laporan ini).
2. Uji import manual: copy JSON → `/admin/works/new` (atau karya sedia ada) — sahkan setiap medan pada **Jadual Import** mendarat di tab yang betul.
3. Uji seorang editor manusia + ukur masa sebenar.
4. Automasi — **hanya selepas** aliran manual terbukti lancar.
