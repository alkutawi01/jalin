# Backend Implementation Scope

**Version**: 1.0
**Date**: 2026-09-22
**Status**: Pre-implementation review

---

## 1. MVP Backend Scope

### Why These 6 Entities First

The MVP backend handles **3 works** and **5 contributors**. Every reader-facing request needs: work content, who made it, what it looks like, and glossary terms. These 6 entities cover 100% of current data.

### works

**Why needed**: Every page reads from this. Homepage, category listing, reader — all query works.

**Current source**: `content/works/*.md` (3 files)

**Fields actually used today**:
| Field | Source | Notes |
|-------|--------|-------|
| id | frontmatter | JLN-CER-0001 |
| slug | frontmatter | URL-safe name |
| title | frontmatter | Display title |
| type | frontmatter | cerpen only today |
| status | frontmatter | draft / published |
| genre | frontmatter | Free-form |
| audience | frontmatter | "13-17" |
| dek | frontmatter | Subtitle |
| body | markdown | Full prose content |
| readingMinutes | frontmatter | Integer |
| version | frontmatter | "v0.2" |
| publishedAt | frontmatter | ISO date |
| updatedAt | frontmatter | ISO date |

**Fields NOT used today** (defer or drop):
| Field | Reason |
|-------|--------|
| kind | Redundant with type for MVP |
| series_id | No bersiri content exists |
| section | No homepage section targeting |
| section_path | No homepage section targeting |
| hero_visual_id | Circular reference with visuals table |

**Migration priority**: HIGH — immediate

---

### contributors

**Why needed**: Credits page, byline display, contributor profiles.

**Current source**: `content/contributors/*.md` (5 files)

**Fields actually used today**:
| Field | Source | Notes |
|-------|--------|-------|
| slug | filename | chatgpt, izzat-anas, etc. |
| display_name | frontmatter.name | "Rafiq Naim" |
| kind | frontmatter.kind | human / virtual |
| bio | body content | Markdown text |
| disclosure | body content | AI disclosure text |

**Fields NOT used today** (defer or drop):
| Field | Reason |
|-------|--------|
| status | All contributors are published |
| provider | Internal only, not used |
| technical_model | Internal only, not used |
| identity_source | Internal only, not used |
| persona_mapping | Internal only, not used |

**Migration priority**: HIGH — immediate

---

### credits

**Why needed**: Reader page displays byline. Full credits panel needs this.

**Current source**: `content/works/*.md` credits array

**Fields actually used today**:
| Field | Source | Notes |
|-------|--------|-------|
| work_id | parent work | FK to works |
| contributor_slug | credits[].contributor | FK to contributors |
| role_label | credits[].role | "initial_draft", "story_editor" |
| byline | credits[].byline | true / false |

**Fields NOT used today** (defer or drop):
| Field | Reason |
|-------|--------|
| guest_name | All credits link to contributors |
| public | All credits are public |
| sort_order | Order is implicit |

**Migration priority**: HIGH — immediate

---

### visuals

**Why needed**: Reader page displays hero and inline images.

**Current source**: `content/works/*.md` visuals array

**Fields actually used today**:
| Field | Source | Notes |
|-------|--------|-------|
| work_id | parent work | FK to works |
| role | visuals[].role | hero / inline |
| src | visuals[].src | URL or local path |
| alt | visuals[].alt | Accessibility text |
| provider | visuals[].provider | Magnific |
| creationId | visuals[].creationId | Provider ID |
| anchor | visuals[].anchor | Text anchor |
| place | visuals[].place | before / after |

**Simplification**: For MVP, store `src` directly in visuals table instead of creating assets table. Assets table adds complexity without benefit when all images are local PNGs.

**Migration priority**: HIGH — immediate

---

### glossary_terms

**Why needed**: Reader page displays glossary panel.

**Current source**: `content/works/*.md` glossary array

**Fields actually used today**:
| Field | Source | Notes |
|-------|--------|-------|
| work_id | parent work | FK to works |
| term | glossary[].term | "beranda" |
| meaning | glossary[].meaning | Definition |
| source | glossary[].source | "Kamus Dewan Edisi Keempat" |

**Migration priority**: HIGH — immediate

---

### assets

**Why needed**: Future visual pipeline needs asset tracking.

**Current state**: No assets table exists. Images are referenced by URL/path in visuals.

**MVP decision**: SKIP for now. Store `src` directly in visuals table.

**Rationale**:
- 3 works × ~2 visuals each = 6 images total
- All images are local PNGs in public/visuals/
- No need for storage abstraction yet
- Assets table adds JOIN complexity without benefit

**Migration priority**: LOW — defer until visual pipeline needed

---

## 2. Deferred Entities

### series

**Why deferred**: No Bersiri content exists. Only cerpen type works are published.

**When needed**: First Bersiri series is created.

**Prerequisite**: At least one series planned in editorial calendar.

**Estimated effort**: 1 day (table + API + admin)

---

### episodes

**Why deferred**: Depends on series. No episodic content exists.

**When needed**: First Bersiri episode is published.

**Prerequisite**: series table exists.

**Estimated effort**: 1 day (table + API + admin)

---

### source_works

**Why deferred**: No fragmen or sinopsis content exists.

**When needed**: First derivative work is published.

**Prerequisite**: None (standalone table).

**Estimated effort**: 0.5 day (table + API + admin)

---

### editorial_revisions

**Why deferred**: Editorial history is simple version tracking.

**Current state**: Stored as JSONB array in works frontmatter.

**MVP decision**: Keep as JSONB column in works table.

**Rationale**:
- 3 works × 2-3 revisions each = ~8 records
- Never queried independently
- Always displayed with parent work
- JSONB is simpler and sufficient

**When needed**: Editorial history becomes complex (10+ revisions per work, revision comparison, rollback).

**Migration priority**: LOW — defer until complexity needed

---

### prompt_templates

**Why deferred**: No AI submission pipeline exists.

**When needed**: First automated AI content generation workflow.

**Prerequisite**: AI submission pipeline designed.

**Estimated effort**: 1 day (table + API + admin)

---

### work_submissions

**Why deferred**: No AI submission pipeline exists.

**When needed**: First automated AI content submission.

**Prerequisite**: prompt_templates table exists.

**Estimated effort**: 2 days (table + API + admin + review workflow)

---

### submission_contributions

**Why deferred**: Depends on work_submissions.

**When needed**: First AI submission with suggested credits.

**Prerequisite**: work_submissions table exists.

**Estimated effort**: 0.5 day (table + API)

---

### visual_requests

**Why deferred**: Visual pipeline is manual today.

**Current workflow**: Editor creates visual in Magnific → downloads PNG → places in public/visuals/ → updates frontmatter.

**When needed**: Automated visual generation workflow.

**Prerequisite**: assets table exists, Magnific API integration designed.

**Estimated effort**: 3 days (table + API + provider adapter + approval workflow)

---

## 3. Recommended Implementation Order

### Phase 1: Read API + Migration

**Duration**: 1 week
**Risk**: Low
**Goal**: Database serves read requests. Files remain source of truth.

#### Step 1.1: Database Setup

- Create PostgreSQL database
- Create schema: works, contributors, credits, visuals, glossary_terms
- Set up migration tool (Prisma or Kysely)
- Verify constraints

#### Step 1.2: Migration Script

- Parse all `content/works/*.md`
- Parse all `content/contributors/*.md`
- Insert into database
- Validate: row counts match file counts
- Validate: field values match frontmatter

#### Step 1.3: Read-Only API

```
GET /api/works              → list all works
GET /api/works/:slug        → single work with credits, visuals, glossary
GET /api/contributors       → list all contributors
GET /api/contributors/:slug → single contributor
```

#### Step 1.4: Reader Integration

- Modify `workLoader.ts` to read from database instead of files
- Keep file fallback for rollback
- Deploy to staging
- Monitor for discrepancies

#### Step 1.5: Validation

- Compare API responses with file-based responses
- Verify all 3 works load correctly
- Verify all 5 contributors load correctly
- Verify build passes

**Exit criteria**: All reader pages work identically with database backend.

---

### Phase 2: Admin Editing

**Duration**: 2 weeks
**Risk**: Medium
**Goal**: Editors can modify content through admin UI.

#### Step 2.1: Admin Routes

```
/admin                      → dashboard
/admin/works                → works list
/admin/works/[id]           → work editor
/admin/contributors         → contributors list
/admin/contributors/[slug]  → contributor editor
```

#### Step 2.2: Work Editor

- Edit all work fields (title, type, status, genre, etc.)
- Edit body (markdown editor with preview)
- Save to database
- Export to markdown file (dual-write)

#### Step 2.3: Credit Management

- Add/remove credits
- Link to existing contributors
- Add guest credits (no contributor record)
- Reorder credits

#### Step 2.4: Visual Management

- Upload new visuals
- Edit visual metadata (alt, role, anchor)
- Remove visuals
- Save to database + public/visuals/

#### Step 2.5: Glossary Management

- Add/remove glossary terms
- Edit term and meaning
- Reorder terms

#### Step 2.6: Dual-Write

- Every save writes to database AND markdown file
- Reconciliation script detects drift
- Run reconciliation daily

**Exit criteria**: All edits persist to database and files. No data loss.

---

### Phase 3: AI Submission Pipeline

**Duration**: 3 weeks
**Risk**: High
**Goal**: AI agents can submit content for editorial review.

#### Step 3.1: Submission Schema

- Create work_submissions table
- Create submission_contributions table
- Create prompt_templates table

#### Step 3.2: Submission API

```
POST /api/submissions           → create submission
GET  /api/submissions           → list pending submissions
GET  /api/submissions/:id       → get submission details
PATCH /api/submissions/:id      → update status (review/accept/reject)
```

#### Step 3.3: Prompt Template Management

- CRUD for prompt templates
- Version management
- Active template selection

#### Step 3.4: Submission Review Workflow

- View submission in admin UI
- Compare with existing works
- Accept → create work from submission
- Reject → mark as rejected
- Request changes → return to AI agent

#### Step 3.5: Credit Mapping

- Map suggested credits to contributors
- Create guest credits for unknown contributors
- Validate credit integrity

**Exit criteria**: AI agent can submit content, editor can review and publish.

---

## 4. Simplifications for BACKEND_DATA_ARCHITECTURE.md

### Issue 1: Circular Reference (works ↔ visuals)

**Current**:
```sql
works.hero_visual_id → visuals.id
visuals.work_id → works.id
```

**Problem**: Circular foreign key. Cannot insert works without visuals, cannot insert visuals without works.

**Simplification**: Remove `hero_visual_id` from works table. Hero is just a visual with `role = 'hero'`. Query hero by:
```sql
SELECT * FROM visuals WHERE work_id = $1 AND role = 'hero' LIMIT 1;
```

**Impact**: No schema change needed, just remove the FK column.

---

### Issue 2: assets Table Unnecessary for MVP

**Current**: assets table stores file metadata. visuals.asset_id → assets.id.

**Problem**: All images are local PNGs. No object storage yet. Assets table adds JOIN complexity.

**Simplification**: Store `src` directly in visuals table for MVP. Add assets table when object storage is implemented.

**Impact**: Remove assets table from MVP schema. Remove asset_id FK from visuals.

---

### Issue 3: editorial_revisions Should Be JSONB

**Current**: Separate editorial_revisions table with 10 fields.

**Problem**: Never queried independently. Always displayed with parent work. Adds JOIN complexity.

**Simplification**: Store as JSONB column in works table:
```sql
ALTER TABLE works ADD COLUMN editorial_history JSONB DEFAULT '[]';
```

**Impact**: Remove editorial_revisions table from MVP schema.

---

### Issue 4: reading_sections Unnecessary for MVP

**Current**: Separate table for pagination sections.

**Problem**: No long-form content exists. All works fit in single body field.

**Simplification**: Remove reading_sections table from MVP. Add when novela content requires pagination.

**Impact**: Remove reading_sections table from MVP schema.

---

### Issue 5: source_works Unnecessary for MVP

**Current**: Separate table for derivative work provenance.

**Problem**: No fragmen or sinopsis content exists.

**Simplification**: Remove source_works table from MVP. Add when derivative content is published.

**Impact**: Remove source_works table from MVP schema.

---

### Issue 6: works.kind Field Redundant

**Current**: works.kind field (cerpen / novela / bersiri).

**Problem**: Redundant with works.type for MVP. All works are cerpen today.

**Simplification**: Remove kind column from works table. Use type field for all classification.

**Impact**: Remove kind column from works schema.

---

### Issue 7: works.section and section_path Unused

**Current**: Homepage section targeting fields.

**Problem**: No homepage section targeting implemented.

**Simplification**: Remove section and section_path columns from works table. Add when homepage sections are implemented.

**Impact**: Remove 2 columns from works schema.

---

## 5. Simplified MVP Schema

Based on the simplifications above, here is the recommended MVP schema:

```sql
-- works (simplified)
CREATE TABLE works (
  id              TEXT PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  type            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft',
  genre           TEXT,
  audience        TEXT,
  dek             TEXT,
  body            TEXT,
  reading_minutes INTEGER,
  version         TEXT NOT NULL DEFAULT 'v0.1',
  editorial_history JSONB DEFAULT '[]',
  published_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_type CHECK (type IN ('cerpen','novela','bersiri','fragmen','sinopsis')),
  CONSTRAINT valid_status CHECK (status IN ('draft','review','ready','published','archived'))
);

-- contributors (simplified)
CREATE TABLE contributors (
  slug            TEXT PRIMARY KEY,
  display_name    TEXT NOT NULL,
  kind            TEXT NOT NULL,
  bio             TEXT,
  disclosure      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_kind CHECK (kind IN ('human','virtual','organization'))
);

-- credits (simplified)
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

-- visuals (simplified, no assets FK)
CREATE TABLE visuals (
  id              SERIAL PRIMARY KEY,
  work_id         TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  role            TEXT DEFAULT 'inline',
  src             TEXT NOT NULL,
  alt             TEXT,
  provider        TEXT,
  creation_id     TEXT,
  anchor          TEXT,
  place           TEXT DEFAULT 'after',
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_role CHECK (role IN ('hero','inline','section')),
  CONSTRAINT valid_place CHECK (place IN ('before','after'))
);

-- glossary_terms (unchanged)
CREATE TABLE glossary_terms (
  id              SERIAL PRIMARY KEY,
  work_id         TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  term            TEXT NOT NULL,
  meaning         TEXT NOT NULL,
  source          TEXT DEFAULT 'Kamus Dewan Edisi Keempat',
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**Removed from MVP**:
- assets table
- series table
- episodes table
- source_works table
- editorial_revisions table
- reading_sections table
- prompt_templates table
- work_submissions table
- submission_contributions table
- visual_requests table

**Removed columns from works**:
- kind
- series_id
- section
- section_path
- hero_visual_id

**Added columns to works**:
- editorial_history (JSONB)

**Removed columns from contributors**:
- status
- provider
- technical_model
- identity_source
- persona_mapping

**Removed columns from credits**:
- public

**Added columns to visuals**:
- src (direct path, no assets FK)

---

## Appendix: Migration Checklist

### Before Phase 1

- [ ] Review BACKEND_DATA_ARCHITECTURE.md with simplifications
- [ ] Decide on ORM/query builder (Prisma vs Kysely)
- [ ] Set up PostgreSQL instance
- [ ] Create migration tooling

### Phase 1 Exit Criteria

- [ ] All 3 works load from database
- [ ] All 5 contributors load from database
- [ ] Credits display correctly
- [ ] Visuals display correctly
- [ ] Glossary displays correctly
- [ ] Build passes
- [ ] No regressions in reader experience

### Phase 2 Exit Criteria

- [ ] Admin UI accessible
- [ ] Work editing works
- [ ] Credit management works
- [ ] Visual upload works
- [ ] Glossary management works
- [ ] Dual-write to files works
- [ ] Reconciliation script passes

### Phase 3 Exit Criteria

- [ ] AI agent can submit content
- [ ] Editor can review submissions
- [ ] Credits can be mapped
- [ ] Work can be created from submission
- [ ] Prompt templates can be managed
