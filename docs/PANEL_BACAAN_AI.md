# Panel Bacaan AI: V1 dalaman (dibina di localhost, 9 hingga 10 Oktober 2026)

Status: **dibina dan diuji pada cabang pembangunan sahaja. Belum di-commit, belum di-push, migrasi 032 belum dijalankan di produksi.**
Kajian asal (13 pusingan lama, 10 pusingan baharu, audit kod `e30dacc`) kekal dalam dokumen kajian Izzat. Fail ini merekod apa yang dibina dan mengapa.

## Keputusan Izzat yang dilaksanakan

| Keputusan | Pelaksanaan |
|---|---|
| Purata semua penilai, bukan median | `src/lib/panel/aggregate.ts`: pecahan tepat (BigInt), min mentah |
| Syarat skor: min **lebih daripada** 8.0 (tepat 8.000 gagal) | `compareToInt(mean, 8) > 0`; paparan dibundar tidak menentukan |
| Tiada kuorum tetap; satu penilaian sah sudah cukup | `panelResult` bekerja dengan 1 penilaian atau lebih |
| Model yang turut menulis karya boleh mengundi | dikira seperti penilai lain; tiada soalan ditanya kepada editor |
| Tiada disagreement gate, tiada gate penerbitan | tiada kod untuk kedua-duanya. Setiap karya digalakkan mempunyai rating tetapi tidak wajib; tumpuan karya baharu; karya lama dinilai jika mahu |
| Hanya cerpen, novela dan bersiri | `PANEL_WORK_TYPES`; fragmen, sinopsis, terjemahan ditolak |
| Setiap versi teks mendapat panel baharu | snapshot dikunci pada hash kandungan + versi rubrik |
| Bersiri: setakat bahan yang ada | satu episod ialah satu karya; baris liputan menyatakan hanya episod itu diberi |
| Promosi kiriman masuk `review` | `promotion-service.ts` |
| Penilai rasmi: **ChatGPT** (10 Okt 2026) | hanya penilaian yang namanya sepadan GPT/OpenAI dikira dalam min dan syarat >8.0. Model lain (Grok, Gemini) disimpan dan dipaparkan sebagai tambahan, tidak dikira. Satu penilaian ChatGPT sudah cukup |
| Teks panjang tidak mengapa | tiada amaran panjang; BUKTI_AWAL/BUKTI_AKHIR membuktikan keseluruhan teks diterima (novela 82,000 aksara lulus) |
| Satu butang **Tampal jawapan**, tiada kotak teks | borang diisi sendiri: verdik, skor, petikan dan sebab dibaca terus daripada papan keratan |
| Notis pemprosesan AI untuk kiriman | tiada borang kiriman awam, jadi editor mengesahkan penulis dimaklumkan sebelum snapshot kiriman dibuat (direkod). Apabila pengguna boleh menghantar karya dalam Jalin (log masuk), notis diletakkan di borang itu |

## Rubrik r2-20261009 (diputuskan bersama ChatGPT dalam enam soalan, 10 Okt 2026)

Perbincangan: https://chatgpt.com/c/6ac90674-c7c4-83ec-b105-5a9627289f18 (S1 dimensi, S2 set akhir, S3 wajaran, S4 format, S5 potongan, S6 sauh).

| Kod | Komponen | Wajaran |
|---|---|---|
| K1 | Bahasa dan Gaya | 20 |
| K2 | Plot dan Struktur Naratif | 25 |
| K3 | Watak dan Dialog | 20 |
| K4 | Sastera dan Teknik Penceritaan | 15 |
| K5 | Tema dan Mesej | 15 |
| K6 | Penghayatan dan Kesan Naratif | 5 |

Wajaran sama untuk semua bentuk. Semua enam komponen wajib bagi setiap karya: tiada N/A, tiada subkomponen. Keaslian digugurkan (tidak boleh disahkan daripada satu teks); kesesuaian umur ialah pengelasan kandungan yang berasingan, bukan mutu, dan tidak ditanya. Skor 1.0 hingga 10.0 langkah 0.5. Skor komposit dikira oleh sistem, bukan penilai. Sauh umum (3, 5, 7, 8.5, 10), peraturan pertengahan (8 lawan 9), sauh khusus setiap komponen dan peraturan keadilan untuk bentuk bukan konvensional (naratif lirik, tanpa dialog, episod tergantung) ada dalam `rubric.ts` dan dimasukkan dalam setiap arahan.

## Format jawapan seragam: JALIN_PANEL_V2 (22 medan)

Teks biasa, satu medan satu baris, label tetap. `FORMAT`, `KOD` (mengikat jawapan kepada snapshot), `MODEL`, `VERDIK` (satu ayat), `BUKTI_AWAL`, `BUKTI_AKHIR`, kemudian bagi K1 hingga K6: `Kx_SKOR`, `Kx_BUKTI` (satu petikan tepat), `Kx_SEBAB`, dan `TAMAT`. ChatGPT mencadangkan 52 medan, kemudian memotongnya kepada 22 selepas dikritik (keyakinan, petikan kedua, kekuatan, kelemahan, ringkasan dan umur dibuang). Penyimpangan kecil daripada cadangannya: baris `KOD` dan `MODEL` dikekalkan (KOD diperlukan untuk mengikat jawapan; MODEL kerana editor tidak tahu versi model).

Parser ketat tentang bentuk: kod salah, label hilang atau berulang, label tidak dikenali, skor di luar grid, N/A, sebab terlalu ringkas, atau awal/akhir teks yang tidak sepadan ditolak dengan sebab, dan jawapan yang ditolak disimpan sebagai ditolak. Hiasan tetingkap sembang (titik peluru, huruf tebal, teks di luar blok) diterima. Petikan bukti disemak terhadap teks tepat; petikan yang tidak ditemui **tidak menolak** penilaian tetapi ditanda.

## Di mana letaknya (keputusan Izzat, 10 Okt 2026)

- **Tab "Penilaian AI" pada halaman karya** (dan bahagian yang sama pada halaman kiriman) ialah ringkas: keputusan (min, melepasi atau tidak), rumusan dua baris, senarai penilaian dengan butang Batalkan, dan dua butang kerja (**1. Salin arahan**, **2. Tampal jawapan**). Satu pautan membawa ke perbandingan penuh.
- **Modul "Penilaian AI"** (menu sisi; sebelum ini "Panel AI") ialah tempat sebenar untuk melihat dan membandingkan:
  - **Ringkasan**: bilangan dinilai, taburan min, purata setiap komponen (dengan graf), kualiti jawapan.
  - **Karya**: senarai status; setiap baris membuka halaman penilaian karya itu.
  - **Halaman penilaian satu karya** (`/admin/panel/work/[id]`): rumusan yang dikira sistem, kad skor setiap penilai, graf bar K1 hingga K6 merentas penilai dengan garis ambang, matriks perbandingan dengan lajur beza, peta bahagian karya yang dirujuk, verdik setiap penilai, sejarah keputusan, semua jawapan, versi teks lama.
  - **Kaedah**, **Rubrik** (paparan) dan **Tetapan**.
- **Tetapan** (ambang skor, nama penilai rasmi, kata padanan nama model) hanya boleh diubah **ketua editor** (dan pemilik); disimpan dalam `panel_settings`. Rubrik sendiri ialah paparan sahaja; mengubahnya ialah versi rubrik baharu.
- **Kalibrasi, kestabilan dan ujian kepekaan** (di bawah) ialah dokumentasi dalaman: tidak terpapar dalam admin.
- **Rumusan** ditulis oleh sistem daripada nombor (julat, komponen paling kukuh dan paling rendah, di mana penilai berbeza paling jauh), bukan oleh AI.
- **Rujukan, bukan hanya petikan**: penilai AI menilai seluruh karya tetapi sering mengutip makna, bukan huruf. Rujukan yang diolah semula tidak dianggap ralat; ia dilabel "diolah semula, bukan petikan harfiah" dan tidak diletakkan pada peta.

## Cara ia berfungsi

1. **Sediakan penilaian** (pada tab Penilaian AI): menyimpan salinan tepat teks (novela: bahagian mengikut susunan; bersiri: satu episod), hash SHA-256, manifest dan kod rujukan `PNL-XXXXXXXX`.
2. **Salin arahan penuh** dan tampal dalam sesi bersih pada ChatGPT. Tiada panggilan API model oleh sistem.
3. **Tampal jawapan**: satu butang. Jika pelayar tidak membenarkan baca papan keratan, tekan Ctrl+V pada kotak yang muncul (bukan kotak teks).
4. Kad penilaian terbuka dengan verdik, jadual K1 hingga K6 (skor, petikan, sebab) dan komposit. Penilaian tidak diubah atau dipadam; ia boleh **dibatalkan dengan sebab** (pangkalan data menolak pembatalan tanpa sebab).
5. **Sejarah keputusan**: setiap penambahan atau pembatalan direkod dengan min sejurus selepasnya.

## Kalibrasi (ChatGPT, Grok, Gemini; sesi baharu setiap kali; 10 Okt 2026)

Min mentah (sistem yang mengira), format V2, rubrik r2. `*` = ada petikan bukti yang tidak ditemui dalam teks tepat. Kosong = model itu tidak menilai karya ini.

| Karya | ChatGPT | Grok | Gemini |
|---|---|---|---|
| Ali dan Kampung yang Baik (karya LEMAH, ditulis untuk ujian) | 3.500 | 3.400 | 3.900 |
| Kerusi di Beranda | 8.375 | 9.000 | 8.500 |
| Nombor Giliran 117 | 8.200 | 8.825 | (tidak muat) |
| Lelaki dengan Seribu Masalah | 8.200 | 8.675 | 8.675 |
| Anak Qasab | 8.150 | 8.575 | 8.500 |
| Benang Merah Tua | 8.350 | 8.575* | (tidak muat) |
| Surat yang Tidak Pernah Selesai | 8.275 | 8.500 | 8.500 |
| Baki Hari | 8.350 | 8.625 | (tidak dapat dikutip) |
| Sekuntum Bunga untuk Alia (novela) | 8.300 | 8.675 | (tidak muat) |
| Dua Helai Kertas, Episod 3 (bersiri) | 8.600 | 8.625 | (tidak muat) |

Bacaan:
1. **Pembezaan jelas.** Karya lemah mendapat 3.4 hingga 3.9 daripada ketiga-tiga model (min 3.6), manakala karya terbit mendapat 8.15 hingga 9.00. Skor tidak cenderung kepada nilai tengah.
2. **Model bersetuju tentang kedudukan, berbeza tentang aras.** Grok kira-kira 0.35 lebih murah hati daripada ChatGPT pada karya yang sama; Gemini berada di antara. Kerana satu penilaian sudah cukup (keputusan Izzat), ambang >8.0 pada ChatGPT tidak sama dengan ambang >8.0 pada Grok. Purata beberapa model meredakan ini.
3. **Semua karya terbit melepasi >8.0 pada semua model.** Sama ada ambang >8.0 ketat atau longgar untuk Jalin bergantung pada niat Izzat; data ini hanya menunjukkan bahawa karya yang sudah diluluskan editor semuanya melepasinya dan karya jelas lemah jauh di bawah.
4. **Rubrik sangat mempengaruhi skor**: cerpen yang sama mendapat 7.250 dengan rubrik draf pertama dan 8.275 dengan rubrik ini.
5. **Gemini tidak dapat menerima arahan yang panjang melalui kotak input** (dipotong pada kira-kira 32,000 aksara); empat karya yang lebih panjang tidak dapat dinilai dengan cara tampal. Memuat naik fail akan menyelesaikannya tetapi tidak dibina. ChatGPT dan Grok menerima novela 82,000 aksara.
6. **Pemadanan petikan**: 12 petikan ditanda pada mulanya; 7 ialah amaran palsu (penanda Markdown seperti `*qasab*` dalam teks tersimpan, tanda petikan dialog dibuang, garis condong terbalik) dan normalisasi diperbaiki. Lima yang tinggal ialah petikan yang diolah semula atau direka oleh model (tiga daripada Gemini). Jawapan tidak ditolak kerana ini; ia ditanda.
7. **Penolakan palsu BUKTI_AKHIR** (dua karya dengan nota di hujung): bukti liputan kini menerima petikan daripada 30% terakhir teks.

Ujian suntikan arahan (arahan palsu dan blok jawapan palsu di dalam cerita) ditahan oleh ChatGPT pada rubrik draf. Belum dilakukan: ujian ulang pada model sama (kestabilan), dan injeksi pada Grok dan Gemini.

## Kestabilan (ChatGPT dinilai tiga kali, sesi baharu setiap kali, 10 Okt 2026)

| Karya | Tiga penilaian | Julat | Sisihan piawai |
|---|---|---|---|
| Karya lemah (ujian) | 3.500 / 3.450 / 3.600 | 0.150 | 0.076 |
| Anak Qasab | 8.150 / 8.150 / 8.250 | 0.100 | 0.058 |
| Baki Hari | 8.350 / 8.125 / 8.200 | 0.225 | 0.115 |
| Kerusi di Beranda | 8.375 / 8.650 / 8.575 | 0.275 | 0.142 |

Bacaan: skor sama karya yang sama berubah sehingga 0.275 (kira-kira 0.1 hingga 0.15 sisihan piawai) antara sesi. Dalam sampel ini tiada penilaian yang melintasi 8.0 (yang terendah ialah 8.125), tetapi karya yang min sebenarnya antara 7.8 dan 8.3 boleh melepasi atau gagal bergantung pada sesi mana yang kebetulan digunakan. Satu penilaian cukup (keputusan Izzat), jadi karya hampir ambang patut dibaca dengan ingatan ini; menambah penilaian ChatGPT kedua memperbaiki keadaan dengan murah. Julat ini ialah anggaran daripada 12 sesi, bukan jaminan statistik.

## Ujian kepekaan (10 Okt 2026, belum lengkap)

Soalan: adakah penilai benar-benar menimbang seluruh karya, atau hanya bahagian yang dipetik? Satu pertiga bahagian tengah Kerusi di Beranda dibuang dan dinilai oleh ChatGPT (satu sesi; tiga sesi asal pada teks penuh: 8.375 / 8.650 / 8.575). Hasil: 8.275 (turun kira-kira 0.1 hingga 0.4), dan sebab K2 menyebut peralihan kepada tindakan mencatat "agak mendadak kerana buku nota belum diperkenalkan", iaitu tepat di tempat bahagian tengah dibuang. Ini menunjukkan model memang membaca seluruh karya. Satu sampel sahaja; ujian yang sama pada Anak Qasab tidak sempat disiapkan (ChatGPT tidak menjawab dalam masa). Ulang jika perlu.

## Apa yang sengaja tidak dibina

- Paparan skor kepada pembaca atau laman utama.
- Gate penerbitan atau lantai komponen (keputusan Izzat).
- Panggilan API ke penyedia model.
- Penilaian novela melalui ringkasan atau chunk (tidak perlu: model menerima teks panjang).
- Rayuan, consent berasingan penulis, pemadaman data kiriman.

## Fail

`src/lib/panel/{rubric,aggregate,parser,prompt,service,view}.ts`, migrasi `032_panel_bacaan_ai.ts` (jadual `panel_snapshots`, `panel_ratings`, `panel_settings`), laluan `/api/admin/panel/*` (snapshot, prompt, rating, void, view, summary, settings), `src/components/admin/PanelTab.tsx` (tab dalam karya dan kiriman), `src/components/admin/PanelSettingsForm.tsx`, halaman modul `/admin/panel`, kebenaran `panel.manage` (pemilik dan ketua editor) dan `panel.settings` (ketua editor dan pemilik), ujian `__tests__/panel-core.test.ts` (68), `npm run db:panel-check` (29).

## Keputusan Izzat (10 Okt 2026) selepas kalibrasi

1. Satu penilaian cukup.
2. ChatGPT ialah model rujukan rasmi; model lain hanya tambahan (kerana aras berbeza antara model).
3. Semua karya terbit melepasi >8.0 pada ChatGPT (8.15 hingga 8.60) dan karya jelas lemah jauh di bawah (3.5): ambang dikekalkan.
4. Karya panjang yang tidak muat dalam kotak input sesebuah model: Izzat sendiri boleh menggunakan Notebook Gemini (sumber fail, mengelakkan halusinasi) dan menampal jawapan; ia disimpan sebagai tambahan.

## Terbuka

- Notis pemprosesan AI di borang kiriman apabila ia wujud (bergantung pada akaun, KOD KIV).
