# Nombor Giliran 117 Work Migration Map v1

Status: TEMPLATE extend — aplikasi pola migrasi Kerusi untuk karya kedua
Tarikh: 22 September 2026
Milestone: FASA 2B-4 (audit + mapping sahaja — tiada kod)

Dokumen ini memetakan semua data "Nombor Giliran 117" daripada sumber lama kepada satu Objek Work. Ia juga menjadi **ujian drift correction** kerana audit FASA 1 mendapati byline tidak padan, metadata tidak konsisten dan versi berbeza antara sumber.

---

## 1. Current sources

### Content body
- **Sumber**: `content/drafts/nombor-giliran-117.md` (331 baris, terbitan repo)
- Frontmatter: `title: "Nombor Giliran 117"`, `slug`, `type: "cerpen"`, `genre: "keluarga"`, `status: "published"`, `authors: [Nara Zahin, Rafiq Naim]`, `audience: "13-17"`
- Body prosa penuh; dua bahagian dalaman dikeluarkan oleh page.tsx:
  - `## Nota editorial dalaman` (baris 307) — semakan gaya prosa Melayu 21 Sept 2026
  - `## Cadangan glosari` (baris 321) — 9 istilah
- **Penting**: versi repo menggunakan **"Ani"** sebagai panggilan Azman kepada Rohani (dikhususkan dalam semakan); manuskrip chat lama menggunakan "Roh" — versi repo menang.

### Title / dek / kicker
- **Sumber**: `page.tsx` — `title = "Nombor Giliran 117"`
- **dek**: "Seorang ibu menunggu nombor gilirannya dipanggil, sambil mengingati tahun-tahun ketika dialah yang tidak pernah berhenti menunggu untuk anaknya."
- **kicker**: "Cerpen · Keluarga" (dari `workMeta` api)

### Visuals
- **Sumber A**: `page.tsx` — objek `visuals` (3 URL signed CDN):
  - `visuals.hero` — hero (wanita di kerusi menunggu hospital)
  - `visuals.nasiLemak` — inline (dapur sebelum Subuh, bakul nasi lemak)
  - `visuals.hearingAids` — inline (alat bantu dengar di atas meja)
- **Sumber B**: `content/visuals/nombor-giliran-117.json` — provenance Magnific:
  - `hero` (creation_id `mEjyWoyhJQ`), `inline-nasi-lemak` (`jURpFvgLD0`), `inline-hearing-aids` (`O60hjs7ynm`); model Seedream 5 Pro; status `staging-reference`
- Nota: URL CDN sementara (exp Okt 2026) — durability berasingan (P0.5)

### Glossary
- **Sumber A**: `page.tsx` — `const glossary: GlossaryMap` (9 istilah + source)
- **Sumber B**: `content/drafts/nombor-giliran-117.md` — `## Cadangan glosari` (9 istilah)
- **Keputusan canonical**: kedua-dua sumber **sepadan 100%** istilah, meaning dan source (disahkan istilah demi istilah). Canonical = senarai dalam page.tsx (yang dipaparkan); guna sebagai asas `Work.glossary`.

### Credits (drift — perlu pembetulan, bukan salinan)
- **Sumber A**: `page.tsx` — `byline`:
  - `{ name: "Nara Zahin", maya: true }` — **TIADA href** (tidak konsisten dengan Kerusi)
  - `{ name: "Rafiq Naim", maya: true }` — **TIADA href**
- **Sumber B**: `page.tsx` — `editorial`:
  - Penulis: Nara Zahin · Maya
  - Penulis & penyemak: Rafiq Naim · Maya
  - Editor: Izzat Anas
- **Sumber C**: frontmatter — `authors: [Nara Zahin, Rafiq Naim]`
- Drift: byline Nombor kekurangan `href` walaupun halaman `/penulis/<slug>` wujud; Kerusi sudah ada href. Migration mesti memperbaiki ini.

### Contributor records
- `content/contributors/nara-zahin.md` — virtual, "Penulis Maya"
- `content/contributors/rafiq-naim.md` — virtual, "Penulis & Penyemak Maya"
- `content/contributors/izzat-anas.md` — **BAHARU (FASA 2B-3)** human, "Editor" — sudah wujud sekarang

### Editorial metadata
- **Sumber**: `page.tsx` — `workMeta`: Bentuk Cerpen, Genre Keluarga, Bacaan ±11 min, Status "Karya asli Jalin", ID `JLN-CER-0002`, Versi `v1.1`
- **Sumber**: `page.tsx` — `characters`: Rohani (Ibu), Danish (Anak), Azman (Suami Rohani)
- **Sumber**: `page.tsx` — `rights`: "NOMBOR GILIRAN 117 · © ADJUNG 2026 · ILUSTRASI JALIN"
- **Sumber**: mobileInfo `note`: "Penulis Maya bekerja di bawah kawal selia editorial manusia."
- Git history: `d1abcc3` publish 21 Sept 2026; `e381b28` reader page 21 Sept; semakan prosa `28b05c5` 22 Sept 2026 ("revise Nombor Giliran 117 into flowing Malay prose")

### Struktur body dalam reader
- `page.tsx` menggunakan `splitAfter(text, anchor)` untuk letak visual inline pada 3 segmen:
  - `kitchenAnchor` = "Begitulah hampir setiap pagi." (selepas ini visual `nasiLemak`)
  - `hearingAnchor` = "Alat bantu dengar itu kekal di atas meja hingga Maghrib." (selepas ini visual `hearingAids`)
  - Segmen: throughKitchen + nasiLemak + throughHearing + hearingAids + afterHearing

---

## 2. Target Work object

```ts
{
  id: "JLN-CER-0002",
  slug: "nombor-giliran-117",
  title: "Nombor Giliran 117",
  type: "cerpen",
  status: "published",
  genre: "Keluarga",
  audience: "13-17",
  publishedAt: "2026-09-21",      // commit d1abcc3
  updatedAt: "2026-09-22",        // semakan prosa 28b05c5
  version: "v1.1",
  dek: "Seorang ibu menunggu nombor gilirannya dipanggil, sambil mengingati tahun-tahun ketika dialah yang tidak pernah berhenti menunggu untuk anaknya.",
  readingMinutes: 11,

  body: "…prosa penuh Ani/Rohani, tanpa Nota editorial dalaman / Cadangan glosari…",

  metadata: {
    characters: [
      { name: "Rohani", role: "Ibu" },
      { name: "Danish", role: "Anak" },
      { name: "Azman", role: "Suami Rohani" }
    ]
  },

  credits: [
    { contributor: "nara-zahin", role: "initial_draft", byline: true },
    { contributor: "rafiq-naim", role: "story_editor", byline: true },
    { contributor: "izzat-anas", role: "final_editor", byline: false }
  ],

  visuals: [
    { role: "hero", src: "<URL signed>", alt: "Seorang wanita Melayu berusia duduk di kerusi menunggu hospital sambil memegang nombor giliran; wajahnya tidak kelihatan jelas.", provider: "Magnific", creationId: "mEjyWoyhJQ" },
    { role: "inline-nasi-lemak", src: "<URL signed>", alt: "Bakul plastik biru berisi bungkusan nasi lemak di dapur rumah sederhana sebelum Subuh.", provider: "Magnific", creationId: "jURpFvgLD0" },
    { role: "inline-hearing-aids", src: "<URL signed>", alt: "Sepasang alat bantu dengar di atas meja kecil bersama beg sekolah dan buku latihan pada lewat petang.", provider: "Magnific", creationId: "O60hjs7ynm" }
  ],

  glossary: [
    /* 9 istilah, canonical = senarai page.tsx yang dipapar (sama dengan Cadangan glosari) */
  ],

  editorialHistory: [
    { version: "v1.0", type: "initial", summary: "Penerbitan pertama Nombor Giliran 117 sebagai cerpen kedua Jalin", date: "2026-09-21" },
    { version: "v1.1", type: "major", summary: "Semakan gaya prosa Melayu: 'Ani' dikhususkan; dialog isyarat diseragamkan; babak sekolah diperluas; frame hospital dibayar semula", date: "2026-09-22" }
  ]
}
```

---

## 3. Credit correction

Prinsip: ikut AGENTS rule 23 — kredit berdasarkan sumbangan sebenar, jangan samakan penyunting dengan penulis.

| Sekarang (page.tsx) | Cadangan role (Work) | Justifikasi |
|---|---|---|
| Penulis: Nara Zahin · Maya | `initial_draft` (byline: true) | Nara penyumbang draf asal — kekal penulis |
| Penulis & penyemak: Rafiq Naim · Maya | `story_editor` (byline: true) | Rafiq menyemak/menggubah prosa, bukan menulis dari kosong — label lama "Penulis & penyemak" itu sendiri mengakui peranan penyemakan |
| Editor: Izzat Anas | `final_editor` (byline: false) | Editor akhir manusia |

**Byline yang betul selepas migrasi** (rujuk FASA 2B-3 reader): resolve nama penuh dan `maya` flag daripada `content/contributors/*.md`, tambah `href: /penulis/<slug>` untuk kedua-dua kredit berbyline. Ini membetulkan drift byline Nombor yang tidak mempunyai href.

**Paparan editorial rail** (parity dengan Kerusi yang baru dimigrasi):
- `initial_draft` → label "Penulis"
- `story_editor` → label "Penulis & penyemak" (kekal parity buat masa ini; redesign label penuh ditunda ke FASA Credit system — nota ChatGPT FASA 2B-3 point 4)
- `final_editor` → label "Editor"

Nota: JANGAN berikan role `writer` kepada Rafiq kerana sumbangan beliau ialah penyemakan/gubahan, bukan penulisan asal teks.

---

## 4. Contributor drift

Semua contributor yang dirujuk untuk Nombor:

| slug | Fail contributor | Wujud? |
|---|---|---|
| `nara-zahin` | `content/contributors/nara-zahin.md` | ✅ (virtual) |
| `rafiq-naim` | `content/contributors/rafiq-naim.md` | ✅ (virtual) |
| `izzat-anas` | `content/contributors/izzat-anas.md` | ✅ (baharu, FASA 2B-3, human) |

Tiada contributor baharu perlu dicipta untuk Nombor.

---

## 5. Glossary

| Istilah (9) | page.tsx (dipapar) | Cadangan markdown | Canonical |
|---|---|---|---|
| kehilangan pendengaran sensorineural | ✅ | ✅ | sama |
| alat bantu dengar | ✅ | ✅ | sama |
| bahasa isyarat | ✅ | ✅ | sama |
| pereka antara muka | ✅ | ✅ | sama |
| saban | ✅ | ✅ | sama |
| meresap | ✅ | ✅ | sama |
| sayup | ✅ | ✅ | sama |
| berderau | ✅ | ✅ | sama |
| sekelumit | ✅ | ✅ | sama |

Semua istilah, meaning dan source **sepadan 100%** antara kedua-dua sumber. Canonical = senarai yang dipaparkan (page.tsx). Tiada konflik.

---

## 6. Jangan buat (dalam langkah ini)

- ❌ Jangan buat `content/works/nombor-giliran-117.md`
- ❌ Jangan ubah `src/app/cerpen/nombor-giliran-117/page.tsx`
- ❌ Jangan ubah WorkLoader
- ❌ Jangan buang `content/drafts/nombor-giliran-117.md`

Milestone seterusnya (FASA 2B-5): migrasi sebenar Nombor ke Work + reader, selepas map ini diluluskan. Pola migrasi sama dengan Kerusi (FASA 2B-3): works file → WorkLoader → reader → parity verify → commit.