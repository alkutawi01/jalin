# Phase 4D-2A — Production Preflight

> **Status: PREPARATION — tiada perubahan produksi dilakukan**

## Ringkasan

Dokumen ini menyediakan senarai semak terperinci untuk production cutover. Setiap langkah mempunyai **exact commands**, **expected output**, dan **go/no-go criteria**.

**Tiada arahan dalam dokumen ini yang menjalankan sebarang perubahan ke database produksi.** Semua arahan adalah untuk verifikasi sahaja.

---

## 1. Production DB Backup Verification

### Sebelum melakukan apa-apa

**WAJIB** bukti backup wujud dan boleh disambung.

### Langkah verifikasi

```bash
# 1. Neon Console → Project jalin → Branches
# 2. Sahkan branch backup wujud:
#    - Nama: backup-pre-4d2-YYYYMMDD (atau nama yang dicatat)
#    - Status: Ready
#    - Region: ap-southeast-1

# 3. Sahkan backup boleh disambung dari luar:
#    - Salin connection string dari Neon Console
#    - Jalankan uji sambungan (lihat Seksyen 2)

# 4. Catatkan:
#    - Timestamp backup: ___________________
#    - Branch name: ___________________
#    - Connection string (pooled): ___________________
```

### Backup verification checklist

| # | Item | Sah? | Nota |
|---|------|------|------|
| 1 | Branch backup wujud di Neon Console | ☐ | |
| 2 | Branch status = "Ready" | ☐ | |
| 3 | Connection string boleh disambung | ☐ | |
| 4 | Timestamp backup dicatat | ☐ | |
| 5 | Backup branch berbeza dari production branch | ☐ | |

### Jika backup GAGAL

**STOP.** Jangan teruskan dengan migration. Cipta backup baru sebelum meneruskan.

---

## 2. Exact SQL/Command Sequence

### Pre-migration: uji sambungan ke production

```bash
# Uji sambungan ke production DB (READ-ONLY — tiada perubahan)
DATABASE_URL="<production-pooled-url>" \
  node -e "
    require('dotenv').config();
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    pool.query('SELECT NOW() as current_time, current_database() as db_name')
      .then(r => {
        console.log('Sambungan BERJAYA');
        console.log('Database:', r.rows[0].db_name);
        console.log('Masa server:', r.rows[0].current_time);
        pool.end();
      })
      .catch(e => {
        console.error('Sambungan GAGAL:', e.message);
        process.exit(1);
      });
  "
```

**Expected output:**
```
Sambungan BERJAYA
Database: jalin
Masa server: 2026-09-26T...
```

**Jika gagal:** STOP. Jangan teruskan.

---

### Step 1: Snapshot state SEMASA production

```bash
# Catatkan state production SEBELUM migration
DATABASE_URL="<production-pooled-url>" \
  node -e "
    require('dotenv').config();
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    async function snapshot() {
      const checks = [
        { name: 'works', sql: 'SELECT COUNT(*) as c FROM works' },
        { name: 'contributors', sql: 'SELECT COUNT(*) as c FROM contributors' },
        { name: 'credits', sql: 'SELECT COUNT(*) as c FROM credits' },
        { name: 'visuals', sql: 'SELECT COUNT(*) as c FROM visuals' },
        { name: 'glossary_terms', sql: 'SELECT COUNT(*) as c FROM glossary_terms' },
        { name: 'source_works', sql: 'SELECT COUNT(*) as c FROM source_works' },
        { name: '_kysely_migrations', sql: 'SELECT COUNT(*) as c FROM _kysely_migrations' },
      ];
      console.log('=== STATE SEBELUM MIGRATION ===');
      for (const check of checks) {
        try {
          const r = await pool.query(check.sql);
          console.log(check.name + ': ' + r.rows[0].c);
        } catch (e) {
          console.log(check.name + ': TIADA (table belum wujud)');
        }
      }
      await pool.end();
    }
    snapshot();
  "
```

**Expected output (production kosong sebelum migration):**
```
=== STATE SEBELUM MIGRATION ===
works: 0
contributors: 0
credits: 0
visuals: 0
glossary_terms: 0
source_works: 0
_kysely_migrations: 0
```

**Jika production sudah ada data:** Catatkan counts sebagai baseline. Jangan padam — migration akan add-on.

---

### Step 2: Jalankan schema migration

```bash
# Jalankan 001-018 ke production
DATABASE_URL="<production-pooled-url>" \
DATABASE_URL_UNPOOLED="<production-unpooled-url>" \
  npx tsx scripts/db-schema-migrate.ts
```

**Expected output:**
```
Running schema migrations...

✓ 001_create_tables: Success
✓ 002_add_credit_public_flag: Success
✓ 003_add_contributor_visibility: Success
✓ 004_submission_data_model: Success
✓ 005_generation_requests: Success
✓ 006_add_promoted_at: Success
✓ 007_enhance_visual_requests: Success
✓ 008_add_visual_asset_finalized: Success
✓ 009_visual_execution_hardening: Success
✓ 010_add_published_by: Success
✓ 011_source_works: Success
✓ 012_novela_bersiri_structure: Success
✓ 013_living_text_revisions: Success
✓ 014_editorial_audit_history: Success
✓ 015_editorial_issues: Success
✓ 016_editorial_issue_events: Success
✓ 017_editorial_roles: Success
✓ 018_work_metadata_reader: Success

Schema migrations complete.
```

**Jika gagal:** Catatkan ralat. Jangan teruskan. Gunakan backup branch untuk rollback.

---

### Step 3: Verifikasi migration

```bash
# Sahkan semua migration berjaya
DATABASE_URL="<production-pooled-url>" \
  node -e "
    require('dotenv').config();
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    async function verify() {
      const r = await pool.query('SELECT COUNT(*) as c FROM _kysely_migrations');
      console.log('Migrations applied:', r.rows[0].c);
      console.log('Expected: 18');
      console.log('Status:', r.rows[0].c == 18 ? 'PASS' : 'FAIL');
      await pool.end();
    }
    verify();
  "
```

**Expected output:**
```
Migrations applied: 18
Expected: 18
Status: PASS
```

**Jika count bukan 18:** STOP. Siasat sebelum teruskan.

---

### Step 4: Jalankan seed

```bash
# Seed 5 karya published ke production
DATABASE_URL="<production-pooled-url>" \
  npx tsx scripts/db-migrate.ts
```

**Expected output:**
```
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
```

**Jika gagal:** Catatkan ralat. Jangan teruskan.

---

### Step 5: Verifikasi seed (DRY INVENTORY)

```bash
# Sahkan row counts sama dengan expected
DATABASE_URL="<production-pooled-url>" \
  node -e "
    require('dotenv').config();
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    async function inventory() {
      const expected = {
        works: 5,
        contributors: 5,
        credits: 9,
        visuals: 7,
        glossary_terms: 27,
        source_works: 3,
      };
      console.log('=== DRY INVENTORY ===');
      let allPass = true;
      for (const [table, exp] of Object.entries(expected)) {
        const r = await pool.query('SELECT COUNT(*) as c FROM ' + table);
        const actual = parseInt(r.rows[0].c);
        const pass = actual === exp;
        console.log(table + ': ' + actual + ' (expected ' + exp + ') ' + (pass ? 'PASS' : 'FAIL'));
        if (!pass) allPass = false;
      }
      console.log('');
      console.log('Overall:', allPass ? 'ALL PASS' : 'FAIL — STOP');
      await pool.end();
    }
    inventory();
  "
```

**Expected output:**
```
=== DRY INVENTORY ===
works: 5 (expected 5) PASS
contributors: 5 (expected 5) PASS
credits: 9 (expected 9) PASS
visuals: 7 (expected 7) PASS
glossary_terms: 27 (expected 27) PASS
source_works: 3 (expected 3) PASS

Overall: ALL PASS
```

**Jika ada FAIL:** STOP. Jangan tukar CONTENT_SOURCE. Siasat perbezaan.

---

### Step 6: content:compare (production vs markdown)

```bash
# Tukar .env.local ke production DATABASE_URL sementara
# (sudah dipulihkan selepas staging test — perlu tukar semula)

# Jalankan compare
npx tsx scripts/content-source-compare.ts
```

**Expected output:**
```
CONTENT SOURCE PARITY CHECK

✓ kerusi-di-beranda
✓ nombor-giliran-117
✓ di-hadapan-singgahsana
✓ gatsby-agung
✓ gatsby-kapal-melawan-arus

Differences: 0
```

**Jika ada diff:** STOP. Siasat sebelum teruskan. Jangan tukar CONTENT_SOURCE.

---

### Step 7: Build database mode

```bash
# Tukar CONTENT_SOURCE="database" dalam .env.local sementara
# Bersihkan .next cache
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Build
npm run build
```

**Expected:** exit 0, tiada ralat.

**PULIH .env.local selepas build.**

---

### Step 8: Shadow HTML compare

```bash
# Build markdown mode → simpan output
CONTENT_SOURCE="markdown" npm run build
Copy-Item -Recurse -Force .next .next-markdown

# Build database mode → simpan output
CONTENT_SOURCE="database" npm run build
Copy-Item -Recurse -Force .next .next-database

# Banding (gunakan script atau manual)
# Perkara yang PERLU sepadan:
# - Route list (semua URL)
# - HTML structure
# - Metadata (title, description)
# - Visual paths
# - Credits rendering

# Bersihkan selepas
Remove-Item -Recurse -Force .next-markdown
Remove-Item -Recurse -Force .next-database
```

**Nota:** Shadow HTML compare adalah nice-to-have, bukan blocker. Content:compare 0 diff sudah membuktikan data parity.

---

## 3. Expected Row Count Validation Script

Script ini boleh disimpan dan dijalankan pada bila-bila masa untuk verifikasi:

```bash
# save as: scripts/verify-production-inventory.ts
# jalankan: npx tsx scripts/verify-production-inventory.ts

import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { Pool } from "pg";

const EXPECTED = {
  works: 5,
  contributors: 5,
  credits: 9,
  visuals: 7,
  glossary_terms: 27,
  source_works: 3,
};

async function verify() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log("=== PRODUCTION INVENTORY VERIFICATION ===\n");

  let allPass = true;
  for (const [table, expected] of Object.entries(EXPECTED)) {
    try {
      const r = await pool.query(`SELECT COUNT(*) as c FROM ${table}`);
      const actual = parseInt(r.rows[0].c as string);
      const pass = actual === expected;
      const icon = pass ? "PASS" : "FAIL";
      console.log(`${table}: ${actual} (expected ${expected}) [${icon}]`);
      if (!pass) allPass = false;
    } catch (e) {
      console.log(`${table}: ERROR (${(e as Error).message}) [FAIL]`);
      allPass = false;
    }
  }

  console.log("");
  console.log(allPass ? "ALL PASS — selamat untuk cutover" : "FAIL — JANGAN tukar CONTENT_SOURCE");

  await pool.end();
  process.exit(allPass ? 0 : 1);
}

verify();
```

---

## 4. Rollback Verification

### Rollback procedure

```bash
# Jika masalah selepas tukar CONTENT_SOURCE=database:

# 1. Vercel Dashboard → Project jalin → Settings → Environment Variables
# 2. Tukar CONTENT_SOURCE dari "database" ke "markdown"
# 3. Save
# 4. Redeploy (automatik)
```

### Rollback verification

```bash
# Selepas rollback, sahkan:
# 1. Laman web berfungsi (semua route)
# 2. Content dari markdown (bukan database)
# 3. Tiada error dalam logs

# Jalankan content:compare dengan CONTENT_SOURCE=markdown
# (sepatutnya 0 diff kerana markdown = source of truth)
```

### Nota penting

- Rollback **HANYA** tukar environment variable
- Tiada code change
- Tiada migration undo
- Database kekal utuh (tidak perlu padam)
- Markdown files kekal utuh (tidak pernah diubah)

### Jika migration gagal

```bash
# 1. Gunakan backup branch dari Neon Console
# 2. Tukar DATABASE_URL ke backup branch
# 3. Sahkan application berfungsi
# 4. Siasat punca kegagalan
# 5. Perbaiki dan jalankan semula
```

---

## 5. Final Go/No-Go Checklist

### GO criteria (SEMUA mesti PASS)

| # | Item | Status | Nota |
|---|------|--------|------|
| 1 | Backup branch wujud dan boleh disambung | ☐ | |
| 2 | Schema migration 001-018 berjaya | ☐ | |
| 3 | Migration count = 18 | ☐ | |
| 4 | Seed 5 karya berjaya | ☐ | |
| 5 | Dry inventory: ALL PASS | ☐ | |
| 6 | content:compare = 0 diff | ☐ | |
| 7 | Build CONTENT_SOURCE=database = exit 0 | ☐ | |
| 8 | Rollback procedure ditulis dan difahami | ☐ | |
| 9 | Published-only rule didokumentasikan | ☐ | |
| 10 | down() limitation dicatat | ☐ | |

### NO-GO criteria (mana-mana = STOP)

| # | Item | Status | Nota |
|---|------|--------|------|
| 1 | Backup branch TIDAK wujud | ☐ | |
| 2 | Migration GAGAL | ☐ | |
| 3 | Migration count BUKAN 18 | ☐ | |
| 4 | Seed GAGAL | ☐ | |
| 5 | Dry inventory: ada FAIL | ☐ | |
| 6 | content:compare: ada diff | ☐ | |
| 7 | Build CONTENT_SOURCE=database: GAGAL | ☐ | |
| 8 | Rollback procedure TIDAK ditulis | ☐ | |

### Keputusan

```
GO:     ☐ Ya    ☐ Tidak

Jika Ya:    Jalankan Step 8 (CONTENT_SOURCE switch)
Jika Tidak: STOP. Siasat sebelum teruskan.

Ditandatangani: ___________________
Tarikh: ___________________
```

---

## 6. Nota untuk Director

### Apa yang dokumen ini sediakan

- Exact commands untuk setiap langkah
- Expected output untuk setiap command
- Go/no-go criteria yang jelas
- Rollback verification

### Apa yang TIDAK dilakukan oleh dokumen ini

- Tiada perubahan production DB
- Tiada migration dijalankan
- Tiada CONTENT_SOURCE ditukar

### Apa yang diperlukan untuk melaksanakan

1. **Production DATABASE_URL** — perlu disahkan (sama ada masih sah)
2. **Production DATABASE_URL_UNPOOLED** — perlu disahkan
3. **Keputusan Director** — bila untuk jalankan cutover
4. **Siapa yang jalankan** — Mimo / Izzat / Codex

### Cadangan

Selepas 4D-2A disahkan, langkah seterusnya ialah **Phase 4D-2B — Execution** (jalankan semua step dalam dokumen ini pada production).

---

*Dokumen ini dikemaskini selepas Phase 4D-2A.*
*Tiada perubahan produksi dilakukan sehingga arahan seterusnya.*
