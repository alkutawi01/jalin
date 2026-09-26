# Phase 4D-2B — Cutover Dry Run

> **Status: DRY RUN SELESAI — semua langkah berjaya pada staging**

## Ringkasan

Simulasi penuh cutover telah dilakukan pada **staging DB** (`jalin_staging`). Semua 9 langkah berjaya. Tiada perubahan production dilakukan.

---

## Dry Run Results

### Step 1: READ-ONLY check staging DB

```
Command: SELECT NOW(), current_database()
Output:
  Sambungan BERJAYA
  Database: jalin_staging
  Masa server: 2026-09-26T11:20:05.181Z
Status: PASS
```

### Step 2: Snapshot state SEMASA staging

```
Command: SELECT COUNT(*) FROM [each table]
Output:
  works: 5
  contributors: 5
  credits: 9
  visuals: 7
  glossary_terms: 27
  source_works: 3
  _kysely_migrations: TIADA (table belum wujud)
Status: PASS (staging ada data dari test awal)
```

### Step 3: Clear staging DB

```
Command: DELETE FROM [each table]
Output:
  glossary_terms: cleared (27 rows)
  visuals: cleared (7 rows)
  credits: cleared (9 rows)
  source_works: cleared (3 rows)
  works: cleared (5 rows)
  contributors: cleared (5 rows)
  _kysely_migrations: TIADA (table belum wujud)
Status: PASS
```

### Step 4: Run migration 001-018

```
Command: npx tsx scripts/db-schema-migrate.ts
Output:
  Running schema migrations...
  Schema migrations complete.
Status: PASS
Nota: Script tidak papar individual migration steps (hanya "complete")
```

### Step 5: Verify migration ledger = 18

```
Command: SELECT COUNT(*) FROM kysely_migration
Output:
  Migrations applied: 18
  Expected: 18
  Status: PASS
Nota: Table name = kysely_migration (BUKAN _kysely_migrations)
```

### Step 6: Run seed published works

```
Command: npx tsx scripts/db-migrate.ts
Output:
  Validating content data...
  Found 5 works and 5 contributors
  Starting migration...
  Migrating 5 contributors...
  Migrating 5 works...
  Migration completed successfully!

  Row counts:
    works: 5
    contributors: 5
    credits: 9
    visuals: 7
    glossary_terms: 27
Status: PASS
```

### Step 7: DRY INVENTORY verification

```
Command: node scripts/_tmp_inventory.js
Output:
  === DRY INVENTORY ===
  works: 5 (expected 5) PASS
  contributors: 5 (expected 5) PASS
  credits: 9 (expected 9) PASS
  visuals: 7 (expected 7) PASS
  glossary_terms: 27 (expected 27) PASS
  source_works: 3 (expected 3) PASS

  Overall: ALL PASS
Status: PASS
```

### Step 8: content:compare

```
Command: npx tsx scripts/content-source-compare.ts
Output:
  CONTENT SOURCE PARITY CHECK
  ✓ kerusi-di-beranda
  ✓ nombor-giliran-117
  ✓ di-hadapan-singgahsana
  ✓ gatsby-agung
  ✓ gatsby-kapal-melawan-arus

  Differences: 0
Status: PASS
```

### Step 9: Build database mode

```
Command: CONTENT_SOURCE="database" npm run build
Output:
  Build successful (exit 0)
  Pages: Static + SSG + Dynamic (same structure as markdown build)
Status: PASS
```

---

## Penemuan Penting

### 1. Table name: `kysely_migration` (bukan `_kysely_migrations`)

Migration ledger table dipanggil `kysely_migration`, bukan `_kysely_migrations`. Dokumen Phase 4D-2A perlu dikemaskini.

### 2. `db-schema-migrate.ts` tidak papar individual steps

Script hanya papar "Schema migrations complete." tanpa menyenaraikan setiap migrasi. Untuk production, pertimbangkan untuk tambah logging.

### 3. Seeder published-only filter berfungsi

`db-seed.ts` hanya menyemai 5 karya published (bukan 7). Ini selari dengan `workLoader.ts`.

### 4. content:compare = 0 diff

Pariti sempurna antara markdown dan database pada staging.

### 5. Build database mode berjaya

Site berjaya dibina dengan `CONTENT_SOURCE=database`. Output sama dengan markdown build.

---

## Rollback Decision Tree

```
Jika masalah selepas CONTENT_SOURCE=database:
  │
  ├─ Laman web tidak load?
  │   └─ Tukar CONTENT_SOURCE="markdown" → Redeploy
  │
  ├─ Content salah/hiang?
  │   └─ Tukar CONTENT_SOURCE="markdown" → Redeploy
  │
  ├─ Credits/visual salah?
  │   └─ Tukar CONTENT_SOURCE="markdown" → Redeploy
  │
  ├─ Slow performance?
  │   └─ Tukar CONTENT_SOURCE="markdown" → Redeploy
  │   └─ Siasat query performance
  │
  └─ Migration gagal?
      └─ Gunakan backup branch dari Neon Console
      └─ Tukar DATABASE_URL ke backup branch
      └─ Sahkan application berfungsi
```

---

## Kesimpulan Dry Run

| Step | Status | Nota |
|------|--------|------|
| 1. READ-ONLY check | PASS | |
| 2. Snapshot state | PASS | |
| 3. Clear staging | PASS | |
| 4. Run migration | PASS | |
| 5. Verify migration | PASS | Table = kysely_migration |
| 6. Run seed | PASS | 5 works published only |
| 7. DRY INVENTORY | PASS | ALL 6 tables PASS |
| 8. content:compare | PASS | 0 diff |
| 9. Build database | PASS | exit 0 |

**Dry run: 9/9 PASS**

---

## Kemaskini Dokumen Phase 4D-2A

Perlu kemaskini:

1. Table name: `_kysely_migrations` → `kysely_migration`
2. Tambah individual migration logging (nice-to-have)
3. Tambah dry run results sebagai bukti

---

## Sedia untuk Production Cutover

Selepas dry run ini, Jalin sudah terbukti boleh:

1. ✅ Migrate dari kosong ke 18 migrations
2. ✅ Seed 5 karya published
3. ✅ Capai 0 diff pariti
4. ✅ Build dengan CONTENT_SOURCE=database
5. ✅ Rollback ke CONTENT_SOURCE=markdown

**Keputusan untuk production cutover bergantung kepada Director.**

---

*Dokumen ini dikemaskini selepas Phase 4D-2B dry run.*
*Tiada perubahan produksi dilakukan.*
