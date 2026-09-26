# Phase 4D-2C — Final Production Cutover Checklist

> **Status: CHECKLIST SAHAJA — tiada perubahan produksi dilakukan sehingga arahan eksplisit**

## Ringkasan

Dokumen ini ialah senarai semak terakhir sebelum production cutover. Semua nilai yang dijangkakan sudah disahkan melalui dry run (Phase 4D-2B).

**Tiada arahan dalam dokumen ini yang menjalankan sebarang perubahan ke database produksi.**

---

## 1. Current Production Git SHA

```
HEAD (local main):  69215e5
ORIGIN/main:        69215e5
Status:             Selari (tiada ahead/behind)
Commit message:     docs: Phase 4D-2B cutover dry run results + fix table name
```

### Nota

- SHA ini ialah **sumber cutover** — jangan ubah selepas freeze window bermula
- Semua verification dilakukan terhadap SHA ini
- Jika ada commit baru selepas freeze, perlu semak semula

---

## 2. Neon Production Backup Confirmation

### Sebelum cutover

**WAJIB** bukti backup wujud dan boleh disambung.

```bash
# Neon Console → Project jalin → Branches
# Sahkan:
# - Branch backup wujud (nama: backup-pre-4d2c-YYYYMMDD)
# - Status: Ready
# - Connection string boleh disambung
# - Timestamp backup dicatat
```

### Backup verification

| # | Item | Sah? | Nota |
|---|------|------|------|
| 1 | Branch backup wujud di Neon Console | ☐ | |
| 2 | Branch status = "Ready" | ☐ | |
| 3 | Connection string boleh disambung | ☐ | |
| 4 | Timestamp backup dicatat | ☐ | |
| 5 | Backup branch berbeza dari production branch | ☐ | |

### Jika backup GAGAL

**STOP.** Jangan teruskan dengan cutover.

---

## 3. Expected Migration Count

```
Expected: 18
Table:    kysely_migration (BUKAN _kysely_migrations)
```

### Verification command

```bash
DATABASE_URL="<production-pooled-url>" \
  node -e "
    require('dotenv').config();
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    pool.query('SELECT COUNT(*) as c FROM kysely_migration')
      .then(r => {
        console.log('Migrations:', r.rows[0].c, '(expected 18)');
        console.log('Status:', r.rows[0].c == 18 ? 'PASS' : 'FAIL');
        pool.end();
      });
  "
```

### Jika count BUKAN 18

**STOP.** Siasat sebelum teruskan.

---

## 4. Expected Seed Counts

### Works (published only)

| Table | Expected | Nota |
|-------|----------|------|
| works | 5 | Hanya status === "published" |
| contributors | 5 | Semua contributor files |
| credits | 9 | Termasuk guest credits |
| visuals | 7 | Semua visual refs |
| glossary_terms | 27 | Semua glosari |
| source_works | 3 | Karya terjemahan/derivative |

### Works yang akan disemai

| # | Slug | Type | Status |
|---|------|------|--------|
| 1 | kerusi-di-beranda | cerpen | published |
| 2 | nombor-giliran-117 | cerpen | published |
| 3 | di-hadapan-singgahsana | sinopsis | published |
| 4 | gatsby-agung | fragmen | published |
| 5 | gatsby-kapal-melawan-arus | fragmen | published |

### Works yang TIDAK akan disemai

| # | Slug | Type | Status | Sebab |
|---|------|------|--------|-------|
| 1 | rumah-yang-masih-menyimpan-suara | cerpen | review | Bukan published |
| 2 | surat-yang-tidak-pernah-selesai | cerpen | review | Bukan published |

### Verification command

```bash
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
      let allPass = true;
      for (const [table, exp] of Object.entries(expected)) {
        const r = await pool.query('SELECT COUNT(*) as c FROM ' + table);
        const actual = parseInt(r.rows[0].c);
        const pass = actual === exp;
        console.log(table + ':', actual, '(expected', exp + ')', pass ? 'PASS' : 'FAIL');
        if (!pass) allPass = false;
      }
      console.log('Overall:', allPass ? 'ALL PASS' : 'FAIL');
      await pool.end();
      process.exit(allPass ? 0 : 1);
    }
    inventory();
  "
```

### Jika ada perbezaan

**STOP.** Jangan tukar CONTENT_SOURCE. Siasat perbezaan.

---

## 5. Expected Compare Result

```
content:compare = 0 diff
```

### Verification command

```bash
# Tukar .env.local ke production DATABASE_URL sementara
npx tsx scripts/content-source-compare.ts
```

### Expected output

```
CONTENT SOURCE PARITY CHECK

✓ kerusi-di-beranda
✓ nombor-giliran-117
✓ di-hadapan-singgahsana
✓ gatsby-agung
✓ gatsby-kapal-melawan-arus

Differences: 0
```

### Jika ada diff

**STOP.** Jangan tukar CONTENT_SOURCE. Siasat perbezaan.

---

## 6. CONTENT_SOURCE Switch Step

### Apabila SEMUA verification PASS

```bash
# Vercel Dashboard
# → Project: jalin
# → Settings → Environment Variables
# → Tukar CONTENT_SOURCE dari "markdown" ke "database"
# → Save
# → Redeploy (automatik selepas env var berubah)
```

### Nota penting

- Tukar HANYA selepas semua verification PASS
- Tukar HANYA di Vercel dashboard, bukan dalam code
- Redeploy automatik selepas env var berubah
- Jangan tukar semasa trafik tinggi

---

## 7. Rollback Step

### Jika masalah selepas tukar CONTENT_SOURCE=database

```bash
# Vercel Dashboard
# → Project: jalin
# → Settings → Environment Variables
# → Tukar CONTENT_SOURCE dari "database" ke "markdown"
# → Save
# → Redeploy (automatik)
```

### Nota penting

- Rollback **HANYA** tukar environment variable
- Tiada code change
- Tiada migration undo
- Database kekal utuh
- Markdown files kekal utuh

### Jika migration gagal

```bash
# 1. Gunakan backup branch dari Neon Console
# 2. Tukar DATABASE_URL ke backup branch
# 3. Sahkan application berfungsi
# 4. Siasat punca kegagalan
```

---

## 8. Post-Cutover Monitoring Checklist

### 24 jam pertama

| # | Item | Status | Nota |
|---|------|--------|------|
| 1 | Laman web load (< 3 saat) | ☐ | |
| 2 | Semua route berfungsi | ☐ | |
| 3 | Credits muncul dengan betul | ☐ | |
| 4 | Visual muncul dengan betul | ☐ | |
| 5 | Glossary muncul dengan betul | ☐ | |
| 6 | Source work attribution muncul | ☐ | |
| 7 | Metadata/reader notes muncul | ☐ | |
| 8 | Tiada error dalam logs | ☐ | |
| 9 | Performance tiada slowdown | ☐ | |
| 10 | Database connection stabil | ☐ | |

### 7 hari pertama

| # | Item | Status | Nota |
|---|------|--------|------|
| 1 | Tiada memory leak | ☐ | |
| 2 | Tiada connection pool exhaustion | ☐ | |
| 3 | Tiada data inconsistency | ☐ | |
| 4 | User reports tiada isu | ☐ | |

---

## 9. Freeze Window

### Sebelum cutover

1. **Hentikan penambahan karya baharu** sementara
2. **Pastikan tiada perubahan content** selepas seed verification
3. **Catat commit HEAD** yang menjadi sumber cutover: `69215e5`

### Semasa freeze

- Tiada commit baru ke main
- Tiada perubahan content files
- Tiada perubahan database

### Selepas cutover berjaya

- Freeze tamat
- Kembali normal development

---

## 10. Final Go/No-Go Checklist

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
| 9 | Freeze window ditetapkan | ☐ | |
| 10 | Post-cutover monitoring checklist siap | ☐ | |

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
| 9 | Freeze window TIDAK ditetapkan | ☐ | |
| 10 | Post-cutover monitoring checklist TIDAK siap | ☐ | |

---

## 11. Keputusan Akhir

### GO / HOLD

```
Keputusan:  ☐ GO    ☐ HOLD

Jika GO:
  - Jalankan Step 6 (CONTENT_SOURCE switch)
  - Monitor 24 jam pertama
  - Freeze tamat selepas 7 hari

Jika HOLD:
  - Simpan checklist ini
  - Ulang verification apabila sedia
  - Tiada perubahan produksi

Ditandatangani: ___________________
Tarikh: ___________________
Masa: ___________________
```

---

## 12. Nota untuk Director

### Apa yang dokumen ini sediakan

- Semua expected values yang sudah disahkan
- Exact commands untuk verification
- Go/no-go criteria yang jelas
- Post-cutover monitoring checklist

### Apa yang TIDAK dilakukan oleh dokumen ini

- Tiada perubahan production DB
- Tiada migration dijalankan
- Tiada CONTENT_SOURCE ditukar

### Apa yang diperlukan untuk melaksanakan

1. **Keputusan Director** — GO atau HOLD
2. **Backup branch** — perlu dicipta dan disahkan
3. **Window cutover** — masa trafik rendah
4. **Siapa yang jalankan** — Mimo / Izzat / Codex

### Cadangan

Selepas 4D-2C disahkan, Director boleh membuat keputusan:
- **GO**: Jalankan cutover mengikut urutan dalam dokumen ini
- **HOLD**: Simpan checklist, ulang verification apabila sedia

---

*Dokumen ini dikemaskini selepas Phase 4D-2C.*
*Tiada perubahan produksi dilakukan sehingga keputusan GO/HOLD.*
