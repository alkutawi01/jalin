# JLN-CER-0003 — Visual Review Brief

Status: `JALIN_VISUAL_REQUIRED`
Work: `Rumah yang Masih Menyimpan Suara`
Session baseline: 7
Support-pass base head before this brief refresh: `78865254a5957fce8bcc46ba24d58f94dbf24135`

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
- The oldest hero candidate `1liHRa4r4r` has **one private Magnific Visual Curator assist comment** (comment `64310`, persisted 2026-09-25T11:40:10Z; revalidated in this support pass). It records that this remains the oldest bounded hero correction candidate and that final approval is withheld until `JALIN_TEXT_REVIEW_COMPLETE`; this assist note is not approval.
- Prior actual pixel-level inspection evidence for candidate `1liHRa4r4r` remains applicable because the manuscript/head basis is unchanged; final revalidation against the completed manuscript is still required before any pass marker.
- The earlier pending GitHub PR handoff at head `2e291040fcae70a8d2b56d710306637f3155ac6d` became stale after two docs-only support commits. The changed range was revalidated: only this visual-review brief changed; Session 7 prose did not. The handoff was retried first against exact head `78865254a5957fce8bcc46ba24d58f94dbf24135`, but the PR-comment write was again blocked by the connector safety layer. Treat the GitHub visual handoff as `PENDING_HANDOFF` until it is auditable on the PR.
- No additional visual candidate was generated in this support pass.
- Before attempting any veranda replacement, Magnific history was searched for this Work and confirmed there is no existing corrected post-Maghrib candidate, so duplicate generation was avoided.
- One bounded generation attempt for a corrected post-Maghrib veranda candidate was then made from the existing `mEjYiz2hJQ` reference using the documented stable scene constraints. The Magnific write was blocked by the connector safety layer before a creation was produced. No creation ID exists from that attempt; treat it as a generation blocker, not as a failed visual.
- A follow-up attempt to persist the concrete rejection reason as a private Magnific comment on `mEjYiz2hJQ` was also blocked. The rejection reason remains auditable in this repo brief.

## Provenance snapshot (revalidated)

| Asset | Role/state | Model | Size | Time-of-day evidence | Review state |
| --- | --- | --- | --- | --- | --- |
| `Xm5ZOkMBfo` | mapped hero | Seedream 5 Pro | 2560×1440 | source prompt explicitly says `golden hour` | mapped; needs independent correction review |
| `WDaOL1OcXe` | mapped inline note | Seedream 5 Pro | 2304×1728 | interior/natural light; note explicitly unreadable | mapped; no new defect identified |
| `mEjYiz2hJQ` | mapped veranda | Seedream 5 Pro | 2304×1728 | source prompt says `evening` | mapped; review against post-Maghrib canon |
| `1liHRa4r4r` | hero candidate #1 | Seedream 5 Pro | 2560×1440 | prompt explicitly requires `early morning`, no sunset/golden-hour | **1 private curator assist comment**; oldest candidate; unapproved |
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


## Metadata sequencing guard

- Do **not** change the Work hero alt text from `petang` to `pagi` while the mapped hero still points to `Xm5ZOkMBfo`; that would make the accessibility text claim a scene state the mapped image does not show.
- Do **not** change the veranda alt text to `selepas Maghrib` until the mapped veranda visual has independently passed against that canon beat. Metadata and asset mapping must move together in the reviewed visual step.
- A candidate-selection decision, visual mapping change, or public alt-text correction is therefore downstream of Independent Visual Curator evidence; this Writer support pass may only preserve the brief/provenance state.


## Current support revalidation

Revalidated against PR #3 head `be626b8486d7dc4fcf646d5950311371c614c0b5` while Session 7 remains at the Writer→Critic gate.

- The oldest pending GitHub visual handoff was retried first on this unchanged head. The PR Conversation write was blocked again by the connector safety layer, so the handoff remains `PENDING_HANDOFF`.
- Work metadata is still internally consistent for editorial versioning: front-matter `version: v1.8` matches the latest `editorialHistory` entry for Session 7.
- Public editorial-history attribution remains canonical (`Rafiq Naim` / `Amir Syafiq`); no provenance repair is required.
- Visual mappings remain unchanged: hero `Xm5ZOkMBfo`, note `WDaOL1OcXe`, veranda `mEjYiz2hJQ`. Because the mapped hero still describes `petang` while manuscript canon opens `Pagi itu`, and the veranda alt still says `petang` while its anchor is post-Maghrib, mapping/alt correction remains downstream of independent visual approval.
- No prose was edited, no candidate was approved, and no new visual was generated in this support pass.

Production touched = NO.
