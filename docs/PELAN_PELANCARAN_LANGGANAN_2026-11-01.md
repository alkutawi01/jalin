# Pelan pelancaran langganan Jalin kepada awam

Pemilik keputusan: Izzat. Disediakan Codex pada 1 November 2026 (MYT).
Status: DRAF UNTUK KELULUSAN, bukan kebenaran melaksanakan operasi produksi.
Skop: Jalin sahaja, bukan SUS. Hasil akhir merangkumi langganan awam dan label pelekat kod untuk kad fizikal.
Penegasan Izzat, 6 November 2026: kad fizikal juga dijual di Shopee dan dipos kepada pembeli. Sistem mesti mencetak label
pelekat melalui pencetak thermal dan menyimpan kodnya. Lihat bahagian 12; aliran fizikal ialah hasil wajib tugas keseluruhan.

## 1. Hasil akhir yang hendak dicapai

Pembaca boleh mencari pautan langganan, melihat harga, membayar melalui CHIP, menerima kod melalui e-mel, log masuk,
menebus kod dan membaca mengikut tempoh aksesnya. Akaun memaparkan status serta tarikh tamat yang betul. Tiada pembaharuan
atau caj berulang automatik. Aliran semasa memerlukan penebusan selepas membeli; pembayaran sahaja belum mengaktifkan akses.

Jualan awam dan dinding bayar ialah dua keputusan berasingan. Dinding bayar hanya dihidupkan selepas satu pembelian sebenar
dan penebusan berjaya dibuktikan, serta Izzat meluluskan penguatkuasaan akses. Sehingga itu bacaan kekal terbuka.

Setiap pintu di bawah memerlukan kelulusan khusus pada masa tindakan. Kelulusan pelan tidak meliputi migrasi,
tetapan produksi, wang sebenar, pemadaman data atau penghidupan dinding bayar.

## 2. Asas bukti dan batasan

- Semakan live 1 November: `/` menjawab 200; `/beli`, `/tebus`, `/log-masuk` dan `/soalanlazim` menjawab 404.
- Rujukan kod yang diperiksa: `origin/main` = `0fa93f87`, `origin/hostinger` = `12bd2a81`. Penempatan menggunakan `hostinger`.
  Sebelum pelaksanaan, ambil semula versi terkini dan padankan dengan komit penempatan yang sebenar dalam hPanel.
- CHIP mod ujian lulus pada 28 Oktober: pembayaran berjaya/gagal, kod tunggal, penebusan dan panggilan balik berulang.
  Ini bukan bukti wang sebenar atau persediaan produksi sudah lulus pada 1 November.
- `purchaseStatus()` memerlukan akaun pembaca, suis pembelian, konfigurasi gerbang dan semua harga 1/6/12 bulan.
- `reader_switches.paywall_on` berasingan daripada kedua-dua suis persekitaran itu.
- Kod dan Terma semasa: percubaan 14 hari bermula apabila pembaca memilih untuk memulakannya, bukan automatik semasa mendaftar.
  Dokumen produk lama yang menyatakan sebaliknya perlu diselaraskan, bukan diikuti secara membuta tuli.
- Menurut serah tugas, migrasi 036/037 pernah dijalankan hanya pada pembangunan. Keadaan DB produksi BELUM disahkan semula.
  Jangan menganggap jumlah kod atau pesanan produksi masih sifar tanpa pertanyaan baca sahaja.
  Semakan susulan baca sahaja pada 2 November kini direkodkan dalam bahagian 8; gunakan hasil itu untuk status terkini.
- `035_web_push.ts` tiada dalam inventori `origin/hostinger` yang diperiksa. Jangan salin fail sementara lalu menjalankan migrasi
  produksi; selesaikan urutan melalui perubahan yang disemak dan diluluskan Izzat.
- Dua risiko skrip `scripts/db-schema-migrate.ts`: `dotenv` menggunakan `override: true`, dan konfigurasi SSL mengandungi
  `rejectUnauthorized: false`. Sahkan terhadap versi terkini dan baiki dengan ujian sebelum menggunakannya pada produksi.
  Penemuan ini mengenai skrip yang diperiksa, bukan dakwaan bahawa sambungan runtime laman live tidak selamat.

## 3. Keputusan Izzat: yang disahkan dan yang masih diperlukan

1. **HARGA DISAHKAN IZZAT, 2 November 2026:** kekalkan RM15 (1 bulan), RM30 (6 bulan), RM50 (12 bulan), seperti Terma semasa.
   Nilai harga untuk konfigurasi kemudian ialah `PLAN_PRICES_MYR=1=15,6=30,12=50`. Keputusan harga ini sahaja bukan kelulusan
   menukar pemboleh ubah Hostinger, membuat bayaran, membuka jualan atau menghidupkan dinding bayar. Konfigurasi produksi belum diubah.
2. **KEPUTUSAN BAYARAN BALIK, diperjelas Izzat pada 2 November 2026:** tiada jaminan bayaran balik kerana tersalah membeli
   atau berubah fikiran, walaupun kod belum ditebus. Pembeli tetap boleh memohon; Izzat boleh meluluskannya atas dasar
   budi bicara. Ini bukan larangan memohon atau larangan bayaran balik mutlak bagi semua keadaan.
   Kod yang masih sah dan belum ditebus boleh disimpan untuk digunakan kemudian atau diberikan kepada orang lain;
   jangan gambarkan tempoh akses yang sudah ditebus sebagai boleh dipindah milik secara automatik. Jika bayaran balik
   diluluskan, kod berkenaan perlu dipastikan tidak lagi boleh ditebus melalui aliran yang diaudit; butiran operasi
   mesti diluluskan sebelum pelaksanaan, bukan dilakukan secara automatik berdasarkan keputusan dasar ini.
   Pengendalian caj berganda, akses yang gagal dibekalkan, salah e-mel dan kod e-mel hilang masih perlu diperincikan.
   Hak pengguna yang terpakai di sisi undang-undang tidak diketepikan oleh keputusan perniagaan ini; teks akhir perlu
   semakan peguam dan semakan bahasa ChatGPT sebelum diterbitkan. Jangan menjanjikan tempoh pemulangan wang atau
   melaksanakan bayaran balik tanpa kuasa operasi yang diluluskan. Penggantian kad yang belum ditebus sudah diputuskan dalam serah tugas.
3. **SUSUNAN PAUTAN DILULUSKAN IZZAT, 2 November 2026:** menu utama menyediakan `Langgan` menuju `/beli`;
   halaman Akaun menyediakan `Beli kod`, `Tebus kod`, status langganan dan tarikh tamat. Menu mudah alih menyediakan
   pautan yang sama. Ini kelulusan susunan, bukan bukti UI sudah dilaksanakan atau kebenaran membuka jualan/menempatkan kod.
   Pelaksanaan mesti menghormati suis ciri supaya pautan pembelian tidak membawa pembaca ke halaman yang masih ditutup.
   **KONSEP KARYA CONTOH DILULUSKAN IZZAT, 2 November 2026:** tiga karya boleh dibaca penuh tanpa akaun sebagai contoh;
   karya lain memerlukan percubaan aktif atau langganan apabila dinding bayar dibuka. Tajuk masih menunggu pilihan Izzat.
   Ini bukan kelulusan menukar suis akses mana-mana karya atau menghidupkan dinding bayar sekarang.
   Cadangan untuk dipilih: `Kerusi di Beranda` dan `Nombor Giliran 117` (cerpen), serta `Gatsby Agung` (sinopsis).
   Ketiga-tiga halaman awam disemak pada 2 November dan menjawab 200; cadangan ini belum menjadi pilihan muktamad atau
   konfigurasi produksi.
   **CADANGAN IZZAT, 2 November 2026:** pilih episod 1 siri `Satu Daerah Paling Sunyi`, bertajuk `Garing, Bukan Hangit`,
   sebagai salah satu daripada tiga bacaan contoh. Halaman siri dan episod disemak live (200):
   `/kategori/bersiri/satu-daerah-yang-paling-sunyi/garing-bukan-hangit`.
   Skop ialah episod 1 sahaja, bukan semua episod siri. Pada masa cadangan episod ini dibuat, dua tajuk lain belum dipilih;
   jangan menganggap semua cadangan asal Codex sudah diluluskan. Uji penandaan per slug episod dan akses episod seterusnya
   sebelum menghidupkan dinding bayar; tiada tetapan karya atau DB produksi diubah ketika mencatat cadangan ini.
   **PILIHAN SUSULAN IZZAT, 2 November 2026:** sinopsis yang disebut sebagai `Tenggelamnya Kapal` dipilih untuk slot
   sinopsis, menggantikan cadangan Codex `Gatsby Agung`. Jangan menukar pilihan ini kepada fragmen daripada novel yang sama.
   Semakan kedua-dua halaman senarai sinopsis live pada 2 November belum menemui padanan tajuk/pautan; tajuk lengkap dan
   slug karya perlu disahkan bersama Izzat sebelum konfigurasi akses. Jangan mereka URL atau mencipta/menerbitkan sinopsis
   baharu daripada keputusan pemilihan ini. Satu lagi bacaan contoh belum dipilih; `Kerusi di Beranda` masih cadangan sahaja.
4. **HAD SAMBUNGAN DISAHKAN IZZAT, 2 November 2026:** Jalin menggunakan aturan yang sama seperti SUS: satu kad/kod tambahan
   sahaja untuk sambungan, maksimum satu tahun selepas tamat kad yang sedang aktif. Terpakai untuk semua tempoh pakej;
   had tidak dikira semula daripada tamat kod tambahan yang masih beratur. Contoh tahunan SUS turut menjadi rujukan:
   kad aktif bagi 2027 boleh disambung sekali bagi 2028, bukan ditebus berulang kali untuk menambah tahun seterusnya dalam tempoh itu.
   Semasa audit awal, kod Jalin masih menyambung tanpa had tersebut. Pelaksanaan setempat dan ujian susulan direkodkan dalam
   bahagian 10; produksi belum diubah.
   **PENJELASAN IZZAT, 2 November 2026:** apabila kod tambahan mula aktif, satu kod lagi boleh ditebus untuk tempoh selepasnya.
   Dalam contoh tahunan, kod 2029 boleh ditebus mulai 1 Januari 2028 apabila kod 2028 mula aktif. Tidak perlu menunggu semua
   tempoh habis. Pembelian Jalin boleh dibuat tanpa akaun, jadi jangan menyalin semakan pembeli-pemilik SUS secara
   terus atau menganggap pembeli semestinya penerima kod. Penolakan penebusan kerana had tidak boleh menggunakan kod atau
   menambah akses; penguatkuasaan mesti selamat terhadap permintaan serentak dan diuji pada DB pembangunan.
5. Sahkan skop pelancaran: jualan awam dahulu, kemudian penguatkuasaan akses selepas ujian wang sebenar (cadangan pelan ini).

Kelulusan CHIP, konsistensi penjual/penerima bayaran Antakesuma, kesesuaian rekod perniagaan serta semakan peranan data oleh
peguam/akauntan ialah prasyarat luaran. Jangan mereka hasil semakan atau mengubah pendaftaran syarikat bagi pihak Izzat.

## 4. Urutan kerja dan pintu kelulusan

### Fasa A: audit kesediaan, baca sahaja

- Semak komit penempatan Hostinger, status binaan dan inventori migrasi pada kod serta DB produksi (baca sahaja).
- Semak akaun dan Brand Jalin di CHIP: kelulusan wang sebenar, kaedah bayaran yang benar-benar aktif, nama penjual dan
  pemegang akaun penyelesaian. Gunakan Brand Jalin sahaja; jangan gunakan Brand SUS.
- Inventori kehadiran konfigurasi Hostinger tanpa memaparkan nilainya; semak e-mel, cron, storan dan sandaran yang boleh dipulihkan.
- Senaraikan beza dokumen lama dengan kod semasa. Jangan menjalankan ujian yang menulis ke DB produksi dalam fasa audit.

Syarat lulus: laporan perkara sedia, perkara belum sedia, migrasi tertunggak dan keputusan dasar. Jika akses tiada,
Izzat melakukan log masuk atau tindakan peribadi; jangan meminta rahsia ditampal dalam chat.

### Fasa B: lengkapkan kod dan teks tanpa membuka jualan

Kumpulkan pembaikan yang diluluskan dalam perubahan yang mudah disemak; elakkan binaan Hostinger bagi setiap fail kecil.

- Selesaikan inventori migrasi 035/036/037 melalui laluan git yang Izzat luluskan; jangan gabungkan semua kerja `web-push` secara buta.
- Baiki skrip migrasi: pemboleh ubah arahan mengatasi fail pembangunan, TLS mengesahkan sijil dan nama hos, sasaran unpooled
  disahkan sebelum perubahan. Jangan menyediakan jalan pintas TLS tidak selamat jika pengesahan gagal.
- Lengkapkan pautan Beli/Tebus/Akaun, mesej status pembayaran dan penghantaran, paparan tempoh aktif/akan datang, serta bantuan
  untuk pembelian berjaya tetapi e-mel belum tiba. Bezakan bayaran disahkan, e-mel diterima penyedia dan e-mel benar-benar sampai.
- Sediakan aliran admin mengganti kod maya yang hilang: jika kod asal belum ditebus, pembatalan dan penggantian mesti diaudit
  dan tidak memberi akses berganda. Jangan menjanjikan menghantar semula kod asal selepas ciphertext sudah dipadam.
- Selaraskan FAQ, Terma dan Privasi dengan dasar diluluskan, penjual, peranan CHIP, percubaan pilihan pembaca dan tiada caj berulang.
  Semua teks pembaca baharu disemak ChatGPT dengan fakta kod, kemudian semakan manusia/peguam yang berkenaan.
- Sediakan mod prapelancaran yang benar-benar menghadkan pembelian ujian kepada penguji yang dibenarkan di pelayan, atau gunakan
  staging terasing yang dilindungi. Menyembunyikan pautan sahaja bukan sekatan akses. Elakkan membuka pembelian ujian kepada awam.
- Jika penambahan had sambungan Jalin diluluskan, laksanakan semakan pembelian/penebusan yang konsisten sebelum menerima wang;
  jangan menjual kod yang penerimanya tidak boleh tebus tanpa penjelasan dan dasar yang dipersetujui.

Syarat lulus: semua pembaikan diluluskan, ujian fasa C lulus, komit ditolak sepenuhnya dan penempatan kod masih menutup jualan.
Langkah penggabungan/penempatan dilakukan hanya selepas kelulusan yang sesuai; pelan ini tidak meluluskannya.

### Fasa C: ujian menyeluruh pada pembangunan/staging

Jalankan dari checkout yang khusus untuk kerja ini; jangan sentuh `scripts/_repro-fill.ts` atau kerja sesi lain.

```text
npx tsc --noEmit
npx eslint <fail kod yang berubah>
node scripts/run-auto-tests.cjs
node scripts/run-tests.cjs
git diff --check
```

Jalankan integrasi berikut hanya pada cabang pembangunan yang telah disahkan, dengan rahsia ujian secara setempat:

```text
npx tsx scripts/redeem-check.ts
npx tsx scripts/codes-admin-check.ts
npx tsx scripts/orders-check.ts
npx tsx scripts/restore-drill.ts
npx tsx scripts/reader-e2e.ts
npx tsx scripts/langganan-admin-check.ts
npx tsx __tests__/card-key-rotation.integration.ts
```

Semak prasyarat setiap skrip sebelum menjalankan; skrip E2E memerlukan pelayan dan sesi admin. Jalankan binaan dengan DB
pembangunan yang dibenarkan, bukan dengan URL produksi. Jika arahan berubah pada versi terkini, rekod penggantinya dan sebab.

Matriks wajib:

- Pakej 1, 6, 12 bulan; tarikh hujung bulan/tahun; pembelian dan penebusan semasa percubaan atau akses masih aktif.
- Bayaran berjaya: satu pesanan PAID, tepat satu kod, e-mel ke alamat ujian Izzat yang diluluskan, satu penebusan dan tempoh betul.
- Bayaran gagal/batal/kurang jumlah, pulang ke laman tanpa bayaran, callback palsu/berulang/serentak: tiada akses atau kod tidak sah.
- E-mel gagal, pelayan dimulakan semula, cron dan percubaan penghantaran serentak: pesanan tidak hilang dan tiada kod kedua.
- Kod sama dua kali, kod dibatalkan/luput, nombor siri salah, penebusan serentak dan suis henti penebusan.
- Percubaan dipilih sekali sahaja, log masuk/log keluar, had peranti dan tamat akses.
- Mobile 375/390/430 piksel serta desktop; papan kekunci, mesej kegagalan dan pautan bantuan.
- Dinding bayar dalam staging: pelawat, akaun tanpa akses, percubaan aktif, langganan aktif, akses tamat, karya contoh.
  Pastikan teks dilindungi tidak bocor dalam HTML/RSC/API/cache dan tidak tersaji silang antara pengguna.
- Eksport terenkripsi dipulihkan menggunakan salinan kunci simpanan, bukan sekadar fail eksport wujud. Latihan dengan data
  ujian yang mengandungi kod dan penebusan bukan kosong; rekonsiliasi tidak menghidupkan semula kod yang pernah digunakan.

Syarat lulus: tiada kegagalan kritikal berkaitan wang, kod, akses, privasi atau pemulihan. Ujian 28 Oktober ialah rujukan,
bukan pengganti ujian selepas pembaikan.

### Fasa D: sandaran dan migrasi produksi [PINTU MIGRASI]

Bentangkan sasaran hos (nama hos sahaja), inventori migrasi tertunggak, perubahan skema serta bilangan baris sebelum tindakan.
Sahkan sandaran Neon baharu wujud dan titik pemulihan direkodkan; kebenaran mencipta sandaran juga diminta jika belum diberi.

Selepas kelulusan khusus, gunakan runner yang sudah dibaiki, URL produksi langsung dalam memori/proses satu arahan sahaja,
dan `ALLOW_NON_DEV_DATABASE=yes` hanya untuk arahan itu. Jangan salin URL ke fail pembangunan atau output.

Arahan calon ialah `npx tsx scripts/db-schema-migrate.ts`, tetapi ia menjalankan SEMUA migrasi tertunggak; jangan jalankan
sebelum senarai tepatnya disemak dan diluluskan. Jangkaan kerja langganan: 036 (channel/redeem_by), 037 (purchase_orders),
dengan urutan 035 diselesaikan dahulu. Jika ada migrasi tambahan di luar kelulusan, berhenti.

Selepas itu semak ledger migrasi, lajur, jadual, indeks, bilangan baris dan laman 200. Kosongkan pemboleh ubah proses.
Tiada down/rollback atau pemulihan DB secara automatik jika gagal; berhenti dan laporkan keputusan sebenar.

### Fasa E: konfigurasi produksi dan ujian terhad [PINTU KONFIGURASI]

Izzat memasukkan rahsia sendiri dalam hPanel. Nilai lama yang sah dikekalkan; jangan menjana semula kunci sedia ada sesuka hati.

- Gerbang: `PAYMENT_PROVIDER=chip`, kunci CHIP dan Brand Jalin, harga yang diluluskan, URL kanonik Jalin.
- Akaun/kod: kunci MAC pembaca dan kod bersama pengecam masing-masing; sahkan kunci lama boleh dipulihkan dan tidak berkongsi
  nilai dengan kunci pembangunan atau projek SUS.
- E-mel: `MAIL_PROVIDER=resend`, `RESEND_API_KEY`, `MAIL_FROM`; uji penghantaran sebenar dan pengendalian penolakan.
- Operasi: `CRON_SECRET`, kunci sandaran terenkripsi dan token storan; jangan paparkan atau log nilai.
- Suis: mula tertutup; buka hanya laluan penguji yang telah dilindungi. Dinding bayar kekal mati.
- Untuk ujian produksi selepas kelulusan konfigurasi, gunakan `PURCHASES_PILOT_ENABLED=yes` dan kekalkan `PURCHASES_ENABLED` ditutup. Halaman `/beli` dan API pesanan memerlukan sesi pemilik Jalin yang sah. Pemilik boleh buka `/beli` secara langsung. Pautan jualan di menu, FAQ dan Akaun kekal tertutup kepada semua pelawat sehingga jualan awam dibuka.
- Sebelum pembayaran ujian wang sebenar, sahkan kedua-dua laluan pembelian menolak pelawat tanpa sesi dan `ALLOW_TEST_PAYMENTS` sudah dibuang. Callback bayaran sebenar kekal boleh mengesahkan pesanan yang telah dibuat.
- Jika menggunakan kunci ujian dengan `ALLOW_TEST_PAYMENTS=yes` pada produksi, sekatan pelayan kepada penguji wajib terbukti
  terlebih dahulu. Jika tidak boleh diasingkan dengan selamat, kekalkan ujian pada staging dan jangan buka mod ujian produksi.

Redeploy dan tunggu binaan berjaya pada komit yang tepat. Cron pesanan setiap 5 minit ke `GET /api/cron/pesanan` dengan Bearer
secret; tanpa secret dijangka 401 apabila akaun hidup (404 apabila ciri akaun mati). Jangan meletakkan secret dalam URL cron/log.
Semak juga penyelenggaraan dan sandaran berjadual yang digunakan Jalin, bukan menganggap cron Vercel lama turut berjalan di Hostinger.

Syarat lulus: ujian terhad membuktikan pembayaran, e-mel sampai, satu kod, penebusan, tarikh akses serta cron betul.
Kod ujian dibatalkan dengan jejak audit; jangan memadam rekod produksi sewenang-wenangnya. Buang `ALLOW_TEST_PAYMENTS` sebelum wang sebenar.

### Fasa F: satu pembelian wang sebenar [PINTU WANG SEBENAR]

Prasyarat: akaun/Brand CHIP diluluskan, kunci sebenar dipasang oleh Izzat, harga muktamad, mod ujian tiada dan akses prapelancaran
masih terhad. Izzat sendiri membuat satu pembayaran pakej terkecil pada harga yang diluluskan. Agen tidak memasukkan butiran kad
atau melaksanakan pembayaran bagi pihak Izzat. Jangan bayar balik secara automatik selepas ujian.

Padankan rekod CHIP dengan pesanan PAID, satu kod, e-mel delivered/sampai, penebusan dan akses bacaan. Semak rekod penyelesaian
bayaran apabila ia tersedia; jangan menyamakan status paid dengan dana sudah masuk bank. Rekod semua hasil tanpa rahsia/kod.

Syarat lulus: aliran wang sebenar lengkap dan Izzat mengesahkan hasil. Jika gagal, kekalkan jualan tertutup dan siasat.

### Fasa G: buka langganan kepada awam [PINTU JUALAN AWAM]

- Sahkan gerbang sebenar dan tiada `ALLOW_TEST_PAYMENTS`; aktifkan akaun dan pembelian untuk awam, buang `PURCHASES_PILOT_ENABLED`
  hanya dengan kelulusan ini. Terbitkan pautan Beli/Tebus/Akaun di tempat diluluskan dalam satu penempatan terkawal.
- Semak pelawat tanpa sesi boleh melihat pakej sebenar, sampai ke CHIP, kembali ke halaman status dan mendapatkan bantuan.
  Jangan mewajibkan akaun sebelum bayaran tanpa keputusan produk; aliran Jalin semasa membenarkan pembelian melalui e-mel.
- Pantau pesanan pertama dan penghantaran. Bacaan kekal terbuka jika pintu dinding bayar belum diluluskan.

### Fasa H: penguatkuasaan akses berbayar [PINTU DINDING BAYAR]

Hanya selepas F dan G lulus, karya contoh dipilih dan polisi awam sepadan. Dengan kelulusan khusus Izzat, hidupkan suis
dinding bayar melalui admin. Semak semula semua jenis pembaca dalam matriks C, cache/CDN serta HTML/RSC selepas pengaktifan.
Pelawat mesti boleh melihat senarai, ringkasan dan karya contoh yang diluluskan; pembaca berbayar tidak boleh terkunci secara salah.

Syarat lulus: pembelian awam dan akses berbayar berfungsi sepenuhnya, tiada kebocoran teks atau ralat akses, bantuan jelas.

## 5. Operasi selepas pelancaran dan tindakan kecemasan

Cadangan pemantauan: rapat pada hari pertama dan semakan harian selama minggu pertama; ini belum menjadualkan automasi.
Semak pesanan PAID yang belum SENT, penolakan/bounce e-mel, callback 5xx, cron terakhir, cubaan tebus, sandaran dan aduan pembaca.
Izzat pemilik operasi; isu gerbang dirujuk kepada sokongan CHIP, e-mel kepada Resend, hos kepada Hostinger mengikut bukti.
Jangan menghantar rahsia, data pembaca atau log mentah kepada sokongan tanpa kelulusan yang sesuai.

| Masalah | Tindakan selamat yang dirancang, dengan kuasa operasi yang diluluskan |
|---|---|
| Pembelian baharu gagal/berisiko | Matikan `PURCHASES_ENABLED`, kekalkan akaun, callback dan penghantaran bagi pesanan yang sudah dibayar. |
| Pembaca berbayar tidak dapat membaca | Matikan dinding bayar dahulu, kekalkan akaun dan hak pembaca; siasat tanpa memadam ledger. |
| E-mel lewat/gagal | Semak pesanan dan percubaan cron/admin; jangan jana kod kedua untuk pesanan sama. |
| Kod pernah dihantar hilang | Ikut dasar penggantian diluluskan; jangan mendakwa kod plaintext asal boleh diambil semula. |
| Penyalahgunaan penebusan/pemulihan DB | Hentikan penebusan; pemulihan dan rekonsiliasi memerlukan keputusan berasingan serta bukti sandaran. |
| Kegagalan selepas migrasi | Hentikan pelancaran, kekalkan data, nilai pembaikan ke hadapan; jangan menjalankan down atau restore tanpa izin. |

Jangan mematikan `READER_ACCOUNTS_ENABLED` sebagai respons biasa kepada masalah jualan: callback dan cron turut bergantung
padanya, jadi pembeli yang sudah membayar boleh terbiar. Jangan memadam pesanan, membatalkan hak atau memutar CODE_MAC_KEY
untuk memulihkan UI. Rahsia dan titik pemulihan mesti disimpan di tempat selamat di luar repo.

## 6. Takrif siap dan laporan penutup

- Semua pintu mempunyai kelulusan dan bukti yang berasingan; kod/komit penempatan, keputusan ujian dan senarai migrasi direkodkan.
- CHIP sebenar diluluskan, harga dan dasar sepadan antara UI/FAQ/Terma, e-mel sampai dan pembelian sebenar lulus.
- Awam dapat membeli, menerima dan menebus kod; status akaun/tarikh akses betul; bayaran gagal/berulang tidak memberi kod berganda.
- Jika dinding bayar diluluskan, akses dan ketiadaan kebocoran teks dibuktikan pada produksi, bukan hanya UI staging.
- Sokongan, cron, eksport terenkripsi dan latihan pemulihan tersedia; kad fizikal bukan penghalang pelancaran kod e-mel.
- Kemas kini serah tugas dan pelan lama dengan bukti, bukan menandakan kotak berdasarkan anggapan.

Semasa penyediaan awal pada 1 November, pelan ini belum dijalankan. Tiada kelulusan CHIP, migrasi, env Hostinger, pembayaran,
pembukaan akaun atau dinding bayar diubah semasa penyediaannya. Hasil audit dan pelaksanaan setempat susulan pada 2 November
direkodkan berasingan dalam bahagian 8 dan 9; senarai ujian yang dirancang di atas bukan keputusan lulus dengan sendirinya.

## 7. Rujukan penyedia yang disemak

- [CHIP Collect](https://www.chip-in.asia/collect/payments): mod ujian tidak memproses wang sebenar; satu Brand berasingan
  bagi setiap laman disokong. Ini tidak membuktikan akaun atau Brand Jalin sudah diluluskan.
- [Panduan kunci CHIP](https://blog.chip-in.asia/docs/how-to-get-api-key-api-host-brand-id/): kunci ujian dan produksi berbeza;
  Brand yang sama boleh digunakan merentas mod ujian/sebenar bagi laman berkenaan. Jangan mengelirukannya dengan penggunaan
  satu Brand untuk dua laman yang berbeza. UI portal semasa perlu disemak kerana panduan ini diterbitkan lebih awal.
- [Akta Perlindungan Pengguna 1999, cetakan semula rasmi yang disediakan TTPM](https://ttpm.kpdn.gov.my/images/webuser/MuatTurun/Akta%20Perlindungan%20Pengguna%202021.pdf):
  seksyen 60 dan 64 menyediakan remedi berkaitan kegagalan perkhidmatan dan kesan pembatalan yang memenuhi syarat Akta.
  Rujukan ini bukan pengesahan peguam bahawa semua terma langganan Jalin sudah mematuhi undang-undang semasa.

## 8. Hasil audit kesediaan teknikal, 2 November 2026 (Fasa A)

Selepas Izzat meminta supaya kerja diteruskan mengikut pelan, semakan Hostinger dan Neon dibuat secara baca sahaja.
Pemilihan tajuk contoh yang belum disahkan ditangguhkan; ia bukan penghalang menjalankan audit teknikal.
Panduan Hostinger dan Neon digunakan untuk memilih bacaan metadata/SQL tanpa mengambil URL sambungan atau nilai rahsia.

### Penempatan dan konfigurasi Hostinger

- Tapak Node.js `jalin.adjung.com` aktif. Binaan terakhir `completed`, daripada repo `alkutawi01/jalin`, cabang `hostinger`,
  komit `12bd2a81ed7524c4fefa3caf0f4bf261f7f0052a`. Auto-deploy diaktifkan; Node.js 24, jenis Next.js.
- Repo remote diambil semula: `origin/main` masih `0fa93f87`, `origin/hostinger` masih `12bd2a81`.
- Pemboleh ubah **tiada** dalam inventori Hostinger: `CHIP_SECRET_KEY`, `CHIP_BRAND_ID`, `PLAN_PRICES_MYR`,
  `PURCHASES_ENABLED`. Tiada kunci CHIP diambil atau dijana semasa audit.
- Pemboleh ubah berkaitan akaun/kod, e-mel dan sandaran **ada namanya**: `READER_MAC_KEY`, `READER_MAC_KEY_ID`,
  `CODE_MAC_KEY`, `CODE_MAC_KEY_ID`, `READER_ACCOUNTS_ENABLED`, `MAIL_PROVIDER`, `RESEND_API_KEY`, `MAIL_FROM`,
  `BACKUP_ENC_KEY`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`, `NEXT_PUBLIC_APP_URL`, `DATABASE_URL` dan `DATABASE_URL_UNPOOLED`.
  API menutup nilainya; kehadiran nama tidak membuktikan nilai sah, mod ujian/sebenar, URL yang betul atau suis bernilai `yes`.
- Cron yang ditemui bagi Jalin: `/api/cron/penyelenggaraan` dan `/api/cron/dinding-gambar`.
  Tiada cron `/api/cron/pesanan` dalam senarai akaun yang dibaca. Arahan cron dan rahsianya tidak dicetak atau disalin ke dokumen.

### Pangkalan data produksi

- Projek Neon `jalin`, cabang `production`, pangkalan data `jalin` dipilih secara eksplisit melalui metadata penyedia.
  API Hostinger menutup URL DB, jadi padanan nilai URL runtime Hostinger kepada cabang ini belum dapat dibuktikan melalui API env.
- Ledger `kysely_migration` menunjukkan migrasi 027 hingga 034 telah dikenakan; tiada rekod 035, 036 atau 037.
- `code_batches.channel` belum wujud; `redeem_codes.redeem_by` belum wujud; `purchase_orders` belum wujud.
- Bilangan baris sebenar pada masa audit: `code_batches = 0`, `redeem_codes = 0`, `redemptions = 0`.
- Suis DB `paywall_on` tidak ditetapkan. Ini bacaan keadaan sahaja, bukan perubahan suis.
- Cabang `pembangunan` dilaporkan `archived` oleh API. Jangan menghidupkan semula atau mencipta cabang ujian tanpa
  kelulusan operasi yang sesuai; jangan mengarahkan ujian menulis ke produksi sebagai ganti.
- Cabang sandaran berstatus ready yang ditemui termasuk `backup-pre-034-24okt` dan `backup-pre-r2-24okt`.
  Tiada snapshot dalam senarai snapshot projek. Ini bukan bukti sandaran baharu sebelum migrasi atau latihan pemulihan sudah lulus.

### Ujian dan risiko kod

- `npx tsx __tests__/migration-inventory.test.ts`: **36 passed, 1 failed**, mesej `missing: 35`.
  Ujian ini memeriksa inventori fail dan tidak menjalankan `up()` terhadap DB.
- `035_web_push.ts` tiada pada `origin/hostinger`; cabang rujukan `web-push` wujud secara setempat. Jangan gabungkan semua
  cabang atau menyalin fail sementara untuk migrasi produksi tanpa semakan skop.
- Risiko runner disahkan semula pada `origin/hostinger`: `.env.local` menggunakan `override: true`, SSL menggunakan
  `rejectUnauthorized: false`. Kedua-duanya perlu diselesaikan dan diuji sebelum runner itu digunakan pada produksi.
- Kehadiran kunci e-mel/sandaran tidak membuktikan penghantaran e-mel, nyahsulit, integriti eksport, pemulihan atau cron berjaya.
  Ujian menulis dan penghantaran ujian belum dijalankan dalam audit ini.

### Tindakan seterusnya mengikut pelan

Fasa B: minta kelulusan untuk pembaikan kod setempat dan ujian terlebih dahulu, bermula dengan keselamatan runner dan
penyelesaian inventori 035 yang disemak. Seterusnya lengkapkan had sambungan, UI/teks dan pemulihan pesanan/kod yang telah
diluluskan. Pembaikan tidak meliputi migrasi produksi, perubahan env, redeploy, penggabungan cabang atau pembukaan jualan
tanpa kebenaran yang berasingan. Akses cabang ujian perlu disediakan secara diluluskan sebelum ujian DB.

Tiada env Hostinger, cron, cabang Neon, data DB, dinding bayar, kod aplikasi atau tetapan CHIP diubah dalam audit ini.
Hanya dokumen pelan dikemas kini; tiada commit atau push dibuat. Fail kerja sesi lain dibiarkan seperti sedia ada.

## 9. Pelaksanaan setempat yang diluluskan, 2 November 2026 (Fasa B)

Izzat mengesahkan supaya pembaikan kod dan ujian setempat dimulakan, dengan sasaran akhir pembelian langganan awam
dan cetakan kod pada label pelekat untuk kad. Kerja diasingkan pada cabang `fix/jalin-subscription-readiness-20261102`,
berasaskan `origin/main` yang diperiksa (`0fa93f87`). Ini tidak menghidupkan jualan atau dinding bayar.

Urutan pertama: baiki pemilihan persekitaran dan TLS kedua-dua runner migrasi; bawa **hanya** fail migrasi
`035_web_push.ts` daripada cabang rujukan `web-push` (`79d0729f`) sebagai inventori kekal yang boleh disemak,
bukan salinan sementara untuk arahan produksi. Ciri notifikasi dan cabang kerja sesi lain tidak digabungkan.
Ujian baharu tidak menyambung ke DB: semak keutamaan shell, sekatan sasaran, konfigurasi TLS efektif dalam pemacu `pg`,
serta kegagalan tanpa mencetak URL. Runner bagi hos selain pembangunan turut memerlukan `--expected-host <nama-hos>`
dan `ALLOW_NON_DEV_DATABASE=yes` dari shell; fail env tidak boleh memberi kebenaran tersebut.

Fungsi label PDF sedia ada akan disemak dengan ujian saiz/susun atur. Saiz lalai 50 × 30 mm bukan keputusan saiz cetakan
muktamad. Tiada kod sebenar dijana, tiada reka bentuk kad diubah dan tiada tuntutan bahawa pencetak fizikal sudah diuji.
Ujian menulis DB memerlukan skop data ujian yang terasing dan disemak. Penggabungan, push/deploy, perubahan env, migrasi produksi,
pembayaran sebenar dan pembukaan suis tetap memerlukan kelulusan operasi yang berasingan.

### Pembaikan label yang ditemui semasa semakan

- Reproduksi sebelum pembaikan: `scratchTopMm=0` diterima tanpa ralat tetapi nombor siri tiada dalam PDF;
  `scratchTopMm=22` diterima tanpa ralat tetapi tarikh akhir tebus tiada. Kedua-duanya menggunakan label 50 × 30 mm.
- `computeLayout` kini menempah ruang untuk teks sehingga 9 pt di atas jalur gores dan, jika tarikh diperlukan, di bawahnya.
  Semakan ini dijalankan sebelum membuat kelompok atau menggantikan kod. Susun atur tidak boleh lagi menggugurkan teks secara senyap.
  Bagi penggantian kod lama, keperluan tarikh dibaca daripada kod asal; kod tanpa tarikh kekal tanpa tarikh.
- PDF turut menyemak sama ada **mana-mana** label memerlukan tarikh, bukan hanya label pertama. Saiz lalai tidak berubah.
- Dua mesej ralat disemak melalui ChatGPT dalam projek Jalin pada 2 November:
  [Semak Mesej Ralat](https://chatgpt.com/g/g-p-6aa7d8eaff5c81918ed35b086fc59cd2-jalin/c/6ae807b9-4290-83ec-bb02-ec0722028f2b).
  Respons penuh dibaca. Pindaan istilah/kata kerja diterima; semakan itu terhad kepada bahasa, bukan pengesahan kod atau pencetak.
- Label ujian berkod palsu dijana menggunakan generator aplikasi, dibaca dengan `pdfinfo`, dirender dengan Poppler dan diperiksa
  secara visual: satu halaman 50 × 30 mm, kod 8 pt, nombor siri contoh, kod palsu dan tarikh kelihatan lengkap. Garis panduan
  kedudukan hanya untuk ujian. Fail sebenar tidak dijana dan tiada kod direkodkan dalam dokumen ini.

### Keputusan ujian setempat pakej pertama

- Keselamatan sambungan/persekitaran migrasi: **10/10 lulus**, tanpa sambungan DB.
  Termasuk pemeriksaan konfigurasi TLS efektif selepas URL diproses oleh `pg`, bukannya carian teks sumber sahaja.
- Inventori migrasi: **37/37 lulus**; kandungan 035 sama dengan fail rujukan `web-push` selepas penyeragaman akhir baris.
  Tiada migrasi dijalankan. Fail itu tidak membawa pelaksanaan ciri notifikasi.
- Perlindungan DB sedia ada: **13/13 lulus**; label PDF: **33/33 lulus**; piawaian admin: **11/11 lulus**.
- `npx tsc --noEmit --incremental false`: lulus selepas pembaikan label dan route penggantian.
- `npm run validate-content`: lulus. `git diff --check`: lulus.
- `npm run lint`: belum dapat dijalankan; repo tiada pemasangan/konfigurasi ESLint dan arahan membuka dialog konfigurasi.
  Tiada dependency atau konfigurasi lint ditambah secara sampingan.
- Semakan sambungan susulan: cabang `pembangunan` boleh menerima pertanyaan baca sahaja walaupun metadata awal menyatakan
  `archived`. Tiada arahan restore/start/reset atau cabang baharu diperlukan. `purchase_orders` dan `kysely_migration` wujud.
  Sambungan terus melalui helper migrasi baharu kemudian berjaya menjalankan `SELECT current_database(), 1` pada DB `jalin`;
  soket TLS melaporkan `authorized=true`. Tiada migrasi atau penulisan data dijalankan dalam semakan ini.
- Regresi penuh (`node scripts/run-tests.cjs`, sebelum penambahan pautan): **255 arahan, 3 gagal**. Ketiga-tiga fail kegagalan
  tidak diubah oleh kerja ini: `typography.test.ts` menolak `var(--font-amiri)` yang sudah berada pada HEAD;
  `disposable-fixture.test.ts` mengesan `_repro-fill.ts` milik sesi lain; `ayat-box.test.tsx` gagal pada semakan pembinaan kotak ayat
  dalam editor visual. Jangan mendakwa keseluruhan ujian lulus. Runner ini memulangkan exit 0 walaupun melaporkan kegagalan;
  penilaian dibuat daripada ringkasan dan senarai gagal, bukan exit code sahaja.
- Binaan tanpa DB tetapi akaun setempat masih aktif gagal pada prarender `/_not-found` dan `/soalanlazim` (`DATABASE_URL not set`).
  Binaan ulangan dengan `CONTENT_SOURCE=markdown`, URL DB dikosongkan dan akaun/jualan dimatikan **untuk proses itu sahaja**
  berjaya. Ini bukan ujian aliran langganan aktif. Fail env dan konfigurasi produksi tidak diubah.
- Ujian transaksi pesanan/penebusan, pembayaran CHIP dan cetakan pada pencetak fizikal belum diuji dalam pakej ini.
  Pakej pertama ini bukan pengesahan bahawa seluruh Fasa B atau pelancaran awam sudah selesai.

### Pautan langganan yang diluluskan

- Menu desktop dan telefon menyediakan `Langgan` menuju `/beli`; halaman Beli menandainya sebagai halaman aktif.
  Halaman Akaun menyediakan `Beli kod`, di samping pautan tebus, status dan tarikh akses sedia ada.
- Pelayan menilai `purchaseStatus().enabled`; komponen telefon dan Akaun hanya menerima boolean. Harga/kunci/konfigurasi
  gerbang tidak dihantar sebagai props untuk menentukan pautan. Jika pembelian ditutup atau konfigurasinya tidak lengkap,
  pautan pembelian baharu tidak dipaparkan. Ini tidak menggantikan kawalan laluan/API sedia ada.
- Label baharu turut disemak dalam perbualan ChatGPT yang dipautkan di atas; respons lengkap membenarkan label dikekalkan.
  Panduan React digunakan untuk sempadan pelayan/pelayar; tiada dependency atau mekanisme auth baharu ditambah.
- Ujian render navigasi/Akaun: **3/3 lulus**; regresi kedudukan carian: **10/10 lulus**; unjuran props awam: **14/14 lulus**.
  Ujian auto susulan selepas perubahan navigasi: **42 fail lulus, 0 gagal**.
- QA browser `/beli` menggunakan proses setempat pada port 3102, DB pembangunan, harga yang diluluskan dan konfigurasi CHIP
  **palsu** yang tidak boleh membuat pembayaran sebenar. Tiada borang dihantar, e-mel dihantar atau pesanan dicipta.
  Pada lebar 375, 390, 430 dan 1440 piksel, `scrollWidth` tidak melebihi `clientWidth`; pautan Langgan kekal dalam ruang tersedia
  dan mempunyai `aria-current=page`. Perbezaan antara `innerWidth` dan `clientWidth` ialah ruang scrollbar menegak, bukan overflow.
  Tab pertama selepas summary menu terbuka mencapai `Utama`. Menu telefon dan keseluruhan desktop diperiksa secara visual.
- Satu amaran runtime sedia ada daripada `pg-connection-string` tentang perubahan makna `sslmode=require` pada versi utama
  akan datang muncul semasa dev; tiada ralat JavaScript, hydration atau permintaan API gagal dilihat dalam sesi QA ini.
  Amaran itu bukan kegagalan TLS sekarang; helper migrasi baharu telah diuji dengan TLS yang disahkan.
- QA turut menemui ayat lama `FPX atau kad` pada Beli dan FAQ, sedangkan audit portal hanya membuktikan FPX/DuitNow QR aktif.
  Kedua-duanya kini merujuk kepada kaedah yang tersedia di halaman pembayaran, tanpa menjanjikan kad atau kaedah tertentu.
  Teks disemak ChatGPT dalam perbualan yang sama; syarat fakta tentang pengesahan sebelum penghantaran disahkan daripada
  route callback CHIP (`purchase.status === paid` sebelum `fulfilPaidOrder`/`deliverOrder`) dan logik pesanan.

### Batas sebelum pakej seterusnya

- Soalan pembukaan slot yang tertunggak ketika pakej pertama kini dijawab Izzat: slot dibuka apabila kod tambahan mula aktif.
  Lihat bahagian 10. Izzat akan memberikan reka bentuk kad dan label kemudian; saiz cetakan tidak diubah atau dimuktamadkan.
- `orders-check.ts` diperiksa sebelum pelaksanaan. Bahagian concurrency menyimpan baris sementara dan pembersihannya
  mempunyai `DELETE FROM code_batches WHERE quantity <= 0 AND channel = 'virtual'` tanpa mengehadkan ID kelompok ujian.
  Sapu penghantaran dalam bahagian transaksi juga memilih semua pesanan menunggu. Skrip tidak dijalankan pada DB pembangunan
  yang dikongsi, supaya kerja sesi lain tidak terjejas; asingkan fixture atau cabang ujian dahulu. Tiada dakwaan transaksi lulus dibuat.
- Penggantian kod maya yang hilang, teks dasar/Terma/Privasi dan ujian hujung ke hujung masih kerja seterusnya.
  Had sambungan kemudian dilaksanakan setempat dalam bahagian 10; ujian serentaknya masih memerlukan cabang terasing.
  Kod di cabang ini belum cukup untuk meluluskan pembukaan jualan atau dinding bayar.
- Pelayan QA sementara dihentikan selepas semakan dan viewport browser dipulihkan. Tiada fail env diubah, tiada kunci CHIP
  sebenar digunakan, tiada kod sebenar dibuat dan tiada penulisan data DB dilakukan.
- Binaan terakhir selepas semua perubahan navigasi/teks **lulus**, dengan akaun/jualan ditutup dan sumber markdown tanpa DB
  untuk proses binaan itu sahaja. Binaan `.next` itu dijalankan secara setempat dengan `next start` pada loopback: `/` menjawab
  **200**, `/beli` dan `/tebus` menjawab **404**, dan rendered DOM halaman utama mempunyai **0 pautan Beli/Tebus/Akaun**.
  Ini mengesahkan mod tertutup pada output binaan sebenar, bukan kod sumber sahaja; ia bukan bukti pembelian aktif lulus.
  Pelayan `next start` itu juga dihentikan. Ujian pembelian unit sedia ada lulus **68/68** selepas pembetulan teks, FAQ lulus,
  dan semakan TypeScript terakhir lulus. Lint kekal belum disahkan atas sebab konfigurasi di atas.

## 10. Had sambungan selepas penjelasan Izzat, 2 November 2026

Keputusan: satu kod kad yang belum bermula sahaja boleh berada dalam barisan. Apabila tempoh kod itu bermula (hujung tempoh
sebelumnya ialah eksklusif), ia menjadi tempoh aktif dan satu slot sambungan baharu tersedia. Had masa ialah 12 bulan kalendar
mengikut waktu Malaysia selepas kad yang sedang aktif tamat, bukannya 365 hari atau dikira daripada kad yang masih beratur.
Semua pakej 1/6/12 bulan dan kod fizikal/maya mengikuti aturan sama. Tiada had baharu dikenakan pada kod kongsi atau pemberian admin.

Pelaksanaan yang dirancang: semak ledger di dalam transaksi `addGrant` selepas baris akaun dikunci, sebelum INSERT entitlement
dan redemption. Kod sah yang ditolak kerana had tidak digunakan dan tidak dikira sebagai cubaan kod salah. Penebusan berulang
kod yang sudah berjaya kekal idempotent. Tempoh lama atau beratur yang sudah wujud tidak dipadam atau diubah. Tempoh percubaan
dan akses lain kekal diambil kira bagi tarikh mula seperti kod semasa; jika tiada kad aktif, tempoh akses semasa menjadi asas
had masa. Pembelian tanpa akaun/hadiah tidak disekat berdasarkan akaun pembeli; maklumat had dipaparkan sebelum pembelian.

Ujian: semua kombinasi 1/6/12 bulan, sempadan mula tepat dan 1 ms sebelumnya, tamat akses, tahun lompat/akhir bulan,
kod beratur dibatalkan, ledger lama dengan beberapa kod beratur, tempoh SHARED/ADMIN dan percubaan. Sediakan ujian DB baharu
yang semua fixturenya digulung balik tanpa pembersihan global atau perubahan trigger. Bukti permintaan serentak memerlukan
persekitaran terasing sebelum penerbitan; jangan menggunakan skrip pembersihan luas pada cabang pembangunan yang dikongsi.

Tiada migrasi skema, env, suis produksi, reka bentuk kad atau nilai saiz label diperlukan untuk pembaikan aturan ini.

### Hasil pelaksanaan dan pengesahan setempat

- Semakan CARD kini dilaksanakan dalam `addGrant`, selepas kunci baris akaun dan sebelum entitlement/redemption ditulis.
  Penolakan had memberikan HTTP 409 dengan mesej Melayu; kod kekal belum digunakan dan tidak menambah kiraan cubaan salah.
  Permintaan ulangan berjaya tetap memberikan hasil asal. SHARED/ADMIN dan ledger lama tidak diubah.
- Peringatan had dan pautan FAQ dipaparkan sebelum borang Beli/Tebus dihantar. Pembelian hadiah kekal dibenarkan.
  Teks baharu disemak melalui **tiga pusingan sebenar** ChatGPT; respons lengkap dibaca dan wording diperhalus:
  [Semakan had sambungan](https://chatgpt.com/g/g-p-6aa7d8eaff5c81918ed35b086fc59cd2-jalin/c/6ae8131d-bed8-83ec-b937-d98614b381fc).
  Semakan ini meliputi bahasa dan penerangan aturan, bukan bukti ujian transaksi serentak.
- Ujian aturan tulen: **13/13 lulus**. Ujian DB baharu `scripts/card-extension-check.ts`: **76 semakan lulus** pada pembangunan,
  semuanya dalam transaksi yang digulung balik; ketiadaan akaun, kod dan entitlement fixture disahkan selepas rollback.
  Termasuk semua sembilan kombinasi pakej 1/6/12, kod fizikal/maya, ulangan, hadiah selepas penolakan, percubaan, pembatalan,
  tamat tempoh dan penyampaian tarikh had. Tiada e-mel, pesanan atau pembayaran dibuat.
- Ujian render navigasi/borang **4/4**, unjuran props awam **14/14**, primitif langganan **65/65**, dan ujian FAQ lulus.
  Suite auto terakhir: **43 fail lulus, 0 gagal**. `git diff --check` lulus. Ini tidak menghapuskan tiga kegagalan suite penuh
  sedia ada yang direkodkan dalam bahagian 9; suite penuh itu tidak diulang untuk mendakwa semuanya lulus.
  TypeScript, validasi kandungan dan binaan produksi dengan akaun/jualan **aktif dalam proses setempat sahaja** turut lulus.
  Binaan menggunakan DB pembangunan dan konfigurasi CHIP palsu. Fail env dan tetapan produksi tidak disentuh.
- Binaan sebenar dijalankan pada loopback: `/beli` dan `/soalanlazim` menjawab **200** dan mengandungi peringatan baharu.
  Pemeriksaan HTML kedua-duanya tidak menemui penanda kunci/Brand palsu atau status dalaman had.
  POST anonim `/api/akaun/tebus` menjawab **401** dengan `no-store`.
- QA pelayar Beli dan FAQ pada lebar CSS **375, 390, 430, 1440** tidak menemui horizontal overflow.
  Pautan had menuju seksyen Langganan; FAQ boleh dibuka/ditutup dengan papan kekunci dan teks lengkap kelihatan.
  Tiada ralat/amaran konsol dilihat. Borang pembayaran tidak dihantar. Ini bukan ujian pembayaran sebenar atau sesi penebusan berautentikasi.
- Ujian serentak **belum dijalankan**. Mod `--race` menolak operasi tanpa URL ujian, hos dijangka dan persetujuan eksplisit.
  Permintaan kelulusan ialah mencipta `jalin-card-qa-20261102` daripada pembangunan, menguji, kemudian memadam cabang ujian itu sahaja.
  Izzat menjawab **tunggu dulu**; ujian ini kekal ditangguhkan sehingga kelulusan baharu diterima. Tiada cabang dicipta dan
  tiada fixture concurrency dikomit ke DB.
- Reka bentuk kad/label menunggu fail daripada Izzat. Tiada saiz cetakan dimuktamadkan, kod sebenar dicetak, migrasi dijalankan,
  push/deploy dibuat atau suis produksi dihidupkan. Lint masih belum disahkan kerana konfigurasi repo seperti bahagian 9.
  Pelayan QA loopback telah dihentikan, port 3102 tidak lagi mendengar, viewport dipulihkan dan tab sementara ditutup.

## 11. Pemulihan kod e-mel, 6 November 2026 — kerja setempat

Izzat menangguhkan cabang/ujian serentak pada 2 November; arahan `next` pada 6 November menyambung kerja bebas ini sahaja.
Tiada cabang Neon ujian dicipta. `origin/main` masih `0fa93f87`; `origin/hostinger` kini `10764727` selepas fetch baca sahaja.
Kerja kekal di cabang kesediaan setempat; fail `_repro-fill.ts` tidak disentuh.

Rancangan: tambah tindakan pemilik pada pesanan PAID yang e-melnya sudah dihantar, untuk mengganti kod maya yang masih sah
dan belum ditebus. Kunci baris pesanan dan kod; minta nombor siri semasa sebagai prasyarat supaya permintaan lapuk/berulang
tidak mengganti sekali lagi. Kekalkan pakej, pembeli, bayaran dan tarikh akhir penebusan asal. Batalkan kod lama, pautkan kod
baharu dengan ciphertext menunggu penghantaran, serta rekod pelaku/sebab dalam satu transaksi yang wajib berjaya bersama.
Tiada plaintext kod dalam respons admin, aktiviti atau log. Hantar selepas transaksi kepada alamat pesanan asal sahaja;
jika e-mel gagal, cuba semula kod pengganti yang sama. Kod yang sudah ditebus, dibatalkan atau luput tidak diganti.

Ujian dirancang: transaksi rollback pada pembangunan dengan mailer palsu dalam memori, penggantian berjaya/gagal/ulangan,
tarikh asal, audit, plaintext tidak tersimpan, kegagalan e-mel dan percubaan semula. Tiada fixture kekal, pembayaran, e-mel sebenar,
migrasi atau perubahan env. Ujian serentak kekal ditangguhkan. Teks disemak ChatGPT sebelum dianggap sedia diterbitkan.

### Pelaksanaan dan hasil ujian

- Fungsi `replaceOrderCode` dan tindakan `replace` pada API pesanan dilaksanakan. Penggantian tidak mendedahkan kod kepada admin;
  ciphertext dan nombor siri pesanan ditukar dalam transaksi yang sama dengan pembatalan kod lama dan rekod `admin_activity`.
  Audit wajib: kegagalannya menggagalkan transaksi. Sebab kosong/lebih 160 aksara atau pelaku tanpa identiti ditolak.
- Permintaan menyertakan nombor siri yang dilihat ketika senarai dimuatkan. Ulangan lapuk ditolak selepas penggantian pertama;
  kod pengganti yang e-melnya masih menunggu mesti dihantar semula, bukan diganti lagi. Kod telah ditebus/dibatalkan/luput tidak dihidupkan semula.
- Penyelesaian penghantaran kini bersyarat pada kod/ciphertext/giliran yang sama. Respons penghantar lama tidak boleh memadam
  ciphertext pengganti atau menulis status/ralatnya. Penerimaan penyedia tidak didakwa sebagai e-mel `delivered` ke peti masuk.
  Bagi hasil gagal/terlangkau/pengecualian selepas commit, admin diminta menyemak status terlebih dahulu; ralat rangkaian mungkin
  berlaku selepas penyedia menerima mesej, jadi teks tidak membuat dakwaan mutlak bahawa penyedia belum menerima e-mel.
- Dua pusingan semakan bahasa sebenar dalam projek Jalin; respons penuh dibaca dan cadangan diperhalus berdasarkan fakta `skipped`:
  [Semak Teks Admin Jalin](https://chatgpt.com/g/g-p-6aa7d8eaff5c81918ed35b086fc59cd2-jalin/c/6aed9784-b99c-83ec-8ec8-17102e9e26e5).
  Teks ketidakpastian yang disemak digunakan untuk semua hasil selain penerimaan penyedia; ini mengelakkan andaian tentang kegagalan rangkaian.
- `scripts/order-replacement-check.ts`: **94 lulus, 0 gagal**, semuanya pada pembangunan dalam satu transaksi rollback.
  Tiada rangkaian gerbang atau e-mel sebenar: bayaran disimulasi melalui fungsi pemenuhan, mailer menangkap mesej dalam memori.
  Meliputi pakej 1/6/12, tarikh/penerima/bayaran asal, audit, tiada plaintext tersimpan, penebusan kod lama/baharu, ulangan lapuk,
  kegagalan e-mel dan percubaan semula, kod luput/dibatalkan/ditebus, serta rollback apabila audit gagal menggunakan savepoint.
  Ketiadaan semua fixture pesanan/kod/akaun/aktiviti disahkan selepas rollback. Ujian penghantar lambat ialah susunan operasi
  deterministik pada satu sambungan, **bukan** transaksi DB serentak; ujian serentak masih ditangguhkan.
- Ujian auto **44 fail lulus, 0 gagal**; ujian render pesanan baharu **3/3**, RBAC **27/27**, piawaian admin **11/11** dan
  `security-hardening-e` lulus. TypeScript, validasi kandungan dan `git diff --check` lulus. Lint khusus kekal belum disahkan
  atas sebab konfigurasi yang direkodkan sebelum ini; tiada dakwaan bahawa suite penuh lama tanpa kegagalan dibuat.
- Binaan produksi terakhir selepas pembaikan CSS/teks **lulus**. Ia menggunakan DB pembangunan dengan TLS disahkan, sumber markdown,
  akaun aktif dan pembelian ditutup hanya dalam proses setempat. Output `.next` sebenar dijalankan pada loopback: `/` **200**,
  `/beli` **404**, halaman pesanan admin anonim **307** ke log masuk dan POST penggantian anonim **401**, tanpa medan kod/ciphertext.
  Ini menguji binaan serta penolakan anonim; tiada sesi pemilik sebenar, pesanan kekal atau e-mel sebenar digunakan dalam ujian HTTP ini.
- QA interaktif menggunakan komponen sebenar `OrdersTable`/`DialogHost` dan CSS global/admin, tetapi router, data pesanan dan API palsu
  pada loopback. Ini tidak memintas auth dalam aplikasi atau mengesahkan E2E admin sebenar. Sebab wajib, had 160 aksara, fokus pada Batal,
  Tab, Escape dan tiada permintaan selepas pembatalan diperiksa; pengesahan membuat tepat satu panggilan palsu dan mengemas kini senarai.
  Lebar CSS 375/390/430/1440: tiada overflow dokumen atau jadual. QA menemui borang melebarkan jadual desktop; lebar borang kini
  dihadkan dan teks membalut. Bukti dengan data palsu disimpan di luar repo dalam `output/qa/20261106` ruang kerja Codex.
  Pelayan pratonton dihentikan, viewport dipulihkan dan tab sementara ditutup.
- Tiada migrasi, env, produksi, suis akaun/jualan/dinding bayar, pembayaran sebenar, push atau deploy diubah. Reka kad/label
  masih menunggu Izzat. Ujian e-mel sebenar dan E2E admin berautentikasi untuk aliran penggantian ini belum disahkan.

## 12. Kad fizikal, label thermal dan pesanan Shopee — penegasan 6 November 2026

Arahan Izzat: kod dicetak menggunakan pencetak label pelekat thermal, ditampal pada kad langganan fizikal, dijual di Shopee
dan dipos kepada pembeli. Sistem mesti mencetak **dan menyimpan** kod. Kad fizikal bukan hasil pilihan yang boleh dilupakan
selepas jualan e-mel dibuka. Urutan e-mel dahulu dalam keputusan lama tidak menetapkan tarikh pelancaran fizikal baharu.
Pada masa penegasan ini, reka bentuk/ukuran masih ditunggu. Izzat kemudian mengesahkan ukuran dan memberi rujukan SUS;
keputusan terkini ialah bahagian 13 di bawah.

### Jurang yang disahkan daripada kod semasa

- `createBatch` menyimpan nombor siri, MAC kod, pakej, kelompok, tarikh akhir penebusan dan status. Kod yang boleh dibaca hanya
  wujud ketika penjanaan dan dalam PDF yang dimuat turun sekali. PDF label sedia ada menggunakan satu halaman bagi setiap label.
- Kod asal **tidak boleh dibina semula daripada MAC**. Eksport sandaran kod kad juga menyimpan MAC, bukannya kod boleh cetak.
  Oleh itu simpanan semasa belum memenuhi keperluan menyimpan kod asal untuk pengambilan/cetakan semula dalam sistem.
- Penggantian kod yang sudah ada membatalkan kod lama dan menghasilkan kod lain; itu tidak sama dengan mencetak semula label
  kod asal selepas masalah pencetak. Jangan menggunakan penggantian secara senyap apabila permintaan ialah cetakan semula.

### Keperluan pelaksanaan dan penerimaan

1. Penjanaan kelompok kad fizikal mengaitkan kod unik dengan nombor siri dan pakej serta tarikh akhir penebusan.
2. Simpan kod boleh pulih dalam bentuk **terenkripsi**, dengan akses pemilik dan jejak audit pengambilan/cetakan semula.
   Kekalkan MAC bagi semakan penebusan. Jangan menyimpan plaintext dalam repo, log, senarai umum atau eksport terbuka.
   Reka bentuk kunci/sandaran dan pemulihan simpanan terenkripsi mesti didokumenkan serta diuji sebelum digunakan untuk kad sebenar.
3. Cetak label pada saiz fizikal yang Izzat beri, menggunakan pencetak thermal sebenar. Nombor siri, kod dan tarikh akhir mesti
   lengkap dan boleh dibaca; pengambilan/cetakan semula menggunakan kod sama dan tidak menjana hak akses atau stok kad baharu.
4. Sahkan cetakan dan rekod kad sebagai stok sedia. Urus status kad supaya kad sama tidak diperuntukkan kepada dua pesanan.
5. Kaitkan kad/nombor siri dengan rujukan pesanan Shopee serta status penghantaran dan nombor penjejakan apabila tersedia.
   Tentukan pelaksanaan manual atau integrasi API apabila skop pesanan diperincikan; tiada integrasi Shopee automatik telah diluluskan/dibina.
6. Label ditampal pada kad; kad diperuntukkan kepada pesanan dan dipos kepada pembeli. Pengaktifan kod sebelum kad meninggalkan
   penjual mengikuti aliran sedia ada sehingga ada keputusan lain. Pembelian/penghantaran tidak memulakan tempoh akses;
   tempoh bermula melalui penebusan mengikut aturan akses dan had sambungan yang sudah dipersetujui.
7. Uji kad fizikal hujung ke hujung: jana → simpan → pulihkan/cetak semula kod sama → cetak thermal → tampal → peruntukkan
   kepada pesanan → aktifkan/pos → pembeli tebus. Uji cetakan gagal, pengambilan berulang dan penebusan berganda tanpa menambah stok/akses.

Pemetaan kepada lapan fasa: B meliputi simpanan/cetakan dan pengurusan stok/pesanan fizikal; C meliputi pemulihan kod serta
ujian pencetak/kad sebenar; D/E kekal memerlukan kelulusan khusus bagi migrasi/konfigurasi produksi; G bagi saluran fizikal
memerlukan persediaan penyenaraian Shopee, stok, pembungkusan dan penghantaran. Akaun/saluran Shopee, model pencetak,
saiz label dan reka kad belum disahkan dalam penegasan ini. Jangan mereka harga pos, dasar pemulangan atau butiran peribadi.

Status bahagian ini: **keperluan direkodkan, belum dilaksanakan**. Tiada kod kad sebenar dijana, tiada rahsia/kod dicatat,
tiada migrasi atau operasi produksi, tiada perubahan pencetak/Shopee dan tiada saiz cetakan dimuktamadkan dalam kemas kini dokumen ini.

## 13. Saiz pelekat disahkan dan rujukan kad SUS, 6 November 2026

Izzat mengesahkan label **3 × 5 cm** dan pelekat gores **0.8 × 4 cm**, serta memberikan `Kad kod langganan (1).zip`
sebagai contoh reka bentuk **Sains untuk Semua**. Dua fail SVG (`1.svg`, `2.svg`) diperiksa sebagai rujukan hadapan/belakang;
tiada arahan dalam artwork diambil sebagai kebenaran operasi atau keputusan produk baharu.

- Orientasi pada contoh ialah melintang: label **lebar 50 × tinggi 30 mm**, gores **lebar 40 × tinggi 8 mm**.
  Nilai numerik `DEFAULT_LABEL` Jalin sudah sepadan; tiada perubahan ukuran runtime diperlukan. Kedudukan jalur, ruang margin
  dan skala pemacu masih perlu diuji pada pencetak thermal sebenar. Penetapan saiz tidak dianggap bukti cetakan fizikal lulus.
- Contoh SUS mempunyai nombor siri, barcode, ruang kod terlindung gores dan tarikh akhir penebusan. Penjana PDF Jalin kini
  mencetak nombor siri, kod dan tarikh akhir, **belum mencetak barcode**. Kehadiran barcode dalam contoh bukan keputusan
  automatik untuk menambah barcode atau menetapkan data yang dikodkannya pada label Jalin; skopnya perlu dipadankan dengan artwork Jalin.
- Carian fail reka bentuk dalam checkout `jalin-fix10` ini menemui aset jenama, kad maya `/tebus` (`RedeemForm.tsx`) dan
  penjana PDF label, tetapi **tidak menemui fail artwork kad fizikal Jalin**. Jangan mendakwa reka fizikal Jalin sudah tersedia
  atau bahawa semua checkout/Canva di luar repo sudah dicari. Fail asal ZIP tidak diubah; salinan rujukan/render diletakkan di luar repo.
- Nama/laman/identiti penjual serta ayat tempoh akses SUS tidak disalin terus kepada Jalin. Teks pada kad perlu sepadan dengan
  aturan sambungan akses yang dipersetujui; tiada artwork atau teks kad milik Izzat diubah semasa semakan ini.
- Simpanan kod fizikal terenkripsi yang boleh dipulihkan/cetak semula dalam bahagian 12 masih perlu dibina. Saiz kini disahkan,
  manakala reka fizikal Jalin, skop barcode dan ujian pencetak kekal belum disahkan. Tiada kod sebenar dijana/dicetak,
  tiada perubahan DB, env atau produksi dan tiada konfigurasi pencetak diubah.
- Ujian penjana label sedia ada **33/33 lulus** dan `git diff --check` lulus selepas kemas kini catatan/keputusan saiz.
  Ujian ini mengesahkan PDF dan susun atur berangka; ia bukan ujian hasil cetakan thermal fizikal.

## 14. Keutamaan jana/simpan/cetak label, arahan Izzat 7 November 2026

Izzat mengurus reka bentuk kad sendiri. Pelaksanaan penjanaan, simpanan dan cetakan label tidak perlu menunggu artwork kad.
Skop pakej setempat ini: kod fizikal boleh dijana, disimpan terenkripsi, dimuat turun dalam PDF 50 × 30 mm dan dicetak semula
secara terpilih tanpa mencipta kod/nombor siri/stok/hak akses baharu. Tiada barcode atau reka bentuk kad ditambah dalam pakej ini.

Reka bentuk sebelum pelaksanaan:
- Migrasi aditif **038_physical_label_storage**: dua lajur nullable pada `redeem_codes` (`label_cipher`, `label_key_id`),
  serta susun atur label nullable pada `code_batches` (`label_layout`). Kod lama kekal sah tetapi tidak boleh dibina semula
  daripada MAC jika tiada ciphertext. Jangan menjana pengganti sebagai kesan sampingan cetakan semula.
- AES-256-GCM dengan kunci diterbitkan melalui HKDF daripada CODE_MAC_KEY sedia ada, tujuan berasingan daripada kod e-mel
  dan sandaran. Ciphertext terikat pada nombor siri. Simpan pengecam kunci; cetakan semula menyokong ring kunci lama sedia ada.
  Jangan memutar/menjana kunci produksi; kunci lama mesti disimpan untuk pemulihan label seperti keperluan kod sedia ada.
- Semua kod fizikal baharu dan pengganti fizikal menyimpan ciphertext dalam transaksi penjanaan. Susun atur cetakan disimpan
  bagi kelompok. PDF pertama dibina semula daripada simpanan tersebut sebelum transaksi disahkan, membuktikan kod tersimpan boleh dibuka.
- Pemilik sahaja, same-origin POST, PDF `no-store`; cetakan semula mengunci kelompok/kod, menyemak MAC hasil nyahsulit,
  menolak ciphertext rosak/kunci tiada dan merekod audit wajib. Tiada plaintext dalam JSON, aktiviti, senarai, log atau props React.
- Cetakan semula hanya kod fizikal tersimpan yang belum ditebus/dibatalkan/luput dalam kelompok aktif. Pilihan tertentu mesti
  sepadan sepenuhnya; jangan mengeluarkan PDF separa jika salah satu pilihan tidak layak. Muat turun semula tidak mengaktifkan kod.
- Sandaran terenkripsi membawa ciphertext dan pengecamnya; pemulihan mengembalikan simpanan tanpa menghidupkan kod yang telah digunakan.
  Fail lama tanpa medan baharu masih diterima, tetapi tidak boleh mencipta plaintext/ciphertext yang tidak pernah disimpan.
- Ujian kriptografi/label tanpa DB, integrasi dengan migrasi 038 **di dalam transaksi rollback pembangunan sahaja**, pemulihan
  ciphertext/penebusan, PDF tepat/tiada kod berganda, serta QA kawalan admin. Tiada migrasi kekal pada pembangunan atau produksi,
  ujian transaksi serentak, cabang baharu, pembayaran, cetakan sebenar, env atau suis produksi dalam pakej ini.

Pintu migrasi produksi kini perlu menyemak 038 juga sebelum kod ini boleh ditempatkan. Kelulusan operasi produksi terdahulu
tidak dianggap meliputi migrasi baharu ini. Tiada dakwaan bahawa pencetak fizikal sudah diuji tanpa hasil cetakan sebenar.

Semakan 7 November 2026: ujian PostgreSQL dalam memori menggunakan migrasi sebenar lulus untuk jana dua kod, cetak semula PDF yang sama, cetak satu pilihan, tolak kunci yang tiada, tebus satu kod, pulihkan sandaran terenkripsi dan kecualikan kod yang sudah ditebus. Kegagalan rekod audit membatalkan penjanaan tanpa meninggalkan kelompok atau kod tambahan. TypeScript, ujian kriptografi dan ujian ukuran PDF lulus. Sampel 50 × 30 mm diperiksa pada render 203 dpi. Pengesahan pada pelekat fizikal masih diperlukan.

Inventori baca sahaja Neon `production` pada tarikh sama menunjukkan migrasi 034 direkodkan dan 035–038 belum direkodkan. Jadual `purchase_orders` dan lajur `redeem_codes.label_cipher` belum wujud. Bilangan kelompok, kod dan penebusan masing-masing 0. `/beli` dan `/tebus` memberi HTTP 404. Ini menjadi asas semakan sebelum pintu migrasi dan konfigurasi.

[Semakan bahasa teks label pentadbir](https://chatgpt.com/g/g-p-6aa7d8eaff5c81918ed35b086fc59cd2/c/6aed9784-b99c-83ec-8ec8-17102e9e26e5) dibuat dalam projek ChatGPT Jalin pada 7 November. Teks cetakan semula menyebut kod yang layak, mengikut penapis sebenar. PDF penjana mengandungi satu halaman bagi setiap label, disahkan dalam ujian `label-pdf.test.ts`.
