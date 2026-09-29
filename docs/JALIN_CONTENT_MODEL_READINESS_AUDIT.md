# Content Model Readiness Audit — Parser Output vs Admin Storage

| | |
| --- | --- |
| **Status** | Audit only. No code, schema or UI changed in this pass, per instruction. |
| **Tarikh** | 2026-09-29 |
| **Skop** | Untuk setiap medan yang dihasilkan Master Content Parser v2: adakah Jalin (DB schema + admin write path + reader) sudah ada destinasi, atau belum. |
| **Berkaitan** | `docs/JALIN_MASTER_CONTENT_PARSER_PROMPT.md` (v2), `docs/JALIN_MASTER_PARSER_V2_REAL_MANUSCRIPT_TEST.md`, `docs/NOVELA_PROGRESSIVE_DISCLOSURE.md` |

## Kaedah

Disemak terus terhadap kod sebenar (bukan dokumentasi lama, yang boleh
ketinggalan zaman):

- Skema: `src/lib/db/migrations/*.ts` (sumber kebenaran skema, per
  `AGENTS.md`/ujian `migration-inventory`).
- Laluan tulis admin: `src/lib/admin/*-service.ts` dan
  `src/app/api/admin/**/route.ts`.
- Model kandungan pembaca: `src/lib/content/types.ts` (`Work`,
  `CharacterMeta`, `GlossaryEntry`, dll).

## Ringkasan (jawapan pantas)

| Medan parser | Skema DB wujud? | Laluan tulis admin wujud? | Reader guna? | Status |
| --- | --- | --- | --- | --- |
| `title`, `dek`, `genre`, `audience`, `readingMinutes`, `slug` | ✅ `works` (001) | ✅ `/admin/works/new` + edit | ✅ | **Siap sepenuhnya** |
| `author` → credits | ✅ `credits` (001) | ✅ tab Kredit (dibaiki PR #10) | ✅ | **Siap sepenuhnya** |
| `glossary` (`term`, `meaning`) | ✅ `glossary_terms` (001) | ✅ tab Glosari | ✅ | **Siap sepenuhnya** |
| `visualSuggestions` → visuals | ✅ `visuals` (001, 008 `is_asset_finalized`) | ✅ tab Visual (manual attach) + `/admin/visual-requests` (Magnific) | ✅ | **Siap**, tapi *brief* parser (scene/reason) ≠ `src` sedia guna — subsistem penuh, bukan salin medan |
| `sourceWork` (fragmen/sinopsis) | ✅ `source_works`/rujukan (011) | ✅ Karya → Sumber | ✅ | **Siap sepenuhnya** |
| `sections`/`episodes` (novela/bersiri) | ✅ `sections`, siri (012) | ✅ tab Bahagian Novela, `/admin/series` | ✅ | **Siap sepenuhnya** |
| **`characters`** (`name`, `role`) | ⚠️ **Separuh** — `works.metadata` jsonb wujud (018) tapi cuma untuk `characters`, TIADA validasi bentuk | ❌ **TIADA laluan tulis admin langsung** | ✅ dibaca (`RightRail`, `MobileStoryInfo`) *jika* wujud dalam DB | **Gap: laluan tulis** |
| **`locations`** | ❌ Tiada lajur/medan langsung — hanya boleh disorok dlm `works.metadata` jsonb bebas bentuk jika seseorang tulis SQL terus | ❌ Tiada | ❌ Tiada di `Work` type langsung | **Gap: skema + tulis + baca** |
| **`themes`** | ❌ Sama seperti locations | ❌ Tiada | ❌ Tiada | **Gap: skema + tulis + baca** |
| **`firstAppearanceSection`** (pada characters/locations/glossary, novela) | ❌ Tiada lajur di mana-mana jadual (`credits`, `glossary_terms`, atau `works.metadata`) | ❌ Tiada | ❌ Reader tidak menapis mengikutnya — direkodkan sebagai keputusan editorial belum dilaksanakan (`NOVELA_PROGRESSIVE_DISCLOSURE.md`) | **Gap: skema + tulis + baca** |

## Butiran per medan

### `characters` — separuh siap, bukan kosong

- **Skema**: `works.metadata` (jsonb, nullable) sudah wujud sejak
  migration `018_work_metadata_reader.ts`. Ia dibaca terus oleh
  `database-repository.ts:73`
  (`parseJsonbField<{ characters?: CharacterMeta[] }>(row.metadata)`)
  dan digunakan pembaca (`RightRail`, `MobileStoryInfo`) — **jika**
  medan itu wujud dalam baris DB.
- **Bentuk semasa**: `CharacterMeta = { name: string; role: string }`
  sahaja (`src/lib/content/types.ts:54`). Tiada `description`, tiada
  `firstAppearanceSection`.
- **Laluan tulis admin**: `grep` terhadap `src/lib/admin/work-service.ts`
  dan semua route `/api/admin/works/**` tidak menjumpai SATU rujukan
  pun kepada `metadata` atau `reader`. Medan ini hanya boleh diisi
  hari ini melalui SQL terus atau skrip seed (`db-seed.ts` validasi
  sahaja, tidak sebenarnya insert) — **bukan** melalui mana-mana
  borang admin.
- **Kesimpulan**: skema TIDAK perlu diubah untuk `characters` asas
  (`name`/`role`). Yang tiada ialah **UI + endpoint PATCH** untuk
  admin tulis ke `works.metadata`. Ini kerja kod sederhana (satu tab
  baharu + satu endpoint), bukan migration.

### `locations` dan `themes` — kosong sepenuhnya

- Tiada dalam `Work` type, tiada dalam mana-mana jadual, tiada
  disebut dalam mana-mana fail admin. Parser v1/v2 boleh
  menghasilkannya (`docs/JALIN_MASTER_CONTENT_PARSER_PROMPT.md`
  medan `locations`, `themes`), tetapi output itu hari ini **hanya
  boleh disimpan sebagai nota editorial di luar sistem** (spreadsheet,
  Editor Report) — disahkan semasa
  `docs/JALIN_MASTER_PARSER_V2_REAL_MANUSCRIPT_TEST.md`.
- `themes` khususnya memerlukan keputusan reka bentuk dahulu (bukan
  sekadar "tambah lajur"): director sendiri sudah nyatakan tema
  berpotensi spoiler mesti kekal **editorial-only**, tidak pernah ke
  paparan awam. Ini bermakna `themes` — jika disimpan — perlu
  ditanda jelas sebagai medan dalaman (cth. lajur berasingan daripada
  `characters`/`locations`, tiada laluan ke reader langsung), bukan
  sekadar disambung terus ke `RightRail` seperti `characters`.

### `firstAppearanceSection` — belum wujud langsung

- Tiada dalam `CharacterMeta`, `GlossaryEntry`, atau mana-mana jadual
  DB (`credits`, `glossary_terms`).
- Keputusan editorial (progressive disclosure) sudah direkodkan
  (`docs/NOVELA_PROGRESSIVE_DISCLOSURE.md`), dan bentuk medan sudah
  disahkan berfungsi secara empirik terhadap manuskrip sebenar
  (`docs/JALIN_MASTER_PARSER_V2_VALIDATION.md`) — tetapi ini baru
  **keputusan produk + bukti konsep**, belum **pelaksanaan**.
- Pelaksanaan sebenar memerlukan tiga bahagian berasingan, semuanya
  belum dibina:
  1. Lajur/medan storan (`firstAppearanceSection` pada setiap entri
     watak/lokasi/istilah).
  2. UI admin untuk isi/sunting medan itu.
  3. Logik penapisan reader (`RightRail`, `MobileStoryInfo`,
     `buildVerifiedGlossary`) yang membandingkan
     `firstAppearanceSection` dengan bahagian semasa pembaca — ini
     **hanya relevan untuk novela**; cerpen/fragmen/sinopsis tidak
     memerlukannya.

## Kesimpulan untuk keputusan seterusnya

Susunan kerja mengikut kos/faedah, bukan susunan sebutan dalam parser:

1. **`characters` (asas, tanpa `firstAppearanceSection`)** — kos
   paling rendah (skema sedia ada), faedah segera (Ujian PR #13
   tunjukkan ini medan yang paling meletihkan untuk editor taip
   manual). Calon terbaik untuk kerja seterusnya jika mahu satu
   kemenangan cepat sebelum reka bentuk penuh progressive disclosure.
2. **`locations`** — memerlukan skema/type baharu (jsonb tambahan
   pada `works.metadata` atau lajur baharu), tetapi mudah — bentuk
   serupa `characters`.
3. **`firstAppearanceSection`** — bergantung kepada #1/#2 wujud
   dahulu; hanya bermakna untuk novela.
4. **`themes`** — perlu keputusan reka bentuk (editorial-only vs
   reader-facing) SEBELUM sebarang skema, bukan hanya kerja kod.

**Tiada cadangan dibuat di sini tentang bila/jika membina** — ini
audit sahaja, per arahan. Keputusan seterusnya (bina `characters`
dahulu, tunggu manuskrip novela, atau lain-lain) milik Director.
