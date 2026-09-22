# Generic Work Reader Migration Plan v1

> **⚠️ STALE**: Dokumen ini telah digantikan oleh `ADMIN_CONSOLE_PLAN.md`. Rujukan untuk backend migration, rujuk `ADMIN_CONSOLE_PLAN.md` Fasa A. Dokumen ini dikekalkan untuk rujukan sejarah sahaja.

Status: TEMPLATE extend — dokumen perancangan FASA 2C (dokumentasi sahaja, tiada kod)
Tarikh: 22 September 2026
Milestone: FASA 2C-1 — Audit dan pelan migrasi route `/cerpen/[slug]`

Dokumen ini merancang penghapusan halaman cerpen hard-code dan penggantian dengan satu reader generik `/cerpen/[slug]`. Selepas langkah ini siap, menambah cerpen baharu bukan lagi kerja coding — hanya menambah Work (`content/works/*.md`).

Prasyarat: FASA 2B selesai. Kerusi dan Nombor sudah menggunakan `getWorkBySlug` dan metadata datang daripada Work.

---

## 1. Current routes

### `/cerpen/kerusi-di-beranda` — `src/app/cerpen/kerusi-di-beranda/page.tsx`
- Panggil `getWorkBySlug("kerusi-di-beranda")`.
- Bina `glossary` dari `work.glossary`, `byline` dari `work.credits` + `content/contributors/*.md` (dengan `href: /penulis/<slug>`).
- `workMeta` rail: Bentuk Cerpen, Genre (dari Work), Bacaan ±, Status "Karya asli Jalin", ID, Versi.
- `characters` dari `work.metadata.characters`.
- `editorial` rail dari `work.credits` (label role: initial_draft → "Penulis", story_editor → "Penulis & penyemak", final_editor → "Editor").
- **Pembahagian body untuk inline visual** (hard-code dalam page):
  - `rubberAnchor` = "Di hadapan mereka, jalan tanah merah membelah kampung kepada dua. ..." → split selepas perenggan getah, letak visual `inline-rubber-estate`.
  - `notebookAnchor` = "Menjelang senja, Pak Long meminta pen." → split, letak visual `inline-notebook`.
  - Guna `publicStory.split(anchor)`; anchor kekal dalam segmen.
- `rights` = "KERUSI DI BERANDA · © ADJUNG 2026 · ILUSTRASI JALIN" (literal).
- `mobileInfo.note` = "Panel Bacaan AI belum dipaparkan sehingga format penilaiannya dimuktamadkan." (literal).
- H1/Hero/StoryEnd/Footer generik.

### `/cerpen/nombor-giliran-117` — `src/app/cerpen/nombor-giliran-117/page.tsx`
- Sama dengan Kerusi, kecuali:
  - `getWorkBySlug("nombor-giliran-117")`.
  - Anchor: `kitchenAnchor` = "Begitulah hampir setiap pagi." (visual `inline-nasi-lemak`), `hearingAnchor` = "Alat bantu dengar itu kekal di atas meja hingga Maghrib." (visual `inline-hearing-aids`).
  - Guna helper tempatan `splitAfter(text, anchor)` (mengembalikan `[before, after]`).
  - `rights` = "NOMBOR GILIRAN 117 · © ADJUNG 2026 · ILUSTRASI JALIN" (literal).
  - `mobileInfo.note` = "Penulis Maya bekerja di bawah kawal selia editorial manusia." (literal).

### Duplikasi diperhatikan
- Kerangka JSX hampir identik; beza: slug, anchor/visual roles, rights string, kicker (sama "Cerpen · Keluarga"), nota mobileInfo, helper split.
- `getContributorMeta` diduplikasi dalam kedua-dua page.
- Anchor untuk inline visual **tidak disimpan dalam Work** — berada hard-code dalam page. Ini `perlu dipindah ke data Work` untuk reader generik.

---

## 2. Target route

```
src/app/cerpen/[slug]/page.tsx
```

Reader generik:
- terima `params.slug`;
- panggil `getWorkBySlug(slug)`;
- render mana-mana Work `type: cerpen` dengan layout yang sama.

### Menjaga static generation (kritikal)
Halaman sedia ada diprerender sebagai static (`○ (Static)`). Route dinamik tanpa senarai akan menjadi server-rendered (`ƒ`). Untuk kekal static:

```ts
export const dynamicParams = false;
export function generateStaticParams() {
  return getAllWorks({ type: "cerpen" }).map((work) => ({ slug: work.slug }));
}
```

- `dynamicParams = false` bermakna slug yang tiada dalam Work → 404 (kiraan, tidak merosakkan halaman live).
- Semua slug cerpen sedia ada kekal dalam senarai → output static sama seperti sekarang.

### Penunjuk kategori lain
Fasa ini MENGENAL `type` dari Work; jika `type !== "cerpen"`, boleh panggil 404 atau render mengikut sharpening kategori kemudian. Untuk fasa ini hanya cerpen diaktifkan.

---

## 3. Shared rendering (apa yang kekal)

Komponen dan tingkah laku sedia ada yang reader generik mesti gunakan tanpa perubahan:

| Komponen / tingkah laku | Sumber |
|---|---|
| `SiteHeader`, `SiteFooter` | `components/reader/StoryChrome` |
| `StoryHead` (kicker, title, dek, byline) | `components/reader/StoryChrome` |
| `StoryEnd` | `components/reader/StoryChrome` |
| `EditorialImage` (hero + inline) | `components/reader/StoryChrome` |
| `LeftRail` (workMeta) | `components/reader/StoryChrome` |
| `RightRail` (characters + editorial) | `components/reader/StoryChrome` |
| `StoryMarkdown` + glossary tooltip | `components/reader/StoryMarkdown` |
| `MobileStoryInfo` | `components/reader/MobileStoryInfo` |
| "Bentuk Cerpen · Genre" kicker | dinaikkan dari Work (`type` + `genre`) |
| Scene divider `***` | daripada markdown body (react-markdown meninggalkan `***`) |
| Anchor visual (lihat §4) | dipindah ke Work frontmatter |
| Credits rail | daripada `work.credits` + `content/contributors/*.md` |
| Contributor links | `href: /penulis/<slug>` (sudah dibetulkan di FASA 2B-5) |

Mesej kualiti: **tiada perubahan tipografi, layout, warna atau struktur halaman** (ikut `CONTENT_LAYER_IMPLEMENTATION_RULES.md` §3).

---

## 4. Data-driven behaviour

Semua maklumat yang reader perlukan mesti datang daripada Work. Bancian `page.tsx` sekarang:

| Maklumat | Kini (hard-code?) | Sumber Work selepas migrasi |
|---|---|---|
| `title` | dari Work | `work.title` |
| `dek` | dari Work | `work.dek` |
| `kicker` | literal "Cerpen · Keluarga" | derive: `typeToLabel(work.type) + " · " + (work.genre ?? "Keluarga")` |
| `byline` | dari Work + contributors | `work.credits` (+ `content/contributors/*.md`) |
| `workMeta` rows | dari Work | `work.type`, `work.genre`, `work.readingMinutes`, `work.id`, `work.version` |
| `characters` | dari Work | `work.metadata.characters` |
| `editorial` rail | dari Work | `work.credits` (label role) |
| `mobileInfo` | dari Work + literal note | `work.genre` dsb + `note` (lihat §5) |
| `visuals` | dari Work | `work.visuals` (cari ikut `role`) |
| **posisi inline visual (anchor)** | **hard-code dalam page** | **pindah ke `work.visuals[i].anchor` (frontmatter) — lihat §5** |
| `rights` | literal per-work | derive: `work.title.toUpperCase() + " · © ADJUNG " + year + " · ILUSTRASI JALIN"` atau field `work.rights` |
| `characters` | dari Work | `work.metadata.characters` |

### Tidak dibenarkan
Reader generik TIDAK boleh:
- memilih visual/gloss/byline berdasarkan nama fail atau conditional per-slug;
- menyimpan arrays anchor dalam file TS.

---

## 5. Perubahan kecil pada Work yang diperlukan

Reader generik memerlukan dua maklumat yang belum ada dalam `content/works/*.md`:

### (a) Anchor bagi setiap inline visual
Tambah `anchor` pada setiap visual `role: inline-*` dalam frontmatter Work:

```yaml
visuals:
  - role: inline-rubber-estate
    src: "..."
    alt: "..."
    provider: Magnific
    creationId: LwZMwrgswO
    anchor: "Di hadapan mereka, jalan tanah merah membelah kampung kepada dua. ..."
```

- Teks cerita TIDAK diubah — ini metadata sahaja, selaras "mask metadata daripada Work".
- `hero` tidak perlu anchor (diletak di atas, sebelum body).

### (b) Nota mobileInfo yang berbeza
Kerusi dan Nombor memaparkan nota berbeza. Untuk generik, kekalkan nota per-Work dalam frontmatter (field `infoNote` atau `readerNote`), dengan default = teks sedia ada. Ini mengelakkan pembahagian per-slug dalam kod.

cadangkan:
```yaml
reader:
  note: "Penulis Maya bekerja di bawah kawal selia editorial manusia."
```

Jika dua nota itu sahaja yang wujud, boleh juga derive: jika ada contributor virtual → nota "Penulis Maya ...", jika tiada → nota Kerusi. **Keputusan semasa (cadangan awal): simpankan nota dalam frontmatter** supaya jelas dan tidak heuristic. Perbincangan lanjut semasa FASA 2C-2.

> Nota keputusan bersyarat: jika editor manusia lebih suka not visual sama untuk semua cerpen, kita boleh betulkan kepada satu nota generik. Keputusan dibawa ke semakan ChatGPT/editor sebelum coding.

### Menambah field `anchor` dan `reader.note` ke kedua-dua Work
Memerlukan edit kecil pada `content/works/kerusi-di-beranda.md` dan `content/works/nombor-giliran-117.md` (frontmatter sahaja). Ini dibenarkan kerana ia metadata, bukan teks cerita.

---

## 6. Migration steps

### Step 1 — Bina `[slug]` route
- Buat `src/app/cerpen/[slug]/page.tsx` dengan `generateStaticParams` + `dynamicParams = false`.
- Extract `getContributorMeta` ke shared (cth `src/lib/content/contributors.ts`).
- Usahakan structur hasil gabungan dua page; bezanya hanya “data” daripada Work.
- Tambah `anchor` ke `VisualRef` type + `reader.note` ke `Work` type.

### Step 2 — Uji Kerusi
`/cerpen/kerusi-di-beranda` melalui route baharu: H1, body, glossary (10 istilah), hero + 2 inline (getah, nota), credits, contributor links, mobile. Banding dengan live.

### Step 3 — Uji Nombor
`/cerpen/nombor-giliran-117` melalui route baharu: H1, body, glossary (9 istilah), hero + 2 inline (nasi lemak, alat bantu dengar), credits, contributor links, mobile. Banding dengan live.

### Step 4 — Buang halaman lama
Selepas kedua-dua route baharu lulus dan output di-sahkan sama:
- Buang `src/app/cerpen/kerusi-di-beranda/` dan `src/app/cerpen/nombor-giliran-117/`.
- Pastikan 404 untuk slug janggal; pastikan build static (`○` untuk dua slug).
- Commit terpisah supaya rollback mudah.

### Step 5 — Tambah kategori lain kemudian
`type` lain (novela, terjemahan, fragmen, sinopsis, bersiri) boleh dibuka pada fasa akan datang melalui `generateStaticParams` mengikut type; bukan dalam skop 2C.

---

## 7. Jangan buat dalam FASA 2C

- ❌ JANGAN ubah teks cerita (Ani/Rohani, dialog, struktur prosa);
- ❌ JANGAN migrasi Novela;
- ❌ JANGAN papar masa nyata / "Waktu Sebenar";
- ❌ JANGAN tambah pagination;
- ❌ JANGAN tambah auth/account;
- ❌ JANGAN tambah database/CMS;
- ❌ JANGAN redesign UI;
- ❌ JANGAN buang `content/drafts/` (selepas fasa ini baru fikir).

---

## 8. Risiko & keputusan terbuka

| Risiko / isu | Keputusan |
|---|---|
| Anchor hard-code pindah ke frontmatter → `VisualRef.anchor` baharu | Metadata sahaja, teks tidak berubah; jenis `work.visuals` diperluas |
| Nota mobileInfo berbeza per-work | Simpan `reader.note` dalam frontmatter (cadangan §5b) |
| Route baharu menjadi `ƒ` (dynamic) | `generateStaticParams` + `dynamicParams = false` |
| Slug yang tiada dalam getAllWorks | 404 (dynamicParams=false), tidak merosakkan live |
| Imej CDN tamat Okt 2026 | Tangguh ke fasa asset durability (bukan skop 2C) |
| Kicker derive vs literal | derive `type + genre`; pantau jika genre tidak set (fallback "Keluarga") |

---

## 9. Ketika selesai

Selepas FASA 2C, aliran menjadi:

```
content/works/N-[slug].md
        ↓
WorkLoader
        ↓
/cerpen/[slug]  (generic reader)
```

Menambah cerpen baharu = tambah `.md`, bukan kod. Itulah titik platform.