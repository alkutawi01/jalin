# PRODUCTION_DB_PROVISIONING.md

## Gate-0 Blockers (4 Remaining)

| # | Item | Status | Classification |
|---|------|--------|----------------|
| 3 | Production DATABASE_URL exists | ⬜ BLOCKED | infrastructure |
| 4 | Production database is NOT staging database | ⬜ BLOCKED | infrastructure |
| 5 | Database backup/snapshot available | ⬜ BLOCKED | backup/recovery |
| 6 | ADMIN_SECRET configured securely | ⬜ BLOCKED | environment configuration |

## Resolution Status

### Item 3: Production DATABASE_URL

**Status**: Requires production PostgreSQL provisioned by owner/infrastructure layer.

**Action needed**:
- Owner must provision a production PostgreSQL database
- Obtain connection string
- Configure in Vercel environment variables

### Item 4: Production Database Isolation

**Status**: Cannot verify until production DB exists.

**Action needed**:
- Confirm production DB is separate from staging
- Verify different connection strings
- Test isolation

### Item 5: Backup/Snapshot

**Status**: Requires backup mechanism configured.

**Action needed**:
- Enable automated backups on production DB provider
- OR configure manual backup procedure
- Verify recovery path

### Item 6: ADMIN_SECRET

**Status**: Requires secure secret generated and configured.

**Action needed**:
- Generate strong random secret
- Configure in Vercel environment variables
- Never commit to Git

## Production Database Provisioning

### Recommended Provider

**Vercel Postgres** (if deploying on Vercel):
- Integrated with Vercel deployment
- Automatic SSL
- Built-in backups
- Connection pooling

**Alternative: Supabase/Neon**:
- Free tier available
- PostgreSQL compatible
- SSL required
- Manual backup configuration

### Provisioning Steps (Owner Action Required)

1. **Create production PostgreSQL database**
   - Via Vercel Dashboard → Storage → Create Database
   - OR via Supabase/Neon dashboard

2. **Obtain connection string**
   - Format: `postgresql://user:password@host:5432/jalin_production`

3. **Configure environment variables in Vercel**
   ```
   DATABASE_URL=postgresql://...
   DATABASE_SSL=true
   DATABASE_POOL_SIZE=10
   CONTENT_SOURCE=markdown  # Keep as markdown for now
   ADMIN_SECRET=<generate-strong-secret>
   ADMIN_ALLOWED_EMAILS=admin@jalin.adjung.com
   ADMIN_DEV_BYPASS=false
   ```

4. **Verify production/staging isolation**
   - Different DATABASE_URL values
   - Different database instances

5. **Enable backups**
   - Configure automated backups on provider
   - OR set up manual backup procedure

6. **Verify recovery**
   - Test backup restore procedure
   - Document recovery steps

## Current Status

**BLOCKED** — Production database not yet provisioned by owner.

### Next Steps (Owner Action Required)

1. Provision production PostgreSQL database
2. Obtain connection string
3. Configure in Vercel environment variables
4. Enable backups
5. Verify recovery procedure
6. Report back to Director

### What I Can Do

Once owner provides production database access:
1. Run schema migrations
2. Verify connectivity
3. Test backup/recovery
4. Update PRODUCTION_CUTOVER_PLAN.md
5. Report Gate-0 closure to Director

## Recommendation

**STOP** — Waiting for owner to provision production database.

The 4 unresolved Gate-0 items require owner/infrastructure action:
- Provision production PostgreSQL
- Configure environment variables
- Enable backups
- Verify recovery

I cannot proceed without production database access.

---

*Document generated: 2026-09-23*
*Latest commit: 9e571b3*
