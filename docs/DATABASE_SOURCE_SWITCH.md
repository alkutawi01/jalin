# DATABASE_SOURCE_SWITCH.md

## Overview

Jalin supports two content sources:

1. **Markdown** (default) — reads from `content/works/*.md` files
2. **Database** — reads from PostgreSQL via Kysely

Switch between them using the `CONTENT_SOURCE` environment variable.

## Current Status

| Source | Status | Notes |
|--------|--------|-------|
| Markdown | ✅ Primary | Default, used in production |
| Database | ✅ Equivalent | Verified via `npm run content:compare` |

## Configuration

### .env

```
CONTENT_SOURCE=markdown
# or
CONTENT_SOURCE=database
DATABASE_URL=postgresql://user:password@pooled-host/jalin
DATABASE_URL_UNPOOLED=postgresql://user:password@direct-host/jalin
```

### Environment Variables

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `CONTENT_SOURCE` | `markdown`, `database` | `markdown` | Selects content backend |
| `DATABASE_URL` | Pooled PostgreSQL URI | — | Runtime connection used by Next.js/Kysely, verification, and parity checks |
| `DATABASE_URL_UNPOOLED` | Direct PostgreSQL URI | — | Required only for schema migrations and session-level operations |
| `DATABASE_SSL` | `true`, `false` | `false` | Enable SSL for database connection |
| `DATABASE_POOL_SIZE` | positive integer | `5` | Runtime connection pool size |

Schema migrations never fall back to `DATABASE_URL`. A missing, invalid, or pooled `DATABASE_URL_UNPOOLED` fails before connecting, and validation errors never include credentials.

## How It Works

### Repository Pattern

```
ContentRepository (interface)
├── MarkdownContentRepository (reads .md files)
└── DatabaseContentRepository (reads PostgreSQL)
```

`repository-factory.ts` selects the implementation based on `CONTENT_SOURCE`.

### DatabaseContentRepository

- Loads all data into memory on `init()` (async warm-up)
- Serves synchronously from cache after initialization
- Pages call `initContentRepository()` which handles async initialization

### Page Routing

All three page types route through the repository:

- `/` (homepage) — `initContentRepository().getWorks()`
- `/kategori/[type]` — `initContentRepository().getWorksByType(type)`
- `/kategori/[type]/[slug]` — `initContentRepository().getWork(slug)`

## Commands

### Compare Sources

```bash
npm run content:compare
```

Output:
```
WORK PARITY CHECK

✓ kerusi-di-beranda
✓ nombor-giliran-117
✓ rumah-yang-masih-menyimpan-suara

Differences: 0
```

### Schema Migration

```bash
npm run db:schema:migrate
```

This command requires the direct `DATABASE_URL_UNPOOLED` connection.

### Import Markdown Content

```bash
npm run db:migrate
```

`db:migrate`, `db:verify`, and `content:compare` use the pooled runtime `DATABASE_URL`. `db:seed` parses source content and does not require session-level migration semantics.

### Verify Database

```bash
npm run db:verify
```

## Migration Path

1. **Now**: Markdown primary, Database verified equivalent
2. **After Admin Console (Phase 4C)**: Database can become primary
3. **Future**: Markdown kept as fallback/reference

## Constraints

- No schema changes required for parity verification
- No new tables
- No admin UI yet
- No API routes yet
- Markdown support preserved
