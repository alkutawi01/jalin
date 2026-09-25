# Backend Data Architecture

**Version**: 1.0
**Date**: 2026-09-22
**Status**: Design (no code implementation)

---

## 1. Entity Model

### works

**Purpose**: Core content entity. Every published piece is a Work.

**Key fields**:
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT PK | Work ID (JLN-CER-0003) |
| slug | TEXT UNIQUE | URL-safe identifier |
| title | TEXT | Display title |
| type | TEXT | cerpen / novela / bersiri / fragmen / sinopsis |
| kind | TEXT | cerpen / novela / bersiri (structural kind) |
| status | TEXT | draft / review / ready / published / archived |
| genre | TEXT | Free-form genre tags |
| audience | TEXT | Target age range |
| dek | TEXT | Subtitle/tagline |
| body | TEXT | Markdown content |
| reading_minutes | INTEGER | Estimated read time |
| version | TEXT | Current version (v1.1) |
| series_id | TEXT FK | Nullable, links to series |
| section | TEXT | Nullable, homepage section targeting |
| section_path | TEXT | Nullable, URL path for section |
| hero_visual_id | INTEGER FK | Nullable, links to visuals |
| published_at | TIMESTAMPTZ | Publication timestamp |
| updated_at | TIMESTAMPTZ | Last modification |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Relationships**:
- works --< credits >-- contributors
- works --< visuals
- works --< glossary_terms
- works --< editorial_revisions
- works --< reading_sections
- works --< work_submissions
- works >-- series (via series_id)
- works -- source_works (1:1 for derivative works)

**Migration source**: `content/works/*.md` (frontmatter + body)

---

### contributors

**Purpose**: People and AI personas who contribute to Jalin content.

**Key fields**:
| Field | Type | Description |
|-------|------|-------------|
| slug | TEXT PK | URL-safe identifier (rafiq-naim) |
| display_name | TEXT | Public name |
| kind | TEXT | human / virtual / organization |
| bio | TEXT | Public biography |
| disclosure | TEXT | AI disclosure (mandatory for virtual) |
| status | TEXT | draft / published / archived |
| provider | TEXT | Internal: AI provider (OpenAI, etc.) |
| technical_model | TEXT | Internal: model name (gpt-4, etc.) |
| identity_source | TEXT | Internal: persona origin |
| persona_mapping | TEXT | Internal: capability mapping |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last modification |

**Relationships**:
- contributors --< credits
- contributors --< submission_contributions

**Migration source**: `content/contributors/*.md`

**Note**: Internal fields (provider, technical_model, etc.) are NEVER exposed publicly. No public API returns these fields.

---

### credits

**Purpose**: Flexible contribution records linking works to contributors.

**Key fields**:
| Field | Type | Description |
|-------|------|-------------|
| id | SERIAL PK | Auto-increment |
| work_id | TEXT FK | References works(id) |
| contributor_slug | TEXT FK | References contributors(slug), nullable |
| guest_name | TEXT | Used when contributor not in system |
| role_label | TEXT | Free-form role description |
| byline | BOOLEAN | Show in public byline |
| public | BOOLEAN | Show in full credits |
| sort_order | INTEGER | Display order |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Constraints**:
- Either contributor_slug OR guest_name must be non-null

**Migration source**: `content/works/*.md` credits array

---

### assets

**Purpose**: Physical media files stored in object storage (R2/S3).

**Key fields**:
| Field | Type | Description |
|-------|------|-------------|
| id | SERIAL PK | Auto-increment |
| storage_key | TEXT UNIQUE | Object storage path |
| alt_text | TEXT | Accessibility description |
| width | INTEGER | Image width in pixels |
| height | INTEGER | Image height in pixels |
| mime_type | TEXT | MIME type (image/png, etc.) |
| provider | TEXT | Generation provider (Magnific) |
| creation_id | TEXT | Provider-specific creation ID |
| approved | BOOLEAN | Editorial approval status |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Migration source**: New entity (no current file equivalent)

---

### visuals

**Purpose**: Links assets to works with editorial context (role, scene, placement).

**Key fields**:
| Field | Type | Description |
|-------|------|-------------|
| id | SERIAL PK | Auto-increment |
| work_id | TEXT FK | References works(id) |
| asset_id | INTEGER FK | References assets(id) |
| role | TEXT | hero / inline / section |
| scene | TEXT | Scene description |
| anchor | TEXT | Text anchor for inline placement |
| place | TEXT | before / after anchor |
| sort_order | INTEGER | Display order |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Migration source**: `content/works/*.md` visuals array

---

### glossary_terms

**Purpose**: Per-work glossary entries for reader comprehension.

**Key fields**:
| Field | Type | Description |
|-------|------|-------------|
| id | SERIAL PK | Auto-increment |
| work_id | TEXT FK | References works(id) |
| term | TEXT | Glossary term |
| meaning | TEXT | Definition |
| source | TEXT | Reference source |
| sort_order | INTEGER | Display order |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Migration source**: `content/works/*.md` glossary array

---

### series

**Purpose**: Container for episodic content (Bersiri).

**Key fields**:
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT PK | Series ID |
| slug | TEXT UNIQUE | URL-safe identifier |
| title | TEXT | Series title |
| synopsis | TEXT | Series description |
| kind | TEXT | continuous / anthology |
| status | TEXT | ongoing / completed |
| hero_asset_id | INTEGER FK | Nullable, hero image |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last modification |

**Relationships**:
- series --< episodes --< works

**Migration source**: New entity (no current file equivalent)

---

### episodes

**Purpose**: Ordering and metadata for series episodes.

**Key fields**:
| Field | Type | Description |
|-------|------|-------------|
| id | SERIAL PK | Auto-increment |
| series_id | TEXT FK | References series(id) |
| work_id | TEXT FK | References works(id) |
| episode_number | INTEGER | Ordering position |
| title | TEXT | Episode title (denormalized) |
| published_at | TIMESTAMPTZ | Episode publication date |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Constraints**:
- UNIQUE(series_id, episode_number)
- UNIQUE(series_id, work_id)

**Migration source**: New entity (no current file equivalent)

---

### source_works

**Purpose**: Provenance metadata for derivative works (fragmen, sinopsis).

**Key fields**:
| Field | Type | Description |
|-------|------|-------------|
| id | SERIAL PK | Auto-increment |
| work_id | TEXT UNIQUE FK | References works(id) |
| original_title | TEXT | Source work title |
| author | TEXT | Source author |
| original_language | TEXT | Source language |
| publication_year | INTEGER | Source publication year |
| source_edition | TEXT | Edition used |
| source_url | TEXT | Reference URL |
| rights_status | TEXT | public_domain / licensed / unknown_need_review |
| rights_notes | TEXT | Additional rights notes |
| verified_at | TIMESTAMPTZ | Rights verification date |
| verified_by | TEXT | Verifier identity |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Migration source**: `content/works/*.md` sourceWork object

---

### prompt_templates

**Purpose**: Versioned AI prompt templates for content generation.

**Key fields**:
| Field | Type | Description |
|-------|------|-------------|
| id | SERIAL PK | Auto-increment |
| name | TEXT | Template name |
| version | TEXT | Version identifier |
| content | TEXT | Markdown prompt content |
| is_active | BOOLEAN | Active template flag |
| notes | TEXT | Internal notes |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last modification |

**Constraints**:
- UNIQUE(name, version)
- Only one active template per name (partial unique index)

**Migration source**: New entity (no current file equivalent)

---

### work_submissions

**Purpose**: Incoming content submissions from AI agents or contributors.

**Key fields**:
| Field | Type | Description |
|-------|------|-------------|
| id | SERIAL PK | Auto-increment |
| work_id | TEXT FK | Nullable, links to existing work |
| submitted_at | TIMESTAMPTZ | Submission timestamp |
| submitted_by | TEXT | Agent/contributor identifier |
| status | TEXT | pending / reviewed / accepted / rejected |
| manuscript | TEXT | Raw markdown submission |
| metadata_json | JSONB | Parsed frontmatter |
| agent_identity | JSONB | Agent/provider info (internal only) |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last modification |

**Migration source**: New entity (no current file equivalent)

---

### submission_contributions

**Purpose**: Suggested credits from submission metadata.

**Key fields**:
| Field | Type | Description |
|-------|------|-------------|
| id | SERIAL PK | Auto-increment |
| submission_id | INTEGER FK | References work_submissions(id) |
| contributor_slug | TEXT FK | References contributors(slug), nullable |
| guest_name | TEXT | Guest contributor name |
| role_label | TEXT | Suggested role |
| suggested | BOOLEAN | AI-suggested flag |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Migration source**: New entity (no current file equivalent)

---

### editorial_revisions

**Purpose**: Version history for living text works.

**Key fields**:
| Field | Type | Description |
|-------|------|-------------|
| id | SERIAL PK | Auto-increment |
| work_id | TEXT FK | References works(id) |
| version | TEXT | Version identifier |
| revision_type | TEXT | initial / minor / major |
| summary | TEXT | Public revision summary |
| notes_internal | TEXT | Internal notes (not public) |
| reviewed_at | TIMESTAMPTZ | Review timestamp |
| published_at | TIMESTAMPTZ | Publication timestamp |
| approved_by | TEXT | Approver identity |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Migration source**: `content/works/*.md` editorialHistory array

---

## 2. PostgreSQL Schema

### Table Definitions

```sql
-- works
CREATE TABLE works (
  id              TEXT PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  type            TEXT NOT NULL,
  kind            TEXT NOT NULL DEFAULT 'cerpen',
  status          TEXT NOT NULL DEFAULT 'draft',
  genre           TEXT,
  audience        TEXT,
  dek             TEXT,
  body            TEXT,
  reading_minutes INTEGER,
  version         TEXT NOT NULL DEFAULT 'v0.1',
  series_id       TEXT REFERENCES series(id),
  section         TEXT,
  section_path    TEXT,
  hero_visual_id  INTEGER REFERENCES visuals(id),
  published_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_type CHECK (type IN ('cerpen','novela','bersiri','fragmen','sinopsis')),
  CONSTRAINT valid_kind CHECK (kind IN ('cerpen','novela','bersiri')),
  CONSTRAINT valid_status CHECK (status IN ('draft','review','ready','published','archived'))
);

CREATE INDEX idx_works_type ON works(type);
CREATE INDEX idx_works_status ON works(status);
CREATE INDEX idx_works_series ON works(series_id);
CREATE INDEX idx_works_section ON works(section);

-- contributors
CREATE TABLE contributors (
  slug            TEXT PRIMARY KEY,
  display_name    TEXT NOT NULL,
  kind            TEXT NOT NULL,
  bio             TEXT,
  disclosure      TEXT,
  status          TEXT NOT NULL DEFAULT 'draft',
  provider        TEXT,
  technical_model TEXT,
  identity_source TEXT,
  persona_mapping TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_kind CHECK (kind IN ('human','virtual','organization')),
  CONSTRAINT valid_status CHECK (status IN ('draft','published','archived'))
);

-- credits
CREATE TABLE credits (
  id              SERIAL PRIMARY KEY,
  work_id         TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  contributor_slug TEXT REFERENCES contributors(slug),
  guest_name      TEXT,
  role_label      TEXT NOT NULL,
  byline          BOOLEAN DEFAULT true,
  public          BOOLEAN DEFAULT true,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT credit_identity CHECK (
    contributor_slug IS NOT NULL OR guest_name IS NOT NULL
  )
);

CREATE INDEX idx_credits_work ON credits(work_id);
CREATE INDEX idx_credits_contributor ON credits(contributor_slug);

-- assets
CREATE TABLE assets (
  id              SERIAL PRIMARY KEY,
  storage_key     TEXT UNIQUE NOT NULL,
  alt_text        TEXT,
  width           INTEGER,
  height          INTEGER,
  mime_type       TEXT,
  provider        TEXT NOT NULL DEFAULT 'Magnific',
  creation_id     TEXT,
  approved        BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- visuals
CREATE TABLE visuals (
  id              SERIAL PRIMARY KEY,
  work_id         TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  asset_id        INTEGER REFERENCES assets(id),
  role            TEXT DEFAULT 'inline',
  scene           TEXT,
  anchor          TEXT,
  place           TEXT DEFAULT 'after',
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_role CHECK (role IN ('hero','inline','section')),
  CONSTRAINT valid_place CHECK (place IN ('before','after'))
);

CREATE INDEX idx_visuals_work ON visuals(work_id);

-- glossary_terms
CREATE TABLE glossary_terms (
  id              SERIAL PRIMARY KEY,
  work_id         TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  term            TEXT NOT NULL,
  meaning         TEXT NOT NULL,
  source          TEXT DEFAULT 'Kamus Dewan Edisi Keempat',
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_glossary_work ON glossary_terms(work_id);

-- series
CREATE TABLE series (
  id              TEXT PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  synopsis        TEXT,
  kind            TEXT NOT NULL DEFAULT 'continuous',
  status          TEXT NOT NULL DEFAULT 'ongoing',
  hero_asset_id   INTEGER REFERENCES assets(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_kind CHECK (kind IN ('continuous','anthology')),
  CONSTRAINT valid_status CHECK (status IN ('ongoing','completed'))
);

-- episodes
CREATE TABLE episodes (
  id              SERIAL PRIMARY KEY,
  series_id       TEXT NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  work_id         TEXT NOT NULL REFERENCES works(id),
  episode_number  INTEGER NOT NULL,
  title           TEXT,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(series_id, episode_number),
  UNIQUE(series_id, work_id)
);

CREATE INDEX idx_episodes_series ON episodes(series_id);

-- source_works
CREATE TABLE source_works (
  id                SERIAL PRIMARY KEY,
  work_id           TEXT UNIQUE NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  original_title    TEXT,
  author            TEXT,
  original_language TEXT,
  publication_year  INTEGER,
  source_edition    TEXT,
  source_url        TEXT,
  rights_status     TEXT DEFAULT 'unknown_need_review',
  rights_notes      TEXT,
  verified_at       TIMESTAMPTZ,
  verified_by       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_rights CHECK (rights_status IN ('public_domain','licensed','unknown_need_review'))
);

-- prompt_templates
CREATE TABLE prompt_templates (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  version         TEXT NOT NULL,
  content         TEXT NOT NULL,
  is_active       BOOLEAN DEFAULT false,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(name, version)
);

CREATE UNIQUE INDEX idx_one_active_template
  ON prompt_templates(name)
  WHERE is_active = true;

-- work_submissions
CREATE TABLE work_submissions (
  id              SERIAL PRIMARY KEY,
  work_id         TEXT REFERENCES works(id),
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  submitted_by    TEXT,
  status          TEXT DEFAULT 'pending',
  manuscript      TEXT,
  metadata_json   JSONB,
  agent_identity  JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_submission_status CHECK (status IN ('pending','reviewed','accepted','rejected'))
);

CREATE INDEX idx_submissions_status ON work_submissions(status);

-- submission_contributions
CREATE TABLE submission_contributions (
  id              SERIAL PRIMARY KEY,
  submission_id   INTEGER NOT NULL REFERENCES work_submissions(id) ON DELETE CASCADE,
  contributor_slug TEXT REFERENCES contributors(slug),
  guest_name      TEXT,
  role_label      TEXT NOT NULL,
  suggested       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_submission_contributions ON submission_contributions(submission_id);

-- editorial_revisions
CREATE TABLE editorial_revisions (
  id              SERIAL PRIMARY KEY,
  work_id         TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  version         TEXT NOT NULL,
  revision_type   TEXT NOT NULL,
  summary         TEXT,
  notes_internal  TEXT,
  reviewed_at     TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  approved_by     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_revision_type CHECK (revision_type IN ('initial','minor','major'))
);

CREATE INDEX idx_revisions_work ON editorial_revisions(work_id);

-- reading_sections
CREATE TABLE reading_sections (
  id                SERIAL PRIMARY KEY,
  work_id           TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  sequence          INTEGER NOT NULL,
  body              TEXT NOT NULL,
  page_label        TEXT,
  estimated_minutes INTEGER,
  created_at        TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(work_id, sequence)
);

CREATE INDEX idx_sections_work ON reading_sections(work_id);
```

---

## 3. Content Migration

### Current Architecture

```
content/works/*.md          ← Markdown files with YAML frontmatter
        ↓
src/lib/content/workLoader.ts  ← Parses frontmatter + body
        ↓
src/lib/content/types.ts       ← TypeScript interfaces
        ↓
Next.js pages                 ← Static generation
```

### Future Architecture

```
PostgreSQL database           ← Source of truth
        ↓
API layer (REST/GraphQL)     ← CRUD + queries
        ↓
Next.js pages                 ← Server-side rendering
```

### Migration Phases

#### Phase A: Markdown Remains Source of Truth

**Duration**: 2-3 weeks
**Risk**: Low

Keep existing file-based system. Add database as read-only cache.

1. Create PostgreSQL schema
2. Build migration script: parse all `content/works/*.md` → insert into database
3. Build read-only API endpoints
4. Validate data integrity (file → database comparison)
5. Deploy to staging, monitor for discrepancies

**Rollback**: Delete database, files remain unchanged.

#### Phase B: Dual-Write

**Duration**: 2-3 weeks
**Risk**: Medium

Write to both files and database. Database becomes eventual source of truth.

1. Build admin console (write operations)
2. Implement dual-write: file + database on every edit
3. Build reconciliation script (detect drift)
4. Migrate contributor files to database
5. Migrate series metadata to database

**Rollback**: Stop dual-write, revert to file-only.

#### Phase C: Database as Source of Truth

**Duration**: 3-4 weeks
**Risk**: High

Database becomes primary. Files become backup/export format.

1. Switch read path to database-only
2. Build export functionality (database → markdown files)
3. Remove file-based write operations
4. Archive original markdown files
5. Monitor for 2 weeks before full cutover

**Rollback**: Restore from markdown export, switch read path back.

#### Phase D: Full Backend

**Duration**: Ongoing
**Risk**: Low

Complete backend with all features.

1. Implement submission pipeline
2. Implement prompt template management
3. Implement visual request workflow
4. Implement series management
5. Deprecate file-based content entirely

---

## 4. Visual Pipeline

### Current State

```
Magnific URL (external)
        ↓
Manual download
        ↓
public/visuals/{slug}/
        ↓
Frontmatter src: /visuals/{slug}/hero.png
```

### Future Visual Pipeline

```
visual_requests
    ↓
provider_adapter (Magnific / other providers)
    ↓
asset_storage (R2/S3)
    ↓
editorial_approval
    ↓
assets table
    ↓
visuals table (linked to works)
```

### Visual Request Workflow

1. **Request Creation**: Editor or AI agent creates visual request
   - Work ID
   - Role (hero / inline / section)
   - Scene description
   - Text anchor (for inline placement)
   - Provider preference

2. **Provider Adapter**: System sends request to Magnific API
   - Creation ID tracked
   - Response stored in assets table

3. **Editorial Approval**: Visual reviewed by human editor
   - Approve → asset.approved = true
   - Reject → asset deleted, new request created

4. **Integration**: Approved visual linked to work
   - visuals.asset_id = assets.id
   - visuals.work_id = works.id

### Provider Adapters

```typescript
interface ProviderAdapter {
  name: string;
  createVisual(request: VisualRequest): Promise<Asset>;
  checkStatus(creationId: string): Promise<VisualStatus>;
  getAssetUrl(storageKey: string): Promise<string>;
}

// Magnific adapter
class MagnificAdapter implements ProviderAdapter {
  name = 'Magnific';
  // ... implementation
}
```

---

## 5. Series Model

### Series Types

#### Continuous Series

Episodes form a single ongoing narrative. Each episode continues from the previous.

**Example**: Cerita Hujan (ep1 → ep2 → ep3)

**Metadata**:
- kind: continuous
- status: ongoing | completed
- episodes must be read in order

#### Anthology Series

Episodes are standalone stories within a shared theme or world. Each episode is self-contained.

**Example**: Kisah-kisah Kampung (ep1: "Pokok Mangga", ep2: "Kerusi Usang")

**Metadata**:
- kind: anthology
- status: ongoing | completed
- episodes can be read in any order

### Episode Ordering

**Continuous**:
- episode_number must be sequential (1, 2, 3...)
- Gaps not allowed
- Reordering requires editorial review

**Anthology**:
- episode_number is display order
- Gaps allowed
- Reordering is safe

### Episode Status

Each episode is a Work with its own status:
- draft → review → ready → published → archived

Series status is derived:
- ongoing: at least one episode is published
- completed: all episodes published, no new episodes planned

---

## 6. Admin Requirements

### Work Management

| Operation | Description |
|-----------|-------------|
| Create Work | New work with metadata |
| Edit Work | Modify content, metadata, visuals |
| Change Status | draft → review → ready → published |
| Archive Work | Move to archived state |
| Duplicate Work | Clone for revisions |
| Export Work | Download as markdown |

### Credit Management

| Operation | Description |
|-----------|-------------|
| Add Credit | Link contributor to work |
| Edit Credit | Modify role, byline, public flags |
| Remove Credit | Unlink contributor |
| Reorder Credits | Change display order |
| Add Guest Credit | Credit without contributor record |

### Submission Management

| Operation | Description |
|-----------|-------------|
| View Submissions | List pending submissions |
| Review Submission | Accept, reject, or request changes |
| Convert to Work | Create work from accepted submission |
| Assign Credits | Map suggested credits to contributors |

### Prompt Template Management

| Operation | Description |
|-----------|-------------|
| Create Template | New prompt template |
| Edit Template | Modify content |
| Version Template | Create new version |
| Activate Template | Set as active for name |
| Deactivate Template | Remove active status |

### Visual Management

| Operation | Description |
|-----------|-------------|
| Request Visual | Create visual request |
| Upload Asset | Manual asset upload |
| Approve Visual | Mark asset as approved |
| Reject Visual | Remove rejected asset |
| Assign Visual | Link asset to work |
| Reorder Visuals | Change display order |

---

## 7. Backend Implementation Order

### Recommended Order

1. **Database Schema** (Phase A)
   - Create all tables
   - Set up migrations (Prisma/Kysely)
   - Verify constraints

2. **Data Migration** (Phase A)
   - Parse markdown files
   - Insert into database
   - Validate integrity

3. **Read-Only API** (Phase A)
   - GET /works
   - GET /works/:slug
   - GET /contributors
   - GET /contributors/:slug

4. **Admin Console - Works** (Phase B)
   - Works list with filters
   - Work editor (basic fields)
   - Status transitions

5. **Admin Console - Credits** (Phase B)
   - Credit management
   - Contributor autocomplete

6. **Admin Console - Visuals** (Phase B)
   - Visual upload
   - Asset management
   - Approval workflow

7. **Submission Pipeline** (Phase C)
   - Submission intake
   - Review workflow
   - Conversion to works

8. **Prompt Templates** (Phase C)
   - Template CRUD
   - Version management
   - Activation logic

9. **Series Management** (Phase C)
   - Series CRUD
   - Episode ordering
   - Status derivation

10. **Full Backend** (Phase D)
    - Authentication
    - Authorization
    - Audit logging
    - Performance optimization

### Risk Assessment

| Phase | Risk | Mitigation |
|-------|------|------------|
| A | Data loss | Keep original files, validate checksums |
| B | Data drift | Reconciliation script, dual-write |
| C | Downtime | Feature flags, gradual rollout |
| D | Security | Penetration testing, rate limiting |

---

## Appendix: Current File Mapping

| Current File | Database Table | Notes |
|--------------|----------------|-------|
| `content/works/*.md` | works, visuals, glossary_terms, editorial_revisions, credits | Split into multiple tables |
| `content/contributors/*.md` | contributors | Direct mapping |
| `public/visuals/**` | assets | New storage layer |
| N/A | series, episodes | New entities |
| N/A | source_works | Extracted from works |
| N/A | prompt_templates | New entity |
| N/A | work_submissions | New entity |
