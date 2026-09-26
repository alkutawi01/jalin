# Phase 4D-2 — Production Database Cutover Plan

> **Status: PREPARATION (tiada perubahan produksi lagi)**

## Ringkasan

Phase 4D-1D telah membuktikan: Markdown → DB → Reader = 0 diff. Jalin boleh berjalan menggunakan database tanpa mengubah output pembaca.

Dokumen ini merancang langkah-langkah untuk beralih ke database produksi secara SELAMAT.

---

## Prasyarat sebelum cutover

| # | Item | Status | Nota |
|---|------|--------|------|
| 1 | Staging parity disahkan | ✅ | content:compare 0 diff, build exit 0 |
| 2 | Seeder filter published-only | ✅ | db-seed.ts selari dengan workLoader.ts |
| 3 | Production DB sedia ada | ? | Perlu disahkan — Neon `jalin` @ ep-muddy-tooth |
| 4 | Backup procedure ditentukan | ? | Neon branching / PITR |
| 5 | Rollback plan ditulis | ? | Dokumen ini |
| 6 | Shadow run dilakukan | ? | Banding tanpa tukar pembaca |
| 7 | Migration diuji pada staging | ✅ | 001-018 berjaya |
| 8 | Seed diuji pada staging | ✅ | 5 karya published berjaya |

---

## 1. Neon Production Backup Procedure

### Sebelum migration

```bash
# 1. Neon Console → Branches → production branch
# 2. Create backup branch (PITR atau manual branch)
# 3. Namakan: backup-pre-4d2-YYYYMMDD
# 4. Sahkan backup branch wujud dan boleh disambung
```

### Nota penting

- Neon **auto-backup** setiap hari (PITR 7 hari untuk plan Pro)
- Manual branch = instant copy, boleh disambung untuk verification
- **JANGAN** jalankan migration tanpa backup

---

## 2. Migration Execution Plan

### Urutan

```
Step 1: Backup production DB (Neon branch)
        ↓
Step 2: Jalankan db:schema:migrate pada production
        (001-018, semua additive — tiada DROP COLUMN)
        ↓
Step 3: Sahkan migration berjaya
        (SELECT COUNT(*) FROM kysely_migration)
        ↓
Step 4: Jalankan db:migrate (seed) pada production
        (5 karya published, 5 contributors)
        ↓
Step 5: Sahkan seed berjaya
        (row counts: works=5, credits=9, visuals=7, glossary=27)
        ↓
Step 6: Jalankan content:compare (production vs markdown)
        (sasaran: 0 diff)
        ↓
Step 7: Baru tukar CONTENT_SOURCE=database
```

### Arahan terperinci

```bash
# Step 1: Backup (lakukan dari Neon Console)
# - Pergi ke Neon Console → Project jalin → Branches
# - Create branch: "backup-pre-4d2-YYYYMMDD"
# - Tunggu branch siap (biasanya <1 minit)

# Step 2: Schema migration
DATABASE_URL="<production-pooled-url>" \
DATABASE_URL_UNPOOLED="<production-unpooled-url>" \
  npx tsx scripts/db-schema-migrate.ts

# Step 3: Verify migration
DATABASE_URL="<production-pooled-url>" \
  node -e "
    require('dotenv').config();
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    pool.query('SELECT COUNT(*) FROM kysely_migration')
      .then(r => { console.log('Migrations applied:', r.rows[0].count); pool.end(); })
      .catch(e => { console.error(e.message); process.exit(1); });
  "

# Step 4: Seed data
DATABASE_URL="<production-pooled-url>" \
  npx tsx scripts/db-migrate.ts

# Step 5: Verify seed
DATABASE_URL="<production-pooled-url>" \
  node -e "
    require('dotenv').config();
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    async function go() {
      const tables = ['works','contributors','credits','visuals','glossary_terms'];
      for (const t of tables) {
        const r = await pool.query('SELECT COUNT(*) FROM ' + t);
        console.log(t + ':', r.rows[0].count);
      }
      await pool.end();
    }
    go();
  "

# Step 6: Compare (production DB vs markdown)
# - Tukar .env.local ke production DATABASE_URL sementara
# - Jalankan content:compare
# - Sasaran: 0 diff
# - PULIH .env.local selepas

# Step 7: Tukar CONTENT_SOURCE (Vercel dashboard)
# - Pergi ke Vercel → Project jalin → Settings → Environment Variables
# - Tukar CONTENT_SOURCE dari "markdown" ke "database"
# - Redeploy
```

---

## 3. Seed Verification

### Row counts yang dijangkakan

| Table | Count | Nota |
|-------|-------|------|
| works | 5 | Hanya published (status !== "review") |
| contributors | 5 | Semua contributor files |
| credits | 9 | Termasuk guest credits |
| visuals | 7 | Semua visual refs |
| glossary_terms | 27 | Semua glosari |

### Perkara yang PERLU disemak

- [ ] `guest_name` dipisahkan daripada `contributor_slug` (bukan `guest:F. Scott Fitzgerald` dalam slug)
- [ ] `source_works` wujud untuk semua karya terjemahan/derivative
- [ ] `metadata` dan `reader` jsonb kosong atau mengandungi data yang betul
- [ ] Tiada `rightsStatus` yang hilang (guard dalam compare akan lapor)

---

## 4. Rollback Procedure

### Jika masalah selepas tukar CONTENT_SOURCE=database

```bash
# Rollback: tukar CONTENT_SOURCE semula ke "markdown"
# - Vercel dashboard → Settings → Environment Variables
# - Tukar CONTENT_SOURCE dari "database" ke "markdown"
# - Redeploy
```

### Nota penting

- Rollback HANYA tukar environment variable, bukan code
- Tiada migration perlu diundur (semua additive, tiada DROP)
- Database kekal utuh (tidak perlu padam)
- Markdown files kekal utuh (tidak pernah diubah)

### Jika migration gagal

```bash
# 1. Gunakan backup branch dari Step 1
# 2. Neon Console → Branches → backup-pre-4d2-YYYYMMD
# 3. Tukar DATABASE_URL ke backup branch
# 4. Sahkan application berfungsi
# 5. Siasat punca kegagalan
```

---

## 5. Shadow Run Procedure

### Tujuan

Banding output production (markdown) dengan output database TANPA mengubah pembaca.

### Langkah

```bash
# 1. Pastikan production berjalan dengan CONTENT_SOURCE=markdown

# 2. Jalankan content:compare dengan production DATABASE_URL
#    (sudah dilakukan dalam Step 6 migration plan)

# 3. Banding HTML output:
#    - Build dengan CONTENT_SOURCE=markdown → simpan output
#    - Build dengan CONTENT_SOURCE=database → simpan output
#    - Banding kedua-dua output

# 4. Perkara yang PERLU sepadan:
#    - Route list (semua URL yang sama)
#    - HTML structure (markup, class, attributes)
#    - Metadata (title, description, OG tags)
#    - Visual paths (src attributes)
#    - Credits rendering (names, roles, bylines)
#    - Glossary terms
#    - Source work attribution
```

### Nota

- Shadow run boleh dilakukan pada staging (sudah dilakukan dalam 4D-1D)
- Shadow run pada produksi = content:compare sahaja (bukan build)
- Build comparison = nice-to-have, bukan blocker

---

## 6. Published-Only Rule

### Dokumentasi

Seeder (`db-seed.ts`) dan reader (`workLoader.ts`) kedua-duanya hanya memproses karya dengan `status === "published"`.

```typescript
// db-seed.ts
export function getAllWorks(): WorkData[] {
  return getAllWorkFiles()
    .map(f => parseWorkFile(path.join(WORKS_DIR, f)))
    .filter((w): w is WorkData => w !== null && w.status === "published");
}

// workLoader.ts
export function getAllWorks(): Work[] {
  loadWorks();
  return worksCache.filter((entry) => entry.work.status === "published").map((entry) => entry.work);
}
```

### Implikasi

- Karya dengan `status: draft` atau `status: review` **TIDAK** akan masuk database
- Karya dengan `status: draft` atau `status: review` **TIDAK** akan dipaparkan kepada pembaca
- Jika karya tiada dalam database, ia bukan bug — ia belum dipublish

### Untuk karya baharu

1. Tulis karya dalam `content/works/*.md` dengan `status: draft`
2. Apabila sedia, tukar `status: published`
3. Jalankan `db:migrate` untuk masukkan ke database
4. Karya akan muncul kepada pembaca

---

## 7. down() Migration Limitation

### Nota teknikal

`scripts/db-schema-migrate.ts` hanya menyokong `migrateToLatest()`. Ia TIDAK menyokong arahan `down`.

```typescript
// db-schema-migrate.ts — hanya ini
const { results, error } = await migrator.migrateToLatest();
```

### Implikasi

- Untuk undur migration: gunakan SQL terus (`DROP TABLE IF EXISTS ...`)
- Untuk clear staging: guna `DELETE FROM` (bukan `down()`)
- Untuk production: backup sebelum migration (bukan bergantung pada `down()`)

### Alternatif

Jika perlu undur migration pada produksi:
```bash
# Gunakan backup branch dari Step 1
# Tukar DATABASE_URL ke backup branch
# Sahkan application berfungsi
```

---

## 8. CONTENT_SOURCE Switch Plan

### Apabila semua verification selesai

```bash
# Vercel Dashboard
# → Project: jalin
# → Settings → Environment Variables
# → Tukar CONTENT_SOURCE dari "markdown" ke "database"
# → Save
# → Redeploy (automatik selepas env var berubah)
```

### Selepas tukar

- [ ] Sahkan laman web berfungsi (semua route)
- [ ] Sahkan credits muncul dengan betul
- [ ] Sahkan visual muncul dengan betul
- [ ] Sahkan glossary muncul dengan betul
- [ ] Sahkan source work attribution muncul dengan betul
- [ ] Sahkan metadata/reader notes muncul (jika ada)

### Jika masalah

```bash
# Rollback: tukar CONTENT_SOURCE semula ke "markdown"
# → Redeploy
```

---

## 9. Checklist Lengkap

### Sebelum cutover

- [ ] Backup production DB (Neon branch)
- [ ] Sahkan backup boleh disambung
- [ ] Shadow run: content:compare 0 diff
- [ ] Dokumen rollback procedure siap
- [ ] Published-only rule didokumentasikan
- [ ] down() limitation dicatat

### Semasa cutover

- [ ] Jalankan db:schema:migrate (001-018)
- [ ] Sahkan migration berjaya
- [ ] Jalankan db:migrate (seed 5 karya)
- [ ] Sahkan seed berjaya (row counts betul)
- [ ] Jalankan content:compare (0 diff)
- [ ] Tukar CONTENT_SOURCE=database (Vercel)
- [ ] Redeploy

### Selepas cutover

- [ ] Smoke test semua route
- [ ] Sahkan credits/visual/glossary betul
- [ ] Monitor error logs (24 jam pertama)
- [ ] Sahkan performance (tiada slowdown)
- [ ] Backup baru selepas cutover berjaya

---

## 10. Nota untuk Director

### Apa yang sudah dibuktikan

- Markdown → DB → Reader = 0 diff (data parity)
- Build CONTENT_SOURCE=database = exit 0
- Semua gates (test, validate-content) lulus
- Seeder selari dengan reader (published-only)

### Apa yang BELUM dilakukan

- Production migration (belum dijalankan)
- Production seed (belum dijalankan)
- Production content:compare (belum dijalankan)
- CONTENT_SOURCE switch (belum ditukar)
- Shadow run pada produksi (belum dilakukan)

### Keputusan yang diperlukan

1. **Bila** untuk jalankan production migration?
2. **Siapa** yang akan jalankan (Mimo / Izzat / Codex)?
3. **Backup** procedure — Neon branching atau PITR?

---

*Dokumen ini dikemaskini selepas Phase 4D-1D disahkan.*
*Tiada perubahan produksi dilakukan sehingga arahan seterusnya.*
