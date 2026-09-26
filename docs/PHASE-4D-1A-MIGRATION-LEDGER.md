# Phase 4D-1A — Migration Ledger & Single-Path Recommendation

Status: audit kod sahaja — **tiada sambungan DB, tiada migrasi dijalankan, tiada seed, tiada perubahan skema, `CONTENT_SOURCE` tidak disentuh, dirty tree tidak dibersihkan (D5: inventory sahaja).**
Skop: (1) audit `scripts/db-schema-migrate.ts` (inline) vs `src/lib/db/migrations/001–017` (fail), (2) ledger migrasi, (3) cadangan satu laluan eksekusi.
Keputusan Director dilaksanakan: D1 konsolidasi (018 DITAHAN), D2 `inline-*` kekal, D3 fix repository (fasa selepas ini), D4 seed semua 7 karya (fasa selepas ini), D5 tree tidak disentuh.

---

## 1. Ledger migrasi (kod)

### 1.1 Keadaan semasa tiga "kebenaran"

| Sumber | Kandungan | Digunakan oleh |
|---|---|---|
| **Inline — working copy** `scripts/db-schema-migrate.ts` | **001–013** (013 = +90 baris, belum di-HEAD) | `npm run db:schema:migrate` (Migrator + ledger `_kysely_migrations`) — **LALUAN AKTIF** |
| **Inline — HEAD** | 001–012 sahaja | versi repo; bukan yang dieksekusi pada mesin ini |
| **Fail** `src/lib/db/migrations/*.ts` | **001–017** (013 = **untracked**) | tiada pemanggil — `runMigrations()` wujud tetapi **tiada sesiapa memanggilnya** (disemak: src/, scripts/, __tests__/ — 0 pemanggil) |

### 1.2 Jadual ledger 001–017

Status: **APPLIED** = direkod/direkod oleh ledger laluan aktif · **DUPLICATE** = definisi wujud dua tempat (fail + inline) · **MISSING** = tiada laluan eksekusi · **UNTRACKED** = tiada di HEAD.

| # | Fail | Di HEAD | Inline (working) | Status | Drift fail ↔ inline |
|---|---|---|---|---|---|
| 001_create_tables | ✅ | ✅ | ✅ | **DUPLICATE** | ❌ **5 drift** (lihat 1.3) |
| 002_add_credit_public_flag | ✅ | ✅ | ✅ | DUPLICATE | ✅ sama |
| 003_add_contributor_visibility | ✅ | ✅ | ✅ | DUPLICATE | ✅ sama |
| 004_submission_data_model | ✅ | ✅ | ✅ | DUPLICATE | ⚠️ **1 drift** (status default) |
| 005_generation_requests | ✅ | ✅ | ✅ | DUPLICATE | ✅ sama (+nota types) |
| 006_add_promoted_at | ✅ | ✅ | ✅ | DUPLICATE | ✅ sama |
| 007_enhance_visual_requests | ✅ | ✅ | ✅ | DUPLICATE | ✅ sama |
| 008_add_visual_asset_finalized | ✅ | ✅ | ✅ | DUPLICATE | ✅ sama |
| 009_visual_execution_hardening | ✅ | ✅ | ✅ | DUPLICATE | ✅ sama |
| 010_add_published_by | ✅ | ✅ | ✅ | DUPLICATE | ✅ setara (fail idempotent, inline bergantung ledger) |
| 011_source_works | ✅ | ✅ | ✅ | DUPLICATE | ✅ setara (fail idempotent) |
| 012_novela_bersiri_structure | ✅ | ✅ | ✅ | DUPLICATE | ✅ sama (dua-dua idempotent) |
| 013_living_text_revisions | ⚠️ **UNTRACKED** | ❌ | ✅ (dirty +90) | **DUPLICATE + kedua-dua belum di-HEAD** | ✅ setara (fail lebih defensif `.catch`) |
| 014_editorial_audit_history | ✅ | ✅ | ❌ | **MISSING** (tiada eksekusi) | — |
| 015_editorial_issues | ✅ | ✅ | ❌ | **MISSING** | — |
| 016_editorial_issue_events | ✅ | ✅ | ❌ | **MISSING** | — |
| 017_editorial_roles | ✅ | ✅ | ❌ | **MISSING** | — |

Ringkasan: **13 duplicate, 4 missing, 1 untracked, 2 migrasi berdrift kandungan (001, 004)**.

### 1.3 Drift terperinci

**001 — 5 perbezaan (fail vs inline):**

| Perkara | Fail (migrations/) | Inline (aktif) | Kesan |
|---|---|---|---|
| `contributors.disclosure` | ✅ ada | ❌ **tiada** | **TINGGI** — `db-migrate.ts` menulis `disclosure` → seed **crash** ("column does not exist") pada DB binaan laluan aktif. Tiada migrasi inline lain menambahnya. |
| `credits.work_id` ON DELETE | **CASCADE** | tiada (RESTRICT) | **SEDERHANA** — padam work boleh tinggalkan kredit yatim pada DB inline |
| `credits.byline` default | `true` | `false` | Rendah — seeder/tulis sentiasa nilai eksplisit |
| `glossary_terms.source` default | `"Kamus Dewan Edisi Keempat"` | `""` | Rendah — seeder tulis eksplisit |
| Indeks (6: works type/status, credits work/contributor, visuals work, glossary work) | ✅ semua | ❌ **tiada satu pun** | **SEDERHANA** — prestiji kuari; bukan kefungsian |

**004 — 1 perbezaan:**

| Perkara | Fail | Inline | Kesan |
|---|---|---|---|
| `visual_requests.status` default | `"pending"` | `"draft"` | **Fail yang silap** — `VisualRequestStatus` (types.ts) tiada nilai `pending` (ada `draft`) → DB baharu binaan fail akan cipta status di luar union TypeScript. Semasa konsolidasi: **selaraskan fail → `draft`**. |

**Nota bukan-inline-vs-fail (diperhatikan semasa audit):**
- `types.ts` `GenerationRequests.updated_at` wujud tetapi **tiada migrasi mana-mana laluan** menambah `updated_at` pada `generation_requests` — perlu semakan (jenis↔skema terapung; di luar skop 4D-1A).
- Fail 001–009 bukan idempotent (create/alter polos) — selamat **hanya** di bawah ledger; ini sebab `runMigrations()` (tanpa ledger, re-run semua) tidak boleh menjadi laluan.
- Fail 010–017: pola idempotent (`information_schema` guard + `.catch`) — sesuai untuk mana-mana laluan.

### 1.4 Keadaan ledger sebenar (`_kysely_migrations`)

**Tidak disemak** dalam fasa ini (tiada sambungan DB dibenarkan/dilakukan). Yang pasti dari kod:
- Laluan aktif menggunakan Kysely `Migrator.migrateToLatest()` → merekod nama + masa dalam `_kysely_migrations` (cth. `001_create_tables` … `012_…`, atau `013_…` jika skrip working pernah dijalankan di mesin ini).
- **Nama inline == nama asas fail** (`001_create_tables` dsb. 13/13 sepadan) → selepas konsolidasi, baris lama kekal sah dan tidak diulang.
- Risiko ledger: jika `runMigrations()` (fail, tanpa ledger) pernah/tidak sengaja dijalankan terhadap DB sama → `001` createTable berulang → ralat (fail 001 tiada guard) — laluan mati ini mesti dibuang/depayarkan (cadangan §3).

**Query verifikasi untuk staging (pelaksanaan selepas ini, bukan fasa ini):**
```sql
SELECT name, created_time FROM _kysely_migrations ORDER BY name;
SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' ORDER BY 1;
SELECT column_name FROM information_schema.columns
  WHERE table_name = 'contributors' ORDER BY ordinal_position;   -- probe: disclosure?
SELECT indexname FROM pg_indexes
  WHERE schemaname = 'public' ORDER BY indexname;                -- probe: 6 idx_001?
```
Bandingkan hasil dengan jadual §1.2 → mengesahkan sama ada DB sedia ada dibina dari inline-001 (drift) atau fail-001 (sepadan).

---

## 2. Inventori dirty tree (D5 — dokumentasi SAHAJA, tiada sentuh)

**Modified (tracked):**

| Fail | Delta | Anggaran kластer kerja |
|---|---|---|
| `scripts/db-schema-migrate.ts` | +90 (inline **013** working-only) | Living-text (pasangan fail 013 untracked) |
| `scripts/db-migrate.ts` | 7 (version_label/revision_count; buang hardcode published_by dsb.) | Living-text seeder WIP |
| `scripts/db-seed.ts` | 4 (parse versionLabel/revisionCount) | Living-text seeder WIP |
| `src/lib/content/types.ts` | +42 (sections/series/revision types) | Living-text + struktur 012 |
| `src/app/admin/works/[id]/page.tsx` | +160 | UI revisi admin WIP (pasangan: API untracked di bawah) |
| `AGENTS.md` | +72 (arahan komunikasi Director) | Dokumentasi proses |
| `scripts/mobile-qa-test.ts` | 13 | Skrip QA |

**Deleted (tracked):** `scripts/assign-author-waktu-sebenar.ts`, `scripts/import-waktu-sebenar.ts` — era Waktu Sebenar (fasa belum dieksekusi).

**Untracked:** `migrations/013_living_text_revisions.ts` (kandungan setara dengan salinan inline dirty — kedua-duanya belum di-HEAD) · API revisi `api/admin/works/[id]/revisions/*` (3) · laluan statik `cerpen/kerusi-di-beranda/`, `cerpen/nombor-giliran-117/` · 16 skrip audit/utiliti (`audit-*`, `backfill-revisions`, `poll-visual`, `regenerate-hero-*`, dll.) · 27 `qa-*.png` · `tsconfig.tsbuildinfo` · (2 dokumen audit ini).

Klasifikasi: **tidak diketahui / kerja aktif separa** — tiada penghapusan, tiada staging, tiada commit mengikut D5. Keputusan (termasuk nasib fail 013) milik Adjung.

---

## 3. Cadangan — SATU laluan eksekusi (pelaksanaan tertakluk kelulusan; bukan fasa ini)

**Keputusan D1 diluluskan** — cadangan teknikal:

1. **Satu migrator**: Kysely `Migrator` + `_kysely_migrations` (kekal) — satu-satunya pelaksana.
2. **Fail = sumber**: ganti objek inline (~600 baris) dengan provider kecil yang membaca `src/lib/db/migrations/*.ts` (sort nama), eksport `up/down`. Skrip menjadi ~30 baris.
3. **Padanan nama**: nama fail == nama ledger sedia ada (disahkan 13/13) → DB lama tidak diulang; 014–017 mula direkod dengan betul.
4. **Selesaikan drift SEBELUM tukar** (fail = kebenaran mengikut D1):
   - betul `004` default `pending` → `draft`;
   - pengesahan: `disclosure` + 6 indeks + `ON DELETE CASCADE` sudah betul dalam fail (ya);
   - DB sedia ada yang dibina inline-001: **probe** (§1.4) → jika berdrift, cadangan migrasi pemulihan additive (guard EXISTS) — **dinamakan/biliksa selepas konsolidasi disahkan; tiada `018` dicipta dalam fasa ini**.
5. **Matikan laluan mati**: `runMigrations()` tiada pemanggil — padam atau jadikan thin wrapper ke Migrator supaya mustahil dua laluan.
6. **Jurnal kebenaran**: apa jua perubahan skema akan datang = SATU fail fail + ledger; salinan inline dilarang (mengikut tiga-sumber yang Director kenal pasti).
7. **Verifikasi penerimaan konsolidasi** (staging, fasa pelaksanaan): `db:schema:migrate` pada DB kosong → query §1.4 sepadan jangkaan → `db:migrate` seed 7 karya (D4) gagal pada `disclosure`/FK dulu jika drift tidak selesai.

Aliran selepas ini (mengikut urutan Director): **konsolidasi → pengesahan/repair → schema additive (metadata/reader) → seeder fix → staging DB → parity MD↔DB**. Admin/backend UI: tidak.

---

## 4. Pengesahan bukan-tindakan

- ❌ tiada sambungan/queries ke mana-mana DB · ❌ tiada migrasi dijalankan · ❌ tiada fail `018` · ❌ tiada seed · ❌ `CONTENT_SOURCE` tidak ditukar · ❌ tiada fail dirty/untracked disentuh/didelete/distage/dicommit selain dokumen ini · ❌ reader tidak disentuh (D2/D3: `inline-*` kekal; fix label = fasa repository selepas ini).
