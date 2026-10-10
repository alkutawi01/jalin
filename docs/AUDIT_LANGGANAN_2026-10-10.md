# Audit sistem langganan Jalin (KOD), 10 Okt 2026

Audit baca-sahaja oleh Claude atas permintaan Izzat. Tiada kod langganan diubah. Projek KOD masih KIV; dokumen ini hanya senarai dapatan dan cadangan.

**Skop:** akaun pembaca (log masuk kod e-mel, peranti, sesi), lejar akses, kod kad dan kod kongsi, admin Langganan, label, eksport sandaran dan pemulihan, cron, halaman pembaca, dokumen kajian. Rujukan luar: amalan Stripe, Shopify, Voucherify, RevenueCat, Nintendo, Steam, NIST SP 800-63B-4, OWASP (ASVS dan cheat sheet), dan ringkasan firma guaman tentang PDPA Malaysia.

**Kaedah:** membaca kod sumber (`src/lib/reader-auth`, `src/lib/subscription`, migrasi 027 hingga 030, laluan `/api/akaun` dan `/api/admin/langganan`, komponen pembaca), menjalankan semakan sedia ada pada cabang pembangunan, dan beberapa ujian kecil untuk mengesahkan dapatan.

**Keadaan semasa:** kod ada di `main` dan sudah deploy; migrasi 027 hingga 030 sudah dijalankan pada pengeluaran; `READER_ACCOUNTS_ENABLED` tidak ditetapkan, jadi pembaca tidak nampak apa-apa.

## 1. Keputusan ringkas

Enjin teras (kod, tebus, lejar) dibina dengan teliti dan lebih kukuh daripada kebanyakan sistem kecil. Yang belum siap ialah bahagian di sekelilingnya: dinding bayar belum wujud, pembaca belum boleh memadam akaun, tiada amaran apabila sesuatu gagal, dan beberapa keputusan operasi (kunci, sandaran, e-mel) boleh mematikan seluruh sistem. **Belum sedia dibuka kepada awam.**

Semakan yang dijalankan hari ini, semuanya lulus:

| Semakan | Hasil |
|---|---|
| `db:reader-check` (skema) | 22 lulus |
| `db:reader-auth-check` (log masuk) | 30 lulus |
| `db:reader-ledger-check` (lejar) | 27 lulus |
| `db:redeem-check` (tebus, perlumbaan serentak) | 49 lulus |
| Ujian unit: access-rules, shared-code, subscription-primitives, reader-auth-primitives, label-pdf, staff-accounts | 25, 22, 36, 50, 27, 32 lulus |

## 2. Yang sudah kukuh (kekalkan)

- Kod kad tidak disimpan. Hanya HMAC bagi (nombor batch, kod) dengan kunci berasingan daripada kunci log masuk. Selari dengan amalan Shopify (kod penuh dipulangkan sekali sahaja).
- Kod 16 aksara Crockford base32 (80 bit) dengan aksara semak; O, I, L dibaca sebagai 0 dan 1; salah taip ditolak sebelum dikira sebagai tekaan.
- Tebus dalam satu transaksi; `redemptions.code_id` UNIQUE; had kod kongsi dinaikkan dengan syarat dalam pernyataan yang sama. Ujian 12 pembaca berebut 5 tempat lulus.
- Lejar tambah-sahaja, dikuatkuasa oleh pencetus pangkalan data (tidak boleh diubah, dipadam atau dipindah akaun).
- Jawapan sama untuk semua kegagalan; tiada laluan "semak kod"; had kadar setiap akaun, setiap IP dan global.
- Keadaan kod yang jelas: dijana, disahkan cetak, diaktifkan (`issued`), dibatalkan. Kad yang belum diaktifkan tidak boleh ditebus (setara "activation at sale" InComm).
- Suis henti dalam pangkalan data, tanpa deploy.
- Fail eksport bertandatangan, skrip rekonsiliasi arah selamat, dan latihan pemulihan 30 semakan.
- Kuki `__Host-`, HttpOnly, Secure, SameSite=Lax; semakan asal-sama pada semua perubahan; token sesi 256 bit disimpan sebagai cincangan.
- Log masuk: 6 digit, 5 minit, 5 cubaan setiap kod, kod terikat pada cabaran, permintaan baharu membatalkan kod lama. Dalam had NIST (10 minit, sekurang-kurangnya 6 digit).

## 3. Dapatan dan penambahbaikan

Keutamaan: **P0** mesti selesai sebelum pendaftaran dibuka; **P1** sebelum jualan kad pertama; **P2** selepas pelancaran.

### P0-1. Dinding bayar belum wujud: langganan tidak mengubah apa-apa

- **Bukti:** `readDecision()` dalam `src/lib/subscription/access.ts` tidak dipanggil di mana-mana halaman. Tiada medan `access_policy` atau bendera teaser pada karya.
- **Kesan:** pembaca yang menebus kad tidak mendapat apa-apa yang berbeza daripada pelawat. Aliran hujung ke hujung terputus di langkah terakhir.
- **Cadangan:** bina Fasa 6 seperti dalam kajian (bahagian 5.11): satu fungsi `canReadWork()` di pelayan, bendera teaser, dan senarai semak kebocoran (HTML awal, RSC, JSON-LD, sitemap, carian dan `/api/cari`, `/api/koleksi-cerita`, pratonton, imej, cache). Tambah ujian kenari yang gagal jika teks berkunci muncul di mana-mana laluan.

### P0-2. Pembaca tidak boleh memadam akaun atau mengeksport data

- **Bukti:** status `deletion_requested` wujud dalam skema tetapi tiada kod yang menggunakannya; `AccountPanel.tsx` tiada butang padam atau eksport.
- **Kesan:** kriteria G2 dalam kajian ("data boleh dieksport/dipadam") belum dipenuhi. PDPA (prinsip penyimpanan; pindaan 2024 tentang kemudahalihan data berkuat kuasa 1 Jun 2025 menurut ringkasan firma guaman) menjadikan ini risiko pematuhan.
- **Cadangan:** padam akaun layan diri dengan pengesahan kod e-mel; nyatakan apa yang kekal (baris lejar tanpa pautan, cincangan "percubaan sudah digunakan") dan sebabnya; eksport data ringkas (profil, peranti, lejar, simpanan). Tetapkan tempoh simpan akaun yang tamat.

### P0-3. Had e-mel global boleh mematikan log masuk untuk semua orang

- **Bukti:** `LIMITS.requestsPerDayAll = 90` dalam `service.ts` (terikat pada pelan percuma Resend 100 sehari). Sesiapa boleh meminta kod untuk mana-mana alamat: 20 permintaan sejam bagi setiap IP.
- **Kesan:** lima alamat IP boleh menghabiskan kuota harian dalam sejam. Selepas itu tiada pembaca boleh log masuk sehingga esok, dan mereka melihat mesej "kod telah dihantar" walaupun tiada apa dihantar.
- **Kesan kedua:** had 10 kegagalan sejam bagi setiap e-mel membolehkan orang lain mengunci mangsa selama sejam (OWASP menyebut risiko ini).
- **Cadangan:** naik pelan e-mel sebelum pelancaran dan naikkan had; asingkan bajet untuk akaun sedia ada daripada alamat baharu; tambah cabaran bot (contohnya Turnstile) selepas ambang, bukan sekatan terus; paparkan mesej jujur apabila had global dicapai; amaran kepada Izzat pada 70% kuota. Pasang SPF, DKIM dan DMARC pada domain penghantar.

### P0-4. Tiada sokongan putaran kunci; kehilangan kunci membatalkan semua kad

- **Bukti:** `redeemCard` mencari dengan `c.key_id = kunci semasa`; `loadCodeKey` membaca satu kunci sahaja. Tiada ujian putaran (kajian menyenaraikan "kunci lama selepas putaran" sebagai kriteria Fasa 4). Kajian sendiri mengaku: kehilangan `CODE_MAC_KEY` membuat semua kod bercetak tidak sah.
- **Kesan:** jika kunci bocor, memutarnya mematikan semua kad yang sudah dijual. Jika kunci hilang (projek Vercel terpadam, salah taip), tiada jalan pulih.
- **Kesan kedua:** memutar `READER_MAC_KEY` memadam rekod "percubaan sudah digunakan", jadi semua orang layak percubaan kali kedua.
- **Cadangan:** gelang kunci (kunci semasa untuk menjana, kunci lama untuk mengesah) dengan `key_id` pada setiap baris, yang sudah ada dalam skema; ujian putaran; salinan kunci di luar Vercel dalam pengurus kata laluan dengan prosedur bertulis; kunci tandatangan eksport yang berasingan daripada kunci kod.

### P0-5. Sandaran: fail awam, jurang 24 jam, tiada amaran kegagalan

- **Bukti:** `maintenance.ts` menyimpan fail di Vercel Blob dengan `access: "public"` (alamat rawak), dan menyimpan URL itu dalam pangkalan data. Cron sekali sehari (`0 20 * * *` UTC). Kegagalan hanya kelihatan jika Izzat membuka Langganan > Ringkasan.
- **Kesan:** sesiapa yang memperoleh URL (salinan pangkalan data, log) boleh memuat turun senarai siri, HMAC, kod kongsi dalam teks biasa dan cincangan e-mel. Penebusan dalam 24 jam sebelum pemulihan tidak dilindungi. Sandaran boleh berhenti berminggu-minggu tanpa disedari.
- **Cadangan:** storan persendirian atau fail disulitkan; salinan kedua di luar Vercel (contohnya e-mel kepada Izzat atau storan lain); eksport tambahan selepas setiap N penebusan atau setiap jam apabila ada jualan; amaran jika eksport terakhir lebih 36 jam; pengesahan tandatangan berjadual; prosedur bertulis "henti, pulih, rekonsiliasi, sambung" dan satu latihan sebenar.

### P0-6. PDF kelompok ialah rahsia paling bernilai dan tiada kawalan

- **Bukti:** `POST /api/admin/langganan/batch` memulangkan PDF dengan semua kod teks biasa sekali sahaja. Jika muat turun gagal, kelompok mesti dibatalkan dan dibuat semula. Fail itu kekal dalam folder Muat Turun.
- **Kesan:** komputer atau akaun pemilik yang dikompromi bermakna kod boleh dicetak sesuka hati. Tiada orang kedua, tiada pemberitahuan.
- **Cadangan:** pengesahan dua faktor untuk akaun pemilik (sahkan sama ada sudah ada); e-mel pemberitahuan kepada Izzat setiap kali kelompok dijana, dieksport atau diaktifkan; prosedur memadam PDF selepas cetak; had kelompok kecil pada mulanya (kajian sudah mengesyorkan); amaran apabila kod daripada kelompok yang belum ditanda terjual ditebus.

### P0-7. Urutan pelancaran: percubaan terbakar sebelum dinding bayar

- **Bukti:** percubaan 14 hari bermula pada saat akaun dicipta (`verifyLoginCode`), tanpa mengira sama ada dinding bayar hidup.
- **Kesan:** jika akaun dibuka dahulu (contohnya untuk ciri hantar manuskrip), pendaftar awal kehabisan percubaan sebelum ada apa-apa yang dikunci.
- **Cadangan:** mulakan jam percubaan hanya apabila dinding bayar hidup, atau beri percubaan baharu kepada akaun sedia ada pada hari pelancaran. Putuskan sebelum `READER_ACCOUNTS_ENABLED` dihidupkan.

### P0-8. Perkara terbuka yang bukan kod

- Kunci Resend yang terdedah belum diganti (dicatat dalam nota projek).
- Entiti penjual, dasar pulangan, tempoh sah kad dan semakan peguam belum diputuskan. Peraturan Perdagangan Elektronik 2012 menghendaki nama perniagaan, nombor pendaftaran dan butiran hubungan dipaparkan (menurut ringkasan firma guaman; belum disahkan terhadap teks warta).
- Sediakan satu halaman prosedur pelanggaran data: 72 jam kepada Pesuruhjaya, 7 hari kepada individu terjejas, daftar pelanggaran 2 tahun (garis panduan 25 Feb 2025, menurut ringkasan firma guaman).

### P1-1. Percubaan percuma boleh diulang tanpa had

- **Bukti (diuji):** `normaliseEmail` mengekalkan titik dan tanda tambah. `ali.baba+1@gmail.com`, `alibaba@gmail.com` dan `alibaba@googlemail.com` ialah tiga akaun dengan tiga percubaan.
- **Cadangan:** kunci kelayakan percubaan pada alamat yang dinormalkan (buang `+tag`; buang titik untuk gmail.com dan googlemail.com sahaja) sambil menghantar e-mel ke alamat yang ditaip; had percubaan baharu setiap IP sehari; senarai domain pakai buang pada permulaan percubaan sahaja. Elakkan cap jari peranti (data peribadi tambahan).

### P1-2. Sesi tidak pernah tamat dan tiada pemberitahuan peranti baharu

- **Bukti:** baris `reader_devices` tiada tarikh luput; kuki 400 hari; tiada e-mel apabila peranti baharu log masuk atau peranti digantikan.
- **Rujukan:** NIST mengesyorkan had masa sesi keseluruhan tidak lebih 30 hari pada AAL1; Netflix menyediakan senarai peranti dengan log keluar jauh (sudah ada di sini).
- **Cadangan:** tamat sesi selepas tempoh tidak aktif (contohnya 90 hari) dan had mutlak (contohnya setahun); e-mel "peranti baharu log masuk" dengan pautan log keluar semua.

### P1-3. Pengalaman menebus masih kasar

- `/tebus` tanpa log masuk menghantar ke `/log-masuk`, dan selepas log masuk pembaca tiba di `/akaun`, bukan kembali ke `/tebus`.
- Dua medan (kod dan nombor batch) menambah salah taip. Label hanya mencetak alamat `jalin.adjung.com/tebus`.
- Kod kongsi yang tamat, penuh atau dijeda memberi mesej umum "tidak dapat ditebus" dan dikira sebagai cubaan gagal terhadap had pembaca itu.
- Tiada e-mel pengesahan selepas tebus (`Mailer` hanya ada `sendLoginCode`).
- **Cadangan:** kekalkan destinasi selepas log masuk; kod QR pada kad yang mengisi nombor batch (kajian 16.1 sudah mencadangkan); untuk kod kongsi yang wujud, beri sebab sebenar (tamat, penuh) kerana ia bukan rahsia, dan jangan kira sebagai tekaan; e-mel resit dengan tarikh tamat akses.

### P1-4. Membatalkan tempoh di tengah meninggalkan lubang

- **Bukti (diuji):** tiga kad berturut-turut, yang kedua dibatalkan: pembaca kehilangan akses sepanjang bulan kedua, kemudian akses hidup semula pada bulan ketiga. Ini reka bentuk yang disengajakan (tiada pengiraan tersembunyi), tetapi admin tidak diberi amaran.
- **Cadangan:** apabila admin membatalkan tempoh yang diikuti tempoh lain, tunjukkan lubang yang terhasil dan tawarkan satu butang "batal dan rapatkan" yang menambah geran ganti secara eksplisit.

### P1-5. Kelemahan kecil dalam admin dan data

- Geran `ADMIN` tiada kunci idempoten: dua klik memberi dua tempoh. Tambah `sourceRef` daripada borang.
- `created_by` dan `revoked_by` menyimpan nama admin, bukan id. Nama boleh berubah. Simpan id.
- Kod kongsi yang dibatalkan boleh dihidupkan semula (`setSharedCodeStatus` menerima sebarang peralihan). Jadikan "dibatalkan" muktamad, atau catat sebab.
- `lostSharedRedemptions` dalam rekonsiliasi hanya melaporkan apabila tiada langsung penebusan bagi kod itu, jadi kehilangan separa tidak dilaporkan.
- Kes hujung: `redeemShared` menaikkan bilangan sebelum `addGrant`; jika `addGrant` memulangkan pendua, bilangan sudah naik tanpa penebusan. Hampir mustahil dicapai, tetapi patut dibetulkan dengan memeriksa dahulu.
- Carian pembaca oleh admin tidak dicatat dalam log aktiviti (OWASP: catat akses data peribadi oleh pentadbir).
- Tiada fungsi "ganti kad rosak" yang memautkan siri lama kepada siri baharu; kini dua langkah manual.

### P1-6. Tiada pemantauan atau amaran

- **Bukti:** tiada amaran untuk lonjakan tebus gagal, had global dicapai, e-mel gagal dihantar, cron gagal atau eksport gagal. Hanya satu aliran kerja GitHub (`editorial-audit.yml`); ujian pangkalan data dijalankan secara manual.
- **Rujukan:** Voucherify mengesyorkan amaran pada lonjakan `redemption.failed`. Serangan GiftGhostBot (2017) menguji 1.7 hingga 4 juta nombor kad sejam terhadap halaman semak baki.
- **Cadangan:** ringkasan harian melalui e-mel atau Telegram (tebus berjaya, gagal, akaun baharu, kuota e-mel, tarikh eksport); amaran segera pada ambang; jalankan ujian unit langganan dalam CI pada setiap tolakan.

### P1-7. Had tebus gagal global ialah tuas penafian perkhidmatan

- **Bukti:** `failsAllPerHour = 200`. Selepas 200 kegagalan dalam sejam daripada sesiapa sahaja, semua pembaca menerima "terlalu banyak cubaan".
- **Cadangan:** ganti sekatan global dengan amaran dan suis henti manual; kekalkan had setiap akaun dan setiap IP.

### P1-8. Tiada komunikasi kitaran hayat

- Tiada peringatan sebelum akses tamat, tiada e-mel pada hari tamat, tiada e-mel selepas tamat.
- **Cadangan:** peringatan 7 hari dan 1 hari sebelum tamat dengan tarikh tepat dan cara menebus kad baharu; nyatakan apa yang berlaku pada simpanan dan kemajuan bacaan selepas tamat. Perlukan jadual `outbox` (kajian 5.13 sudah menyebutnya).

### P2. Selepas pelancaran

- Jadual `saved_works` dan `reading_progress` wujud tetapi tiada kod yang menggunakannya. Tetapan bacaan disimpan tetapi tidak dipakai pada halaman cerita.
- Kod log masuk berada dalam tajuk e-mel, jadi kelihatan pada pemberitahuan skrin kunci. Pertimbangkan tajuk tanpa kod.
- Had jumlah tempoh bertindan (contohnya 36 bulan) untuk mengehadkan kerugian jika kod dicuri secara pukal.
- Kajian mencatat keputusan "12 aksara"; pelaksanaan ialah 16 aksara dan satu aksara semak. Kemas kini dokumen.
- Ujian beban (k6) dan ujian 20 tebus serentak pada pengeluaran belum dijalankan (kajian menandakannya BELUM DIUJI).
- Rekod jualan kad (siapa beli, saluran, harga) tiada; diperlukan untuk padanan jualan dengan penebusan (kriteria Fasa 7) dan untuk akauntan.

## 4. Perbandingan dengan sistem lain

| Perkara | Amalan lazim | Jalin sekarang |
|---|---|---|
| Abjad kod | Crockford base32, aksara semak (Nintendo membuang O, I, Z) | Sama, 80 bit |
| Simpanan kod | Cincangan; kod penuh sekali sahaja (Shopify) | Sama (HMAC) |
| Pengaktifan semasa jualan | Kad tiada nilai sehingga diaktifkan (InComm) | Ada (`issued`), manual |
| Had cubaan | Setiap akaun, IP; amaran pada lonjakan (Voucherify, Steam) | Had ada; amaran tiada |
| Kod kongsi | Had guna, luput, sekali setiap pelanggan (Stripe) | Sama |
| Kod log masuk | 6 digit, paling lama 10 minit (NIST) | 6 digit, 5 minit |
| Tamat sesi | Tidak lebih 30 hari (NIST AAL1) | Tiada tamat |
| Had peranti | Senarai peranti, pilih yang dibuang (Netflix, Kindle) | Ada |
| Penyalahgunaan percubaan | Alamat dinormalkan, domain pakai buang (Stripe, Castle) | Tiada |
| Lejar | Tambah-sahaja, idempoten (Stripe, RevenueCat) | Ada; geran admin tidak idempoten |
| Peringatan tamat | Sebelum dan pada tarikh tamat | Tiada |
| Padam akaun | Layan diri | Tiada |
| Sandaran kod | Lokasi kedua, rekonsiliasi | Ada; fail awam, sekali sehari |

Nota tentang sumber: perkara NIST, OWASP, Crockford dan Voucherify dibaca daripada sumber asal. Perkara Shopify, Stripe, Nintendo, InComm, Steam dan undang-undang Malaysia datang daripada sumber sekunder (dokumen pembangun, ringkasan firma guaman, liputan berita). Tiada sumber ditemui tentang tempoh sah minimum kad prabayar di Malaysia; tanya peguam.

## 5. Urutan kerja yang dicadangkan (jika KOD dibuka semula)

1. Keputusan dan kebersihan: ganti kunci Resend, naik pelan e-mel, SPF/DKIM/DMARC, salinan kunci di luar Vercel, pengesahan dua faktor pemilik.
2. Gelang kunci dan ujian putaran (P0-4).
3. Sandaran persendirian, salinan kedua, amaran eksport (P0-5).
4. Padam akaun dan eksport data (P0-2).
5. Dinding bayar, bendera teaser, ujian kenari (P0-1), bersama keputusan jam percubaan (P0-7).
6. Had e-mel dan cabaran bot (P0-3); normalisasi percubaan (P1-1).
7. Pemantauan, ringkasan harian, CI (P1-6); buang sekatan tebus global (P1-7).
8. Kemasan tebus: destinasi selepas log masuk, QR, mesej kod kongsi, resit (P1-3); peringatan tamat (P1-8).
9. Pembetulan admin (P1-4, P1-5).
10. Latihan pemulihan sebenar dan 50 kad ujian (Fasa 5 dan G5 dalam kajian).

## 6. Had audit ini

- Saya tidak menyemak tetapan Vercel, Neon atau Resend yang sebenar (tiada akses), termasuk sama ada PITR Neon dihidupkan.
- Saya tidak menguji pada pengeluaran; semua semakan dijalankan pada cabang pembangunan.
- Antara muka admin Langganan dan penjana PDF label dibaca secara sepintas lalu, tidak diuji baris demi baris.
- Pengesahan dua faktor akaun admin tidak disemak.
- Perkara undang-undang bukan nasihat guaman.
