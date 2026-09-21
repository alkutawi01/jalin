# Jalin MVP Master Plan v1.0

Status: **ACTIVE MASTER PLAN**

Dokumen ini ialah pelan pelaksanaan utama untuk membawa Jalin daripada prototaip satu cerpen kepada MVP yang boleh dilancarkan. Semua agent perlu bekerja mengikut turutan ini kecuali editor manusia mengubah keutamaan.

## 0. Matlamat MVP

MVP Jalin perlu membuktikan empat perkara:

1. pengalaman membaca fiksyen Melayu yang premium dan selesa;
2. sistem editorial yang teliti dan boleh diaudit;
3. kandungan pelbagai bentuk: Cerpen, Novel Pendek, dan Bersiri;
4. akaun asas yang membolehkan pembaca simpan dan sambung bacaan.

MVP **tidak** perlu membuktikan komuniti, gamifikasi, komen, self-publishing atau subscription berbayar.

## 1. Skop pelancaran

### Wajib ada

- Homepage Jalin.
- Halaman indeks Cerpen.
- Halaman indeks Novel Pendek.
- Halaman indeks Bersiri.
- Halaman karya.
- Halaman bab untuk Novel Pendek/Bersiri.
- Carian asas.
- Genre filter asas.
- Akaun pengguna.
- Simpan karya.
- Sejarah bacaan.
- Sambung bacaan.
- Progress bacaan.
- Glosari kontekstual melalui hover/tap.
- Contributor/persona bio.
- Kredit editorial.
- Ilustrasi editorial Jalin.
- Mobile reading experience.
- Minimum admin/editorial interface.
- Publish/unpublish gate oleh manusia.
- PostgreSQL.
- Object storage S3-compatible.
- Backup automatik.
- Self-host deployment awal.

### Tidak termasuk MVP

- komen;
- like/reaction;
- follower;
- badge/gamification;
- reader voting;
- open submissions;
- self-publishing;
- live reader influence;
- paid subscription UI;
- notification system besar;
- AI rating sebagai skor awam wajib.

AI rating boleh dibina sebagai eksperimen editorial selepas struktur karya stabil, tetapi jangan jadikan blocker pelancaran.

---

# FASA A — FOUNDATION LOCK

## A1. Brand assets

Pastikan hanya aset kanonik digunakan:

- header: `jalin-wordmark.svg`;
- footer/brand card: `jalin-logo-primary.svg`;
- favicon: icon bulat kanonik;
- tiada crop/reconstruction logo dalam UI;
- semua fail logo mempunyai safe bounds dan tidak terpotong.

**Definition of done:** desktop + mobile header/footer/favicons konsisten dan tiada clipping.

## A2. Design tokens

Kunci token global:

- warna;
- type scale;
- serif reading font;
- sans-serif UI font;
- spacing;
- max content width;
- border/radius;
- sticky header behavior;
- mobile breakpoints.

**Definition of done:** komponen baru tidak perlu mencipta nilai visual rawak.

## A3. Core responsive shell

Lengkapkan:

- header;
- footer;
- desktop side rails;
- mobile Info bottom sheet;
- save control;
- main content shell;
- focus/keyboard states.

**Definition of done:** satu shell boleh digunakan untuk semua jenis karya.

---

# FASA B — READING EXPERIENCE

## B1. Finalize Cerpen reader

Gunakan `Kerusi di Beranda` sebagai acceptance reference.

Wajib siap:

- byline `Maya` yang halus, bukan pill;
- metadata kiri;
- watak + editorial kanan;
- glosari tooltip sahaja;
- vertical image rights strip;
- editorial ID/version;
- typography dialog smart quotes;
- foreign terms italic tanpa warna khas;
- inline images dengan spacing stabil;
- mobile Info sheet;
- accessibility keyboard/touch;
- image alt text.

## B2. Mobile reading QA

Uji sekurang-kurangnya:

- 360 px;
- 390 px;
- 430 px;
- tablet ~768 px.

Semak:

- font size;
- line length;
- tooltip positioning;
- sticky header;
- Info handle;
- bottom sheet tap/drag;
- image rights strip;
- no horizontal overflow.

## B3. Novel Pendek reader

Bina komponen reusable:

- work header;
- chapter title/number;
- previous/next chapter;
- chapter list;
- reading progress;
- resume anchor;
- work-level metadata.

## B4. Bersiri reader

Guna reader Novel Pendek sebagai asas, tambah:

- status siri;
- latest episode/chapter;
- chapter/episode index;
- published date;
- simple “terbaru” marker.

**Definition of done Fasa B:** ketiga-tiga bentuk karya mempunyai pengalaman membaca production-ready.

---

# FASA C — CONTENT MODEL & DATABASE

## C1. Lock schema v1

Bina PostgreSQL schema minimum:

### works
- id
- slug
- title
- type
- genre
- synopsis
- status
- access_mode
- hero_asset_id
- published_at
- created_at
- updated_at

### chapters
- id
- work_id
- number
- slug
- title
- body
- status
- published_at

### glossary_terms
- id
- work_id
- chapter_id nullable
- term
- meaning
- source
- occurrence/anchor metadata

### contributors
- id
- slug
- display_name
- kind
- role
- bio
- disclosure
- avatar_asset_id

### credits
- id
- work_id
- contributor_id
- role
- sort_order

### assets
- id
- type
- storage_key
- alt_text
- width
- height
- approved
- visual_reference_role
- copyright_notice

### users
Auth-owned user identity plus app profile fields only when necessary.

### saved_works
- user_id
- work_id
- created_at

### reading_progress
- user_id
- work_id
- chapter_id nullable
- position
- updated_at

## C2. Content repository boundary

Public GitHub:
- code;
- docs;
- safe published samples if required.

Private DB/storage:
- unpublished manuscripts;
- story bible;
- future arcs;
- editorial notes;
- production media;
- user data.

## C3. Seed migration

Migrate `Kerusi di Beranda` from markdown/static page into database-backed content without changing visible output.

**Definition of done:** page rendered from DB matches current approved reader.

---

# FASA D — MEDIA SYSTEM

## D1. Object storage

Set up S3-compatible storage, preferably Cloudflare R2.

Need:

- public delivery URL;
- storage key convention;
- image metadata in DB;
- alt text;
- approved status;
- canonical reference role.

## D2. Replace signed Magnific URLs

Current Magnific signed links are temporary.

Copy approved production assets into object storage and replace all temporary signed URLs.

## D3. Image pipeline rules

Before production use:

- provenance recorded;
- scene anchor recorded;
- PASS/FIX/REJECT review;
- canonical reference recorded;
- no duplicate symbolic object generation;
- no face rule violations.

**Definition of done:** no production page depends on temporary third-party signed URLs.

---

# FASA E — DISCOVERY PAGES

## E1. Homepage

Minimum sections:

- featured work;
- latest;
- Cerpen;
- Novel Pendek;
- Bersiri;
- continue reading for logged-in users.

Avoid overcrowding.

## E2. Type indexes

Create:

- `/cerpen`
- `/novel-pendek`
- `/bersiri`

Cards show only useful metadata:

- cover/hero;
- title;
- genre;
- type/status;
- reading length or chapter count;
- contributor names.

## E3. Work landing page

For multi-chapter works:

- synopsis;
- contributors;
- chapter list;
- continue/start reading;
- save;
- editorial metadata.

## E4. Search

MVP search:

- title;
- contributor;
- genre.

No complex recommendation engine.

**Definition of done:** a new reader can discover and start any published work without knowing its URL.

---

# FASA F — ACCOUNT & READING STATE

## F1. Authentication

Implement smallest practical auth flow:

- sign up;
- sign in;
- sign out;
- reset/recovery;
- session handling.

No social profile features.

## F2. Save

Logged-in users can:

- save/unsave work;
- open saved list.

## F3. Reading history

Record recently opened works/chapters.

## F4. Reading progress

Cerpen:
- percentage or stable reading position.

Novel/Bersiri:
- chapter + position.

Update with sensible throttling; do not write on every scroll pixel.

## F5. Continue reading

Expose on:

- homepage;
- account/library;
- work page.

**Definition of done:** user can leave and reliably resume reading on another session/device.

---

# FASA G — CONTRIBUTOR & EDITORIAL IDENTITY

## G1. Contributor pages

Each contributor gets:

- display name;
- role;
- short bio;
- published works.

Virtual contributor pages must explicitly disclose AI/virtual status.

## G2. Credit rules

Byline:
- subtle AI disclosure;
- no SaaS-looking badge;
- names remain visually primary.

Editorial rail/panel:
- named human editor;
- writing/review roles;
- version/ID.

## G3. Editorial IDs

Assign stable IDs, e.g.:

- `JLN-CER-0001`
- `JLN-NPD-0001`
- `JLN-BSR-0001`

Do not reuse IDs after publication.

---

# FASA H — ADMIN / EDITORIAL MVP

Build a small internal admin, not a full CMS.

## H1. Work management

- create/edit work;
- title/slug/type/genre/synopsis;
- assign contributors;
- access mode;
- status.

## H2. Chapter management

- create/edit/reorder;
- status;
- publish date.

## H3. Glossary management

- term;
- concise definition;
- source;
- occurrence/anchor.

Kamus Dewan Edisi Keempat is primary Malay-language reference when applicable.

## H4. Asset management

- upload/select;
- alt text;
- copyright notice;
- approval;
- canonical role.

## H5. Editorial workflow

Enforce:

`DRAFT → REVIEW → VISUAL_REVIEW → READY → PUBLISHED`

Only authorized human editor can transition to PUBLISHED or unpublish.

## H6. Preview

Every unpublished work needs a private preview URL or authenticated preview state.

**Definition of done:** a normal content update does not require editing TypeScript source.

---

# FASA I — EDITORIAL QA AUTOMATION

## I1. Pre-publish validator

Flag:

- straight ASCII quotes in prose;
- missing source/glossary definition;
- missing alt text;
- missing credits;
- missing hero;
- invalid status transition;
- unpublished contributor;
- duplicate slug;
- broken chapter order;
- foreign-term styling issues;
- missing copyright metadata.

## I2. Story QA

Checklist:

- age suitability;
- POV/continuity;
- characterization;
- pacing;
- unrelated paragraphs/subheadings;
- language naturalness;
- canon conflicts;
- unresolved setup/payoff where relevant.

## I3. Visual QA

Use locked visual guardrails.

## I4. AI rating experiment — KIV

Before public rollout, define:

- what is being measured;
- which models;
- fixed rubric;
- whether result is descriptive or numeric;
- rerun/version policy;
- disclosure;
- human review.

Do not publish arbitrary AI scores until this protocol exists.

---

# FASA J — SECURITY, BACKUP & OPERATIONS

## J1. Environment/security

- no secrets in repo;
- production env vars;
- HTTPS;
- secure cookies/session settings;
- minimal DB permissions;
- admin authorization.

## J2. Database backup

Automate:

- daily PostgreSQL dump;
- retention schedule;
- encrypted offsite copy;
- secondary copy, e.g. Google Drive;
- periodic restore test.

## J3. Media backup

Ensure object storage lifecycle/versioning or secondary copy is understood and documented.

## J4. Observability

Minimum:

- application logs;
- server health;
- DB disk usage;
- backup success/failure;
- 5xx monitoring.

Avoid a large observability stack for MVP.

---

# FASA K — SELF-HOST DEPLOYMENT

## K1. Production packaging

Prefer reproducible deployment:

- Docker or documented Node deployment;
- reverse proxy;
- HTTPS;
- environment config;
- PostgreSQL connectivity;
- R2 connectivity.

## K2. Staging

Have one non-production environment before public launch.

## K3. Deployment safety

- no automatic production deploy for every tiny visual tweak;
- build/test before restart;
- rollback procedure;
- database migrations backed up before risky change.

**Definition of done:** fresh server can be brought up from documentation.

---

# FASA L — CONTENT LAUNCH PACK

MVP should not launch with one story.

Target launch pack should include all three pillars.

Practical minimum:

- several Cerpen;
- at least one complete Novel Pendek;
- at least one Bersiri with enough initial chapters to establish value.

Exact quantity is editorial, not technical. Quality and continuity override volume.

For each work require:

- final prose;
- metadata;
- contributor credit;
- glossary;
- approved hero;
- selected inline illustrations;
- alt text;
- copyright metadata;
- editorial ID/version;
- final human approval.

---

# FASA M — ACCESSIBILITY, SEO & PERFORMANCE

## M1. Accessibility

Check:

- semantic headings;
- keyboard navigation;
- focus visibility;
- contrast;
- alt text;
- tooltip keyboard/touch access;
- mobile sheet accessibility;
- reduced-motion behavior where needed.

## M2. SEO

Per work:

- title;
- description;
- canonical URL;
- Open Graph image;
- structured metadata where appropriate;
- sitemap;
- robots rules.

Do not index private previews/drafts.

## M3. Performance

- optimized production images;
- responsive image delivery;
- font loading;
- no oversized JS for reading pages;
- DB query indexes;
- cache public work data sensibly.

---

# FASA N — RELEASE QA

Before launch run a fixed acceptance suite.

## Reader

- desktop;
- tablet;
- phone;
- Chrome/Edge/Safari-class browser coverage;
- long story scroll;
- tooltips;
- save;
- resume;
- chapter navigation.

## Editorial

- create → review → preview → publish;
- unpublish;
- slug collision;
- broken asset;
- missing glossary/source;
- visual approval.

## Account

- create/sign in/sign out;
- save;
- history;
- progress;
- recovery.

## Operations

- production restart;
- DB backup;
- restore test;
- media access;
- failure logging.

No MVP launch until all critical acceptance checks pass.

---

# FASA O — LAUNCH

## O1. Soft launch

Release to a small controlled reader group first.

Observe:

- reading completion;
- mobile issues;
- confusion around Maya disclosure;
- glossary usefulness;
- resume accuracy;
- page speed;
- content feedback.

## O2. Fix window

Resolve critical/high issues before wider announcement.

## O3. Public MVP

Publish domain, sitemap, initial library and contributor pages.

---

# FASA P — POST-MVP, NOT BEFORE

Only after the reading/editorial core is stable:

- public AI rating panel;
- reader reactions;
- comments;
- recommendation engine;
- subscriptions/paywall;
- competitions;
- notifications;
- reader influence on serials;
- open submissions;
- social profiles.

---

# Current status — 21 Sept 2026

Already substantially started:

- repo foundation;
- product/editorial/AI/visual docs;
- locked brand direction;
- one Cerpen prototype;
- responsive reading layout;
- hero + inline illustration workflow;
- visual generation guardrails;
- glossary tooltip prototype;
- desktop metadata/editorial rails;
- mobile Info bottom sheet;
- footer/header brand use;
- named editor credit.

Still prototype/static:

- PostgreSQL content model;
- object storage;
- auth;
- saved works;
- reading history/progress;
- discovery pages;
- multi-chapter readers;
- contributor pages;
- admin;
- deployment;
- backups;
- launch content pack.

---

# Execution order

Agent should follow this order:

**A → B → C → D → E → F → G → H → I → J → K → L → M → N → O**

Exceptions:
- content creation for launch pack may run in parallel after Visual Bible and Editorial System are stable;
- infra preparation may begin early, but do not skip acceptance gates;
- AI rating stays KIV until its protocol is explicitly approved.

## Immediate next tasks

1. Finish Fasa A audit on current logo/header/footer and design tokens.
2. Finish Fasa B1/B2 with a full desktop + mobile QA of `Kerusi di Beranda`.
3. Build reusable reader components rather than leaving the current page as one-off code.
4. Build Novel Pendek reader prototype.
5. Build Bersiri reader prototype.
6. Then lock PostgreSQL schema v1.

This document is the default execution sequence unless Izzat Anas changes it.
