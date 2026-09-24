# Editorial Audit Guide

## Overview

The editorial audit tool checks the integrity of published works in the Jalin database.

## Usage

```bash
# Standard output
npm run audit:editorial

# JSON output (for CI/CD)
npm run audit:editorial -- --json
```

## Audit Categories

### Authors
- **PASS**: All published works have public author attribution
- **FAIL**: Some published works are missing author information
- **Action**: Add author credits to works missing them

### Revisions
- **PASS**: All published works have valid revision snapshots
- **FAIL**: Revision integrity issues detected
- **Action**: Investigate and fix revision linkage

### Visual Credits
- **PASS**: All visuals have credit attribution
- **WARNING**: Some visuals are missing credit fields
- **Action**: Requires editorial decision on credit format

### Translations
- **PASS**: No legacy translation type works
- **WARNING**: Works with `type=terjemahan` exist
- **Action**: Requires taxonomy decision (KIV-S31)

## Exit Codes

- `0`: All checks passed (PASS only)
- `1`: Some checks failed (FAIL present)

## Integration

Add to CI/CD pipeline:
```yaml
- name: Editorial Audit
  run: npm run audit:editorial
```

## KIV-S31 Items

These items require editorial decisions before resolution:

1. **Mimo display name**: Should it be "Mimo" or "Amir Syafiq"?
2. **Visual credit format**: What format should visual credits use?
3. **Translation taxonomy**: Should `type=terjemahan` be migrated to metadata?