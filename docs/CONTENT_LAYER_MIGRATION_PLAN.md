# Jalin Content Layer Migration Plan v1

> **⚠️ STALE**: Dokumen ini telah digantikan oleh `ADMIN_CONSOLE_PLAN.md`. Content layer migration kini dilaksanakan sebagai Fasa A dalam `ADMIN_CONSOLE_PLAN.md`. Dokumen ini dikekalkan untuk rujukan sejarah sahaja.

Status: DRAF FOR SEMAKAN — belum kod dilaksanakan
Tarikh: 22 September 2026
Author: OpenCode/big-pickle, di bawah arahan editorial AI (Rafiq Naim) dan manusia (Izzat)

Dokumen ini menerangkan perancangan untuk menyatukan lapisan kandungan Jalin daripada beberapa sumber metadata yang tersebar kepada satu Content Layer berstruktur. Ia merupakan asas untuk FASA 2 (content model) dan FASA 3 (Novela, pagination, kategori baharu).

---

## A. Current architecture

Keadaan sekarang: satu karya diwakili oleh beberapa bahagian yang bertabur antara fail kandungan dan kod TS.

### Strata semasa bagi setiap cerpen

```
Work (Nombor Giliran 117 / Kerusi di Beranda)
 ├── markdown        → content/drafts/<slug>.md   (frontmatter ringkas + body + nota dalaman)
 ├── TS metadata     → src/app/cerpen/<slug>/page.tsx  (title, dek, kicker, workMeta)
 ├── TS glossary     → GlossaryMap di page.tsx
 ├── TS visuals      → objek visuals (signed CDN URL) di page.tsx
 ├── TS credits      → byline, editorial, characters di page.tsx
 └── TS notes        → mobileInfo note di page.tsx
```

### Butiran

1. **Markdown** (`content/drafts/*.md`)
   - Frontmatter YAML sedia ada: `title`, `slug`, `type`, `genre`, `status`, `authors`, `audience`.
   - Body mengandungi cerita penuh **plus** seksyen dalaman `## Nota editorial dalaman` dan `## Cadangan glosari` yang dipotong pada masa render melalui `indexOf`.
   - Frontmatter **tidak dibaca** oleh page — hanya `matter()` untuk membelah content.

2. **Metadata TS** (`page.tsx`)
   - `title`, `kicker`, `dek`, `workMeta` (Bentuk, Genre, Bacaan, Status, ID, Versi) di-hard-code.
   - `visuals` — URL imej dipaut terus dalam kod.
   - `glossary` — kamus istilah diduplikasi dalam TS setiap page.
   - `byline`, `characters`, `editorial`, `mobileInfo` — kredit dan watak di-hard-code.
   - Sebahagian metadata (ID, versi, genre) wujud **dua kali**: frontmatter md + TS.

3. **Contributor** (`content/contributors/*.md`)
   - Bentuk markdown dengan frontmatter (`name`, `kind`, `role`, `status`).
   - Route `/penulis/[slug]` guna senarai putih (whitelist) hard-code `allowed = new Set([...])`.
   - Byline pada cerpen ada yang memaut `/penulis/...` (Kerusi) dan ada yang tidak (Nombor) — tidak konsisten.

4. **Visual** (`content/visuals/*.json`)
   - Merekod provenance Magnific (creation_id, model, scene, status staging-reference).
   - **Tidak dibaca** oleh page — URL CDN di-hard-code berasingan di page.tsx.
   - Nota dalam JSON menjelaskan signed URL sementara perlu diganti aset durable.

### Masalah utama

- **Dua sumber kebenaran** untuk metadata (frontmatter md vs TS) — mudah serong.
- Glossary tidak berfungsi daripada satu sumber.
- Provenance visual tidak hidup bersama URL yang digunakan.
- Nota editorial dalaman tinggal dalam fail content — selamat sekarang kerana dipotong, tetapi berisiko bocor melalui renderer/API/RSS masa depan.
- Contributor whitelist hard-code menyukarkan penambahan persona.
- Body ialah satu blok markdown — tidak menyokong bab/pagination untuk Novela.

---

## B. Target architecture

Content Layer bersatu di bawah satu direktori sumber, dibaca oleh satu loader yang sama untuk semua kategori.

```
content/
 ├── works/              → karya dari semua kategori (satu fail per Work)
 │    ├── kerusi-di-beranda.md
 │    ├── nombor-giliran-117.md
 │    └── waktu-sebenar.md
 ├── contributors/       → persona/human contributor (satu fail per contributor)
 │    ├── nara-zahin.md
 │    └── rafiq-naim.md
 ├── visuals/            → provenance & peranan visual (satu fail per Work/aset)
 │    ├── kerusi-di-beranda.json
 │    └── nombor-giliran-117.json
 └── revisions/          → sejarah editorial (satu fail per Work)
      ├── kerusi-di-beranda.json
      └── nombor-giliran-117.json
```

Sumber kebenaran tunggal: **content/**. Kod hanya menganjak data melalui `WorkLoader`.

### Prinsip reka bentuk

1. Metadata karya hidup sepenuhnya dalam frontmatter `content/works/<slug>.md` — bukan dalam TS.
2. Body hanya prosa awam. Nota editorial dalaman dan cadangan glosari tidak lagi berada dalam fail karya.
3. Kredit dirujuk melalui contributor key, bukan string nama yang diulang.
4. Visual dirujuk secara longgar: peranan (hero/inline-*) + provenance; URL production datang dari `visuals/` (durable), bukan hard-code.
5. Sejarah editorial disimpan dalam `content/revisions/` sebagai senarai rekod EditorialRevision.
6. Satu `WorkLoader` (TS utility) menyediakan data kepada semua halaman — `cerpen`, `novela`, `terjemahan`, `fragmen`, `sinopsis`, `bersiri`.

---

## C. Work schema

Setiap Work wajib menyokong field berikut (cadangan frontmatter/struktur):

```yaml
id: "JLN-CER-0002"
slug: "nombor-giliran-117"
title: "Nombor Giliran 117"
type: "cerpen"            # cerpen | novela | bersiri | terjemahan | fragmen | sinopsis
genre: "keluarga"
status: "published"       # draft | review | ready | published | archived

publishedAt: "2026-09-21"
updatedAt: "2026-09-22"
version: "v1.1"

body:                    # rujukan atau inline
  kind: "markdown"
  source: "content/works/nombor-giliran-117.md"

credits:
  - contributor: "nara-zahin"
    role: "writer"
    sequence: 1
  - contributor: "rafiq-naim"
    role: "story_editor"
    sequence: 2
    public: true
  - contributor: "izzat-anas"
    role: "final_editor"
    sequence: 3
    public: true

visuals:
  - role: "hero"
    scene: "Rohani menunggu di hospital sambil memegang nombor giliran; wajah tidak jelas."
    asset_key: "nombor-giliran-117/hero"
  - role: "inline-nasi-lemak"
    scene: "Dapur sebelum Subuh dengan bakul biru dan bungkusan nasi lemak."
    asset_key: "nombor-giliran-117/nasi-lemak"
  - role: "inline-hearing-aids"
    scene: "Sepasang alat bantu dengar di atas meja kecil bersama beg sekolah."
    asset_key: "nombor-giliran-117/hearing-aids"

glossary:
  - term: "berderau"
    meaning: "terasa berdebar atau bergoncang secara tiba-tiba kerana terkejut, cemas atau takut."
    source: "Kamus Dewan"

editorialHistory:
  - version: "v1.0"
    type: "initial"
    summary: "Draf awal terbit"
    date: "2026-09-20"
  - version: "v1.1"
    type: "minor"
    summary: "Semakan prosa Melayu mengalir; motif Tok. Tok.; perenggan diolah."
    date: "2026-09-22"
```

Nota: `body` untuk MVP kekal dalam fail markdown yang sama; pemisahan `revisions/` dan `visuals/` adalah untuk menjaga satu sumber kebenaran tanpa memaksa perubahan kepada gaya penulisan.

---

## D. Migration strategy

Migrasi dilakukan dalam lima langkah. **WorkLoader dibina dahulu** supaya setiap karya yang dimigrasi melalui laluan data sebenar yang akan digunakan semua kategori pada masa depan. Tiada perubahan schema DB yang diperlukan pada peringkat ini (belum ada DB).

### Step 1 — WorkLoader foundation

- Bina lapisan abstraksi `src/lib/content/`:
  - `types.ts` — jenis data Work, Credit, VisualRef, GlossaryEntry, EditorialRevision, Contributor;
  - `workLoader.ts` — fungsi `getWorkBySlug(slug)`, `getWorksByType(type)`;
  - `index.ts` — export bersama.
- Loader membaca `content/works/*.md`, `content/contributors/*.md`, `content/visuals/*.json`, `content/revisions/*.json`.
- Belum migrate sebarang karya. Belum ubah `page.tsx`. Belum ubah UI.

Hasil: laluan data abstraksi wujud untuk semua karya.

### Step 2 — Migrasi Kerusi di Beranda (JLN-CER-0001)

- Cipta `content/works/kerusi-di-beranda.md` daripada `content/drafts/kerusi-di-beranda.md`:
  - pindahkan metadata penuh ke frontmatter (id, type, genre, status, publishedAt, updatedAt, version);
  - buang `## Nota editorial dalaman` dan `## Cadangan glosari` daripada body;
  - catat kredit penuh/gelar mengikut contributor key;
  - pastikan `body` mewakili prosa awam sahaja.
- Pindahkan realidad visual & provenance sedia ada ke `content/visuals/kerusi-di-beranda.json` (jika belum lengkap).
- Cipta `content/revisions/kerusi-di-beranda.json` dengan rekod EditorialRevision sedia ada (v0.1/v0.2).

Hasil: metadata Kerusi hidup dalam satu fail sumber.

### Step 3 — Tukar reader Kerusi kepada WorkLoader

- Tukar halaman `src/app/cerpen/kerusi-di-beranda/page.tsx` untuk mengambil data daripada WorkLoader, bukan hard-code.

Hasil: ujian pertama laluan sebenar yang akan digunakan semua karya.

### Step 4 — Migrasi Nombor Giliran 117 (JLN-CER-0002)

- Ulang proses Step 2 untuk `content/works/nombor-giliran-117.md`.
- Pastikan byline konsisten (kredit boleh memaut contributor key yang sama dengan Kerusi).
- Catat v1.0 → v1.1 dalam `content/revisions/nombor-giliran-117.json`.
- Tukar reader Nombor Giliran 117 kepada WorkLoader (seperti Step 3).

Hasil: kedua-dua cerpen sumber tunggal melalui satu loader.

### Step 5 — Buang hard-code lama

- Padam metadata/glossary/visual byline TS yang berlebihan daripada `page.tsx`.
- Padam/park file `content/drafts/*.md` selepas semua rujukan bertukar ke `content/works/`.
- Sahkan tiada bahan dalaman (nota editorial) dalam fail yang mungkin dirender oleh API/RSS pada masa depan.

Hasil: Content Layer tunggal sebagai asas untuk Novela, Waktu Sebenar, pagination dan kategori baharu.

---

## Skop luar (disengajakan untuk fasa ini)

- Migrasi aset visual ke object storage durable — dirancang berasingan (documentation dahulu, bukan code).
- CI/lockfile/batch deploy guard — dirancang dalam phase engineering hygiene selepas content stabil.
- Error/not-found page — dilengahkan.
- Database & auth account — kekal di luar skop MVP content ini.

## Acceptance criteria

1. Dua cerpen sedia ada dibaca melalui satu Work loader (bukan hard-code).
2. Frontmatter `content/works/*.md` menjadi sumber tunggal metadata.
3. Tiada nota editorial dalaman dalam fail content karya.
4. Byline konsisten antara Kerusi dan Nombor (contributor key).
5. Glosari dan visual dirujuk daripada content, bukan TS page.
6. `content/drafts/` tidak lagi menjadi sumber render selepas Step 4.
7. Tiada perubahan tampak pada pengalaman pembaca (regression zero).