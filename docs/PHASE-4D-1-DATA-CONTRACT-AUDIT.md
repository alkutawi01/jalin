# Phase 4D-1 — Backend Data Contract Audit

Status: **audit sahaja** — tiada migrasi dijalankan, tiada admin UI, tiada perubahan reader, tiada karya baharu, production tidak disentuh.
Dirujuk: kontrak terbukti Checkpoint 4D-0 (kandungan Markdown kini).
Deliverable: (1) schema gap report, (2) migration proposal, (3) risk assessment.

## Inventori kandungan rujukan (kontrak 4D-0)

7 fail `content/works/*.md` — **5 published, 2 review**:

| Slug | Type | Status | Ciri kontrak |
|---|---|---|---|
| kerusi-di-beranda | cerpen | published | metadata.characters, reader.note kustom, 3 visuals (role `inline-*`), 10 glosari |
| nombor-giliran-117 | cerpen | published | metadata.characters, reader.note (= default), 3 visuals, 9 glosari |
| di-hadapan-singgahsana | sinopsis | published | sourceWork (rights `needs_review`), guest credit byline=false |
| gatsby-agung | sinopsis | published | sourceWork (rights `public_domain`), guest credit byline=false |
| gatsby-kapal-melawan-arus | fragmen | published | sourceWork, guest credit **byline=true**, hero visual Magnific+creationId |
| rumah-yang-masih-menyimpan-suara | cerpen | review | metadata, AI co_writer credits |
| surat-yang-tidak-pernah-selesai | cerpen | review | metadata, AI initial_draft credit |

Nota: **tiada karya novela/bersiri/terjemahan** dalam kandungan semasa — kriteria penerimaan "novela tidak rosak" hanya boleh diuji secara structural (laluan `reading_sections`/`series` tidak terjejas).

---

## 1. Schema gap report

### 1.1 Ringkasan eksekutif

| Entiti (sketsa Director) | Verdict | Nota utama |
|---|---|---|
| `works` (type, status) | ✅ READY | enum jenis/status sepadan (DB supersets `terjemahan`) |
| `works.metadata` (characters, reader note) | ❌ **GAP-2 BLOCKER** | tiada kolom; repository membuangnya → drift HTML |
| `credits` (contributor_id?, guest_name?, role) | ⚠️ **GAP-1 BLOCKER (seeder)** + GAP-7 (nomenklatur) | kolom wujud; *seeder* salah isi hingga runtuh FK |
| `sourceWorks` (title, original_author, language, rights_status) | ✅ schema READY | kolom lebih kaya dari MD; **seeder tak isi** (GAP-3); **label hak cipta salah laluan DB** (GAP-4) |
| `visuals` (provider, creation_id, asset_path) | ✅ READY | `src`=asset_path; provider/creation_id wujud; pipeline `visual_requests` sedia |
| Lapisan DB → reader (repository → public projection → reader) | ✅ READY + GAP-4 | `repository-factory` (default `markdown`), `credit-projection` kekal lapisan public — **tiada bypass** |
| Migrasi & seed | ❌ **GAP-3 + GAP-8 BLOCKER** | dua sistem migrasi berpecah; seeder tidak lengkap |

### 1.2 Peta penuh kontrak → kolom

**works** — `id, slug, title, type, status, genre, audience, dek, body, reading_minutes, version, version_label, revision_count, editorial_history jsonb, published_at, published_by, first_published_at, published_revision_id, updated_at, created_at`
- ✅ sepadan dengan `Work` (content/types.ts) untuk semua medan asas.
- ❌ tiada `metadata` (characters) dan `reader` (note) — lihat GAP-2.
- ✅ `editorial_history` jsonb menerima `EditorialRevision[]` MD.

**credits** — `id, work_id, contributor_slug (FK→contributors.slug, boleh NULL), guest_name, role_label, byline, is_public, sort_order`
- `role_label` menyimpan **role KEY** (`author`, `story_editor`, …) — bukti: `db-migrate.ts:85` tulis `credit.role`; `database-repository.ts:147` baca sebagai `role` untuk projection; `serialize-work.ts:89` tulis balik `role: role_label`. Fungsi betul, nama mengelirukan (GAP-7).
- Identiti diskriminatif: repository membina semula `contributor_slug || guest:${guest_name}` (`database-repository.ts:144`) — MD `guest:` prefix ↔ dua kolom DB.
- Tiada `identity_type` kolom — **boleh diterbitkan** (contributor_slug vs guest_name); tiada CHECK yang menguatkuasakan "tepat satu" (GAP-7).

**source_works** (migrasi 011) — `work_id (unique FK), original_title, author, original_language, publication_year, source_edition, source_url, source_locator, source_text_basis, rights_status (+enum RightsStatus), rights_notes, rights_evidence, rights_history, approved_material_hash, reviewed_at, reviewed_by`
- ✅ sepadan `sourceWork` MD (`title→original_title`, `author→author`, `language→original_language`, `rightsStatus→rights_status`) dan lebih kaya (governance hak cipta).
- ⚠️ `mapPublicSourceWork` (**database-repository.ts:7-27**) menukar status → label **awal** di repository — lihat GAP-4.

**visuals** — `id, work_id, role, src, alt, provider, creation_id, anchor, place, sort_order, is_asset_finalized`
- ✅ `src`=asset_path, `provider`, `creation_id` wujud dan diisi oleh seeder.
- ⚠️ nilai role MD `inline-rubber-estate` dll. disimpan oleh kolom `text` SQL ✅ tetapi **type TS sempit** dan API admin whitelist 4 nilai sahaja (GAP-6).

**Sokongan**: `contributors` ✅ (kind/disclosure/is_visible — **caveat GAP-8**), `glossary_terms` ✅, `reading_sections`/`series`/`series_entries` ✅ (012), `work_revisions` ✅ (inline 013), `visual_requests`/`generation_requests` ✅.

### 1.3 Apa yang sudah stabil (jangan diusik)

- **Laluan DB → reader sedia wujud di belakang flag**: `repository-factory.ts` (`CONTENT_SOURCE`, default `markdown`; `DATABASE_URL` tiada → fallback `markdown` dengan amaran). Production kekal Markdown.
- **`DatabaseContentRepository`**: published-saahaja (sama seperti `getWorksByType`), filter `credits.is_public`, `contributors.is_visible`, suntingan rights sensitive **tidak** dibawa keluar (comment baris 6: rights_notes/evidence/history tidak pernah ke reader).
- **`credit-projection` kekal lapisan public tunggal**: repository menghasilkan `ContributorRef` mentah; reader memanggil `projectBylineCredits`/`projectEditorialCredits` (`kategori/[type]/[slug]/page.tsx:199-200`) — repository **tidak** memanggil projection (tiada bypass).
- Perkhidmatan tulis admin sudah wujud (work/credit/visual/source-rights/glossary/promotion-service) — di luar skop audit ini.

### 1.4 GAP terperinci

#### GAP-1 — BLOCKER — Seeder meletakkan identity guest dalam FK contributor
- **Bukti**: `scripts/db-migrate.ts:83-84` → `contributor_slug = "guest:Naguib Mahfouz"`, `guest_name = null` sentiasa. `001_create_tables.ts:42` → `contributor_slug` merujuk `contributors.slug`.
- **Kesan**: karya derivative pertama mengikut turutan alfabet (`di-hadapan-singgahsana`) menyebabkan **pelanggaran FK → seluruh transaksi seed runtuh**. Seed semasa **mustahil dijalankan** terhadap kandungan 4D-0. (Ada di HEAD — bukan kerja kotor tempatan.)
- **Betul**: split `guest:` → `guest_name = <nama>`, `contributor_slug = NULL` (repository sudah membaca bentuk ini).

#### GAP-2 — BLOCKER — `works.metadata` dan `works.reader` tiada kolom; repository membuangnya
- **Bukti**: kontrak `Work` membawa `metadata.characters` (4 karya) dan `reader.note` (kerusi kustom, nombor=default); `database-repository.ts:67-68` menetapkan `metadata: undefined, reader: undefined` pada laluan working-copy; laluan snapshot (`:425-426`) **memelihara** keduanya tetapi seed tidak pernah mencipta `work_revisions`.
- **Kesan HTML** (reader `kategori/[type]/[slug]/page.tsx:205-212`): panel watak hilang; `reader.note` kerusi jatuh ke default *"Penulis Maya bekerja di bawah kawal selia editorial manusia."* → **drift vs baseline Markdown** — melanggar penerimaan *"cerpen HTML ≈ sama"*.

#### GAP-3 — BLOCKER — Seeder (`scripts/db-migrate.ts`) tidak lengkap untuk kontrak 4D-0
1. Tiada INSERT `source_works` → provenance sinopsis/fragmen hilang → penerimaan *"sinopsis masih ada provenance"* dan *"fragmen Gatsby masih sama"* gagal.
2. Tiada parse/simpan `metadata`/`reader` (punca struktural GAP-2).
3. GAP-1 (guest FK).
4. Anak-tiada idempotensi: `credits/visuals/glossary` tanpa `onConflict`/delete → **re-seed menghasilkan pendua** (works sahaja `doNothing`).
5. Tiada `work_revisions` (opsyen — selepas GAP-2 fix, fallback working-copy memadai).
- Nota: `scripts/db-seed.ts` **hanya validator** (tulis tiada DB). `npm run db:seed` = validate sahaja.

#### GAP-4 — HIGH — Label hak cipta salah dalam laluan DB (double-conversion)
- **Bukti**: `database-repository.ts:7-27` menukar `rights_status` → label dahulu (`public_domain → "Domain awam"`); reader pula memanggil `buildSourceAttribution` (`page.tsx:80`) yang memetakan **sekali lagi** melalui `RIGHTS_LABELS` (`source-attribution.ts:8-13`) — carian `"Domain awam"` tidak jumpa → jatuh ke fallback *"Karya berasaskan sumber"*.
- **MD**: enum mentah → `"Domain awam"` / `"Perlu semakan"` ✅. **DB**: semua status → `"Karya berasaskan sumber"` ❌.
- Turunan: `RIGHTS_LABELS` tiada kunci `unknown/restricted/rejected/permission_obtained` (ada `permission` — tidak sepadan enum DB) → walaupun pembetulan repository, enum jarang perlu peta tambahan.
- **Fix**: `mapPublicSourceWork` pulangkan **status enum mentah** (buang pra-konversi) — repository-layer, bukan reader. `source-attribution.ts` kekal satu-satunya tuan label.

#### GAP-5 — MED — Round-trip `serialize-work.ts` (DB → MD) merosakkan kontrak
- `orderedKeys` (:154-158) tiada `sourceWork`, `metadata`, `reader`, `sections`, `series` → eksport admin membuang provenance.
- Guest ditulis sebagai `displayName` (:96) tetapi `workLoader.normalizeCredits` hanya baca `contributor`/`slug` (:29) → **kredit guest hilang** pada import semula.
- `editorialHistory` ditulis semula sintetik (:128-136).
- Kesan: apabila DB menjadi canonical untuk admin publish, MD yang ditulis semula bukan lagi setara (risiko regresi masa depan). Laluan staging (MD→DB) tidak terjejas.

#### GAP-6 — LOW/NOTA — Vocabulary role visual
- MD terbukti: `hero`, `inline-rubber-estate`, `inline-notebook`, `inline-nasi-lemak`, `inline-hearing-aids`.
- SQL `text` ✅ simpan; type TS `VisualRole` sempit (tekanan sahaja pada tahap types).
- `publication-readiness.ts:536-545`: `inline-*` **grandfathered → warning** (bukan blocker) untuk karya lama; `api/admin/visuals` menolak nilai bukan-kanonik untuk visual **baharu** sahaja.
- Reader tidak membenam nilai role dalam HTML (inline dipilih ikut `anchor` :219; hero ikut `role === "hero"` :216) → **normalisasi role adalah HTML-safe**, tetapi keputusan editorial diperlukan (Cadangan: KEKALKAN nilai lama, jangan ubah data).

#### GAP-7 — LOW — Konsistensi nomenklatur & sumber dual
- `role_label` memegang role KEY (fungsi betul) — cadangan: dokumentasikan, **jangan rename** (AGENTS #13).
- Tiada CHECK "tepat satu identity" pada `credits` — optional hardening.
- **`credit-projection.ts:2`** mengimport `getContributorMeta` dari modul **statik MD** (`content/contributors`), bukan repository → dalam mod DB: karya dari DB, meta contributor dari MD. Konsisten hari ini (fail MD kekal dalam repo) tetapi divergen jika contributor hanya wujud di DB. Refactor masa depan (suntik lookup repository) — **JANGAN sentuh sekarang** (lapisan reader).
- `WorkType` DB mengandungi `terjemahan` yang tiada dalam content — supersets, boleh diterima.

#### GAP-8 — BLOCKER (reproducibility) — Dua sistem migrasi berpecah
| | Laluan A (AKTIF) | Laluan B (wujud, tiada pemanggil) |
|---|---|---|
| Skrip | `npm run db:schema:migrate` → `scripts/db-schema-migrate.ts` | `runMigrations()` dalam `src/lib/db/migrate.ts` |
| Skema | **salinan inline 001–013** dalam objek skrip | fail `src/lib/db/migrations/001–017` |
| Ledger | ✅ Kysely `_kysely_migrations` | ❌ tiada (re-run setiap kali) |
| Liputan | ❌ **014–017 (editorial_*) tiada laluan eksekusi** | termasuk 014–017 tetapi **tiada sesiapa memanggil** |
- **Drift sudah wujud** antara salinan inline dan fail:
  - `contributors.disclosure`: ada dalam fail `001:35`, **tiada** dalam inline — sedangkan `db-migrate.ts:40` menulis `disclosure` → **seed crash kedua** (mendahului GAP-1) terhadap DB binaan laluan A.
  - `credits.byline` default: fail=`true`, inline=`false` (data sentiasa explicit — impak kecil).
- Fail `013` **untracked di HEAD** tetapi **sudah di-inline** dalam skrip aktif (laluan A OK untuk `version_label` dsb.); fail `014–017` tracked tetapi tidak pernah dieksekusi → `editorial_audit_runs` dsb. tiada jaminan wujud pada DB (admin audit akan gagal runtime).
- Fail kotor pra-sediaan (`types.ts`, `db-migrate.ts`, `db-seed.ts`, `AGENTS.md`, dst.) bukan milik audit ini — memerlukan keputusan penyegerakan (D1).

---

## 2. Migration proposal (staging sahaja)

Tiada pelaksanaan dalam fasa audit ini. Urutan di bawah adalah cadangan untuk fasa pelaksanaan 4D-1 selepas keputusan D1–D5.

### Prasyarat keputusan (Director / Adjung)

- **D1 — Sumber kebenaran migrasi**: cadangan **konsolidasi** — jadikan `db-schema-migrate.ts` membaca fail `src/lib/db/migrations/` melalui provider Migrator (kekal ledger), buang salinan inline; otomatis menjemput 014–017 dan menutup drift (disclosure dsb.). Alternatif minimum: serlahkan/selaraskan inline + tambah 018 di dua-dua tempat (tertinggal mudah berlaku).
- **D2 — Role visual**: kekalkan `inline-*` sedia ada (grandfather sedia ada menguruskan) vs normalisasi kepada 4 nilai kanonik. Cadangan: **KEKALKAN** (data jujur, reader tak terjejas).
- **D3 — Lokasi fix label hak cipta**: betulkan `mapPublicSourceWork` (repository) — **bukan** `source-attribution`/reader (behavior MD kekal).
- **D4 — Scope seed**: semua 7 karya (status dikekalkan; 5 published untuk perbandingan HTML, 2 review wujud tapi tidak terdedah) — cadangan: **ya, semua 7**.
- **D5 — Fail kotor pra-sediaan**: sama ada failkan `013` + selesaikan kotoran tracked (`types.ts`, `db-*.ts`, `AGENTS.md`, dll.) sebelum staging direproduksi — keputusan Adjung; audit ini tidak menyentuhnya.

### Fasa A — Sumber kebenaran migrasi (D1)
Satu laluan sahaja: Migrator + ledger, fail di `src/lib/db/migrations/` sebagai sumber. Selepas ini, tambah `018_*.ts` pada fail sahaja.

### Fasa B — Migrasi `018_work_metadata_reader.ts` (additive, idempotent — pola 011/013)
```sql
ALTER TABLE works ADD COLUMN metadata jsonb;   -- { characters: [...] }
ALTER TABLE works ADD COLUMN reader   jsonb;   -- { note: "..." }
```
- Guard `information_schema` (sama seperti 013) supaya selamat re-run.
- **Tiada** perubahan enum/kolom sedia ada; **tiada** rename `role_label`.
- (Opsyen D-lain): `CHECK (num_nonnulls(contributor_slug, guest_name) = 1)` pada `credits` — hanya selepas seeder/GAP-1 selesai.

### Fasa C — Naik taraf seeder (`scripts/db-migrate.ts`) — MD → DB
1. Parse `sourceWork`, `metadata`, `reader` (dan `sections`/`series` bila wujud — masa depan) dalam `parseWorkFile` (`db-seed.ts`).
2. Kredit: nilai bermula `guest:` → `guest_name`, `contributor_slug=NULL`; selainnya → `contributor_slug`; format lain → **ralat** (jangan senyap-senyap rosak).
3. INSERT `source_works` (`original_title/author/original_language/rights_status` sahaja; MD hanya 4 kunci) + `onConflict work_id doNothing`.
4. Idempotensi anak: dalam transaksi per karya, `delete from credits/visuals/glossary_terms where work_id = ?` sebelum insert (deterministik semula); `contributors`/`works` kekal `doNothing`.
5. Selepas D1: `disclosure` kolom wujud (crash pertama tertutup).
6. (Opsyen, boleh tunda) cipta `work_revisions` snapshot penuh + `published_revision_id` untuk 5 published — laluan snapshot kemudian memelihara metadata/reader; **tidak wajib** untuk penerimaan selepas GAP-2 fix (fallback working-copy membaca kolom baharu).

### Fasa D — Parity repository (laluan DB ↔ MD)
1. **GAP-4**: `mapPublicSourceWork` pulangkan `rightsStatus` = status enum **mentah**; buang pra-label.
2. **GAP-2**: `mapWork` → `metadata: row.metadata ?? undefined`, `reader: row.reader ?? undefined`.
3. **GAP-7**: (tak wajib sekarang) samakan `RIGHTS_LABELS` dengan enum DB (`permission_obtained`, `unknown`, `restricted`, `rejected`) — additive, tiada impak karya semasa.
4. **Jangan** ubah `credit-projection`, renderer, atau behavior reader MD.

### Fasa E — Alat kawalan
1. `content-source-compare.ts` (sedia ada, `npm run content:compare`):
   - SLUGS: tambah 3 karya derivative published (`di-hadapan-singgahsana`, `gatsby-agung`, `gatsby-kapal-melawan-arus`) — kini hanya 3 cerpen.
   - Tambah medan banding: **`sourceWork`, `metadata`, `reader`, `editorialHistory`** (kini `sourceWork`/`metadata`/`reader` langsung tidak dibandingkan → GAP-2/4 boleh "PASS" secara palsu).
   - Kekalkan status sebagai medan banding (sudah ada).
2. Perbandingan HTML penuh (gaya 4D-0): build dengan `CONTENT_SOURCE=database` pada staging → diff vs baseline Markdown (modulo build-id/asset-hash) — ini penerimaan sebenar, repository-compare hanyalah prapemeriksaan.

### Fasa F — Runbook staging (selepas D1–D5)
```
1. DB staging KOSONG (skema baharu; production disentuh)
2. npm run db:schema:migrate        -- ledger, 001..018
3. npm run db:migrate               -- seed 7 karya (Fasa C)
4. npm run content:compare          -- parity repository (Fasa E) mesti 0 diff
5. Set .env.local staging: DATABASE_URL + CONTENT_SOURCE=database
6. npm run build                    -- halaman daripada DB
7. Perbandingan HTML vs baseline Markdown
8. Kembalikan CONTENT_SOURCE default (markdown) — npm test mesti kekal hijau (11 suite)
```

### Penerimaan (diselaraskan dengan inventori sebenar)

| Kriteria Director | Ujian sebenar |
|---|---|
| cerpen HTML ≈ sama | `kerusi-di-beranda` + `nombor-giliran-117`: byte-diff modulo build-id/asset-hash; **panel watak & nota kustom kerusi TERPELIHARA** |
| novela tidak rosak | tiada karya novela → structural: `reading_sections`/`series` laluan utuh; `rumah` (review) tidak terdedah (published-saahaja) |
| sinopsis masih ada provenance | `di-hadapan` → Status *"Perlu semakan"*; `gatsby-agung` → *"Domain awam"* (bukti fix GAP-4) |
| fragmen Gatsby sama | hero + sidebar (`Sumber asal/Bahasa asal/Status/Versi`) + byline guest tanpa pautan |
| Review works | `rumah`, `surat` wujud di DB, **tidak** dirender awam |

Gate kekal: `npm run validate-content` + `npm test` (11 suite) mesti hijau dalam mod markdown selepas apa-apa perubahan kod fasa ini.

---

## 3. Risk assessment

| # | Risiko | Kesan | Prob. | Mitigasi |
|---|---|---|---|---|
| R1 | Seed runtuh: crash `disclosure` (jalur A) dan/atau FK `guest:` (GAP-1) | Tinggi — staging tak boleh diisi | Tinggi | Fasa C + D1 sebelum sebarang `db:migrate` |
| R2 | Drift HTML (watak/nota/hak cipta label) lolos ke penerimaan | Tinggi — kontrak 4D-0 tercabul | Sederhana | GAP-2 + GAP-4; perbandingan medan extended (Fasa E) + diff HTML |
| R3 | Dua laluan migrasi menghasilkan skema berbeza; 014–017 tiada eksekusi | Tinggi — ketidakreproducian | Tinggi | D1 konsolidasi; ledger kekal |
| R4 | Re-seed menghasilkan pendua anak (kredit/visual/glosari) | Sederhana | Tinggi jika berulang | Delete-then-insert per karya dalam transaksi |
| R5 | `CONTENT_SOURCE=database` tersilap di production | Tinggi — DB belum canonical | Rendah | Flag hanya staging; default `markdown` + fallback `DATABASE_URL`-tiada; audit env selepas setiap fasa |
| R6 | Round-trip `serialize-work` membuang provenance (GAP-5) | Tinggi pada masa depan admin-publish | Sederhana | Selesai sebelum DB jadi canonical untuk publish; bukan laluan staging |
| R7 | Sumber dual contributor (projection dari MD, karya dari DB) berdivergen | Rendah hari ini | Rendah | Dokumen (GAP-7); refactor injection selepas 4D-1 |
| R8 | `work_revisions` tiada dalam seed → laluan snapshot tak diuji | Rendah (fallback selamat selepas GAP-2) | Tinggi | Opsyen Fasa C.6; uji laluan hidup-text dalam fasa admin |
| R9 | Whitelist role menolak visual baharu `inline-*` | Rendah (grandfather lama OK) | Rendah | D2: kekalkan; visual baharu guna 4 kanonik |
| R10 | Status hak cipta berubah semasa migrasi | Kritikal (integriti editorial) | Rendah | Seeder **COPY enum mentah sahaja**; tiada sebarang normalisasi/auto-approve (AGENTS #4, gate 4D-0 kekal) |
| R11 | Fail kotor/`013` untracked mengelirukan reproduksi staging | Sederhana | Tinggi | D5 — keputusan penyegerakan fail sebelum runbook |

---

## 4. Keputusan menunggu

| # | Keputusan | Cadangan |
|---|---|---|
| D1 | Sumber kebenaran migrasi (inline vs fail) | Konsolidasi ke fail + ledger |
| D2 | Role visual `inline-*` | Kekalkan |
| D3 | Lokasi fix label hak cipta | Repository (`mapPublicSourceWork`) |
| D4 | Skop seed | Semua 7 karya |
| D5 | Penyegerakan fail kotor + `013` | Adjung putuskan |

Skop audit ini tertutup di sini: tiada kod DB/reader disentuh, tiada migrasi dijalankan, production tidak disentuh. Pelaksanaan Fasa A–F menunggu arahan seterusnya.
