# Phase 4D-9 — Manuscript Import (Master Parser → draf)

| | |
| --- | --- |
| **Status** | Siap dan digabung (PR #28); ujian DB sebenar lulus pada cawangan Neon ujian. Baki di "Belum siap". |
| **Tarikh** | 2026-09-29 |
| **Sebab** | Ujian penerbitan novela "Sekuntum Bunga untuk Alia": editor manusia tampal manuskrip ke chatbot, chatbot sediakan semua maklumat (termasuk arahan gambar), sistem baca terus. Sebelum ini output parser disalin manual medan demi medan. |
| **Berkaitan** | `docs/JALIN_MASTER_CONTENT_PARSER_PROMPT.md` (v3), `docs/JALIN_EDITOR_CHECKLIST.md`, `docs/VISUAL_GENERATION_GUARDRAILS.md` |

## Keputusan

- Import **hanya mencipta draf** dalam satu transaksi (`src/lib/admin/import/import-service.ts`). Ia tidak pernah menerbitkan dan tidak memanggil penyedia imej (AGENTS #4).
- Halaman `/admin/works/import`: salin Prompt Master → tampal jawapan chatbot → tampal manuskrip → **Semak** (dry-run, tiada apa disimpan; berfungsi tanpa pangkalan data) → **Cipta draf**.
- Chatbot menyediakan arahan adegan (`visualSuggestions[].scene`, `visualBible`); sistem menambah gaya Jalin (`composeVisualPrompt`) dan memaparkan arahan penuh dengan butang salin. Agent tidak lagi mereka arahan gambar sendiri.
- Teks manuskrip tidak diubah. Hanya pemisah perenggan diseragamkan (setiap baris = satu perenggan markdown) kerana reader memerlukan baris kosong. Tajuk bab dipadankan tanpa mengira huruf besar/kecil, pemisah baris dan jenis petikan.
- `readingMinutes` dikira daripada teks yang disimpan (menutup dapatan checklist: novela dulu tersalah jadi "1 minit").
- `anchor` visual inline dilebarkan ke sempadan perenggan dan disimpan sebagai teks tepat manuskrip, kerana reader memotong badan tepat pada hujung anchor.
- Istilah glosari yang sama dengan nama watak/lokasi dilangkau (tooltip kini hanya pada kemunculan pertama istilah sebenar).
- Jenis `bersiri` belum disokong oleh import (guna `/admin/series`).
- Perkhidmatan sedia ada tidak boleh berkongsi transaksi (setiap satu buka sambungan sendiri), maka penulis import memasukkan lajur yang sama secara terus.

## Ujian

- `__tests__/manuscript-import.test.ts` (49 semakan, tanpa DB) dan `__tests__/master-parser-prompt.test.ts` (12, menjaga prompt dalam dokumen = pemalar kod; jana semula dengan `node scripts/sync-master-parser-prompt.mjs`). Kedua-duanya dalam `npm test`.
- Larian sebenar: output ChatGPT untuk manuskrip 10,058 perkataan → 10 bab dibelah betul, 2 anchor inline ditemui, arahan hero dijana. Output chatbot mengandungi `headingText` tepat dan `visualBible` yang menangkap "berniqab" dan "biru kelabu".

## Belum siap

1. ~~Ujian hujung-ke-hujung dengan pangkalan data~~ **Selesai 2026-09-29** pada cawangan Neon ujian (dipadam): import mencipta karya draf lengkap (10 bab, 7 watak, 2 glosari, 3 visual request); kredit, muat naik hero manual, luluskan dan pautkan berjaya. Penghalang terbit yang tinggal ialah status (keputusan editor) dan src sementara (storan tempatan).
2. ~~Imej yang dibuat manual oleh editor tidak boleh dipautkan.~~ **Selesai 2026-09-29 atas arahan Izzat ("batalkan gate magnific").** `validateAttachGate` kini menerima sebarang provider yang direkod (Magnific masih perlu ID Magnific supaya tidak didakwa palsu; kelulusan manusia dan asset stabil kekal wajib). Ditambah `POST /api/admin/visual-requests/[id]/upload` (`manual-upload.ts`: sahkan jenis imej dengan magic bytes, PNG/JPEG/WebP ≤ 10 MB, simpan melalui `storeVisualAssetBytes`, direkod provider `manual` + nama alat, status `under_review`) dan kawalan muat naik pada halaman visual request. AGENTS #15 dan `VISUAL_GENERATION_GUARDRAILS.md` dipinda. Catatan: pada Vercel imej hanya disimpan jika `OBJECT_STORAGE_*` dikonfigurasi; dan gate terbit menganggap laluan `/assets/…` (storan tempatan dev) sebagai sementara.
3. Sumber produksi masih Markdown (`docs/DATABASE_SOURCE_SWITCH.md`): karya yang dicipta dalam DB tidak muncul di laman awam sehingga `CONTENT_SOURCE=database`.
4. ~~Butang salin arahan penuh pada halaman visual request~~ Selesai (komponen kongsi CopyButton).
5. Skema staging: projek jalin-staging, cawangan production, tiada jadual; migrasi (db:schema:migrate) hanya dijalankan pada cawangan ujian.
6. `__tests__/repository-detection.test.ts` memerlukan DATABASE_URL hidup dan novela terbit dalam DB; ia gagal tanpa DB (bukan regresi).
