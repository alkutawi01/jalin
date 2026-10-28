# Pelan langganan Jalin: langkah demi langkah

Disediakan 25 Oktober 2026. Tandakan `[x]` apabila siap. Susunan penting: jangan langkau ke bahagian seterusnya sebelum bahagian sebelumnya selesai.

## Keadaan semasa (25 Okt 2026)

Sudah dibina dan berada di produksi, tetapi tersembunyi: akaun pembaca, percubaan 14 hari, dinding bayar (suis), penebusan kod kad dan kod kongsi, admin langganan (`/admin/langganan`), sandaran malam kod ke luar pangkalan data, nombor siri sebagai faktor kedua (`docs/NOMBOR_SIRI_KAD.md`), label pelekat (siri dan kod sahaja), kad maya `/tebus`, dan halaman `/soalanlazim` (bahasa disemak ChatGPT, `docs/SOALAN_LAZIM.md`). Pangkalan data produksi masih 0 kod. `READER_ACCOUNTS_ENABLED` belum dihidupkan, jadi `/tebus`, `/akaun` dan `/soalanlazim` memberi 404.

Belum ada: bayaran dalam Jalin (pilih pakej, bayar, kod dihantar ke e-mel); dasar bayaran balik dan penggantian kad.

## Keputusan Izzat (25 Okt 2026)

- **Urutan pelancaran: kod e-mel dahulu, kad fizikal kemudian.** Jadi bayaran dalam Jalin (bahagian C) ialah laluan kritikal. Kad fizikal (bahagian B) menyusul.
- **Pakej:** 1, 6 dan 12 bulan. Harga belum ditetapkan.
- **Tarikh tebus sebelum:** ada, ditetapkan bagi setiap kelompok (seperti SUS). BELUM DIBINA (lihat C3).
- **Kad hilang atau rosak:** diganti jika kod belum ditebus (sistem sudah menyokongnya). Sekiranya sudah ditebus, tiada penggantian. Soalan Lazim perlu dikemas kini (lihat A1).
- **Nombor siri fizikal dan maya dibezakan dengan satu huruf sebelum nombor kad:** F untuk kad fizikal, M untuk kad maya (kod e-mel). Contoh bentuk: `...-F01` dan `...-M01`. Fizikal dan maya mempunyai urutan nombor masing-masing. Keputusan Izzat, 25 Okt 2026. DIBINA 25 Okt 2026.
- **Tarikh tebus sebelum, kod maya:** tetap satu tahun selepas kod dijana (tiada pilihan setiap kelompok). **Kod fizikal:** ditetapkan setiap kelompok. **DIBINA 25 Okt 2026** (migrasi 036).
- **Gateway:** ChatGPT dan kajian Claude sama-sama mencadangkan Billplz Basic dahulu (`docs/KAJIAN_PENYEDIA_BAYARAN.md`). Satu akaun gateway cukup untuk SUS dan Jalin; guna rujukan berasingan. Belum dipilih secara rasmi.
- **Saluran pengeluaran kod mesti direkod:** kad fizikal, bayaran dalam talian, hadiah. Satu sistem tebus untuk semua; kod Jalin tidak sah di SUS dan sebaliknya.
- **Kod digital:** salinan terenkripsi disimpan sehingga e-mel berjaya dihantar, kemudian dipadam (enjin sedia ada hanya menyimpan cincang, jadi ini perlu dibina).
- **Struktur penjual (Izzat, 28 Okt 2026):** Adjung Press Platform (SSM pemilik tunggal) belum ada akaun bank perniagaan, dan Billplz memaklumkan akaun peribadi tidak boleh. Antakesuma Holdings Sdn Bhd (Izzat ialah pengarah urusan; kedua-dua entiti milik Izzat) akan menjadi **merchant dan penjual langganan sahaja**, manakala Adjung Press Platform kekal sebagai penerbit kandungan Jalin. Belum dilaksanakan; lihat langkah C0 di bawah.
- **Bayaran balik:** belum diputuskan; Soalan Lazim kekal senyap tentangnya.
- **SUS tidak mempunyai sistem kad langganan** (disahkan daripada sesi SUS, 25 Okt); "samakan dengan SUS" bermaksud samakan rupa dan nada kad, bukan sistem sedia ada. Tiada dasar SUS untuk disalin.

## Perkara teknikal yang mesti diselesaikan sebelum kod e-mel dihantar

- **Kod e-mel perlu membawa nombor siri juga.** Nombor siri ialah faktor kedua bagi semua kod kad. Borang tebus kini hanya menghantar nombor siri jika pembaca memilih "ada kad fizikal"; kod kad yang diterima melalui e-mel tanpa nombor siri akan ditolak. Penyelesaian: e-mel "kad maya" memaparkan nombor siri dan kod bersama, dan borang sentiasa meminta kedua-duanya untuk kod kad. Kod kongsi (cth JLN-...) tidak memerlukan nombor siri.
- **Tarikh tebus sebelum:** tambah medan pada kelompok, semakan semasa tebus (tolak jika lepas tarikh), dan paparan pada label dan kad maya.
- **Jualan dalam talian tidak menggunakan pelekat kikis.** Kod dalam e-mel dilihat terus. Tentukan sama ada mahu kod disimpan sebagai kad maya (gambar dalam e-mel) atau teks sahaja.

## Bahagian A. Keputusan yang perlu dibuat (tiada kod)

- [ ] **A1. Bayaran balik** belum diputuskan. Penggantian kad hilang atau rosak sudah diputuskan (diganti jika belum ditebus): kemas kini Soalan Lazim, kemudian hantar ChatGPT semula dengan fakta sumber.
- [ ] **A2. Harga** pakej 1, 6 dan 12 bulan.
- [ ] **A3. Padam atau kurangkan** perbualan ChatGPT "Semakan bahasa dan fakta" (folder Jalin) dan `docs/NOMBOR_SIRI_KAD.md`, jika maksud nombor siri mahu dirahsiakan sepenuhnya.

## Bahagian B. Kad fizikal (selepas kod e-mel dilancarkan)

- [ ] **B1. Reka kad** dalam Canva atau Illustrator (hadapan 1, 6 dan 12 bulan; belakang). Jalin tidak mereka bentuk kad; sistem hanya mencetak label.
- [ ] **B2. Pilih kedudukan label** pada belakang kad, dan kedudukan pelekat kikis di atas kod.
- [ ] **B3. Semak teks kad dan Soalan Lazim sepadan:** lokasi nombor siri dan kod, arahan penebusan, alamat `jalin.adjung.com/tebus` dan `jalin.adjung.com/soalanlazim`.
- [ ] **B4. Ujian cetak label.** Di `/admin/langganan/kad`, muat turun "label ujian". Cetak pada pencetak haba sebenar, lekatkan pelekat kikis, dan semak: kod tidak terpotong, kod masih boleh dibaca selepas dikikis, dan pelekat menutup kod sepenuhnya walaupun senget sedikit.
- [ ] **B5. Tetapkan saiz muktamad** label dan pelekat kikis (nilai awal 50 x 30 mm dan 40 x 8 mm hanyalah andaian). Jika saiz berubah, kemas kini `DEFAULT_LABEL` dalam `src/lib/subscription/label.ts`.
- [ ] **B6. Cetak kelompok percubaan kecil** (contoh 10 kad) dan uji dengan satu akaun ujian (lihat bahagian D).

## Bahagian C. Bayaran dalam Jalin dan kod e-mel (DIDAHULUKAN, belum dibina)

- [ ] **C0. Struktur penjual (Antakesuma menjual langganan).** Izzat: (a) pastikan Antakesuma ada akaun bank syarikat dan dokumen SSM syarikat; (b) tanya akauntan tentang perjanjian antara dua syarikat, SST atau e-Invois, dan skop aktiviti (SSIC) pada SSM Antakesuma; (c) berikan nombor SSM dan alamat berdaftar Antakesuma (maklumat awam syarikat sahaja, bukan nombor MyKad). Claude (selepas itu): kemas kini `src/lib/legal-identity.ts`, `src/lib/company-notice.ts`, Terma penggunaan, Dasar privasi (menyebut kedua-dua entiti), Tentang kami, kad maya `/tebus`; draf melalui ChatGPT dan semakan peguam. **Kad fizikal yang Izzat reka juga membawa SSM Adjung Press Platform: putuskan nama penjual pada kad sebelum dicetak.** Pendaftaran penyedia bayaran dibuat atas nama Antakesuma; pengesahan selfie dan MyKad pengarah mungkin berulang, jadi teruskan tiket sokongan Billplz dan cuba CHIP.
- [x] **C1. Kajian penyedia bayaran** siap (25 Okt 2026): lihat `docs/KAJIAN_PENYEDIA_BAYARAN.md`. Senarai pendek: Billplz dan CHIP Collect. Tiada kod ditulis dan tiada akaun dibuka.
- [ ] **C1b. Izzat:** lihat senarai dokumen pendaftaran Billplz dan CHIP, tanya sama ada pemilik tunggal boleh terima ke akaun bank yang ada (atau mesti atas nama perniagaan), tanya SST ke atas yuran dan masa kelulusan, dan (CHIP) bayaran balik dan mod ujian. Kemudian pilih satu.
- [ ] **C2. Buka akaun penyedia** yang dipilih dan sediakan kunci API (mod ujian dahulu).
- [x] **C3. Aliran jualan dalam talian dibina (25 Okt 2026)** dan diuji hujung ke hujung pada pangkalan data pembangunan dengan kunci palsu: pesanan, bayaran (callback bertandatangan), satu kod bagi satu bayaran, kod tersulit sehingga e-mel dihantar, hantar semula, tebus dengan nombor siri F/M, tarikh tebus sebelum. Lihat `docs/JUALAN_DALAM_TALIAN.md`. **Belum diuji dengan Billplz sebenar.**
- [ ] **C3b. Izzat:** buka akaun Billplz sandbox, tetapkan pemboleh ubah dalam `docs/JUALAN_DALAM_TALIAN.md`, jalankan migrasi 036 dan 037 pada produksi (selepas migrasi 035 `web-push` digabungkan), dan lakukan satu pembelian sandbox.
- [x] **C3c-1 (26 Okt 2026):** Soalan Lazim dikemas kini (tarikh tebus sebelum, beli dalam talian) dan teks baharu disemak ChatGPT.
- [ ] **C3c-2 Claude (kemudian):** pautan ke `/beli` dalam menu atau halaman (Izzat tentukan tempat), dan butang penggantian kod maya.
- [ ] **C4. Uji dalam mod ujian penyedia**, kemudian satu pembelian sebenar bernilai kecil.
- [ ] **C5. Kemas kini Terma penggunaan dan Dasar privasi** untuk memasukkan pembayaran, dan semak melalui ChatGPT.

C kini laluan kritikal, kerana kod e-mel dilancarkan dahulu. Selesaikan juga perkara teknikal di atas (nombor siri dalam e-mel, tarikh tebus sebelum) sebagai sebahagian C3.

## Bahagian D. Ujian sebelum hidup

- [ ] **D1. Jalankan ujian hujung ke hujung** yang belum dijalankan: `npx tsx scripts/reader-e2e.ts` dan `scripts/langganan-admin-check.ts` (perlukan pelayan hidup dan sesi admin; guna cabang pangkalan data pembangunan sahaja).
- [ ] **D2. Ujian manual** dengan alamat e-mel ujian awak: daftar, log masuk, mulakan percubaan, tebus kod dengan nombor siri, semak akses dan tarikh tamat, cuba tebus kod yang sama dua kali, cuba nombor siri yang salah.
- [ ] **D3. Uji suis henti penebusan** (`/admin/langganan`): hidupkan, pastikan tebus ditolak, matikan semula.
- [ ] **D4. Semak sandaran malam kod** (`/admin/langganan`, "Eksport terakhir yang berjaya") wujud dan terkini.

## Bahagian E. Hidupkan (keputusan awak)

Lakukan hanya selepas B, D selesai dan A1 diputuskan.

- [ ] **E1. Hidupkan akaun pembaca:** tetapkan `READER_ACCOUNTS_ENABLED=yes` pada Hostinger dan bina semula. Selepas itu `/tebus`, `/akaun` dan `/soalanlazim` wujud.
- [ ] **E2. Buat kelompok sebenar** di `/admin/langganan/kad`: pilih tempoh, bilangan dan bulan dijangka dikeluarkan. PDF label dimuat turun sekali sahaja; kod tidak disimpan dalam bentuk asal. Jika PDF hilang, kelompok mesti dibatalkan dan dibuat semula.
- [ ] **E3. Cetak, semak, tekan "Sahkan cetakan".** Selepas itu, apabila kad keluar dari tangan awak, tekan "Aktifkan kod" (boleh seluruh kelompok atau ikut nombor siri).
- [ ] **E4. Hidupkan dinding bayar** (`/admin/langganan`, "Hidupkan dinding bayar") hanya apabila kad pertama sudah dijual. Selagi mati, semua cerita terbuka untuk semua orang.
- [ ] **E5. Pantau minggu pertama:** `/admin/langganan` (pendaftaran, percubaan, tebus), tiada kegagalan berulang, dan e-mel ke `editorial@adjung.com`.

## Jika berlaku masalah

- **Penebusan disalahgunakan atau pangkalan data dipulihkan:** hidupkan "Suis henti penebusan" dahulu. Prosedur pemulihan fail eksport malam ada dalam `scripts/restore-drill.ts` (latihan lulus).
- **Kad hilang atau rosak sebelum ditebus:** batalkan atau ganti di halaman kelompok (`/admin/langganan/kad/[id]`).
- **Cetakan salah:** batalkan kelompok, semua kodnya mati.

## Nota 28 Okt 2026: Antakesuma pada laman Jalin

Atas arahan Izzat (supaya CHIP nampak laman dimiliki dan diuruskan oleh dua syarikat), nama dan nombor SSM Antakesuma Holdings Sdn. Bhd. ditambah pada Jalin: kaki laman (setiap halaman), Terma penggunaan (Kad dan pembelian), Dasar privasi (BM dan EN) dan Tentang kami. Sumber data: `src/lib/company-notice.ts` dan `src/lib/legal-identity.ts` (alamat berdaftar Antakesuma sahaja, bukan alamat perniagaan; tiada butiran peribadi pengarah). Teks disemak ChatGPT pada 28 Okt 2026.

Perkara yang ChatGPT tandakan dan **perlu disahkan peguam atau akauntan**:
- Peranan Antakesuma terhadap data pembelian: ChatGPT menyatakan memproses alamat e-mel tidak semestinya menjadikannya pemproses data bagi pihak Adjung Press Platform; jika Antakesuma menentukan tujuan atau kaedah pemprosesan sendiri, ia mungkin pengawal data juga (PDPA 2010 selepas pindaan 2024). Mungkin perlu perjanjian pemprosesan data antara dua syarikat.
- Entiti merchant yang didaftarkan dengan CHIP, pemegang akaun bank penerima, nama pada rekod transaksi dan penjual langganan mesti konsisten (Antakesuma).
- Aktiviti perniagaan (SSIC) pada SSM Antakesuma belum meliputi penerbitan atau langganan digital.
