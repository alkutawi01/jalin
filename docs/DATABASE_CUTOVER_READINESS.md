# DATABASE_CUTOVER_READINESS.md

## Current Architecture

### Read Paths

1. **Markdown Mode (Current Production)**
   ```
   Admin → Publish → Markdown → MarkdownContentRepository → Public Reader
   ```

2. **Database Mode (Experimental)**
   ```
   Admin → PostgreSQL → DatabaseContentRepository → Public Reader
   ```

### Admin Components

- Works CRUD (create, read, update, archive)
- Contributors CRUD
- Credits CRUD
- Visuals CRUD
- Glossary CRUD
- Publish to Markdown workflow
- Sync status display
- Backup/rollback mechanism

### Public Components

- Homepage (`/`)
- Category pages (`/kategori/[type]`)
- Work reader pages (`/kategori/[type]/[slug]`)
- Contributor pages (`/penulis/[slug]`)

## What Was Tested

### Build Verification
- ✅ `npm run build` passes
- ✅ All routes compile successfully
- ✅ No TypeScript errors

### Content Parity
- ✅ `npm run content:compare` verifies Markdown ↔ Database equivalence
- ✅ All 3 production works match across sources

### Database Verification
- ✅ `npm run db:verify` checks database integrity
- ✅ Foreign key relationships intact
- ✅ No orphaned records

### Public Routes
- ✅ Markdown mode: all routes functional
- ✅ Database mode: all routes functional (when DATABASE_URL set)

### Admin Routes
- ✅ `/admin` dashboard loads
- ✅ `/admin/works` list loads from database
- ✅ `/admin/works/[id]` editor loads
- ✅ `/admin/contributors` list loads
- ✅ `/admin/contributors/[slug]` editor loads

## Known Limitations

### Authentication
- Admin uses development bypass (no production auth)
- Admin routes accessible without authentication in development
- **Blocker for production**: Need NextAuth or similar before switching to database mode

### Performance
- DatabaseContentRepository loads all data into memory on init
- Suitable for current scale (3 works, 5 contributors)
- May need pagination for larger datasets

### Publish Workflow
- Publish creates/overwrites Markdown files
- Backup mechanism exists but rollback is manual
- External Markdown changes detected but require manual resolution

## Blocking Issues

1. **Admin Authentication**: No production authentication implemented
   - Risk: Unauthorized access to admin routes
   - Mitigation: Keep admin routes internal/VPN-only until auth implemented

2. **Database Connection Pool**: Using default pool size
   - Risk: May need tuning for production load
   - Mitigation: Monitor and adjust `DATABASE_POOL_SIZE`

## Non-Blocking Issues

1. **Contributor Display**: Using hardcoded fallback for display names
   - Impact: Minor UX inconsistency
   - Fix: Enhance contributor service to query by slug

2. **Visual Asset Management**: Physical file deletion not implemented
   - Impact: Orphaned files possible
   - Fix: Add cleanup job or manual process

## Rollback Plan

### If Database Mode Fails

1. Set `CONTENT_SOURCE=markdown` in environment
2. Restart application
3. Public reader continues from Markdown files
4. No data loss (Markdown files preserved)

### If Publish Causes Issues

1. Use rollback endpoint: `POST /api/admin/publish` with `action: "rollback"`
2. Or manually restore from `content/backups/` directory
3. Verify Markdown content matches expected state

## Environment Change for Cutover

### To Enable Database Mode

```bash
# .env
CONTENT_SOURCE=database
DATABASE_URL=postgresql://user:password@host:5432/jalin
DATABASE_SSL=true  # if required
DATABASE_POOL_SIZE=10
```

### To Revert to Markdown Mode

```bash
# .env
CONTENT_SOURCE=markdown
# DATABASE_URL can remain set (won't be used)
```

## Verification Steps After Cutover

1. **Build succeeds**: `npm run build`
2. **Content parity**: `npm run content:compare`
3. **Database integrity**: `npm run db:verify`
4. **Homepage loads**: Check `/` displays all works
5. **Category pages load**: Check `/kategori/cerpen` etc.
6. **Reader pages load**: Check `/kategori/cerpen/kerusi-di-beranda`
7. **Visuals display**: Check hero and inline images
8. **Glossary works**: Check term tooltips
9. **Credits display**: Check byline and editorial credits
10. **Admin functional**: Check `/admin/works` loads from database

## Recommendation

**READY FOR STAGING**

### Rationale

- All core functionality implemented and tested
- Markdown/Database parity verified
- Publish workflow with safety checks in place
- Rollback mechanism available
- No critical data loss risks identified

### Preconditions for Staging

1. Set up PostgreSQL database for staging environment
2. Run migration: `npm run db:migrate`
3. Configure environment variables
4. Test with staging traffic

### Preconditions for Production

1. Implement admin authentication (NextAuth or similar)
2. Load test with production-like data
3. Monitor database performance
4. Establish backup/monitoring procedures

## Future Considerations

1. **Database as Primary**: After staging validation, consider making database the primary source
2. **Admin Authentication**: Required before production deployment
3. **AI Submission Pipeline**: Can be added after cutover stability confirmed
4. **Series/Episodes**: Can be added after basic workflow stable

---

*Document generated: 2026-09-23*
*Latest commit: 9e61a4a*
