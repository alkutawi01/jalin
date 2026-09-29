# Audit: Visual Workflow — Cadangan Parser (`visualSuggestions`) vs Admin Sedia Ada

| | |
| --- | --- |
| **Status** | Audit sahaja. Tiada kod, schema atau UI diubah dalam pass ini, per arahan. |
| **Tarikh** | 2026-09-29 |
| **Skop** | Bandingkan output `visualSuggestions` (Master Content Parser v2) dengan medan/laluan Visual sedia ada dalam Jalin Admin. |
| **Berkaitan** | `docs/JALIN_MASTER_CONTENT_PARSER_PROMPT.md` (v2), `docs/JALIN_CONTENT_MODEL_READINESS_AUDIT.md`, `docs/VISUAL_GENERATION_GUARDRAILS.md`, `AGENTS.md` #15–19 |

## Konteks

Semasa ujian aliran manuskrip sebenar ("Surat yang Tidak Pernah Selesai",
lihat laporan ujian 2026-09-29), tab **Visual** pada halaman
`/admin/works/[id]` (menulis terus ke jadual `visuals`) didapati
memerlukan `src` (fail imej sebenar) — tiada medan untuk brief teks
sahaja. Ini pada mulanya dilaporkan sebagai satu-satunya laluan visual
dalam admin, dan disimpulkan sebagai jurang penuh.

Audit lanjut mendapati kesimpulan itu **tidak lengkap**: `/admin/works/[id]`
tab Visual bukan satu-satunya laluan. Terdapat laluan kedua,
`/admin/visual-requests`, yang sudah dibina (Phase 4D-5) khusus untuk
peringkat brief → generate → approve → finalize.

## Dapatan

### 1. Jadual `visuals` (tab Visual pada halaman edit karya) — untuk aset SIAP sahaja

- Medan wajib: `src` (path/URL fail imej sebenar).
- Sesuai untuk melampirkan visual yang **sudah dijana/dilulus**, bukan
  untuk merekod cadangan/brief AI.
- **Bukan** destinasi untuk `visualSuggestions` parser.

### 2. Jadual `visual_requests` + `/admin/visual-requests/new` — SUDAH menyokong brief-sahaja

Disemak `src/lib/admin/visual-request-service.ts`,
`src/lib/db/types.ts` (`VisualRequestStatus`), dan
`src/app/admin/visual-requests/new/page.tsx`:

- `VisualRequestStatus` termasuk nilai `"draft"` — status permulaan
  rekod, **sebelum** sebarang panggilan Magnific.
- Borang `/admin/visual-requests/new` mencipta rekod dengan
  `status: input.status || "draft"` — mencipta draf semata-mata TIDAK
  mencetuskan integrasi Magnific atau penjanaan.
- Medan borang sedia ada memadan cadangan parser dengan baik:
  - `prompt` (wajib) ← boleh diisi terus daripada `visualSuggestions[].scene` (+ `reason` disertakan dalam teks yang sama).
  - `anchor` ("Teks anchor dalam manuskrip") ← memadan konsep `scene` (rujukan adegan spesifik) dalam parser.
  - `visualRole` (Hero/Inline/Section/Decorative) ← memadan `role` visual sedia ada (hero/inline/section).
  - `workId`, `place`, `aspectRatio` — medan admin biasa, tiada dalam output parser (editor isi).
- **Kesimpulan**: laluan untuk merekod cadangan visual AI (tanpa
  menjana apa-apa) **sudah wujud** hari ini, secara manual melalui
  borang ini. Tiada UI/kod baharu diperlukan untuk sekadar *merekod*
  brief.

### 3. Jurang sebenar (kecil, bukan blocker)

- **Tiada medan `reason` berasingan** pada `visual_requests` — rasional
  cadangan (kenapa visual ini membantu pembaca) mesti dilipat ke dalam
  `prompt` atau `altText` secara manual oleh editor. Kesan: kecil,
  hilang sedikit struktur, bukan kehilangan maklumat.
- **Tiada pautan terus** daripada halaman edit karya
  (`/admin/works/[id]`) ke `/admin/visual-requests/new` dengan
  `workId` pra-isi. Editor perlu buka tab/halaman berasingan dan
  taip semula ID karya. Geseran kecil, bukan blocker fungsi.
- **Tiada paparan `visualSuggestions` parser di dalam admin itu
  sendiri** — editor perlu salin daripada output JSON/Editor Report
  parser secara manual ke borang `visual-requests/new`. Ini konsisten
  dengan reka bentuk Master Prompt sedia ada ("satu paste, satu
  output, editor semak & masukkan secara manual") — bukan
  keperluan automasi baharu.

## Aliran sedia ada (disahkan wujud, belum diuji hidup end-to-end dalam pass ini)

```
Cadangan AI (visualSuggestions: scene + reason)
        ↓ (editor salin manual)
/admin/visual-requests/new  → status "draft" (TIADA panggilan Magnific)
        ↓ (editor)
Jana (Magnific) ATAU muat naik sendiri
        ↓ (editor)
Semak & lulus (approval_state)
        ↓ (editor)
Finalize → lampir ke jadual `visuals` (asset_finalized)
```

Ini **sepadan** dengan keputusan sedia ada "visual boleh diuruskan
editor manusia" dan keperluan AGENTS.md #15–19 (Magnific sahaja,
provenance direkod, kelulusan manusia wajib).

## Cadangan (paling kecil) — TIADA KOD DALAM PASS INI

1. **Tiada perubahan segera diperlukan** untuk membolehkan editor
   merekod brief visual daripada parser — laluan `/admin/visual-requests/new`
   sudah cukup untuk kegunaan manual hari ini.
2. **Penambahbaikan pilihan** (bukan wajib, tidak dilaksanakan sekarang):
   - Pautan "+ Cipta Visual Request" pada tab Visual/Kandungan halaman
     edit karya, pra-isi `workId` sahaja (navigasi, bukan automasi).
   - Medan `reason` opsyenal pada `visual_requests` (perubahan skema
     kecil) — hanya jika editor sebenar melaporkan keperluan selepas
     guna aliran manual beberapa kali.
3. Kedua-dua item di atas kekal **belum dibina** sehingga arahan
   eksplisit director, selaras "jangan bina integrasi Magnific, jangan
   ubah schema visual, jangan ubah publishing gate."

## Nota

Audit ini tidak menguji aliran `/admin/visual-requests/new` secara
hidup (live) — hanya semakan kod/skema. Ujian hidup (cipta draf
request, jana melalui Magnific, lulus, finalize) memerlukan kunci
`MAGNIFIC_API_KEY` sebenar dan kelulusan editor manusia untuk
peringkat generate/approve — di luar skop audit tanpa-kod ini.
