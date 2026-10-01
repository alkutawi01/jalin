# Laporan audit Jalin (Oktober 2026)

Skop: audit dan pembaikan tujuh fasa. Tiada kandungan production, rekod Neon production atau karya diubah; tiada deploy; tiada migrasi atau pembetulan data production. Semua ujian data dijalankan pada cabang Neon sementara yang disalin daripada production, kemudian dipadam.

Kaedah bukti: **Terbukti dalam kod** (K), **Diulang dalam UI/ujian** (U), **Hipotesis** (H). Tiada ujian dilaporkan lulus tanpa dijalankan.

## 1. PR untuk disemak (susunan merge)

| Susunan | PR | Kandungan |
|---|---|---|
| 1 | [#59](https://github.com/alkutawi01/jalin/pull/59) | Pembaikan: repositori kandungan tidak pernah dimuat semula selepas permintaan pertama |
| 2 | [#55](https://github.com/alkutawi01/jalin/pull/55) | P0: bekukan versi awam semasa terbit; satu sumber readiness; sekat terbit jika ada suntingan belum disimpan |
| 3 | [#56](https://github.com/alkutawi01/jalin/pull/56) | Fasa 3-4: identiti sumber, pembatalan kelulusan hak, pengesahan manusia teks Fragmen, kredit penulis, jenis import terikat |
| 4 | [#57](https://github.com/alkutawi01/jalin/pull/57) | Fasa 5: UI awam |
| 5 | [#58](https://github.com/alkutawi01/jalin/pull/58) | Fasa 6: UI admin (disusun di atas #55) |
| 6 | [#60](https://github.com/alkutawi01/jalin/pull/60) | Aksesibiliti: kontras dan landmark (disusun di atas #57 dan #58) |
| 7 | PR e2e | Skrip E2E editor (disusun di atas #55) |

Pesanan merge di atas mengelakkan konflik. Semua cabang telah digabungkan dalam satu cabang percubaan tempatan dan diuji bersama (bahagian 3).

## 2. Isu yang diselesaikan

### P0
- **K+U** Penerbitan tidak pernah mencipta revisi (`createRevision` tiada pemanggil), jadi setiap karya terbit dihidangkan daripada salinan kerja langsung. Setiap suntingan bocor kepada pembaca serta-merta. Dibuktikan: `scripts/controlled-public-snapshot-test.ts` gagal 6/6 semakan kebocoran sebelum pembaikan, lulus 19/19 selepas. Pembaikan: baris lengkap dibekukan dalam transaksi penerbitan (#55). Suntingan seterusnya kekal draf sehingga **Terbitkan semula** (fungsi baharu).
- **U** Repositori kandungan tidak dimuat semula selepas permintaan pertama (`initPromise` tidak dikosongkan). Karya yang baru diterbitkan memberi 404 lebih 160 saat pada pelayan yang sama, walaupun instans baharu menemuinya (#59).
- **K** Butang terbit menjalankan pengesah kedua berbahasa Inggeris yang menolak pengarang bernama tetamu (import). Dibuang; readiness ialah satu-satunya sumber.
- **K** `IN ()` kosong dalam pemuatan revisi akan gagal bagi karya yang hanya dikreditkan kepada tetamu.
- **K** Papan pemuka dan senarai karya menunjukkan "Sedia diterbitkan" hanya berdasarkan status. Kini guna perkhidmatan readiness yang sama; karya Sedia tetapi disekat (cth. Hak) dipaparkan sebagai disekat dengan pautan terus ke tab berkenaan.
- **K+U** Terbit/Tandakan sedia dinyahaktifkan semasa teks belum disimpan; bar simpan menerangkan apa yang disimpan serta-merta (kredit, gambar, glosari, watak) berbanding apa yang perlu disimpan (teks, maklumat). Pratonton menyatakan ia versi tersimpan.

### Fasa 3-4
- Sumber sama dikesan merentas jenis dengan: lipatan diakritik, tajuk asal berbanding tajuk Jalin/terjemahan karya lain sebagai alias, rakan draf (amaran awal), rakan jenis sama (amaran), dan mesej yang menamakan karya lain (ID, jenis) serta laluan penyelesaian. Ralat sebenar ditemui oleh ujian E2E: status rakan tidak dihantar ke readiness (dibaiki dalam #56).
- Pembatalan kelulusan hak apabila catatan atau bukti berubah (hash bahan sumber tidak merangkumi dua medan itu).
- Fragmen: pengesahan manusia bahawa teks paparan ialah Bahasa Melayu, terikat pada cap jari teks; suntingan teks atau bahasa menarik balik pengesahan. Menggantikan pergantungan pada medan bahasa yang ditaip.
- Kredit: readiness memerlukan kredit awam sebagai penulis (editor/penyemak tidak mencukupi); penulis bernama tetamu daripada import diterima. Karya sudah terbit hanya mendapat amaran.
- Import: jenis dipilih semasa mula dan diikat; jawapan chatbot yang menyebut jenis lain ditolak (bukan ditukar senyap). Masalah semasa menyimpan (cth. sumber tidak tersimpan) dipaparkan sebelum keluar daripada borang.

### Fasa 5 (UI awam)
- Nota pendedahan Maya hanya apabila penyumbang maya dikreditkan; satu sumber untuk desktop dan mudah alih (sebelum ini rentetan global tetap).
- Watak ditapis mengikut bab kemunculan pertama. Disahkan pada data novela sebenar: bab-1 tiada Maryam/Ustaz Hakim/Farid; bab-5 ada semua.
- Laman utama: sorotan Bersiri (pautan siri, episod terkini, episod pertama; tiada apa-apa jika kosong), karya tidak berulang antara hero, pilihan editor dan terbaru, episod bersiri tidak lagi menghasilkan kad yang 404.
- `aria-current` pada navigasi awam; istilah glosari mendedahkan `aria-expanded` dan penerangan sentiasa ada untuk pembaca skrin; helaian maklumat mudah alih ialah dialog modal dengan fokus keluar-masuk dan kunci skrol.
- 320-360px: peraturan kad dan grid; saiz imej pilihan editor lebih tajam.

### Fasa 6 (UI admin)
- Navigasi: Siri ditambah, "Editorial" dinamakan semula "Penyumbang" (ia membuka senarai penyumbang), Permintaan gambar dicapai dari Karya, Penghantaran dan templat lama dipautkan dari Tetapan (sebelum ini hanya boleh dicapai dengan menaip URL).
- Carian karya: ID, tajuk, alamat pautan, pengarang; penapis aktif dinyatakan; satu butang kosongkan semua.
- Tambah Karya: satu soalan menerangkan dua cara (Tulis sendiri / Guna chatbot) dan bahawa kedua-duanya menghasilkan draf; pautan "Buka editor lengkap" yang salah dibuang.
- Perkataan Inggeris/teknikal dan ralat API diterjemah (Unauthorized, Hero, Approve/Attach, glossary, provenance, submission, template, Work, tajuk halaman).
- Label teks alternatif terikat pada medan dan ditandakan wajib; fail import dinyatakan sebelum ralat (.txt/.md, 2 MB, bukan .docx/PDF); sasaran sentuh 44px.

### Aksesibiliti (axe-core 4.10.2, dijalankan dalam pelayar)
Sebelum: color-contrast (serius) pada kicker, kelabu pudar, jadual admin; landmark-unique pada halaman bab. Selepas: **0 pelanggaran** pada laman utama, kategori, bab novela, halaman cerpen, /admin, /admin/works, /admin/works/add, /admin/contributors, /admin/settings.

## 3. Arahan dan keputusan sebenar

Dijalankan pada cabang gabungan semua PR (tempatan, tidak ditolak):

| Arahan | Keputusan |
|---|---|
| `npx tsc --noEmit` | bersih |
| `npm test` | keluar 0 (863 baris ✓; publication-pipeline 173 penegasan) |
| `npm run build` | berjaya |
| `npm run lint` | **tidak dapat dijalankan**: repositori tiada konfigurasi ESLint (`next lint` meminta persediaan interaktif). Tiada konfigurasi ditambah. |
| `npx tsx scripts/controlled-public-snapshot-test.ts` | 19/19 lulus (cabang Neon ujian) |
| `scripts/controlled-source-rights-test.ts` | lulus, termasuk perubahan bukti membatalkan kelulusan |
| `scripts/e2e-editor-flow.ts all` | semua semakan lulus (lihat di bawah) |
| axe-core | 0 pelanggaran pada halaman yang disenaraikan |

E2E (`npm run test:e2e-flow`, pada pelayan dev dan pangkalan data ujian):
- Cerpen: draf baharu, teks/metadata, kredit, glosari, muat naik gambar utama dan dalam teks pada penanda, ganti gambar, alih penanda, penanda yang masih digunakan tidak boleh dibuang, semak, Sedia, terbit, laman awam memaparkan versi terbit, suntingan kekal draf dan tidak bocor, papan status memaklumkan perubahan belum terbit, terbit semula, laman awam memaparkan versi baharu.
- Fragmen asal dan terjemahan: sekatan pengesahan teks BM, pengesahan manusia, semakan hak, pengesahan ditarik balik apabila teks berubah, sekatan penterjemah.
- Sumber sama: amaran awal apabila Sinopsis dan Fragmen berkongsi sumber.
- Bersiri: episod dalam siri diterbitkan; halaman episod, halaman siri dan sorotan laman utama.

Nota had E2E: imej dimuat naik ke cakera tempatan dalam dev (readiness menolaknya sebagai alamat tidak kekal), jadi skrip memberi setiap imej alamat storan kekal tiruan. Itu satu langkah yang disimulasikan; selebihnya guna API admin sebenar.

## 4. Isu tertangguh

| Isu | Status | Sebab |
|---|---|---|
| Atribusi/hak per imej (ganti `© ADJUNG` yang ditetapkan tetap; jadual `visuals` tiada lajur kredit/hak) | Tidak dilaksanakan (K) | Memerlukan migrasi pangkalan data dan audit data; arahan melarang migrasi production tanpa kebenaran. Cadangan: lajur `rights_status`, `credit_line`; rekod sedia ada ditanda "perlu semakan manusia" dan notis lama dikekalkan sehingga disemak. |
| Isi semula versi beku bagi 6 karya terbit sedia ada di production | Skrip siap, **belum dijalankan** | `scripts/backfill-published-revisions.ts` (dry run lalai). Diuji pada cabang ujian: output awam sama (selain susunan seri). Perlu kebenaran khusus anda. Sehingga itu karya sedia ada masih dihidang daripada salinan kerja. |
| Peraturan italik tajuk karya dalam teks editorial | Perlu keputusan reka bentuk | Tajuk halaman kini tegak; tiada mekanisme untuk mencondongkan tajuk yang disebut dalam teks. |
| Ralat dipaparkan sebagai amaran halaman, bukan di sebelah medan | Tertangguh | Perubahan besar pada borang editor. |
| Semakan skrin pembaca sebenar (NVDA/VoiceOver) dan laluan papan kekunci penuh | Tidak dijalankan | Hanya semakan kod dan axe-core. |
| Ujian Playwright `npm run test:editor-ui` (API tiruan) | Tidak dijalankan | Memerlukan pelayan pada port 3100; digantikan oleh E2E API sebenar. |
| Penyelarasan ejaan Indonesia/Melayu dan variasi nama pengarang dalam pengesanan sumber sama | Tertangguh (H) | Memerlukan senarai alias; kini hanya huruf besar/kecil, tanda baca, diakritik dan tajuk asal/terjemahan. |
| Fragmen/Sinopsis jenis sama daripada sumber yang sama | Dibenarkan dengan amaran | Beberapa petikan daripada satu karya adalah sah; tidak disekat. |
| Hash kelulusan hak guna djb2 32-bit | Tertangguh (K) | Cukup untuk perbandingan kesamaan; bukan keselamatan. |
| Kad "Karya terkait" menyerap `body` penuh karya lain dalam muatan RSC halaman | Pemerhatian (U) | Dilihat dalam HTML yang ditangkap semasa ujian. Hanya prestasi/saiz halaman; kandungan sudah awam. Belum disiasat. |
| Halaman siri gaya drama TV (KIV) dan butang "letak gambar di sini" (KIV) | Seperti diputuskan | |
| Pilihan nama Rafiq Naim berganda (slug `chatgpt` dan `rafiq-naim`) | Soalan data untuk anda | |
| Menu navigasi mudah alih tidak tutup apabila klik luar; "Buang" dalam borang semakan import tanpa pengesahan | Rendah | Baris dalam ingatan sahaja. |

## 5. Risiko dan rollback

| Perubahan | Risiko | Rollback |
|---|---|---|
| #55 versi beku | Karya terbit tanpa versi beku masih guna salinan kerja (tingkah laku lama) sehingga isi semula dijalankan. Pemetaan versi beku diuji sama dengan baris langsung, tetapi hanya pada 6 karya + karya ujian. | Revert PR; karya kembali dihidang daripada salinan kerja. Revisi yang sudah ditulis tidak berbahaya. |
| #55 butang Terbitkan semula | Pembaca terus melihat draf apabila ditekan; ada pengesahan. | Revert. |
| #56 sekatan baharu (`fragmen_text_unreviewed`, `writer_credit_missing`) | Karya draf/semakan/sedia tanpa kredit penulis atau pengesahan Fragmen perlu langkah itu sebelum terbit. Karya sudah terbit hanya mendapat amaran. | Revert. |
| #59 muat semula repositori | Pelayan memuat semula pangkalan data setiap 30 saat apabila ada trafik (kos bacaan). | Revert (kembali muat sekali). |
| #57, #58, #60 | Hanya UI/CSS/label. | Revert. |
| Skrip isi semula | Mengubah jadual `work_revisions` dan `works.published_revision_id` bagi karya terbit; tidak mengubah `published_at`/versi (`preserveMeta`). | Tetapkan `published_revision_id` kembali kepada NULL. |

## 6. Bukti tangkap layar

`docs/audit-2026-10/screenshots/`
- `before-tambah-karya.jpg` / `after-tambah-karya-cara-bermula.jpg`: Tambah Karya, sebelum dan selepas.
- `after-admin-terbitkan-semula.jpg`: karya terbit dengan draf berubah; butang Terbitkan semula dan penjelasan.
- `after-admin-carian-pengarang.jpg`: carian "Nara" menemui karya melalui pengarang; penapis aktif dinyatakan.
- `after-laman-utama-320px.jpg`: laman utama pada 320px.

Tangkap layar "sebelum" bagi halaman admin production tidak diambil: sesi pelayar saya tidak log masuk ke admin production dan kelayakan tidak boleh dimasukkan oleh saya.
