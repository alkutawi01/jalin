# JLN-CER-0003 — Visual Review Brief

Status: `JALIN_VISUAL_REQUIRED`
Work: `Rumah yang Masih Menyimpan Suara`
Session baseline: 7
Validated PR head before this support write: `7bf0cc2bb64805c601aff11c42643b1d4b451c7b`

This is an internal commissioning/review brief only. It does not approve or publish any visual.

## Canon truth

- Opening exterior is **pagi**. The current hero production asset `Xm5ZOkMBfo` was generated with a **golden hour** prompt, so its time-of-day treatment does not match the current v1.8 manuscript.
- The handwritten-note inline scene remains canon-consistent. The note must not become readable in the image.
- The final veranda beat occurs **after Maghrib**, after Farid has phoned the agent and before he leaves. The current Work alt text says `petang`, so that metadata should be corrected only after independent visual review.
- Human faces should not be clearly visible.
- Preserve the same house architecture, veranda, yard, gate, restrained painterly Jalin House Style, and symbolic-object continuity.

## Existing production assets

- Hero: `Xm5ZOkMBfo` — Magnific / Seedream 5 Pro — needs time-of-day correction.
- Inline note: `WDaOL1OcXe` — Magnific / Seedream 5 Pro — retain unless Independent Visual Curator finds a separate defect.
- Inline veranda: `mEjYiz2hJQ` — Magnific / Seedream 5 Pro — review against the post-Maghrib anchor.

## Existing hero correction candidates

Oldest candidate first, per one-item review discipline:

1. `1liHRa4r4r` — Magnific / Seedream 5 Pro — early-morning correction candidate.
2. `lJG1FGdgv9` — Magnific / Seedream 5 Pro — later early-morning correction candidate.

Do not generate another competing hero until an Independent Visual Curator has reviewed the oldest viable candidate or recorded a concrete rejection reason.

## Independent review gate

Independent Visual Curator must check scene truth, architecture/continuity, faces, anatomy, lighting/time of day, and overall Jalin House Style. Writer/assistant support work must not mark `JALIN_VISUAL_PASSED`.

If a candidate passes, update the Work visual mapping/alt text in a separate reviewed step. If it fails, record the reason before generating a replacement.

## Persistence / review status

- Magnific provenance for all three mapped assets and both correction candidates was revalidated against the current v1.8 manuscript.
- The oldest hero candidate `1liHRa4r4r` currently has **zero Magnific review comments**. It therefore remains unreviewed; absence of comments is not approval.
- A bounded Independent Visual Curator review-request comment was attempted for `1liHRa4r4r`, but the write was blocked by the connector safety layer. Treat that request as `PENDING_HANDOFF` until it is actually persisted.
- No additional visual candidate was generated in this support pass.

## Provenance snapshot (revalidated)

| Asset | Role/state | Model | Size | Time-of-day evidence | Review state |
| --- | --- | --- | --- | --- | --- |
| `Xm5ZOkMBfo` | mapped hero | Seedream 5 Pro | 2560×1440 | source prompt explicitly says `golden hour` | mapped; needs independent correction review |
| `WDaOL1OcXe` | mapped inline note | Seedream 5 Pro | 2304×1728 | interior/natural light; note explicitly unreadable | mapped; no new defect identified |
| `mEjYiz2hJQ` | mapped veranda | Seedream 5 Pro | 2304×1728 | source prompt says `evening` | mapped; review against post-Maghrib canon |
| `1liHRa4r4r` | hero candidate #1 | Seedream 5 Pro | 2560×1440 | prompt explicitly requires `early morning`, no sunset/golden-hour | **0 review comments**; oldest candidate; unapproved |
| `lJG1FGdgv9` | hero candidate #2 | Seedream 5 Pro | 2560×1440 | prompt explicitly requires `early morning`, no sunset/golden-hour | unapproved; do not prefer over #1 without review reason |

Candidate #1 remains the next bounded visual item for an **Independent Visual Curator**. Do not update the Work mapping or public alt text until that independent gate is recorded.

Production touched = NO.


## Assist concept — post-Maghrib veranda scene

Status: `VISUAL_PENDING` — concept refinement only; no generation or approval in this step.

Stable manuscript anchor:

> Sebelum Farid pulang, Aiman berdiri sekali lagi di beranda.

Scene truth to preserve if a replacement candidate is generated later:

- Time is **after Maghrib**, after Aiman and Farid have prayed together and after Farid has completed the call asking the agent to postpone for one week.
- Aiman is at the veranda / three front steps with the **old broom**; the yard still has dry leaves and only a **small freshly swept strip** should be visible in front of the steps.
- Farid is already near the **gate**, secondary in composition, waiting quietly before leaving.
- Lighting must read as **post-Maghrib / early night**, not daylight, sunset, golden hour, or late afternoon. A restrained porch/interior practical light is acceptable if it does not overpower the dusk/night ambience.
- Keep the established house architecture, veranda, yard and gate continuity. No new signboard, caption, lettering or other readable text.
- Faces remain unclear/obscured; avoid expressive close-ups. The emotional focus is the first small act of caring for the house, not portrait drama.
- Preserve the restrained painterly Jalin House Style and the symbolic continuity of the broom/yard without adding new story objects.

This concept does **not** authorize another competing generation yet. Reuse the same persistent branch/PR and revalidate against the final manuscript after `JALIN_TEXT_REVIEW_COMPLETE` before any visual pass.
