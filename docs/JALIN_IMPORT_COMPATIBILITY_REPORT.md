# JALIN Import Compatibility Report

| | |
| --- | --- |
| **Versi** | v1.0 |
| **Tarikh** | 2026-09-28 |
| **Skop** | Ujian keserasian output parser v1 → medan `/admin/works/new` + tab edit karya — **tanpa sebarang perubahan kod/schema/UI** |
| **Berkaitan** | `docs/JALIN_MASTER_CONTENT_PARSER_PROMPT.md`, `docs/JALIN_MASTER_PARSER_VALIDATION.md` |

## Peraturan yang dipatuhi

Tiada import automatik. Tiada endpoint baharu. Tiada perubahan schema, admin UI atau migration. Ujian ini = audit baca-sahaja ke atas kod admin sedia ada (`src/app/admin/works/new/page.tsx`, `src/app/admin/works/[id]/page.tsx`, API terkait) dan dipadankan dengan output JSON ujian laporan validasi (Cerpen + Novela).

---

## Jadual audit mapping — Cerpen (`Kerusi di Beranda`)

| Parser Output | Jalin Admin Field | Status | Lokasi / nota |
|---|---|---|---|
| `type` | **Jenis \*** (select: cerpen/novela/bersiri/fragmen/sinopsis) | ✅ Sedia | `new/page.tsx:117`; API sahkan `validTypes` (`api/admin/works/route.ts:31`) |
| `title` | **Tajuk \*** | ✅ Sedia | `new/page.tsx:91` — nilai parser tepat |
| `slug` | **Slug \*** | ✅ Sedia | `new/page.tsx:103` — format `lowercase-dash` parser sepadan validasi sistem |
| `dek` | **Dek** | ✅ Sedia | `new/page.tsx:189` — textarea bebas; editor boleh poles |
| `genre` | **Genre** (teks) | ✅ Sedia | `new/page.tsx:156` |
| `audience` | **Audiens** (teks) | ✅ Sedia (manual nilai) | `new/page.tsx:166` — contoh sistem "Remaja 13-17"; parser "13-17" — editor taip mengikut gaya |
| `readingMinutes` | **Minit Bacaan** (nombor) | ✅ Sedia | `new/page.tsx:177` |
| `author` | **Credits** → "Nama Tetamu" + **Peranan \*** (+ Byline/Public) | ✅ Manual | Tiada medan kredit pada borang cipta; dibuat di tab Credits (`[id]/page.tsx:1440-1499`) — 1 kerja manual. Parser keluarkan "tidak dinyatakan" → editor tetapkan (AGENTS #23) |
| `glossary` | **Glosari** → **Term \*** / **Definisi \*** / Sumber | ✅ Manual per-baris | Tab Glosari (`[id]/page.tsx:1806-1832`); API `glossary/route.ts:42` — `source` default `""` (medan sumber glosari = pilihan) — 9 baris untuk cerpen ini |
| `sections` | — | ➖ Tidak berkaitan | Cerpen: kosong, betul |
| `visualSuggestions` | **/admin/visual-requests/new** → **Prompt \*** (+ Role \*, Alt Text, Anchor) | ✅ Manual (sedia) | Tiada medan rancangan pada karya; laluan sedia ada = visual request: `scene` + `reason` ditampal ke medan **Prompt**, Role/Aspect pilih editor (`visual-requests/new/page.tsx:90-187`) |
| `source` | **Karya → Sumber** → Tajuk asal \* / Penulis asal \* / Bahasa asal \* / Asas teks | ✅ Sedia | Tab Source (`[id]/page.tsx:1941-2012`); `source.provenance` → "Asas teks (source_text_basis)" — sepadan sub-medan seperti dicadangkan v2 |

### Medan output parser yang TIADA destinasi admin (bukan halangan import)

| Parser Output | Fakta sistem | Kesan |
|---|---|---|
| `characters` | **Tiada tab/medan watak langsung** dalam admin (grep `src/app/admin` = 0); `works.metadata` jsonb hanya diisi melalui frontmatter `metadata.characters` dalam aliran content (`db-seed.ts:67`, migrasi 018) dan tidak diserialisasi balik oleh `serialize-work.ts` | ❌ **Tiada laluan admin** — lihat fokus novela di bawah |
| `sections[].summary` | Borang bahagian hanya Slug / Tajuk / Body (`[id]/page.tsx:1295-1314`); `reading_sections` tiada lajur summary; reader tiada paparan summary | ❌ Summary = rujukan semakan editor sahaja (kekal dalam laporan Editorial, bukan import) |
| `locations`, `themes` | Grep seluruh `src/` = 0 penggunaan | ❌ Rujukan editorial sahaja |
| `editorialNotes` | Sengaja bukan medan sistem (keputusan Director) | ➖ Memang untuk laporan manusia |

---

## Fokus khas: Novela (`Waktu Sebenar`)

### Sections

| Aspek | Status | Bukti |
|---|---|---|
| `slug` → medan Slug \* | ✅ Sedia | Tab Sections (`[id]/page.tsx:1295`) |
| `title` → "Tajuk bahagian" | ✅ Sedia | `[id]/page.tsx:1304` |
| `order` → `position` | ✅ Sedia (implisit) | API terima `position` pilihan; default = max+1 (`section-service.ts:108`) — cipta **berurutan 1..31** dan sistem kekalkan turutan; laluan pusing-semula wujud (`sections/reorder`); gate penerbitan menuntut 1..N bersambung (`publication-readiness.ts:664-670`) |
| `summary` | ❌ Tiada medan | Tiada lajur/UI/reader — rujukan editor sahaja |
| Body setiap bahagian | ⚠️ Manual | Parser memang **tidak** menghasilkan body (kontrak: metadata sahaja); editor tampal teks manuskrip per-bahagian (pernah dilakukan sekali: `scripts/import-waktu-sebenar.ts`) |
| `readingMinutes` per bahagian | ➖ Tidak perlu | API menyokong tetapi UI admin dan reader tidak guna (dokumen validasi §audit) |

✅ `publication-readiness` gate `novela_no_structure` dipenuhi oleh 31 sections mengikut import kanonik (ujian struktur PASS).

### Watak — audit progresif

Struktur output yang dicadangkan:

```json
{ "name": "", "role": "", "firstAppearance": "", "displayFromSection": "" }
```

Fakta sistem (semua disemak, tiada andaian):

1. **Model data**: `CharacterMeta = { name, role }` sahaja (`content/types.ts:54-57`) — `description` sendiri sudah tiada destinasi baca.
2. **Tiada medan progresif**: grep seluruh repo bagi `firstAppearance` / `displayFromSection` / apa-apa varian = **0 hasil**.
3. **Payload awam memangkas medan tambahan**: ujian `public-rsc-payload.test.ts:133-145` membuktikan medan lebih pada `metadata.characters` (cth `internalSecret`) **dibuang** sebelum sampai ke pembaca — menambah field tanpa ubah projection = sia-sia.
4. **Paparan sekarang**: semua watak tunjuk sejak awal — desktop `RightRail` (`StoryChrome.tsx:128-136`) dan mobile tab "Watak" (`MobileStoryInfo.tsx:72`) senaraikan **kesemua** watak tanpa tapisan bab.
5. **Tiada laluan admin**: tiada tab watak untuk disunting (`src/app/admin` grep = 0).

**Kesimpulan watak**: ❌ **progressive disclosure TIDAK sedia**. Keperluan `firstAppearance`/`displayFromSection` memerlukan: (a) medan data (metadata watak), (b) editor admin, (c) logik tapisan ikut bab pada reader, (d) semakan projection awam. Ini = **NEEDS ADMIN CHANGE** (keputusan Director — bukan sekarang).

### Glosari novela — audit progresif

Struktur yang dicadangkan:

```json
{ "term": "", "meaning": "", "firstAppearance": "", "displayFromSection": "" }
```

Fakta sistem:

1. Glosari dibaca dari tab Glosari (Term \* / Definisi \*) → `glossary_terms` (`term`, `meaning`, `source`, `sort_order`) — import baris demi baris = sedia.
2. **Mekanisme paparan pembaca sudah progresif secara semula jadi**: glosari hanya dipasang sebagai tooltip pada **teks yang mengandungi istilah itu dalam bab semasa** (`StoryMarkdown.tsx:38-55` `decorateGlossary` — padanan rentetan ke atas teks render). Tiada senarai glosari global pada mana-mana tab (tab mobile: Karya/Watak/Editorial/Bab sahaja).
3. Maka: **istilah yang muncul di Bab 20 TIDAK akan muncul di Bab 1** — kerana rentetan itu tiada dalam teks Bab 1. Medan `firstAppearance`/`displayFromSection` **tidak diperlukan**.

**Kesimpulan glosari**: ✅ **READY tanpa medan baharu** — progresif disclosure tercapai oleh reka bentuk render sedia ada.

---

## Laporan ringkas (format Director)

```
JALIN IMPORT COMPATIBILITY REPORT

Cerpen:
- medan lengkap: type, title, slug, dek, genre, audience, readingMinutes, source (tab Sumber),
  glossary (tab Glosari, per-baris), visualSuggestions (→ /admin/visual-requests/new, Prompt)
- medan tiada: characters (tiada tab/medan admin), locations, themes, editorialNotes
  (rujukan editorial sahaja — tiada destinasi sistem)
- manual adjustment diperlukan: 1) Credits (Nama Tetamu + Peranan)  2) 9 baris Glosari
  3) 4 visual request (prompt = scene + reason; role/aspect pilihan editor)
  4) nilai Audiens mengikut gaya sistem  5) tampal manuskrip ke medan body

Novela:
- sections: READY — slug/tajuk/position (cipta berurutan, default max+1, gate 1..N dipenuhi);
  summary tiada medan sistem (rujukan editor sahaja); body per-bahagian = tampal manual
- characters: TIADA laluan admin; CharacterMeta = name+role; payload awam memangkas medan
  tambahan; paparan sekarang = semua watak dari awal
- glossary: READY — 3 baris (term/definisi); medan sumber = pilihan (default kosong)
- progressive disclosure ready: TIDAK untuk watak (NEEDS ADMIN CHANGE);
  YA untuk glosari (padanan teks semula jadi — istilah bab lewat tidak muncul bab awal)

Kesimpulan: NEEDS ADMIN CHANGE (watak: medan admin + tapisan bab + progresif disclosure)
— selebihnya READY untuk import copy-paste manual; tiada perubahan prompt diperlukan,
tiada sebab untuk bina import automatik pada fasa ini.
```

---

## Penilaian

1. **9 daripada 12 baris** dalam jadual Director dipetakan terus ke medan sedia ada; 2 baris ada laluan sedia ada di luar borang karya (`visualSuggestions` → visual request; `source` → tab Sumber); **1 baris (`characters`) tiada destinasi**.
2. **Cadangan v2 Jadual Import** (sub-medan `source` → Tajuk asal/Bahasa asal/Asas teks) disahkan sepadan dengan label sebenar tab Sumber.
3. Medan tanpa destinasi (`summary`, `locations`, `themes`) bukan kegagalan — ia nilai **untuk semakan manusia**, bukan import: kekal dalam JSON sebagai bahan Editorial Report, jangan paksa sistem menampungnya.
4. **Pembetulan manual sebenar adalah kecil** (metadata teras = 8 medan borang; glosari/sections/visual = entri baris) — tetapi jurang `characters` + progresif disclosure watak perlu keputusan Director sebelum sebarang import besar-besaran dinilai semula.

## Fasa seterusnya (cadangan, menunggu arahan)

1. **Bukan** bina import automatik (setuju dengan penilaian Director: import awal hanya mempercepatkan ralat masuk DB).
2. Uji copy-paste manual sebenar pada satu karya ujian di `/admin/works/new` + tab edit — sahkan aliran penuh (metadata → credits → glosari → sections → visual request).
3. Putuskan hala tuju `characters`: (a) tambah tab watak admin + medan progresif (NEEDS ADMIN CHANGE), atau (b) kekalkan aliran frontmatter content buat masa ini.
4. Import automatik / butang JSON → hanya selepas pilihan (2) dan (3) selesai.
