# Kerusi Work Migration Map v1

Status: TEMPLATE untuk migrasi karya pertama Jalin
Tarikh: 22 September 2026
Milestone: FASA 2B-2 (audit sahaja — tiada kod)

Dokumen ini memetakan semua data "Kerusi di Beranda" yang tersebar di beberapa sumber hari ini kepada satu Objek Work masa depan. Ia menjadi template untuk migrasi karya lain (termasuk Nombor Giliran 117).

---

## 1. Current sources

Semua data Kerusi hari ini bertaburan:

### Content body
- **Sumber**: `content/drafts/kerusi-di-beranda.md`
- Frontmatter: `title: "Kerusi di Beranda"`, `slug: "kerusi-di-beranda"`, `type: "cerpen"`, `genre: "keluarga"`, `status: "review"`, `authors: [Nara Zahin, Rafiq Naim]`, `audience: "13-17"`
- Body prosa penuh (satu fail), kemudian dua bahagian dalaman:

```
---
## Nota editorial dalaman      <- dikeluarkan oleh page.tsx sebelum dipaparkan
## Cadangan glosari             <- cadangan, masih tidak digunakan terus
```

### Title
- **Sumber A**: `page.tsx` — `const title = "Kerusi di Beranda"`
- **Sumber B**: `page.tsx` — `dek` (subjudul): "Di sebuah beranda yang menyimpan lebih banyak daripada yang pernah ditanya, seorang anak mula menulis sebelum sebahagian cerita keluarganya hilang."
- **Sumber C**: frontmatter markdown — `title: "Kerusi di Beranda"`

### Visuals
- **Sumber A**: `page.tsx` — objek `visuals` dengan 3 URL signed CDN:
  - `visuals.hero` — hero (kerusi rotan di beranda)
  - `visuals.rubberEstate` — inline (kebun getah tidak ditoreh)
  - `visuals.notebook` — inline (tangan tua memegang pen)
- **Sumber B**: `content/visuals/kerusi-di-beranda.json` — provenance Magnific:
  - `hero` (creation_id `TdExepDVNR`), `inline-rubber-estate` (`LwZMwrgswO`), `inline-notebook` (`xS3TwzajfW`); model Seedream 5 Pro; status `staging-reference`
- Nota: URL CDN bersifat sementara (exp Okt 2026) — durability berasingan (P0.5, ditangguh)

### Glossary
- **Sumber A**: `page.tsx` — `const glossary: GlossaryMap` (10 istilah, dengan meaning + source)
- **Sumber B**: `content/drafts/kerusi-di-beranda.md` — `## Cadangan glosari` (10 istilah, susunan/teks sedikit berbeza)

### Credits
- **Sumber A**: `page.tsx` — `byline`: Nara Zahin (maya, → `/penulis/nara-zahin`), Rafiq Naim (maya, → `/penulis/rafiq-naim`)
- **Sumber B**: `page.tsx` — `editorial: EditorialCredit[]`:
  - Penulis: Nara Zahin · Maya
  - Penulis & penyemak: Rafiq Naim · Maya
  - Editor: Izzat Anas
- **Sumber C**: `content/drafts/kerusi-di-beranda.md` — `authors: [Nara Zahin, Rafiq Naim]`

### Contributor records
- `content/contributors/nara-zahin.md` — kind `virtual`, role "Penulis Maya", status `draft`
- `content/contributors/rafiq-naim.md` — kind `virtual`, role "Penulis & Penyemak Maya", status `draft`

### Editorial metadata
- **Sumber**: `page.tsx` — `workMeta`: Bentuk Cerpen, Genre Keluarga, Bacaan ±12 min, Status "Karya asli Jalin", ID `JLN-CER-0001`, Versi `v0.2`
- **Sumber**: `page.tsx` — `characters`: Pak Long Rashid (Bapa), Along (Anak)
- **Sumber**: `page.tsx` — `rights`: "KERUSI DI BERANDA · © ADJUNG 2026 · ILUSTRASI JALIN"
- **Sumber**: mobileInfo `note`: "Panel Bacaan AI belum dipaparkan..."
- Git history: draf awal `14feeb9` (2026-09-21), semakan editorial kedua `7d1a451` (2026-09-22, "bring Kerusi di Beranda to Jalin prose standard")

### Struktur body dalam reader
- `page.tsx` memecah body markdown kepada tiga segmen menggunakan dua anchor:
  - `rubberAnchor` = "Di hadapan mereka, jalan tanah merah membelah kampung..." (selepas ini visual `rubberEstate`)
  - `notebookAnchor` = "Menjelang senja, Pak Long meminta pen." (selepas ini visual `notebook`)
  - Segmen: A + rubberEstate + B + notebook + C

---

## 2. Target Work object

Bagaimana Kerusi akan kelihatan jika dimuatkan melalui WorkLoader:

```ts
{
  id: "JLN-CER-0001",
  slug: "kerusi-di-beranda",
  title: "Kerusi di Beranda",
  type: "cerpen",
  status: "published",
  genre: "keluarga",
  audience: "13-17",
  publishedAt: "2026-09-21",      // cadangan, perlu sahkan tarikh terbit sebenar
  updatedAt: "2026-09-22",        // semakan editorial kedua
  version: "v0.2",
  dek: "Di sebuah beranda yang menyimpan lebih banyak daripada yang pernah ditanya, seorang anak mula menulis sebelum sebahagian cerita keluarganya hilang.",

  body: "…prosa penuh tanpa Nota editorial dalaman / Cadangan glosari…",

  credits: [
    { slug: "nara-zahin", role: "writer" },
    { slug: "rafiq-naim", role: "story_editor" }   // perlu sahkan role oleh editor manusia
  ],

  visuals: [
    { src: "<URL signed hero>", alt: "Kerusi rotan lama di beranda rumah kampung dengan kain lusuh pada tiang kayu.", provider: "Magnific", creationId: "TdExepDVNR" },
    { src: "<URL signed rubber estate>", alt: "Barisan pokok getah lama yang tidak ditoreh, dengan semak mula memenuhi lantai kebun.", provider: "Magnific", creationId: "LwZMwrgswO" },
    { src: "<URL signed notebook>", alt: "Tangan tua Pak Long memegang pen di atas buku nota di meja beranda.", provider: "Magnific", creationId: "xS3TwzajfW" }
  ],

  glossary: [
    { term: "kemerosotan kognitif", definition: "kemerosotan pada keupayaan mental seperti mengingat, memahami atau berfikir." },
    /* …10 istilah, source = page.tsx (versi dipaparkan)… */
  ],

  editorialHistory: [
    { version: "v0.1", type: "initial", summary: "Draf awal Kerusi di Beranda", date: "2026-09-21" },
    { version: "v0.2", type: "major", summary: "Semakan editorial kedua — prosa dibawa ke standard cerpen Melayu; kosa kata ditambah; nota plot dipekatkan", date: "2026-09-22" }
  ]
}
```

---

## 3. Mapping table

| Data | Sumber lama | Lokasi baharu |
|---|---|---|
| title | `page.tsx` (title) + frontmatter | `Work.title` |
| dek / subjudul | `page.tsx` (dek) | `Work.dek` (sementara di luar skema v1; boleh kekal dalam page atau ditambah ke Work) |
| body prosa | `content/drafts/kerusi-di-beranda.md` (selepas buang bahagian dalaman) | `Work.body` dari `content/works/kerusi-di-beranda.md` |
| visuals + alt | `page.tsx` (visuals, alt dalam JSX) | `Work.visuals[]` (+ alt) |
| visual provenance | `content/visuals/kerusi-di-beranda.json` | `Work.visuals[].creationId/provider` |
| glossary | `page.tsx` (GlossaryMap) | `Work.glossary[]` |
| rd credits (byline penulis) | `page.tsx` (byline) + `authors` frontmatter | `Work.credits[]` (slug + role) |
| editorial credits (role/editor) | `page.tsx` (editorial) | `Work.credits[]` + `content/contributors/` |
| characters | `page.tsx` (characters) | Sementara: luar skema v1 (boleh kekal di page / ditambah kemudian) |
| workMeta (ID, versi, bentuk, genre, bacaan, status) | `page.tsx` (workMeta) | `Work.id`, `Work.version`, `Work.type`, `Work.genre`, `workMeta` tambahan |
| rights caption | `page.tsx` (rights) | Sementara: kekal di page (visual rights) |
| nota editorial dalaman | `content/drafts/*.md` (bahagian dalam) | JANGAN masuk ke Work body — dipisahkan ke `content/revisions/`/dokumentasi dalaman |

---

## 4. Risiko

**Adakah semua visual boleh dipindahkan?**
Ya. Ketiga-tiga visual (hero + 2 inline) ada URL production (page.tsx) dan provenance (JSON). Ancor body reader menentukan kedudukan inline visual — body penuh mesti mengekalkan anchor sama (rubberAnchor, notebookAnchor) supaya visual muncul di posisi sama. Risiko utama: URL CDN tamat Okt 2026 (ditangguh ke fasa asset durability, bukan menghalang migrasi ini).

**Adakah glossary lengkap?**
Ya — 10 istilah sedia dalam `GlossaryMap` page.tsx. Tetapi dua sumber berbeza (page.tsx vs Cadangan glosari dalam markdown): teks "kemerosotan kognitif" dan beberapa istilah berbeza sedikit. Keputusan: sebar yang dipaparkan = `page.tsx` menjadi kanon; Cadangan glosari dalam dokumen dalaman tidak boleh bocor ke api/renderer awam.

**Adakah contributor link kekal?**
Ya. Kedua-dua contributor (nara-zahin, rafiq-naim) wujud dalam `content/contributors/` dan byline memaut ke `/penulis/<slug>`. Migrasi mesti memastikan link `/penulis/nara-zahin` dan `/penulis/rafiq-naim` kekal berfungsi. Nota: frontmatter `authors` (nama sahaja) tidak boleh digunakan sebagai satu-satunya kredit — ia tidak membezakan role.

**Adakah UI berubah?**
Sasaran: TIDAK. Reader (visual layout, glossary tooltip, byline, workMeta, rights) mesti kekal sama. WorkLoader menyuap data yang sama; `page.tsx` tidak perlu mengubah tampilan. Apa-apa perbezaan output dilarang (rujuk CONTENT_LAYER_IMPLEMENTATION_RULES section 3).

**Isu kecil**
1. frontmatter `status: "review"` berkonflik dengan `workMeta` "Karya asli Jalin" + halaman live/published — perlu sahkan nilai `status` sebenar (nampaknya `published`).
2. `characters` (2 watak) tiada dalam skema Work v1 — perlu keputusan: kekal dalam page (sementara) atau tambah field ke Work (mungkin FASA later).
3. Perbezaan kredit between byline vs editorial credits (Rafiq = "Penulis & penyemak" dalam editorial, tetapi dipaparkan sebagai penulis dalam byline) — ikut AGENTS rule 23, role mesti berdasarkan sumbangan. Perlu pengesahan editorial sebelum role diterjemah ke `credits[]`.

---

## 5. Jangan buat (dalam langkah ini)

- ❌ Jangan ubah `src/app/cerpen/kerusi-di-beranda/page.tsx`
- ❌ Jangan buat WorkLoader baca Kerusi lagi
- ❌ Jangan ubah `content/drafts/kerusi-di-beranda.md`
- ❌ Jangan migrate Nombor Giliran 117
- ❌ Jangan tambah schema baharu

Milestone seterusnya (FASA 2B-3): masukkan Kerusi ke WorkLoader + tukar reader, selepas semakan map ini oleh ChatGPT dan editor manusia.