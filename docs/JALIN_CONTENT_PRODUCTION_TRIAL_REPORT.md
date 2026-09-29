# Content Production Trial — Laporan Akhir (Batch 1, sebahagian)

| | |
| --- | --- |
| **Status** | Laporan ujian. Tiada kod diubah. |
| **Tarikh** | 2026-09-29 |
| **Skop** | Bandingkan masa cerpen vs novela, sahkan blocker sama, sahkan aliran visual, sahkan dapatan `readingMinutes`, kesimpulan akhir fasa Content Production Trial. |
| **Kaedah** | Guna karya ujian sedia ada (tiada manuskrip baharu, ikut arahan director) — parser dijalankan berasingan/tanpa bias utk setiap karya, admin diuji hidup atas cawangan Neon ujian terpencil, dipadam selepas selesai. |
| **Berkaitan** | `docs/JALIN_EDITOR_CHECKLIST.md`, `docs/JALIN_PRODUCTION_READINESS_AUDIT.md`, `docs/JALIN_VISUAL_WORKFLOW_AUDIT.md` |

## Ringkasan dua ujian

| | Cerpen — "Surat yang Tidak Pernah Selesai" | Novela — "Sekuntum Bunga untuk Alia" |
| --- | --- | --- |
| Panjang | ~1,470 patah perkataan, 1 bahagian | ~10,048 patah perkataan, 10 bab |
| Masa end-to-end | ~15–20 minit (kandungan+metadata+kredit+4 watak) | ~45 minit (10 bab+8 watak+3 glosari+1 kredit) |
| `slug`/`readingMinutes` auto-cadang | Padan TEPAT dgn cadangan parser (slug sama, 7 minit sama) | Perlu dibetulkan manual — lihat dapatan di bawah |
| Struktur | N/A (cerpen tiada gate struktur) | PASS — position 1..10 tanpa jurang/pendua |
| Kredit | PASS (Nama Tetamu, sebab tiada contributor rekod dlm DB ujian kosong) | PASS (sama) |
| Blocker tertinggal | Status draft→ready, Visual hero | Status draft→ready, Visual hero (**SAMA PERSIS**) |

## 1. Perbandingan masa cerpen vs novela

Cerpen (~1,470 patah perkataan) mengambil ~15–20 minit; novela
(~10,048 patah perkataan, ~7× lebih panjang) mengambil ~45 minit
(~2–3× lebih lama, bukan 7×). Ini kerana majoriti masa novela ialah
salin-tampal teks bab (mekanikal, pantas per aksi), bukan pengisian
metadata berulang — metadata (kredit, watak, glosari) hanya diisi
SEKALI untuk keseluruhan novela, bukan per bab.

**Kesimpulan**: kos operasi tidak berskala linear dgn panjang karya.
Overhead metadata adalah tetap (~15 minit); overhead kandungan
berskala dgn bilangan bahagian/bab (~3–4 minit/bab).

## 2. Sahkan blocker sama merentasi jenis

Kedua-dua ujian (cerpen, novela) — selepas kandungan, kredit, watak
dan glosari lengkap diisi — hanya tinggal **DUA** blocker, sama
persis:

1. `status_not_publishable` — status `draft` belum `ready` (keputusan editorial manusia, sengaja).
2. `hero_missing` — jenis memerlukan visual hero (perlukan Magnific + kelulusan manusia).

**Kesimpulan**: sistem admin (metadata, struktur, kredit) sudah
matang dan konsisten merentasi jenis karya. Sekatan sebenar bukan
"borang tidak cukup", tetapi dua keputusan editorial yang sengaja
kekal manual.

## 3. Sahkan aliran visual

Disahkan drpd audit kod (`JALIN_VISUAL_WORKFLOW_AUDIT.md`, PR #21):
laluan `/admin/visual-requests/new` sudah menyokong rekod brief visual
(status `draft`, tiada panggilan Magnific) tanpa kod baharu. **Tidak
diuji hidup dlm pass ini** (memerlukan `MAGNIFIC_API_KEY` sebenar,
di luar skop — lihat jawapan awal kepada Izzat tentang cara
tambah kunci Magnific).

## 4. Sahkan dapatan `readingMinutes`

Disahkan hidup dua kali (cerpen + novela):

- **Cerpen**: `body` diisi manuskrip PENUH sejak awal → `readingMinutes`
  auto-cadang PADAN TEPAT dgn anggaran parser (7 minit).
- **Novela**: `body` diisi placeholder ringkas (editor terus ke tab
  Bahagian) → `readingMinutes` auto-cadang SALAH (1 minit, sepatutnya
  ~50 minit) → mesti dibetulkan manual.

**Kesimpulan**: ini "gotcha" workflow sebenar, bukan pepijat kritikal
— tetapi checklist editor (PR #24, sudah di-main) kini merekodkannya
supaya editor sedar dan betulkan semasa import novela.

## Kesimpulan Content Production Trial

1. **Jalin sudah menjadi sistem penerbitan manual yang boleh
   beroperasi** — bukan lagi soalan "bolehkah ia dibina", tetapi
   "berapa kos operasi menghasilkan satu karya" (kini terjawab: ~15–20
   minit cerpen, ~45 minit novela 10-bab, tidak termasuk penjanaan
   visual & semakan manusia).
2. Blocker yang tertinggal selepas semua metadata diisi **konsisten**
   merentasi jenis karya — dua keputusan editorial sengaja manual
   (status, visual), bukan kekurangan sistem.
3. Satu dapatan operasi sebenar (`readingMinutes` drpd `body` sahaja)
   direkod dan dibetulkan dlm checklist — tiada kod diubah, cukup
   dgn kesedaran editor semasa import.
4. **Tiada automasi/importer baharu dibina** dlm fasa ini, ikut
   arahan berulang director sepanjang Batch 1.

## Keputusan seterusnya (menunggu arahan director)

Ikut cadangan director sebelum ini ("Adakah Jalin perlukan JSON
Import Module atau tidak?"): data dua ujian ini menunjukkan
kebanyakan masa (cerpen: metadata ringkas cepat; novela: salin-tampal
kandungan berulang) BUKAN metadata semata — jadi manfaat importer
JSON penuh mungkin sederhana berbanding kos membinanya pada tahap
ini. Keputusan akhir (A: import penuh / B: kekal manual / C:
importer kecil) diserahkan kepada director berdasarkan data di atas.
