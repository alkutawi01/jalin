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


## Recovery update — corrected veranda candidate

Revalidated on PR #3 head `d32debf43076943008d4467fc66771d8f0c7aa47`.

- Oldest pending GitHub visual handoff was retried first on this unchanged head; the PR Conversation write remains blocked by the connector safety layer, so GitHub persistence is still `PENDING_HANDOFF`.
- Magnific history for 2026-09-25 shows only the two existing hero-correction candidates and one corrected veranda candidate; no additional competing veranda duplicate exists.
- Corrected veranda candidate `ksis6r616B` exists and is `completed` (Seedream 5 Pro, 2304×1728). Its source prompt explicitly targets the stable post-Maghrib / early-night beat, Aiman with the old broom at the veranda/front steps, a single small swept strip, Farid secondary near the gate, no daylight/golden hour, no readable text, unclear faces, and preserved house/veranda/yard/gate continuity.
- This candidate remains **unapproved**. Metadata/provenance alignment is not a pixel-level pass. Actual rendered-image inspection and revalidation against the final manuscript remain mandatory after `JALIN_TEXT_REVIEW_COMPLETE`.
- An assist-comment write to the Magnific candidate was attempted but blocked by the connector safety layer. Do not infer approval from the absence of that comment.
- No new visual was generated in this recovery update, no Work visual mapping or public alt text changed, and no cerpen prose/session numbering was touched.

Status remains `VISUAL_PENDING`.

Production touched = NO.


## Recovery transport check — 2026-09-26

Support-pass base head: `ef768732d7c77f248fc613e115b4d397cec3d7f5`.

- PR timeline/reviews were rechecked first: `JALIN_TEXT_REVIEW_COMPLETE` is still absent, so the final visual gate remains closed.
- Corrected veranda candidate `ksis6r616B` remains `completed` (Seedream 5 Pro, 2304×1728); its provenance still matches the stable final veranda beat in manuscript v1.8.
- A 16-bit PNG delivery render for the same candidate is available and ready. This is a delivery artifact only, not a visual pass.
- Actual pixel inspection was retried via Magnific inline-image transport and failed again with a transient `AioRpcError`. No pixel-level approval is claimed.
- The manuscript anchor was rechecked directly: Aiman descends three steps with the old broom, sweeps one small strip in front of the steps, and Farid is already at the gate. No prose or session numbering was changed.
- GitHub PR Conversation handoff retry and a private Magnific curator-comment write were both blocked by safety checks. The PR handoff therefore remains `PENDING_HANDOFF`.
- No new candidate was generated, no Work mapping/alt text changed, and no merge/publish/deploy/production action was taken.

Status remains `VISUAL_PENDING`.

Production touched = NO.


## Recovery revalidation — 2026-09-26

- PR #3 exact head remains `d28950b12f8d02ef3a94a0535902b0e956a35d0e`; `JALIN_TEXT_REVIEW_COMPLETE` is still absent, so the final visual gate remains closed.
- Oldest pending PR Conversation handoff was retried first and remained blocked by the connector safety layer.
- Current Work file was rechecked: manuscript remains v1.8; hero alt still says `petang`, veranda alt still says `petang`, and no mapping/alt change is authorized before independent visual approval.
- Final veranda canon was rechecked directly: Aiman descends three steps with the old broom, sweeps one small strip in front of the steps, and Farid is already at the gate.
- Magnific history for this Work still contains exactly the two early-morning hero correction candidates and one corrected post-Maghrib veranda candidate; no new competing duplicate was found.
- Corrected veranda candidate `ksis6r616B` remains completed and provenance-aligned, but unapproved because actual pixel-level inspection is still unavailable in this runtime.
- A private curator assist-comment write on that candidate was retried and blocked by the safety layer.
- No new candidate was generated, no prose/session numbering changed, and no merge/publish/deploy/production action was taken.

Status remains `VISUAL_PENDING`.

Production touched = NO.


## Recovery handoff checkpoint — 2026-09-26

- Exact PR head at checkpoint start: `f1e3f3ecab40517e9a476dc76b3d2b97affe0adb`.
- The previously pending PR-level visual support handoff is now auditable as PR #3 issue comment `5840039693`; it records `VISUAL_PENDING`, candidate `ksis6r616B`, and the requirement for actual rendered-pixel inspection plus post-`JALIN_TEXT_REVIEW_COMPLETE` revalidation.
- Fresh PR conversation/review scan still finds no `JALIN_TEXT_REVIEW_COMPLETE`; the final visual recovery gate remains closed.
- Corrected veranda candidate `ksis6r616B` remains `completed` with the same Seedream 5 Pro provenance and stable post-Maghrib scene constraints. No competing replacement was generated.
- Actual pixel inspection was retried. Magnific inline-image transport still failed transiently with `AioRpcError`; a direct preview retrieval path also could not materialize pixels in this runtime. Therefore no pixel-level pass is claimed.
- No prose, session numbering, Work visual mapping, public alt text, merge, publish, deploy, or production state was changed.

Status remains `VISUAL_PENDING`.

Production touched = NO.

## Recovery transport + duplicate check — 2026-09-26

- Exact PR head at retry start: `a53ee0e1e3ad339988c4c1c5a6149ae84ef29382`; fresh PR conversation/review scan still finds no `JALIN_TEXT_REVIEW_COMPLETE`, so the final visual gate remains closed.
- Oldest pending PR-level handoff was retried first by updating the existing visual support comment rather than creating a duplicate; the GitHub write was blocked by the connector safety layer. Treat that PR-level refresh as `PENDING_HANDOFF` on the exact head above.
- Magnific history was rechecked from 2026-09-25 onward and still contains exactly three bounded candidates for this Work: two early-morning hero corrections and one corrected post-Maghrib veranda candidate. No competing duplicate was found or generated.
- Corrected veranda candidate `ksis6r616B` remains `completed` (Seedream 5 Pro, 2304×1728). A ready 16-bit PNG delivery render still exists, but delivery readiness is not a visual pass.
- Actual rendered-pixel inspection was retried for both the corrected veranda candidate and the oldest hero candidate through Magnific inline-image transport; both attempts failed transiently with `AioRpcError`. No pixel-level approval is claimed.
- A private curator assist-comment write on `ksis6r616B` was retried and blocked by the connector safety layer. The candidate remains unapproved pending actual pixel inspection and post-`JALIN_TEXT_REVIEW_COMPLETE` revalidation.
- No cerpen prose, session numbering, Work visual mapping, public alt text, merge, publish, deploy, production or tooling state was changed.

Status remains `VISUAL_PENDING`.

Production touched = NO.


## Recovery checkpoint — handoff retry + duplicate revalidation

- Exact PR head at checkpoint start: `26882525a84d0c55af3b9f1dbddc0fb498ca1e37`.
- `JALIN_TEXT_REVIEW_COMPLETE` is still absent; final visual gate remains closed.
- Existing PR visual-support comment was retried first and the update was blocked by connector safety checks, so its refresh remains `PENDING_HANDOFF`.
- Current manuscript v1.8 still anchors the final scene after Maghrib: Aiman descends the three front steps with the old broom, sweeps one small strip, and Farid is already at the gate.
- Magnific history still contains exactly three bounded correction candidates for this Work; no duplicate was generated.
- Corrected veranda candidate `ksis6r616B` remains completed and provenance-aligned, with a ready 16-bit PNG delivery render, but actual pixel inspection is still unavailable in this runtime. No visual pass is claimed.
- Magnific assist-comment retry was also blocked by safety checks.
- No prose, session numbering, visual mapping, public alt text, merge, publish, deploy, production, or tooling state changed.

Status remains `VISUAL_PENDING`.

Production touched = NO.
