# MVP Phase A/B Audit 01

Date: 2026-09-21
Scope: Foundation lock + Cerpen reading experience
Reference work: `Kerusi di Beranda`

## Status

**Phase A: PARTIAL PASS**
**Phase B1/B2: PARTIAL PASS**

This audit is source-level. Final visual PASS still requires browser checks on representative desktop and mobile widths.

## A1 Brand assets

### PASS
- Header uses canonical `/brand/jalin-wordmark.svg`.
- Footer uses canonical `/brand/jalin-logo-primary.svg`.
- Favicon is configured separately.
- Noncanonical reconstructed header/horizontal assets were removed.
- Brand README forbids ad-hoc cropping/reconstruction in UI.

### Verify visually
- no clipping of current wordmark;
- stacked footer mark retains correct proportions;
- favicon uses the intended round icon.

## A2 Design system

### PASS
- bounded page shell;
- stable ink/clay/paper palette;
- serif reading typography;
- sans-serif navigation/UI distinction;
- desktop and mobile breakpoints;
- sticky header;
- reusable rail visual language.

### Remaining
- move repeated font stacks and common UI colors into explicit tokens before component expansion;
- avoid introducing one-off values while Novel Pendek/Bersiri reader is built.

## A3 Responsive shell

### PASS
- desktop left/right rails;
- mobile rails hidden;
- mobile Info trigger;
- mobile bottom sheet with Karya / Watak / Editorial tabs;
- tap outside closes;
- drag down from grabber closes;
- Escape closes;
- right-edge swipe opens as optional shortcut;
- content inside sheet remains vertically scrollable.

## B1 Cerpen reader

### PASS
- title/dek/byline;
- subtle `· Maya` disclosure;
- named human editor: Izzat Anas;
- story metadata and editorial ID;
- character rail;
- contextual glossary tooltips;
- foreign terms italic without accent color;
- hero + inline visual placements;
- image alt text;
- vertical image rights strip;
- story end marker;
- no static glossary rail duplication.

### Remaining
- replace temporary signed Magnific URLs with durable object-storage URLs in Phase D;
- glossary meanings should be checked against the project copy of Kamus Dewan before READY;
- run final prose typography validator for straight quotes before READY.

## B2 Mobile QA

### Implemented safeguards
- mobile reading size and line-height;
- full-width inline images;
- hidden desktop rails;
- Info bottom sheet;
- tap + edge-swipe open;
- drag-down close;
- Escape close;
- scrollable sheet content;
- compact image rights strip.

### Manual acceptance widths
Must visually verify:
- 360 px
- 390 px
- 430 px
- 768 px

For each width check:
- no horizontal overflow;
- header/logo not clipped;
- title does not collide with viewport;
- rights strip does not obscure important image content;
- glossary tooltip remains on-screen;
- Info handle does not cover prose;
- sheet tabs remain tappable;
- sheet content scroll works.

## Decision

Do **not** move to PostgreSQL yet.

Next implementation step after visual acceptance:
1. extract reusable reader components from the current one-off Cerpen page;
2. keep the visible `Kerusi di Beranda` output unchanged;
3. use those components for a Novel Pendek prototype;
4. then build Bersiri reader;
5. only after all three reading formats are stable, lock schema v1.
