# Master Content Parser v2 — Ujian Manuskrip Sebenar (Belum Pernah Digunakan)

| | |
| --- | --- |
| **Status** | 2/3 karya diuji (2 cerpen). **1 novela TIADA dalam repo** — lihat "Gap: novela". |
| **Tarikh** | 2026-09-29 |
| **Skop** | Uji Master Content Parser v2 pada manuskrip yang belum pernah menjadi fixture validation, simulasi pemetaan ke `/admin/works/new` + halaman sunting, ukur kerja manual sebenar |
| **Berkaitan** | `docs/JALIN_MASTER_CONTENT_PARSER_PROMPT.md`, `docs/JALIN_MASTER_PARSER_V2_VALIDATION.md`, `docs/JALIN_IMPORT_COMPATIBILITY_REPORT.md` |
| **Artefak** | `docs/test-artifacts/parser-v2-real-manuscript/*.json`, `*.editor-report.md` |

## Pemilihan manuskrip

Repo diimbas untuk manuskrip lengkap yang **bukan** Kerusi di Beranda dan
**bukan** Waktu Sebenar (dan bukan fixture validation v1/v2 lain):

| Jenis | Kandidat tersedia | Digunakan |
| --- | --- | --- |
| Cerpen | `nombor-giliran-117`, `rumah-yang-masih-menyimpan-suara`, `surat-yang-tidak-pernah-selesai` | `nombor-giliran-117`, `rumah-yang-masih-menyimpan-suara` |
| Novela | **Tiada.** Satu-satunya manuskrip novela dalam repo (`content/manuscripts/Waktu_Sebenar_*.txt`) ialah Waktu Sebenar, yang dikecualikan secara eksplisit. | — |

**Gap: novela.** Mengikut arahan ("jika repo tidak mempunyai... JANGAN
cipta manuskrip atau isi sendiri"), tiada manuskrip novela dicipta
atau diisi. Ujian novela ditangguhkan sehingga Director bekalkan
manuskrip novela baharu.

## Kaedah

Kedua-dua cerpen diproses mengikut kontrak prompt v2 penuh (medan
System JSON + Editor Report 4-tajuk), menggunakan hanya teks manuskrip
sebenar (`content/works/*.md`, bahagian body sahaja — frontmatter
terbitan TIDAK dirujuk semasa menjana output, hanya digunakan
**selepas** untuk pengesahan silang, sama metodologi seperti
`docs/JALIN_MASTER_PARSER_VALIDATION.md`). Output disahkan `JSON.parse`
dan disimpan sebagai artefak.

Simulasi pemetaan admin dijalankan terhadap cawangan Neon terpencil
(`frosty-star-60558157`, cabang daripada `jalin-staging`, **dipadam
selepas ujian** — tiada kesan pada staging/produksi), menggunakan
borang `/admin/works/new` yang telah dikemas kini oleh PR #11.

---

## Karya 1 — Nombor Giliran 117 (cerpen)

**PASS parser** — JSON sah, tiada `body`, tiada `rights*` automatik.

| Medan | Output parser | Terbitan (rujukan) | Status |
| --- | --- | --- | --- |
| title | Nombor Giliran 117 | sama | ✅ tepat |
| slug | nombor-giliran-117 | sama | ✅ tepat |
| dek | cadangan 1 ayat tanpa spoiler | dek terpoles editor | ✅ boleh terus dipetak |
| genre | keluarga | Keluarga | ✅ tepat (kapitalisasi diselaraskan editor) |
| readingMinutes | 11 (2,241 ÷ 200) | 11 | ✅ **padan tepat** |
| characters | 3 (Rohani/Danish/Azman) | 3 (sama) | ✅ tepat |
| glossary | 4 istilah, semua wujud dalam teks | 4 (sama) | ✅ tepat |
| author | "tidak dinyatakan" | Nara Zahin (draf), Rafiq Naim (penyunting) | ⚠️ **wajib isi manual** — parser betul tidak meneka |

**Simulasi cipta di admin**: `POST /api/admin/works` → `201 Created`
berjaya menggunakan title/dek/genre/audience/readingMinutes/slug
terus daripada JSON (disahkan langsung — lihat nota bug di bawah).

---

## Karya 2 — Rumah yang Masih Menyimpan Suara (cerpen)

**PASS parser** — JSON sah, tiada `body`, tiada `rights*` automatik.

| Medan | Output parser | Terbitan (rujukan) | Status |
| --- | --- | --- | --- |
| title | Rumah yang Masih Menyimpan Suara | sama | ✅ tepat |
| slug | rumah-yang-masih-menyimpan-suara | sama | ✅ tepat |
| genre | keluarga | Keluarga · Ingatan | ⚠️ parser hasilkan 1 label; terbitan guna 2 label bergabung — editor perlu gabung/pilih |
| readingMinutes | 10 (2,041 ÷ 200) | 12 | ⚠️ Δ−2 (parser konsisten dengan formula sendiri; nilai terbitan mungkin dilaras editor secara manual sebelum ini) |
| characters | 3 (Aiman/Farid/Mak Cik Salmah) | 3 (Aiman/Mak/Farid) | ⚠️ **percanggahan sebenar**: parser tidak masukkan "Mak" (tiada babak aktif semasa — watak hadir melalui ingatan/objek sahaja) tetapi masukkan Mak Cik Salmah (watak sampingan bernama); terbitan buat sebaliknya. Kedua-duanya keputusan editorial yang munasabah — **wajib semakan editor**, bukan defect. |
| glossary | 4 istilah, semua wujud dalam teks | 4 (sama set istilah) | ✅ tepat |
| author | "tidak dinyatakan" | ChatGPT & Mimo (co_writer), izzat-anas (final_editor) | ⚠️ **wajib isi manual** |

**Simulasi cipta di admin**: tidak diulang berasingan — mekanik sama
seperti Karya 1 (lihat nota bug di bawah, yang berlaku pada Karya 1).

---

## Nota bug ditemui semasa simulasi (baharu, di luar skop pembaikan sesi ini)

Semasa mensimulasikan cipta Karya 1 menggunakan slug tepat daripada
JSON parser (`nombor-giliran-117` — sengaja **sama** dengan slug
karya sedia terbitan, kerana itulah nilai literal yang akan dihasilkan
parser untuk manuskrip ini), halaman sunting
(`/admin/works/[id]`) **tersangkut selama-lamanya pada "Memuatkan
karya..."**, walaupun `POST /api/admin/works` berjaya (`201 Created`)
dan semua medan (title/slug/genre/readingMinutes) tersimpan betul
dalam DB ujian (disahkan terus melalui `GET
/api/admin/works/[id]`).

Punca yang dikesan: `GET
/api/admin/publish?action=preview&workId=...` — endpoint yang
digunakan halaman sunting untuk pratonton penerbitan — mengembalikan
`currentContent` daripada **fail markdown sedia ada**
(`content/works/nombor-giliran-117.md`, kandungan terbitan sebenar)
walaupun `CONTENT_SOURCE=database` dan karya ujian berada dalam DB
terpencil yang tiada kaitan dengan fail itu. Ini bermakna endpoint
pratonton penerbitan merujuk direktori `content/works/` tanpa mengira
sumber kandungan aktif, mengelirukan perbandingan "berubah/tidak" dan
nampaknya menyebabkan gelung render tidak stabil pada halaman client.

**Ini bukan disebabkan oleh perubahan PR #9/#10/#11.** Ia hanya
terdedah kerana ujian ini — buat pertama kali — mencipta sebuah karya
DB dengan slug yang **secara sengaja** berlanggar dengan fail markdown
sedia ada, sesuatu yang tidak berlaku dalam ujian PR #10 (slug
`kerusi-di-beranda-test` digunakan di sana, bukan slug sebenar).

**Tidak dibaiki dalam sesi ini** — di luar skop ujian parser yang
diarahkan ("jangan ubah schema/reader/JSON import"), dan bukan
sebahagian arahan semasa. Dilaporkan sebagai dapatan berasingan untuk
Director putuskan sama ada perlu tugasan pembaikan berasingan.
Kesannya pada aliran sebenar: **rendah** — hanya berlaku apabila slug
DB baharu sama literal dengan slug fail markdown sedia ada, keadaan
yang jarang berlaku pada penggunaan biasa (editor lazimnya tidak
mencipta karya dengan slug yang sudah wujud).

---

## Ringkasan silang dua karya — berapa banyak kerja manual?

| Kategori | Bilangan medan/entri |
| --- | --- |
| **Terus daripada `/admin/works/new`** (1 skrin, 1 create) | title, type, dek, genre, audience (lalai), readingMinutes (auto), slug (auto) — 7 medan, tetapi **4 daripadanya automatik/lalai** (audience, readingMinutes, slug tergenerate, type tergenerate default cerpen). Editor sebenarnya hanya taip 2-3: title, dek, (genre jika mahu ubah lalai). |
| **Kredit** (tab berasingan, selepas create) | 1-3 baris × 4 medan (contributor/guest, roleLabel, byline, isPublic) = **4-12 nilai** ditaip/dipilih manual. Parser **tidak pernah** tahu nama penulis sebenar (betul, mengikut kontrak) — 100% input manual. |
| **Glosari** (tab berasingan) | 4 baris × 2 medan (term, meaning) = **8 nilai**. Ini BOLEH disalin terus daripada JSON — tiada percanggahan dikesan pada dua-dua karya. |
| **Visual** (tab berasingan, subsistem berasingan) | `visualSuggestions` parser hanya `{scene, reason}` — brief, BUKAN `src`/`creationId` sedia guna. Editor perlu: (1) cipta Permintaan Visual di `/admin/visual-requests`, (2) jana melalui Magnific, (3) sahkan, (4) baru lampir di tab Visual karya. **Tiada bilangan medan yang bermakna di sini — ia satu subsistem penuh, bukan salin-tampal.** |
| **characters / locations / themes** | **Tiada tempat dalam admin langsung** (disahkan semula dalam ujian ini). Editor perlu baca Editor Report dan buat keputusan secara manual di luar sistem (nota, spreadsheet, ingatan). |
| **Percanggahan yang perlukan keputusan editorial** (bukan sekadar salin) | 1 (Karya 2: watak "Mak"/Mak Cik Salmah) + 2 nilai `readingMinutes`/`genre` berbeza sedikit daripada terbitan (boleh terima atau laras). |

**Jawapan kepada soalan Director** ("berapa banyak medan
copy-paste/manual"): untuk **cerpen**, kira-kira **15-25 nilai**
disalin/ditaip merentasi 3 skrin (create → Kredit → Glosari) bagi
setiap karya, ditambah satu subsistem penuh (Visual) yang tidak boleh
diringkaskan kepada bilangan medan. `characters`/`locations`/`themes`
parser terhasil tetapi **tiada destinasi sistem langsung** — ini
sendiri satu gap struktur, bukan sekadar kerja manual.

## Isu progressive disclosure

Tidak berkaitan — kedua-dua karya diuji ialah **cerpen**, bukan
novela. Peraturan `firstAppearanceSection` (`docs/
JALIN_MASTER_CONTENT_PARSER_PROMPT.md` v2) hanya terpakai untuk
`type=novela`; parser betul tidak menghasilkan medan itu untuk
kedua-dua karya ini. Ujian progressive disclosure sebenar terhadap
manuskrip novela baharu tertangguh — lihat "Gap: novela" di atas.

## Cadangan: JSON Import berbaloi?

Berdasarkan dua ujian ini sahaja (cerpen sahaja, belum novela):

- **15-25 nilai manual setiap karya** merentasi 3 skrin **melepasi**
  ambang yang Director sebut sendiri ("kalau 10-20 medan, memang
  berbaloi"). Kredit dan Glosari khususnya ialah salinan mekanikal
  terus-terang (nama sama, medan sama) yang sesuai untuk automasi.
- **Tetapi** watak/lokasi/tema tiada destinasi sistem — membina JSON
  Import sekarang hanya akan mengisi Kredit+Glosari (bahagian yang
  paling murah untuk disalin tangan), sambil meninggalkan
  watak/lokasi/tema (bahagian paling berharga untuk automasi, kerana
  paling meletihkan menaip manual) tetap tiada rumah.
- **Cadangan**: JSON Import berbaloi, **tetapi** hanya benar-benar
  bernilai penuh selepas ada destinasi untuk `characters`/`locations`/
  `themes` (sekurang-kurangnya paparan rujukan editor, tidak perlu
  penapisan progresif penuh dahulu). Sehingga itu, JSON Import hanya
  akan mengautomasikan Kredit+Glosari — masih berguna, tetapi bukan
  penyelesaian penuh kepada beban manual yang diukur di atas.
- Keputusan novela (progressive disclosure) masih belum diuji dengan
  manuskrip sebenar baharu — cadangan di atas **hanya sah untuk
  cerpen**. Uji novela dahulu sebelum keputusan muktamad JSON Import.

## Perkara yang masih tertangguh

1. **Manuskrip novela baharu** daripada Director — diperlukan untuk
   melengkapkan ujian 2 cerpen + 1 novela yang diarahkan.
2. **Bug pratonton penerbitan** (slug DB berlanggar dengan fail
   markdown) — dilaporkan, belum dibaiki, menunggu keputusan Director
   sama ada perlu tugasan berasingan.
3. **Destinasi admin untuk `characters`/`locations`/`themes`** — gap
   struktur yang wujud sejak Ujian 1 (v1), disahkan semula di sini;
   releven terus kepada keputusan JSON Import.
