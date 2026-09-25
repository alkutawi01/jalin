# Admin Console & Backend Architecture Plan

**Version**: 1.0
**Date**: 2026-09-22
**Status**: Phase 3A Planning

---

## Novela Inconsistency Report

**Issue**: Novela was removed from SiteHeader navigation (commit 49bc21f) but is explicitly defined in all product documentation:

- `docs/MASTER_PLAN.md` Section 2: defines Novela as "Karya fiksyen lengkap yang lebih panjang daripada cerpen"
- `docs/MASTER_PLAN.md` Section 5: navigation should include Novela
- `docs/PRODUCT.md`: lists Novela as a content pillar
- `AGENTS.md` Rule 24: "Novela ialah satu Work lengkap long-form"
- `src/lib/content/types.ts`: `"novela"` is in WorkType union
- `src/app/kategori/[type]/page.tsx`: has `CATEGORY_META.novela`

**Recommendation**: Novela must be restored to SiteHeader navigation and homepage category explorer. It is a locked product definition, not an optional feature.

---

## A. Admin Console Information Architecture

### Route Structure

```
/admin                              # Dashboard (overview)
/admin/works                        # Works list (all statuses)
/admin/works/[id]                   # Work editor
/admin/contributors                 # Contributors list
/admin/contributors/[slug]          # Contributor editor
/admin/prompt-templates             # Prompt templates list
/admin/prompt-templates/[id]        # Template editor
/admin/series                       # Series list (future)
/admin/submissions                  # Submissions inbox (future)
```

**Access Control**: Routes are NOT exposed in public navigation. Authentication required (Phase 3B+).

### Dashboard (`/admin`)

**Purpose**: Quick overview of editorial pipeline.

**Content**:
- Works by status: draft / review / ready / published / archived (counts)
- Recent activity (last 10 editorial actions)
- Quick actions: Create Work, View Submissions
- System status: database connection, storage status

### Works List (`/admin/works`)

**Purpose**: Browse and filter all works.

**Columns**:
| Column | Description |
|--------|-------------|
| ID | Work ID (e.g., JLN-CER-0003) |
| Title | Work title |
| Type | cerpen / novela / bersiri / fragmen / sinopsis |
| Status | draft / review / ready / published / archived |
| Version | Current version (e.g., v1.1) |
| Updated | Last updated timestamp |
| Actions | Edit, Preview, Archive |

**Filters**:
- Status (multi-select)
- Type (multi-select)
- Search (title, ID)

**Bulk Actions**:
- Change status (draft -> review, review -> ready)
- Export selected as markdown

### Work Editor (`/admin/works/[id]`)

**Purpose**: Edit all aspects of a single work.

**Layout**: Tabbed interface

#### Tab 1: Content

**Fields**:
| Field | Type | Notes |
|-------|------|-------|
| title | text | Required |
| slug | text | Auto-generated from title, editable |
| type | select | cerpen / novela / bersiri / fragmen / sinopsis |
| status | select | draft / review / ready / published / archived |
| genre | text | Free-form |
| audience | text | e.g., "13-17 tahun" |
| dek | textarea | Subtitle/tagline |
| body | markdown editor | Full markdown with preview |
| readingMinutes | number | Auto-calculated or manual override |
| version | text | e.g., "v1.1" |

**Publication Dates**:
| Field | Type |
|-------|------|
| publishedAt | datetime (nullable) |
| updatedAt | datetime (auto) |

#### Tab 2: Credits

**Purpose**: Manage contributor credits for this work.

**Interface**:
- List of current credits (draggable for reorder)
- Each credit row:
  - Contributor (autocomplete from existing contributors)
  - OR guest display name (text input, used when contributor not in system)
  - Role label (text input, free-form)
  - Byline toggle (show/hide in public byline)
  - Public toggle (show/hide in full credits)
  - Remove button
- Add Credit button (adds empty row)
- Suggested credits section (from submission, if available)

**Role Examples** (not enforced, suggestions only):
- Penulis
- Idea asal
- Penyunting akhir
- Penterjemah
- Pengarang asal

#### Tab 3: Visuals

**Purpose**: Manage visual assets for this work.

**Interface**:
- Hero image (upload or select from assets)
- Inline visuals list with:
  - Image preview
  - Alt text
  - Role (hero / inline / section)
  - Scene description
  - Provenance (provider, creation ID)
  - Remove button
- Upload new visual (triggers Magnific provenance requirement)

#### Tab 4: Glossary

**Purpose**: Manage glossary terms for this work.

**Interface**:
- Table of terms: Term (text), Meaning (text), Source (text, default: "Kamus Dewan Edisi Keempat")
- Add term / Remove term
- Import from body (auto-detect terms)

#### Tab 5: History

**Purpose**: View editorial revision history.

**Interface**:
- Timeline of versions: Version number, Revision type (initial / minor / major), Summary, Date, Approved by
- Add revision note (for current version)

#### Tab 6: Source (Conditional)

**Purpose**: Manage source work metadata (only for fragmen, sinopsis).

**Fields**: originalTitle, author, originalLanguage, publicationYear, sourceEdition, sourceUrl, rightsStatus (public_domain / licensed / unknown_need_review), rightsNotes, verifiedAt, verifiedBy

### Contributors List (`/admin/contributors`)

**Columns**: Display Name, Slug, Kind (human/virtual/organization), Status, Works count, Actions

**Filters**: Kind, Status, Search (name)

### Contributor Editor (`/admin/contributors/[slug]`)

**Section 1: Basic Info**: displayName, slug, kind, bio, disclosure, status

**Section 2: Internal Identity (Virtual Only)**: provider, technicalModel, identitySource, personaMapping

**Warning**: Internal identity fields are NEVER rendered publicly. No public API exposes these fields.

### Prompt Templates List (`/admin/prompt-templates`)

**Columns**: Name, Version, Active (boolean), Updated, Actions (Edit, Activate)

### Prompt Template Editor (`/admin/prompt-templates/[id]`)

**Fields**: name, version, content (markdown), isActive (boolean), notes

**Version History**: List of previous versions with restore capability.

---

## B. PostgreSQL Schema Proposal

### Entity Relationship Diagram (Text)

```
works --< credits >-- contributors
  |
  +--< visuals >-- assets
  |
  +--< glossary_terms
  |
  +--< editorial_revisions
  |
  +--< reading_sections (for long-form pagination)
  |
  +--< submissions >-- submission_contributions >-- contributors

series --< episodes >-- works

prompt_templates

source_works (1:1 with works that are derivative)
```

### Table: works

```sql
CREATE TABLE works (
  id              TEXT PRIMARY KEY,           -- JLN-CER-0003
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  type            TEXT NOT NULL,              -- cerpen|novela|bersiri|fragmen|sinopsis
  status          TEXT NOT NULL DEFAULT 'draft',
  genre           TEXT,
  audience        TEXT,
  dek             TEXT,
  body            TEXT,                       -- Markdown content
  reading_minutes INTEGER,
  version         TEXT NOT NULL DEFAULT 'v0.1',
  series_id       TEXT REFERENCES series(id),
  published_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_type CHECK (type IN ('cerpen','novela','bersiri','fragmen','sinopsis')),
  CONSTRAINT valid_status CHECK (status IN ('draft','review','ready','published','archived'))
);

CREATE INDEX idx_works_type ON works(type);
CREATE INDEX idx_works_status ON works(status);
CREATE INDEX idx_works_series ON works(series_id);
```

### Table: contributors

```sql
CREATE TABLE contributors (
  slug            TEXT PRIMARY KEY,           -- rafiq-naim
  display_name    TEXT NOT NULL,
  kind            TEXT NOT NULL,              -- human|virtual|organization
  bio             TEXT,
  disclosure      TEXT,                       -- AI disclosure (mandatory for virtual)
  status          TEXT NOT NULL DEFAULT 'draft',

  -- Internal-only fields (virtual contributors)
  provider        TEXT,                       -- e.g., "OpenAI"
  technical_model TEXT,                       -- e.g., "gpt-4"
  identity_source TEXT,                       -- persona origin
  persona_mapping TEXT,                       -- capability mapping

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_kind CHECK (kind IN ('human','virtual','organization')),
  CONSTRAINT valid_status CHECK (status IN ('draft','published','archived'))
);
```

### Table: credits

```sql
CREATE TABLE credits (
  id              SERIAL PRIMARY KEY,
  work_id         TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  contributor_slug TEXT REFERENCES contributors(slug),
  guest_name      TEXT,                       -- Used when contributor not in system
  role_label      TEXT NOT NULL,              -- Free-form role description
  byline          BOOLEAN DEFAULT true,       -- Show in public byline
  public          BOOLEAN DEFAULT true,       -- Show in full credits
  sort_order      INTEGER DEFAULT 0,

  created_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT credit_identity CHECK (
    contributor_slug IS NOT NULL OR guest_name IS NOT NULL
  )
);

CREATE INDEX idx_credits_work ON credits(work_id);
CREATE INDEX idx_credits_contributor ON credits(contributor_slug);
```

### Table: assets

```sql
CREATE TABLE assets (
  id              SERIAL PRIMARY KEY,
  storage_key     TEXT UNIQUE NOT NULL,       -- R2/S3 key
  alt_text        TEXT,
  width           INTEGER,
  height          INTEGER,
  mime_type       TEXT,

  -- Provenance (mandatory)
  provider        TEXT NOT NULL DEFAULT 'Magnific',
  creation_id     TEXT,                       -- Magnific creation ID

  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: visuals

```sql
CREATE TABLE visuals (
  id              SERIAL PRIMARY KEY,
  work_id         TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  asset_id        INTEGER REFERENCES assets(id),
  role            TEXT DEFAULT 'inline',      -- hero|inline|section
  scene           TEXT,                       -- Scene description
  sort_order      INTEGER DEFAULT 0,

  created_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_role CHECK (role IN ('hero','inline','section'))
);

CREATE INDEX idx_visuals_work ON visuals(work_id);
```

### Table: glossary_terms

```sql
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
```

### Table: editorial_revisions

```sql
CREATE TABLE editorial_revisions (
  id              SERIAL PRIMARY KEY,
  work_id         TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  version         TEXT NOT NULL,
  revision_type   TEXT NOT NULL,              -- initial|minor|major
  summary         TEXT,
  notes_internal  TEXT,                       -- Not exposed publicly
  reviewed_at     TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  approved_by     TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_revision_type CHECK (revision_type IN ('initial','minor','major'))
);

CREATE INDEX idx_revisions_work ON editorial_revisions(work_id);
```

### Table: reading_sections

```sql
CREATE TABLE reading_sections (
  id              SERIAL PRIMARY KEY,
  work_id         TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  sequence        INTEGER NOT NULL,
  body            TEXT NOT NULL,              -- Markdown for this section
  page_label      TEXT,                       -- e.g., "Bab 1"
  estimated_minutes INTEGER,

  created_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(work_id, sequence)
);

CREATE INDEX idx_sections_work ON reading_sections(work_id);
```

### Table: series

```sql
CREATE TABLE series (
  id              TEXT PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  synopsis        TEXT,
  kind            TEXT NOT NULL DEFAULT 'continuous', -- continuous|anthology
  status          TEXT NOT NULL DEFAULT 'ongoing',    -- ongoing|completed
  hero_asset_id   INTEGER REFERENCES assets(id),

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_kind CHECK (kind IN ('continuous','anthology')),
  CONSTRAINT valid_status CHECK (status IN ('ongoing','completed'))
);
```

### Table: source_works

```sql
CREATE TABLE source_works (
  id              SERIAL PRIMARY KEY,
  work_id         TEXT UNIQUE NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  original_title  TEXT,
  author          TEXT,
  original_language TEXT,
  publication_year INTEGER,
  source_edition  TEXT,
  source_url      TEXT,
  rights_status   TEXT DEFAULT 'unknown_need_review',
  rights_notes    TEXT,
  verified_at     TIMESTAMPTZ,
  verified_by     TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_rights CHECK (rights_status IN ('public_domain','licensed','unknown_need_review'))
);
```

### Table: prompt_templates

```sql
CREATE TABLE prompt_templates (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  version         TEXT NOT NULL,
  content         TEXT NOT NULL,              -- Markdown prompt template
  is_active       BOOLEAN DEFAULT false,
  notes           TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(name, version)
);

-- Ensure only one active template per name
CREATE UNIQUE INDEX idx_one_active_template
  ON prompt_templates(name)
  WHERE is_active = true;
```

### Table: work_submissions

```sql
CREATE TABLE work_submissions (
  id              SERIAL PRIMARY KEY,
  work_id         TEXT REFERENCES works(id),
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  submitted_by    TEXT,                       -- Agent/contributor identifier
  status          TEXT DEFAULT 'pending',     -- pending|reviewed|accepted|rejected
  manuscript      TEXT,                       -- Raw markdown submission
  metadata_json   JSONB,                      -- Parsed frontmatter
  agent_identity  JSONB,                      -- Agent/provider info (internal only)

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_submissions_status ON work_submissions(status);
```

### Table: submission_contributions

```sql
CREATE TABLE submission_contributions (
  id              SERIAL PRIMARY KEY,
  submission_id   INTEGER NOT NULL REFERENCES work_submissions(id) ON DELETE CASCADE,
  contributor_slug TEXT REFERENCES contributors(slug),
  guest_name      TEXT,
  role_label      TEXT NOT NULL,
  suggested       BOOLEAN DEFAULT true,      -- AI-suggested, not final

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_submission_contributions ON submission_contributions(submission_id);
```

---

## C. New Work Ingestion Flow

### Overview

```
Admin / orchestrator requests new story
        |
        v
Fetch active global prompt
        |
        v
AI creates/reviews story
        |
        v
AI performs identity handshake
        |
        v
Submission contains:
  - manuscript (markdown)
  - metadata (frontmatter)
  - agent identity (provider, model, persona)
  - suggested credits (role labels, contributor references)
        |
        v
Admin reviews/edits credits
        |
        v
Editorial gates
        |
        v
Publish
```

### Step-by-Step Flow

#### 1. Request Initiation

**Trigger**: Human editor requests new work via admin console or API.

**Input**:
- Work type (cerpen, novela, etc.)
- Genre (optional)
- Audience (optional)
- Special instructions (optional)

**Action**: Create `work_submissions` record with status `pending`.

#### 2. Prompt Retrieval

**Action**: Fetch active prompt template from `prompt_templates` where `is_active = true`.

**Fallback**: If no active template, use `config/editorial/new-work-global-prompt.md` from source control.

#### 3. AI Story Creation

**Action**: AI generates story based on:
- Active prompt template
- Request parameters
- Existing works (for consistency)

**Output**: Raw manuscript (markdown) + metadata (frontmatter).

#### 4. Identity Handshake

**Action**: AI declares its identity:
- Provider (e.g., "OpenAI", "Anthropic")
- Model (e.g., "gpt-4", "claude-3-opus")
- Persona mapping (e.g., "Rafiq Naim")

**Storage**: Stored in `work_submissions.agent_identity` as JSONB.

**Important**: This identity is INTERNAL ONLY. Never exposed publicly.

#### 5. Submission Package

**Complete submission contains**:

| Component | Description |
|-----------|-------------|
| manuscript | Raw markdown body |
| metadata | Parsed frontmatter (title, type, genre, etc.) |
| agent_identity | Provider, model, persona |
| suggested_credits | Array of {role_label, contributor_slug OR guest_name} |

**Storage**: All stored in `work_submissions` record.

#### 6. Admin Review

**Human editor reviews submission**:

- **Manuscript**: Edit body text if needed
- **Metadata**: Correct title, slug, type, genre, etc.
- **Credits**:
  - Review suggested credits
  - Add/remove/reorder credits
  - Choose existing contributor OR enter guest display name
  - Assign role labels (free-form)
  - Toggle byline/public visibility

**Critical rule**: Suggested credits are NEVER automatically final public credits.

#### 7. Editorial Gates

**Before publication, all gates must pass**:

| Gate | Description |
|------|-------------|
| Content review | Age appropriateness, language fluency |
| Factual accuracy | Character/plot continuity, internal story facts |
| Glossary | All terms defined and tested |
| Credits | All contributors verified, roles correct |
| Visuals | All images have Magnific provenance |
| Metadata | Complete and accurate |
| Rights | Provenance verified (for derivative works) |
| Version | Version number updated, editorial history logged |

#### 8. Publication

**Action**: Set `status = 'published'`, set `published_at = NOW()`.

**Post-publication**: Work appears in public reader at `/kategori/[type]/[slug]`.

---

## D. Prompt Template Lifecycle

### Current State

Source-controlled file: `config/editorial/new-work-global-prompt.md`

This file is the initial source of truth for the "New Work Global Prompt."

### Lifecycle Phases

#### Phase 1: Source Control (Current)

- Template lives in `config/editorial/new-work-global-prompt.md`
- Version controlled via git
- Active template = latest version on main branch
- No admin UI

#### Phase 2: Database Template (This Phase)

- Template stored in `prompt_templates` table
- Admin UI for view/edit/version
- Only one version active per template name
- Fallback to source-controlled file if no active DB template

#### Phase 3: Integration (Future)

- Orchestrator fetches active template before AI story creation
- Template version logged in submission record
- Template changes audited

### Template Versioning Rules

1. Each version is immutable once created
2. Only one version can be active at a time
3. Activating a new version deactivates the previous
4. Version history is preserved for audit
5. Previous versions can be restored

### Template Schema

```typescript
interface PromptTemplate {
  id: number;
  name: string;          // e.g., "New Work Global Prompt"
  version: string;       // Semantic version (v1.0, v1.1, v2.0)
  content: string;       // Markdown prompt template
  isActive: boolean;     // Only one active per name
  notes?: string;        // Internal notes about this version
  createdAt: Date;
  updatedAt: Date;
}
```

### Template Content Structure (Suggested)

```markdown
# New Work Global Prompt

## Role
You are a literary editor for Jalin, a premium publication for Malaysian teenagers.

## Task
Create a [TYPE] work following these guidelines...

## Requirements
- Language: Bahasa Melayu
- Audience: 13-17 tahun
- Tone: literary, premium
- Length: [TYPE-specific guidelines]

## Output Format
- Markdown with YAML frontmatter
- Include: title, slug, type, genre, dek, credits, glossary
- Body: prose with scene breaks (***)
- Glossary terms marked with {{term}}

## Credit Declaration
Declare your contribution as:
- role_label: [your role]
- contributor_slug: [existing contributor] OR guest_name: [display name]
```

---

## E. Markdown-to-DB Migration Plan

### Migration Strategy: Non-Destructive Three-Phase Approach

#### Phase A: Markdown Remains Source of Truth

**Duration**: Until parity is validated

**Behavior**:
- Markdown files in `content/works/` remain the canonical source
- Admin console reads from markdown files
- Admin console writes changes back to markdown files
- No database involved
- All existing tools (dev-sync, validate-content) continue working

**Implementation**:
- Admin API reads `content/works/*.md` via existing `workLoader.ts`
- Admin API writes changes by updating markdown frontmatter + body
- No schema changes required

#### Phase B: Dual-Write (Admin Writes DB, Reader Reads Markdown)

**Duration**: After admin console is functional

**Behavior**:
- Admin writes to both markdown files AND database
- Reader continues to consume markdown files
- Database is populated but not yet consumed by reader
- Parity validation runs continuously

**Implementation**:
- Admin API writes to:
  1. Markdown files (existing behavior)
  2. PostgreSQL database (new behavior)
- Parity checker compares markdown frontmatter vs DB records
- Discrepancies logged for investigation

**Parity Validation Rules**:
| Field | Source of Truth | Validation |
|-------|-----------------|------------|
| id | markdown | DB matches markdown |
| slug | markdown | DB matches markdown |
| title | markdown | DB matches markdown |
| type | markdown | DB matches markdown |
| status | markdown | DB matches markdown |
| body | markdown | DB body matches markdown body |
| credits | markdown | DB credits match markdown frontmatter |
| glossary | markdown | DB glossary matches markdown frontmatter |

#### Phase C: Database Becomes Source of Truth

**Duration**: After parity validation passes

**Behavior**:
- Database is the canonical source
- Reader consumes from database
- Markdown files become export/backup format
- Admin console writes only to database

**Implementation**:
- Reader API switches from `workLoader.ts` (file-based) to database queries
- Export function generates markdown from DB records
- Markdown files retained for version control and backup

### Migration Validation Checklist

Before transitioning from Phase B to Phase C:

- [ ] All 3 published works exist in DB with correct data
- [ ] All 5 contributors exist in DB
- [ ] All credits match between markdown and DB
- [ ] All glossary terms match between markdown and DB
- [ ] All visuals match between markdown and DB
- [ ] All editorial revisions match between markdown and DB
- [ ] Reader renders correctly from DB data
- [ ] No data discrepancies in parity checker for 7 consecutive days
- [ ] Export function produces valid markdown from DB

### Rollback Plan

If issues arise during Phase C:
1. Switch reader back to markdown consumption (Phase B behavior)
2. Investigate and fix discrepancies
3. Re-run parity validation
4. Attempt Phase C transition again

---

## F. Files/Components Required for Implementation

### Phase 3A: Admin Console Foundation

#### New Files

```
src/app/admin/
  layout.tsx                          # Admin layout (no public nav)
  page.tsx                            # Dashboard
  works/
    page.tsx                          # Works list
    [id]/
      page.tsx                        # Work editor
  contributors/
    page.tsx                          # Contributors list
    [slug]/
      page.tsx                        # Contributor editor
  prompt-templates/
    page.tsx                          # Prompt templates list
    [id]/
      page.tsx                        # Template editor

src/components/admin/
  AdminLayout.tsx                     # Admin shell (sidebar, header)
  AdminNav.tsx                        # Sidebar navigation
  WorksTable.tsx                      # Works list table
  WorkEditor.tsx                      # Work editor (tabbed)
  WorkContentTab.tsx                  # Content tab
  WorkCreditsTab.tsx                  # Credits tab
  WorkVisualsTab.tsx                  # Visuals tab
  WorkGlossaryTab.tsx                 # Glossary tab
  WorkHistoryTab.tsx                  # History tab
  WorkSourceTab.tsx                   # Source tab (conditional)
  ContributorsTable.tsx               # Contributors list
  ContributorEditor.tsx               # Contributor editor
  PromptTemplatesTable.tsx            # Templates list
  PromptTemplateEditor.tsx            # Template editor
  StatusBadge.tsx                     # Status indicator
  ConfirmDialog.tsx                   # Confirmation modal

src/lib/admin/
  db.ts                               # Database connection (pg)
  queries/
    works.ts                          # Work CRUD operations
    contributors.ts                   # Contributor CRUD operations
    credits.ts                        # Credit CRUD operations
    assets.ts                         # Asset CRUD operations
    visuals.ts                        # Visual CRUD operations
    glossary.ts                       # Glossary CRUD operations
    revisions.ts                      # Revision CRUD operations
    series.ts                         # Series CRUD operations
    submissions.ts                    # Submission CRUD operations
    prompt-templates.ts               # Template CRUD operations
  parity.ts                           # Markdown/DB parity checker
  export.ts                           # DB-to-markdown export
```

#### New Dependencies

```json
{
  "pg": "^8.13.0",
  "@types/pg": "^8.11.0"
}
```

#### Modified Files

```
src/components/reader/StoryChrome.tsx   # Restore Novela to nav
src/app/page.tsx                        # Restore Novela to category explorer
```

### Phase 3B: Authentication (Future)

```
src/app/admin/auth/
  login/page.tsx                        # Login page
  callback/route.ts                     # OAuth callback

src/lib/auth/
  session.ts                            # Session management
  middleware.ts                          # Route protection
```

### Phase 3C: Database Connection (Future)

```
src/lib/db/
  connection.ts                         # Connection pool
  migrations/                           # Schema migrations
    001_initial.sql
    002_add_series.sql
```

---

## Summary

| Deliverable | Status | Notes |
|-------------|--------|-------|
| A. Admin Console IA/Spec | Complete | 8 routes, tabbed work editor |
| B. PostgreSQL Schema | Complete | 12 tables, full SQL DDL |
| C. Ingestion Workflow | Complete | 8-step flow with editorial gates |
| D. Prompt Template Lifecycle | Complete | 3-phase approach, versioning rules |
| E. Migration Plan | Complete | 3-phase non-destructive migration |
| F. File/Component List | Complete | ~25 new files, 2 modified files |
| Novela Inconsistency | Reported | Must restore to nav and homepage |
