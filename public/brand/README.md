# Jalin brand assets

Status: **logo direction locked**.

## Locked mark

Jalin menggunakan emblem anyaman bulat + wordmark serif **Jalin** + endorsement **oleh Adjung**.

### Typography rule

Dalam aset produksi dan UI sebenar, perkataan **Adjung** wajib menggunakan **Source Serif 4**.

### Symbol rule

Emblem tidak boleh diolah menjadi bentuk enam bucu / enam penjuru yang boleh kelihatan seperti bintang. Kekalkan bentuk anyaman organik dan bulat.

## Asset naming convention

Apabila aset produksi final dimasukkan, gunakan nama berikut:

- `jalin-logo-primary.svg`
- `jalin-logo-primary.png`
- `jalin-icon-color.svg`
- `jalin-wordmark.svg`
- `jalin-logo-mono.svg`
- `jalin-icon-mono.svg`
- `jalin-logo-reversed.svg`
- `jalin-favicon.svg`

## Source of truth

Rujuk `docs/VISUAL_BIBLE.md`.

> Nota: generated concept images ialah reference visual. Untuk production, logo perlu disimpan sebagai aset bersih dengan geometry dan typography yang konsisten; jangan regenerate logo setiap kali diperlukan.


## Canonical usage — LOCKED

- Header/navigation: use `jalin-wordmark.svg` only.
- Footer/brand card: use `jalin-logo-primary.svg`.
- Favicon/icon-only contexts: use the canonical round mark asset.
- Do not crop, reconstruct, combine, redraw or regenerate the wordmark in UI code.
- Do not create alternate logo lockups unless explicitly approved by the human editor.
- The current `jalin-wordmark.svg` and `jalin-logo-primary.svg` were replaced from user-approved source artwork and are the production source of truth.

## Vector variants (2026-09-30, approved by the human editor)
`jalin-logo-primary.svg` and `jalin-wordmark.svg` are smooth curve artwork. The icon, favicon, mono and reversed files had been low-resolution polyline traces (jagged when enlarged, and the reversed one was invisible: cream shapes on a cream rectangle). They were regenerated from the approved primary artwork with geometry untouched; only framing and colours changed:

- `jalin-icon-color.svg`, `jalin-favicon.svg`: the mark only, framed square
- `jalin-icon-mono.svg`, `jalin-logo-mono.svg`: one colour (#132f38)
- `jalin-logo-reversed.svg`: for the deep teal background (#0b2935): white wordmark, leaves in the background colour with a white outline, terracotta and beige unchanged; transparent background

Do not hand-edit these; if the primary artwork changes, regenerate them.
