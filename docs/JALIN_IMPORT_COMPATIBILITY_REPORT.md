# JALIN Import Compatibility Report

| | |
| --- | --- |
| **Versi** | v1.1 — disemak semula terhadap Admin UX v2 (PR #10/#11) + Parser v2 (PR #12) |
| **Tarikh** | 2026-09-29 (v1.0: 2026-09-28) |
| **Skop** | Ujian keserasian output JSON parser → medan `/admin/works/new` + tab edit karya — **tanpa sebarang perubahan kod/schema/UI** |
| **Berkaitan** | `docs/JALIN_MASTER_CONTENT_PARSER_PROMPT.md` (kini v2), `docs/JALIN_MASTER_PARSER_VALIDATION.md`, `docs/NOVELA_PROGRESSIVE_DISCLOSURE.md`, `docs/JALIN_MASTER_PARSER_V2_REAL_MANUSCRIPT_TEST.md` |

## Peraturan yang dipatuhi

Tiada import automatik. Tiada endpoint baharu. Tiada perubahan schema, admin UI atau migration. Ujian ini = audit baca-sahaja ke atas kod admin sedia ada dan dipadankan dengan output parser (Cerpen + Novela).

## Perubahan sejak v1.0 (29 Sep — kerja Claude semalam)

| Perubahan | Kesan pada laporan |
| --- | --- |
| **PR #11** — `/admin/works/new` disusun semula (4 seksyen; Audiens → select `13-17`; Minit Bacaan auto-anggar ÷200; Status dibuang dari ciptaan — sentiasa `draft`; Genre datalist; label baharu "Ringkasan pendek"/"Alamat pautan") | Jadual pemetaan dikemas kini (lihat di bawah) — **semua pemetaan jadi lebih tepat**, tiada medan hilang |
| **PR #10** — fix simpan Credits/Visual yang **senyap membuang medan** (mismatch camelCase) | Betulkan andaian v1.0: simpan Kredit dahulunya **sentiasa gagal** ("roleLabel diperlukan"); kini disahkan hidup pada cawangan Neon terpencil. Pemetaan `author → Credits` kini ✅ **disahkan berfungsi**, bukan sekadar teori |
| **PR #12** — Prompt Parser naik ke **v2**: `characters[]`, `locations[]`, `glossary[]` (novela sahaja) kini membawa `firstAppearanceSection` | Medan baharu **tiada destinasi admin** (disahkan sendiri oleh PR #12 dan `NOVELA_PROGRESSIVE_DISCLOSURE.md` — pelaksanaan reader belum dibuat). Kesan: lihat seksyen Fokus Novela |
| **`NOVELA_PROGRESSIVE_DISCLOSURE.md`** — keputusan DECIDED: backend *patut* menyimpan metadata penuh + `firstAppearanceSection`; paparan pembaca tapis ikut bab | Mengesahkan keperluan watak progresif sebagai kerja masa depan (admin + reader), bukan kegagalan parser |
| **Ujian manuskrip sebenar (PR #13)** — simulasi cipta hidup `201 Created` + ukur beban manual (15–25 nilai merentas 3 skrin) | Tidak diduplikasi di sini — dirujuk sebagai bukti luaran (lihat "Penilaian") |

---

## Jadual audit mapping — Cerpen (`Kerusi di Beranda`)

| Parser Output | Jalin Admin Field | Status | Lokasi / nota |
|---|---|---|---|
| `type` | **Jenis** (select: cerpen/novela/bersiri/fragmen/sinopsis; tanpa \*, ada lalai) | ✅ Sedia | `new/page.tsx:173`; API sahkan `validTypes` (`api/admin/works/route.ts:31`) |
| `title` | **Tajuk \*** | ✅ Sedia | `new/page.tsx:161` — nilai parser tepat |
| `slug` | **Alamat pautan \*** (auto-jana dari tajuk + pratonton URL, kekal boleh sunting; NFKD-safe) | ✅ Sedia | `new/page.tsx:287`; format `lowercase-dash` parser sepadan |
| `dek` | **Ringkasan pendek** (label baharu v2) | ✅ Sedia | `new/page.tsx:188` |
| `genre` | **Genre** (teks + datalist sedia: Keluarga, Drama Sosial, Sejarah, …) | ✅ Sedia | `new/page.tsx:242` |
| `audience` | **Audiens** (select tunggal `13-17`) | ✅ **Padan tepat** | `new/page.tsx:259-266` — v1.0 kata "manual nilai"; kini sistem kunci `13-17` dan parser menghasilkan `13-17` — **sepadan tepat, tiada kerja manual** |
| `readingMinutes` | **Minit Bacaan** (anggaran automatik, boleh laras, min 0) | ✅ **Formula identik** | `new/page.tsx:270`; `estimateReadingMinutes = Math.max(1, Math.round(wordCount / 200))` (`new/page.tsx:23-24`) — **sama persis** peraturan parser (÷200, bulat terdekat, min 1) |
| `author` | **Credits** → "Penyumbang"/"Nama Tetamu" + **Peranan \*** (+ Byline/Public) | ✅ Manual + **disahkan berfungsi** | Tab Credits (`[id]/page.tsx:1457-1490`); fix PR #10 menterjemah snake_case → camelCase pada write — ujian hidup: simpan kredit tetamu berjaya + gate Kredit lulus. Parser keluarkan "tidak dinyatakan" → editor tetapkan (AGENTS #23) — 100% manual |
| `glossary` | **Glosari** → **Term \*** / **Definisi \*** / Sumber (pilihan) | ✅ Manual per-baris + disahkan | Tab Glosari (`[id]/page.tsx:1823-1849`); API `glossary/route.ts:42` — `source` default `""`; ujian PR #10 sahkan glosari berfungsi sepanjang |
| `sections` | — | ➖ Tidak berkaitan | Cerpen: kosong, betul |
| `visualSuggestions` | **/admin/visual-requests/new** → **Prompt \*** (+ Role \*, Alt Text, Anchor) | ✅ Sedia (di luar karya) | Tiada medan rancangan pada karya; `scene` + `reason` → medan **Prompt**, Role/Aspect pilih editor (`visual-requests/new/page.tsx:90-187`). Nota: lampiran sahaja **tidak** memenuhi gate Visual — `is_asset_finalized` hanya melalui pipeline Magnific (AGENTS #15) |
| `source` | **Karya → Sumber** → Tajuk asal \* / Penulis asal \* / Bahasa asal \* / Asas teks | ✅ Sedia | Tab Source (`[id]/page.tsx:1958-2029`); `source.provenance` → "Asas teks (source_text_basis)" — sepadan sub-medan cadangan v2 |

**Status pembuatan**: borang cipta v2 **tidak lagi memaparkan medan Status** — karya baharu sentiasa `status: "draft"` (`new/page.tsx:126`); Semakan/Sedia ditetapkan kemudian di halaman sunting. Konsisten dengan kontrak parser: parser memang **tidak** pernah menghasilkan `status`.

### Medan output parser yang TIADA destinasi admin (bukan halangan import)

| Parser Output | Fakta sistem | Kesan |
|---|---|---|
| `characters` (+ `firstAppearanceSection` v2 untuk novela) | **Tiada tab/medan watak langsung** dalam admin (semakan semula: grep `src/app/admin` = 0); `works.metadata` jsonb hanya diisi melalui frontmatter aliran content (`db-seed.ts:67`) dan tidak diserialisasi balik oleh `serialize-work.ts:68-136` | ❌ **Tiada laluan admin** — lihat fokus novela |
| `locations` (+ `firstAppearanceSection` v2 untuk novela) | Grep seluruh `src/` = 0 penggunaan; `NOVELA_PROGRESSIVE_DISCLOSURE.md` menetapkan backend *patut* menyimpannya + penapisan reader (belum dilaksanakan) | ❌ Destinasi masa depan sahaja |
| `sections[].summary` | Borang bahagian hanya Slug / Tajuk / Body (`[id]/page.tsx:1312-1321`); `reading_sections` tiada lajur summary; reader tiada paparan summary | ❌ Summary = rujukan semakan editor sahaja |
| `themes` | Grep seluruh `src/` = 0 penggunaan | ❌ Rujukan editorial sahaja |
| `editorialNotes` | Sengaja bukan medan sistem (keputusan Director) | ➖ Memang untuk laporan manusia |

---

## Fokus khas: Novela (`Waktu Sebenar`)

### Sections

| Aspek | Status | Bukti |
|---|---|---|
| `slug` → medan Slug \* | ✅ Sedia | Tab Sections (`[id]/page.tsx:1312`) |
| `title` → "Tajuk bahagian" | ✅ Sedia | `[id]/page.tsx:1321` |
| `order` → `position` | ✅ Sedia (implisit) | API terima `position` pilihan; default = max+1 (`section-service.ts:108`) — cipta **berurutan 1..31**; laluan pusing-semula wujud (`sections/reorder`); gate penerbitan menuntut 1..N bersambung (`publication-readiness.ts:664-670`) |
| `summary` | ❌ Tiada medan | Tiada lajur/UI/reader — rujukan editor sahaja |
| Body setiap bahagian | ⚠️ Manual | Parser memang **tidak** menghasilkan body (kontrak: metadata sahaja); editor tampal teks per-bahagian (pernah dilakukan sekali: `scripts/import-waktu-sebenar.ts`) |
| `readingMinutes` per bahagian | ➖ Tidak perlu | API menyokong tetapi UI admin dan reader tidak guna |

✅ `publication-readiness` gate `novela_no_structure` dipenuhi oleh 31 sections mengikut import kanonik (ujian struktur PASS).

### Watak — audit progresif (v2: `firstAppearanceSection`)

Struktur parser **v2** (`type=novela` sahaja):

```json
{ "name": "", "role": "", "firstAppearanceSection": "bab-N" }
```

Fakta sistem (semak semula terhadap main baharu):

1. **Model data**: `CharacterMeta = { name, role }` sahaja (`content/types.ts:54-57`) — `firstAppearanceSection` **tiada** dalam type.
2. **Tiada medan progresif**: grep repo bagi `firstAppearance`/`displayFromSection` = **0 hasil** dalam `src/` (hanya muncul dalam dokumen keputusan dan prompt v2).
3. **Payload awam memangkas medan tambahan**: `public-rsc-payload.test.ts:133-145` membuktikan medan lebih pada `metadata.characters` **dibuang** sebelum sampai pembaca — menambah data tanpa ubah projection = sia-sia.
4. **Paparan sekarang**: semua watak tunjuk sejak awal — `RightRail` (`StoryChrome.tsx:128-136`) dan mobile tab "Watak" (`MobileStoryInfo.tsx:72`) tanpa tapisan bab.
5. **Tiada laluan admin**: tiada tab watak (disahkan semula; turut disahkan oleh PR #12: "No admin field exists yet for firstAppearanceSection").
6. **Keputusan DECIDED** (`NOVELA_PROGRESSIVE_DISCLOSURE.md`): backend patut simpan metadata penuh + `firstAppearanceSection` (rujuk `ReadingSection.slug`); paparan pembaca tapis `currentSection >= firstAppearanceSection`; pelaksanaan reader **belum dibuat** (kerja berasingan menunggu pengesahan pemilik).

**Kesimpulan watak**: ❌ **progressive disclosure TIDAK sedia** — keperluan v2 (`firstAppearanceSection`) mengukuhkan jurang yang sama: (a) medan data, (b) editor admin, (c) logik tapisan ikut bab pada reader, (d) semakan projection awam. = **NEEDS ADMIN CHANGE** (keputusan Director — bukan sekarang).

### Glosari novela — audit progresif (v2: `firstAppearanceSection`)

Fakta sistem:

1. Import baris demi baris ke tab Glosari (Term \* / Definisi \*) → `glossary_terms` — **READY** untuk `term`/`meaning`.
2. **Mekanisme paparan pembaca sudah progresif secara semula jadi**: glosari hanya dipasang sebagai tooltip pada **teks bab semasa yang mengandungi istilah itu** (`StoryMarkdown.tsx:38-55` `decorateGlossary` — padanan rentetan ke atas teks render). Tiada senarai glosari global (tab mobile: Karya/Watak/Editorial/Bab sahaja). Istilah Bab 20 tidak akan muncul di Bab 1 kerana rentetan itu tiada dalam teks Bab 1.
3. **Jurang v2**: `firstAppearanceSection` bagi istilah novela **tiada medan admin** — disimpan buat masa ini sebagai rujukan editor (keperluan simpanan penuh hanya relevan apabila penapisan reader dilaksanakan).

**Kesimpulan glosari**: ✅ **READY untuk import term/meaning** — progresif disclosure paparan tercapai oleh reka bentuk render sedia ada; medan `firstAppearanceSection` v2 = rujukan editor sehingga kerja admin/reader dijadualkan.

---

## Laporan ringkas (format Director)

```
JALIN IMPORT COMPATIBILITY REPORT (v1.1 — disemak terhadap Admin UX v2 + Parser v2)

Cerpen:
- medan lengkap: type, title, slug (Alamat pautan), dek (Ringkasan pendek), genre (datalist),
  audience (select 13-17 = PADAN TEPAT), readingMinutes (formula auto ÷200 IDENTIKAL parser),
  source (tab Sumber), glossary (tab Glosari, per-baris), visualSuggestions (→ visual-requests)
- medan tiada: characters, locations, themes, editorialNotes (rujukan editorial — tiada destinasi sistem)
- manual adjustment diperlukan: 1) Credits (Nama Tetamu + Peranan; disahkan berfungsi selepas fix #10)
  2) 4-9 baris Glosari  3) subsistem Visual (permintaan → Magnific → sah → lampir; bukan salin-tampal)
  Anggaran: 15-25 nilai merentas 3 skrin (disahkan ujian manuskrip sebenar PR #13)

Novela:
- sections: READY — slug/tajuk/position (cipta berurutan; gate 1..N dipenuhi);
  summary tiada medan sistem (rujukan editor); body per-bahagian = tampal manual
- characters: TIADA laluan admin; CharacterMeta = name+role; payload awam memangkas medan tambahan;
  v2 menambah firstAppearanceSection — keputusan NOVELA_PROGRESSIVE_DISCLOSURE.md menetapkan
  backend patut simpan + reader tapis, tetapi pelaksanaan belum dibuat
- glossary: READY (term/definisi); firstAppearanceSection v2 = rujukan editor buat masa ini
- progressive disclosure ready: glosari YA (padanan teks semula jadi);
  watak TIDAK (NEEDS ADMIN CHANGE: data + editor admin + tapisan bab + projection)

Kesimpulan: NEEDS ADMIN CHANGE (watak + medan firstAppearanceSection v2) — 11/12 baris sedia
untuk copy-paste manual; tiada perubahan prompt diperlukan; tiada sebab bina import automatik
sekarang (setuju dengan PR #13: automasi hanya bernilai penuh selepas destinasi
characters/locations wujud).
```

---

## Penilaian

1. **11 daripada 12 baris** jadual Director dipetakan ke medan sedia ada (v1.0: 9 terus + 2 laluan luar karya); penambahbaikan v1.1 datang daripada Admin UX v2: Audiens kini select `13-17` (padan tepat), Minit Bacaan berkongsi formula **identik** dengan parser, dan fix #10 mengesahkan simpan Kredit benar-benar berfungsi (v1.0 menyemak teori sahaja — sehingga #10, simpan kredit *sentiasa* gagal).
2. **Satu baris kekal tanpa destinasi**: `characters` (+ `locations`) — kini diiktiraf secara rasmi oleh `NOVELA_PROGRESSIVE_DISCLOSURE.md` sebagai keperluan masa depan, bukan kecacatan parser.
3. **Cadangan v2 Jadual Import** disahkan sepadan label sebenar tab Sumber.
4. Medan tanpa destinasi (`summary`, `locations`, `themes`, `editorialNotes`) kekal nilai **untuk semakan manusia** — jangan paksa sistem menampungnya.
5. Pengesahan luaran: `JALIN_MASTER_PARSER_V2_REAL_MANUSCRIPT_TEST.md` (PR #13) mensimulasikan aliran ini secara hidup (`201 Created`) dan membuat kesimpulan selari — automasi berbaloi **tetapi hanya selepas** destinasi `characters`/`locations` wujud.

## Fasa seterusnya (cadangan, menunggu arahan)

1. **Bukan** bina import automatik sekarang (setuju dengan penilaian Director dan PR #13).
2. Uji copy-paste manual sebenar pada satu karya ujian — sebahagian besar sudah dilakukan oleh PR #13 (2 cerpen, ciptaan hidup).
3. Putuskan hala tuju `characters`/`locations`: (a) bina tab watak admin + `firstAppearanceSection` + tapisan reader (NEEDS ADMIN CHANGE — ikut `NOVELA_PROGRESSIVE_DISCLOSURE.md`), atau (b) kekalkan aliran frontmatter content buat masa ini.
4. Import automatik / butang JSON → selepas pilihan (3) selesai dan ujian novela sebenar baharu (PR #13 "Gap: novela") dilengkapkan.
