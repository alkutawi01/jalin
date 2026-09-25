# Visual & Publish Requirements (Phase 4D-9)

## Visual Schema

### Current VisualRef Interface
```typescript
interface VisualRef {
  role?: string;
  src: string;
  alt: string;
  provider?: string;
  creationId?: string;
  anchor?: string;
  place?: "before" | "after";
}
```

### Missing Fields (KIV-S31)
- `credit`: string (visual credit/attribution)
- `status`: string (draft/review/approved/published)
- `workTitle`: string (for display)
- `chapter`: string (which chapter this visual belongs to)

## Publish Validation Requirements

### Current Validation (publish-validator.ts)
- Content: body non-empty
- Authors: at least one public author
- Revisions: published_revision_id exists

### Missing Validations
- Visual credit: warning if no credit
- Translation metadata: warning if legacy type
- Reading sections: warning if sections exist but body empty

## Author Requirements

### Current ContributorRef Interface
```typescript
interface ContributorRef {
  slug: string;
  role: string;
  byline?: boolean;
}
```

### Missing Fields
- `name`: string (display name)
- `bio`: string (author bio)
- `avatar`: string (profile image)

## For Waktu Sebenar

### Before Publish
1. Author decision needed (KIV-S31)
2. Hero image needed (1 minimum)
3. Inline images optional (3-5 recommended)

### Visual Plan (Pending)
- Hero: Waktu Sebenar cover
- Inline: Key scenes from chapters
- Credit: "Ilustrasi AI — Jalin Visual Archive"