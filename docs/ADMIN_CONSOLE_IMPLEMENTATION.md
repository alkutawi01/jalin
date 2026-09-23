# ADMIN_CONSOLE_IMPLEMENTATION.md

## Overview

Jalin Admin Console provides a web interface for managing literary content, contributors, and publication workflow.

## Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Admin routes | ✅ | /admin, /admin/works, /admin/contributors |
| Admin layout | ✅ | Separate from public reader |
| Auth boundary | ✅ | Development bypass (placeholder) |
| DB access boundary | ✅ | src/lib/admin/db.ts |
| Dashboard | ✅ | Stats overview |
| Works editor | ⏳ | Phase 4C-2 |
| Contributors editor | ⏳ | Phase 4C-3 |
| Publish workflow | ⏳ | Phase 4C-4 |

## Architecture

```
Admin Routes
    ↓
Admin Layout
    ↓
Admin Auth (boundary)
    ↓
Admin DB (boundary)
    ↓
Database (PostgreSQL)
```

## Route Structure

| Route | Description | Status |
|-------|-------------|--------|
| /admin | Dashboard | ✅ |
| /admin/works | Works management | Placeholder |
| /admin/contributors | Contributors management | Placeholder |
| /admin/prompts | AI prompts (future) | Not started |
| /admin/submissions | Submissions (future) | Not started |

## Authentication Plan

### Phase 4C-1 (Current)
- Development bypass: always allowed in dev mode
- Mock admin user for development
- Public interface ready for future auth

### Future Implementation
- NextAuth.js integration
- Role-based access: viewer, editor, admin
- Session management
- Protected API routes

## Database Access

Admin database operations are separated from public content repository:

- `src/lib/admin/db.ts` — admin-specific queries
- `src/lib/content/repository.ts` — public content reading

This separation ensures:
- Clear responsibility boundaries
- Different access patterns
- Future permission enforcement

## Migration from Placeholder to Production

1. **Phase 4C-1**: Placeholder with dev bypass
2. **Phase 4C-2**: Add NextAuth.js
3. **Phase 4C-3**: Implement role permissions
4. **Phase 4C-4**: Add audit logging

## Constraints (Phase 4C-1)

- No NextAuth/Auth.js yet
- No user management
- No role permissions
- No CRUD editors
- No API routes

## Commands

```bash
# Build
npm run build

# Verify content parity
npm run content:compare

# Database operations
npm run db:migrate
npm run db:verify
```
