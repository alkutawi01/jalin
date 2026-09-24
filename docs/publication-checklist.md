# Publication Checklist

## Overview

Before publishing a work, run the publish validator to ensure all requirements are met.

## Usage

```bash
# Validate a specific work
npm run audit:publish -- <workId>

# Example
npm run audit:publish -- JLN-CER-0003
```

## Validation Rules

### FAIL (Blocks Publication)

| Check | Description |
|-------|-------------|
| Content | Work must have non-empty body |
| Authors | Work must have at least one public author |
| Revisions | Published revision ID must point to valid revision |

### WARNING (Allows Publication)

| Check | Description |
|-------|-------------|
| Visuals | Visuals without credit field |
| Translations | Legacy translation metadata |

## Integration with Publish Flow

The validator can be integrated into the admin publish workflow:

1. Admin clicks "Publish"
2. System runs validation
3. If FAIL: Block publication, show errors
4. If WARNING: Allow publication, log warnings
5. If PASS: Proceed with publication

## Exit Codes

- `0`: All checks passed (PASS or WARNING only)
- `1`: Some checks failed (FAIL present)

## KIV-S31 Items

These items require editorial decisions:

1. **Visual credit format**: What format should visual credits use?
2. **Translation taxonomy**: Should `type=terjemahan` be migrated to metadata?
3. **Mimo display name**: Should it be "Mimo" or "Amir Syafiq"?