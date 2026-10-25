# Pelan langganan Jalin: langkah demi langkah

Disediakan 25 Oktober 2026. Tandakan `[x]` apabila siap. Susunan penting: jangan langkau ke bahagian seterusnya sebelum bahagian sebelumnya selesai.

## Keadaan semasa (25 Okt 2026)

Sudah dibina dan berada di produksi, tetapi tersembunyi: akaun pembaca, percubaan 14 hari, dinding bayar (suis), penebusan kod kad dan kod kongsi, admin langganan (`/admin/langganan`), sandaran malam kod ke luar pangkalan data, nombor siri sebagai faktor kedua (`docs/NOMBOR_SIRI_KAD.md`), label pelekat (siri dan kod sahaja), kad maya `/tebus`, dan halaman `/soalanlazim` (bahasa disemak ChatGPT, `docs/SOALAN_LAZIM.md`). Pangkalan data produksi masih 0 kod. `READER_ACCOUNTS_ENABLED` belum dihidupkan, jadi `/tebus`, `/akaun` dan `/soalanlazim` memberi 404.

Belum ada: bayaran dalam Jalin (pilih pakej, bayar, kod dihantar ke e-mel); dasar bayaran balik dan penggantian kad.

## Bahagian A. Keputusan yang perlu dibuat (tiada kod)

- [ ] **A1. Dasar bayaran balik dan penggantian kad.** Putuskan: ada atau tiada bayaran balik, bila; kad rosak atau hilang diganti atau tidak (sistem sudah boleh menggantikan kad yang belum ditebus). Selepas putus, Soalan Lazim perlu dikemas kini dan disemak ChatGPT semula (sertakan fakta sumber).
- [ ] **A2. Harga** kad 1, 6 dan 12 bulan.
- [ ] **A3. Padam atau kurangkan** perbualan ChatGPT "Semakan bahasa dan fakta" (folder Jalin) dan `docs/NOMBOR_SIRI_KAD.md`, jika maksud nombor siri mahu dirahsiakan sepenuhnya.

## Bahagian B. Kad fizikal

- [ ] **B1. Reka kad** dalam Canva atau Illustrator (hadapan 1, 6 dan 12 bulan; belakang). Jalin tidak mereka bentuk kad; sistem hanya mencetak label.
- [ ] **B2. Pilih kedudukan label** pada belakang kad, dan kedudukan pelekat kikis di atas kod.
- [ ] **B3. Semak teks kad dan Soalan Lazim sepadan:** lokasi nombor siri dan kod, arahan penebusan, alamat `jalin.adjung.com/tebus` dan `jalin.adjung.com/soalanlazim`.
- [ ] **B4. Ujian cetak label.** Di `/admin/langganan/kad`, muat turun "label ujian". Cetak pada pencetak haba sebenar, lekatkan pelekat kikis, dan semak: kod tidak terpotong, kod masih boleh dibaca selepas dikikis, dan pelekat menutup kod sepenuhnya walaupun senget sedikit.
- [ ] **B5. Tetapkan saiz muktamad** label dan pelekat kikis (nilai awal 50 x 30 mm dan 40 x 8 mm hanyalah andaian). Jika saiz berubah, kemas kini `DEFAULT_LABEL` dalam `src/lib/subscription/label.ts`.
- [ ] **B6. Cetak kelompok percubaan kecil** (contoh 10 kad) dan uji dengan satu akaun ujian (lihat bahagian D).

## Bahagian C. Bayaran dalam Jalin (belum dibina)

- [ ] **C1. Kaji penyedia bayaran** untuk Malaysia: FPX dan kad, yuran, syarat akaun perniagaan (SSM milikan tunggal), API, tempoh pengeluaran wang, bayaran balik. Minta Claude menyediakan perbandingan dan cadangan. Tiada kod ditulis dan tiada akaun dibuka sehingga awak pilih.
- [ ] **C2. Buka akaun penyedia** yang dipilih dan sediakan kunci API (mod ujian dahulu).
- [ ] **C3. Bina aliran:** pilih pakej, bayar, kod dijana dan dihantar ke e-mel, tebus. Kod dari e-mel perlu ditebus melalui mekanisme yang sama (satu kod, satu akaun).
- [ ] **C4. Uji dalam mod ujian penyedia**, kemudian satu pembelian sebenar bernilai kecil.
- [ ] **C5. Kemas kini Terma penggunaan dan Dasar privasi** untuk memasukkan pembayaran, dan semak melalui ChatGPT.

C hanya perlu jika mahu jual terus dalam Jalin. Kad fizikal boleh dilancarkan tanpa C.

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
