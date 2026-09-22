# Backend MVP Schema

**Version**: 1.0
**Date**: 2026-09-22
**Status**: Design (no code implementation)

---

## 1. Table Definitions

### works

Core content entity. Every published piece is a Work.

```sql
CREATE TABLE works (
  id                TEXT PRIMARY KEY,
  slug              TEXT UNIQUE NOT NULL,
  title             TEXT NOT NULL,
  type              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'draft',
  genre             TEXT,
  audience          TEXT,
  dek               TEXT,
  body              TEXT,
  reading_minutes   INTEGER,
  version           TEXT NOT NULL DEFAULT 'v0.1',
  editorial_history JSONB DEFAULT '[]',
  published_at      TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_type CHECK (type IN ('cerpen','novela','bersiri','terjemahan','fragmen','sinopsis')),
  CONSTRAINT valid_status CHECK (status IN ('draft','review','ready','published','archived'))
);

CREATE INDEX idx_works_type ON works(type);
CREATE INDEX idx_works_status ON works(status);
```

**Columns**:
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | TEXT | NO | — | Work ID (JLN-CER-0001) |
| slug | TEXT | NO | — | URL-safe identifier |
| title | TEXT | NO | — | Display title |
| type | TEXT | NO | — | Content type |
| status | TEXT | NO | 'draft' | Publication status |
| genre | TEXT | YES | NULL | Free-form genre |
| audience | TEXT | YES | NULL | Target age range |
| dek | TEXT | YES | NULL | Subtitle/tagline |
| body | TEXT | YES | NULL | Markdown content |
| reading_minutes | INTEGER | YES | NULL | Estimated read time |
| version | TEXT | NO | 'v0.1' | Version identifier |
| editorial_history | JSONB | NO | '[]' | Revision history |
| published_at | TIMESTAMPTZ | YES | NULL | Publication timestamp |
| updated_at | TIMESTAMPTZ | NO | NOW() | Last modification |
| created_at | TIMESTAMPTZ | NO | NOW() | Creation timestamp |

---

### contributors

People and AI personas who contribute to Jalin content.

```sql
CREATE TABLE contributors (
  slug          TEXT PRIMARY KEY,
  display_name  TEXT NOT NULL,
  kind          TEXT NOT NULL,
  bio           TEXT,
  disclosure    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_kind CHECK (kind IN ('human','virtual','organization'))
);
```

**Columns**:
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| slug | TEXT | NO | — | URL-safe identifier |
| display_name | TEXT | NO | — | Public name |
| kind | TEXT | NO | — | Contributor type |
| bio | TEXT | YES | NULL | Public biography |
| disclosure | TEXT | YES | NULL | AI disclosure text |
| created_at | TIMESTAMPTZ | NO | NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NO | NOW() | Last modification |

---

### credits

Flexible contribution records linking works to contributors.

```sql
CREATE TABLE credits (
  id              SERIAL PRIMARY KEY,
  work_id         TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  contributor_slug TEXT REFERENCES contributors(slug),
  guest_name      TEXT,
  role_label      TEXT NOT NULL,
  byline          BOOLEAN DEFAULT true,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT credit_identity CHECK (
    contributor_slug IS NOT NULL OR guest_name IS NOT NULL
  )
);

CREATE INDEX idx_credits_work ON credits(work_id);
CREATE INDEX idx_credits_contributor ON credits(contributor_slug);
```

**Columns**:
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | SERIAL | NO | auto | Primary key |
| work_id | TEXT | NO | — | FK to works |
| contributor_slug | TEXT | YES | NULL | FK to contributors |
| guest_name | TEXT | YES | NULL | Guest contributor name |
| role_label | TEXT | NO | — | Role description |
| byline | BOOLEAN | NO | true | Show in byline |
| sort_order | INTEGER | NO | 0 | Display order |
| created_at | TIMESTAMPTZ | NO | NOW() | Creation timestamp |

**Constraints**:
- Either contributor_slug OR guest_name must be non-null
- ON DELETE CASCADE for work_id

---

### visuals

Visual assets linked to works with editorial context.

```sql
CREATE TABLE visuals (
  id            SERIAL PRIMARY KEY,
  work_id       TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  role          TEXT DEFAULT 'inline',
  src           TEXT NOT NULL,
  alt           TEXT,
  provider      TEXT,
  creation_id   TEXT,
  anchor        TEXT,
  place         TEXT DEFAULT 'after',
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_role CHECK (role IN ('hero','inline','section')),
  CONSTRAINT valid_place CHECK (place IN ('before','after'))
);

CREATE INDEX idx_visuals_work ON visuals(work_id);
```

**Columns**:
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | SERIAL | NO | auto | Primary key |
| work_id | TEXT | NO | — | FK to works |
| role | TEXT | NO | 'inline' | Visual role |
| src | TEXT | NO | — | Image path/URL |
| alt | TEXT | YES | NULL | Accessibility text |
| provider | TEXT | YES | NULL | Generation provider |
| creation_id | TEXT | YES | NULL | Provider creation ID |
| anchor | TEXT | YES | NULL | Text anchor |
| place | TEXT | NO | 'after' | Anchor placement |
| sort_order | INTEGER | NO | 0 | Display order |
| created_at | TIMESTAMPTZ | NO | NOW() | Creation timestamp |

**Constraints**:
- ON DELETE CASCADE for work_id

---

### glossary_terms

Per-work glossary entries for reader comprehension.

```sql
CREATE TABLE glossary_terms (
  id          SERIAL PRIMARY KEY,
  work_id     TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  term        TEXT NOT NULL,
  meaning     TEXT NOT NULL,
  source      TEXT DEFAULT 'Kamus Dewan Edisi Keempat',
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_glossary_work ON glossary_terms(work_id);
```

**Columns**:
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | SERIAL | NO | auto | Primary key |
| work_id | TEXT | NO | — | FK to works |
| term | TEXT | NO | — | Glossary term |
| meaning | TEXT | NO | — | Definition |
| source | TEXT | NO | 'Kamus Dewan Edisi Keempat' | Reference source |
| sort_order | INTEGER | NO | 0 | Display order |
| created_at | TIMESTAMPTZ | NO | NOW() | Creation timestamp |

**Constraints**:
- ON DELETE CASCADE for work_id

---

## 2. Entity Relationship Diagram

```
works (1) ──< (N) credits >── (1) contributors
   │
   ├──< (N) visuals
   │
   └──< (N) glossary_terms
```

**Relationships**:
- One work has many credits
- One work has many visuals
- One work has many glossary terms
- One contributor has many credits (via contributor_slug)
- All child tables cascade delete on work removal

---

## 3. Migration Plan

### Current State

```
content/works/*.md          → 3 files (kerusi, nombor, rumah)
content/contributors/*.md   → 5 files (chatgpt, izzat-anas, mimo, nara-zahin, rafiq-naim)
```

### Field Mapping: works

| Markdown Field | SQL Column | Type | Notes |
|----------------|------------|------|-------|
| id | id | TEXT | Direct mapping |
| slug | slug | TEXT | Direct mapping |
| title | title | TEXT | Direct mapping |
| type | type | TEXT | Direct mapping |
| status | status | TEXT | Direct mapping |
| genre | genre | TEXT | Direct mapping |
| audience | audience | TEXT | Direct mapping |
| dek | dek | TEXT | Direct mapping |
| (body after ---) | body | TEXT | Markdown content |
| readingMinutes | reading_minutes | INTEGER | Snake case |
| version | version | TEXT | Direct mapping |
| editorialHistory | editorial_history | JSONB | Direct JSONB |
| publishedAt | published_at | TIMESTAMPTZ | Snake case |
| updatedAt | updated_at | TIMESTAMPTZ | Snake case |
| (auto) | created_at | TIMESTAMPTZ | Generated |

### Field Mapping: contributors

| Markdown Field | SQL Column | Type | Notes |
|----------------|------------|------|-------|
| filename | slug | TEXT | Without .md |
| name | display_name | TEXT | Direct mapping |
| kind | kind | TEXT | Direct mapping |
| (body after ---) | bio | TEXT | Markdown content |
| (none) | disclosure | TEXT | Extracted from body |
| (none) | created_at | TIMESTAMPTZ | Generated |
| (none) | updated_at | TIMESTAMPTZ | Generated |

**Note**: Contributor `role` and `status` fields are NOT stored in the database. Role is captured in credits. Status is not used.

### Field Mapping: credits

| Markdown Source | SQL Column | Type | Notes |
|-----------------|------------|------|-------|
| credits[].contributor | contributor_slug | TEXT | FK to contributors |
| credits[].role | role_label | TEXT | Direct mapping |
| credits[].byline | byline | BOOLEAN | Direct mapping |
| (auto) | work_id | TEXT | From parent work |
| (auto) | sort_order | INTEGER | Array index |

### Field Mapping: visuals

| Markdown Source | SQL Column | Type | Notes |
|-----------------|------------|------|-------|
| visuals[].role | role | TEXT | Direct mapping |
| visuals[].src | src | TEXT | Direct mapping |
| visuals[].alt | alt | TEXT | Direct mapping |
| visuals[].provider | provider | TEXT | Direct mapping |
| visuals[].creationId | creation_id | TEXT | Snake case |
| visuals[].anchor | anchor | TEXT | Direct mapping |
| visuals[].place | place | TEXT | Direct mapping |
| (auto) | work_id | TEXT | From parent work |
| (auto) | sort_order | INTEGER | Array index |

### Field Mapping: glossary_terms

| Markdown Source | SQL Column | Type | Notes |
|-----------------|------------|------|-------|
| glossary[].term | term | TEXT | Direct mapping |
| glossary[].meaning | meaning | TEXT | Direct mapping |
| glossary[].source | source | TEXT | Direct mapping |
| (auto) | work_id | TEXT | From parent work |
| (auto) | sort_order | INTEGER | Array index |

### Migration Order

1. **Create schema** (5 tables, indexes, constraints)
2. **Migrate contributors** (5 rows)
3. **Migrate works** (3 rows)
4. **Migrate credits** (9 rows: 3 per work)
5. **Migrate visuals** (8 rows: 3+3+2 per work)
6. **Migrate glossary_terms** (15 rows: 6+5+4 per work)
7. **Validate row counts**
8. **Validate field values**

### Rollback Strategy

**Before migration**:
- Create database backup
- Export original markdown files

**During migration**:
- Run in transaction
- Rollback on any error

**After migration**:
- Keep original markdown files
- Keep migration scripts
- Document any data transformations

**Rollback procedure**:
1. Drop all tables
2. Delete database
3. Restore from backup if needed
4. Files remain unchanged

---

## 4. Environment Configuration

### Database

```
DATABASE_URL=postgresql://user:password@localhost:5432/jalin
DATABASE_SSL=false
DATABASE_POOL_SIZE=5
```

**Notes**:
- Use PostgreSQL 14+ for JSONB support
- Connection pooling recommended for production
- SSL required for production deployments

### Application

```
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### File Storage (Future)

```
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=./public/visuals
```

**Notes**:
- MVP uses local file storage
- Future: R2/S3 for production
- Assets stored in public/visuals/

### Environment Variables NOT Needed for MVP

| Variable | Reason |
|----------|--------|
| REDIS_URL | No caching layer |
| S3_BUCKET | Local storage only |
| MAGNIFIC_API_KEY | Manual workflow |
| AUTH_SECRET | No authentication |

---

## 5. Current Data Examples

### Works

#### kerusi-di-beranda

```yaml
id: JLN-CER-0001
slug: kerusi-di-beranda
title: Kerusi di Beranda
type: cerpen
status: published
genre: Keluarga
audience: "13-17"
version: "v0.2"
publishedAt: "2026-09-21"
updatedAt: "2026-09-22"
dek: "Di sebuah beranda yang menyimpan lebih banyak daripada yang pernah ditanya, seorang anak mula menulis sebelum sebahagian cerita keluarganya hilang."
readingMinutes: 12
```

**Credits**: 3 (nara-zahin, rafiq-naim, izzat-anas)
**Visuals**: 3 (1 hero, 2 inline)
**Glossary**: 8 terms

#### nombor-giliran-117

```yaml
id: JLN-CER-0002
slug: nombor-giliran-117
title: Nombor Giliran 117
type: cerpen
status: published
genre: Keluarga
audience: 13-17
version: v1.1
publishedAt: '2026-09-21'
updatedAt: '2026-09-22'
dek: Seorang ibu menunggu nombor gilirannya dipanggil...
readingMinutes: 11
```

**Credits**: 3 (nara-zahin, rafiq-naim, izzat-anas)
**Visuals**: 3 (1 hero, 2 inline)
**Glossary**: 5 terms

#### rumah-yang-masih-menyimpan-suara

```yaml
id: JLN-CER-0003
slug: rumah-yang-masih-menyimpan-suara
title: Rumah yang Masih Menyimpan Suara
type: cerpen
status: review
genre: Keluarga · Ingatan
audience: 13-17
version: v1.1
updatedAt: '2026-09-22'
dek: Sebuah kisah tentang seorang anak yang kembali ke rumah lama keluarganya...
readingMinutes: 12
```

**Credits**: 3 (chatgpt, mimo, izzat-anas)
**Visuals**: 3 (1 hero, 2 inline)
**Glossary**: 4 terms

---

### Contributors

#### chatgpt.md → rafiq-naim

```yaml
slug: chatgpt
display_name: "Rafiq Naim"
kind: virtual
bio: "Rafiq Naim ialah penulis maya Jalin..."
```

#### izzat-anas.md

```yaml
slug: izzat-anas
display_name: "Izzat Anas"
kind: human
bio: "Izzat Anas ialah editor manusia Jalin..."
```

#### mimo.md

```yaml
slug: mimo
display_name: "Mimo"
kind: virtual
bio: "Mimo (OpenCode) ialah penulis maya Jalin..."
```

#### nara-zahin.md

```yaml
slug: nara-zahin
display_name: "Nara Zahin"
kind: virtual
bio: "Nara Zahin ialah penulis maya Jalin..."
```

#### rafiq-naim.md

```yaml
slug: rafiq-naim
display_name: "Rafiq Naim"
kind: virtual
bio: "Rafiq Naim ialah penulis dan penyemak maya Jalin..."
```

---

## 6. Migration Script Example

```typescript
// scripts/migrate-content.ts

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { db } from '../src/lib/db';

const WORKS_DIR = './content/works';
const CONTRIBUTORS_DIR = './content/contributors';

async function migrate() {
  // 1. Create schema
  await db.execute(`
    CREATE TABLE IF NOT EXISTS works (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      genre TEXT,
      audience TEXT,
      dek TEXT,
      body TEXT,
      reading_minutes INTEGER,
      version TEXT NOT NULL DEFAULT 'v0.1',
      editorial_history JSONB DEFAULT '[]',
      published_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 2. Migrate contributors
  const contributorFiles = fs.readdirSync(CONTRIBUTORS_DIR)
    .filter(f => f.endsWith('.md'));

  for (const file of contributorFiles) {
    const raw = fs.readFileSync(path.join(CONTRIBUTORS_DIR, file), 'utf8');
    const { data, content } = matter(raw);
    const slug = file.replace('.md', '');

    await db.execute({
      sql: `INSERT INTO contributors (slug, display_name, kind, bio)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (slug) DO NOTHING`,
      args: [slug, data.name, data.kind, content.trim()]
    });
  }

  // 3. Migrate works
  const workFiles = fs.readdirSync(WORKS_DIR)
    .filter(f => f.endsWith('.md'));

  for (const file of workFiles) {
    const raw = fs.readFileSync(path.join(WORKS_DIR, file), 'utf8');
    const { data, content } = matter(raw);

    await db.execute({
      sql: `INSERT INTO works (id, slug, title, type, status, genre, audience,
            dek, body, reading_minutes, version, editorial_history,
            published_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO NOTHING`,
      args: [
        data.id, data.slug, data.title, data.type, data.status,
        data.genre, data.audience, data.dek, content.trim(),
        data.readingMinutes, data.version,
        JSON.stringify(data.editorialHistory || []),
        data.publishedAt, data.updatedAt
      ]
    });

    // 4. Migrate credits
    if (data.credits) {
      for (let i = 0; i < data.credits.length; i++) {
        const credit = data.credits[i];
        await db.execute({
          sql: `INSERT INTO credits (work_id, contributor_slug, role_label, byline, sort_order)
                VALUES (?, ?, ?, ?, ?)`,
          args: [data.id, credit.contributor, credit.role, credit.byline, i]
        });
      }
    }

    // 5. Migrate visuals
    if (data.visuals) {
      for (let i = 0; i < data.visuals.length; i++) {
        const visual = data.visuals[i];
        await db.execute({
          sql: `INSERT INTO visuals (work_id, role, src, alt, provider, creation_id, anchor, place, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            data.id, visual.role, visual.src, visual.alt,
            visual.provider, visual.creationId,
            visual.anchor, visual.place, i
          ]
        });
      }
    }

    // 6. Migrate glossary
    if (data.glossary) {
      for (let i = 0; i < data.glossary.length; i++) {
        const term = data.glossary[i];
        await db.execute({
          sql: `INSERT INTO glossary_terms (work_id, term, meaning, source, sort_order)
                VALUES (?, ?, ?, ?, ?)`,
          args: [data.id, term.term, term.meaning, term.source, i]
        });
      }
    }
  }

  // 7. Validate
  const workCount = await db.execute('SELECT COUNT(*) as count FROM works');
  const contributorCount = await db.execute('SELECT COUNT(*) as count FROM contributors');
  const creditCount = await db.execute('SELECT COUNT(*) as count FROM credits');
  const visualCount = await db.execute('SELECT COUNT(*) as count FROM visuals');
  const glossaryCount = await db.execute('SELECT COUNT(*) as count FROM glossary_terms');

  console.log('Migration complete:');
  console.log(`  Works: ${workCount.rows[0].count}`);
  console.log(`  Contributors: ${contributorCount.rows[0].count}`);
  console.log(`  Credits: ${creditCount.rows[0].count}`);
  console.log(`  Visuals: ${visualCount.rows[0].count}`);
  console.log(`  Glossary terms: ${glossaryCount.rows[0].count}`);
}

migrate().catch(console.error);
```

---

## 7. Expected Row Counts

| Table | Rows | Notes |
|-------|------|-------|
| works | 3 | kerusi, nombor, rumah |
| contributors | 5 | chatgpt, izzat-anas, mimo, nara-zahin, rafiq-naim |
| credits | 9 | 3 per work |
| visuals | 8 | 3 + 3 + 2 |
| glossary_terms | 17 | 8 + 5 + 4 |

---

## 8. Validation Queries

```sql
-- Count works by status
SELECT status, COUNT(*) FROM works GROUP BY status;

-- Count credits per work
SELECT work_id, COUNT(*) FROM credits GROUP BY work_id;

-- Count visuals per work
SELECT work_id, COUNT(*) FROM visuals GROUP BY work_id;

-- Count glossary terms per work
SELECT work_id, COUNT(*) FROM glossary_terms GROUP BY work_id;

-- Verify all credits link to valid works
SELECT c.id FROM credits c LEFT JOIN works w ON c.work_id = w.id WHERE w.id IS NULL;

-- Verify all credits link to valid contributors
SELECT c.id FROM credits c LEFT JOIN contributors ct ON c.contributor_slug = ct.slug
WHERE c.contributor_slug IS NOT NULL AND ct.slug IS NULL;

-- Verify all visuals link to valid works
SELECT v.id FROM visuals v LEFT JOIN works w ON v.work_id = w.id WHERE w.id IS NULL;

-- Verify all glossary terms link to valid works
SELECT g.id FROM glossary_terms g LEFT JOIN works w ON g.work_id = w.id WHERE w.id IS NULL;
```
