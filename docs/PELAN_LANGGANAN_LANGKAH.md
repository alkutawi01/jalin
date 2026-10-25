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

- [ ] **C1. Kaji penyedia bayaran** untuk Malaysia: FPX dan kad, yuran, syarat akaun perniagaan (SSM milikan tunggal), API, tempoh pengeluaran wang, bayaran balik. Minta Claude menyediakan perbandingan dan cadangan. Tiada kod ditulis dan tiada akaun dibuka sehingga awak pilih.
- [ ] **C2. Buka akaun penyedia** yang dipilih dan sediakan kunci API (mod ujian dahulu).
- [ ] **C3. Bina aliran (termasuk nombor siri dalam e-mel dan tarikh tebus sebelum):** pilih pakej, bayar, kod dijana dan dihantar ke e-mel, tebus. Kod dari e-mel perlu ditebus melalui mekanisme yang sama (satu kod, satu akaun).
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
