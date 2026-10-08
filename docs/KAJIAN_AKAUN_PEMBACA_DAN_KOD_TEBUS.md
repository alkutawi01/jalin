# Kajian dan pelan: akaun pembaca, tetapan bacaan, Jalin Plus dan kod tebus

Versi 2, 8 Okt 2026. Status keseluruhan: **cadangan yang belum diluluskan. Tiada kod ditulis, tiada skema diubah.**
Disemak dalam 20 sesi dengan ChatGPT (skor pelan: 8.0/10 pada sesi 1, **8.5/10 pada sesi 20**, keyakinan 94%). Skor ini menilai kualiti perancangan dan kawalan risiko, bukan kebarangkalian kejayaan perniagaan. Log penuh setiap sesi: [KAJIAN_AKAUN_KOD_TEBUS_LOG_SESI.md](KAJIAN_AKAUN_KOD_TEBUS_LOG_SESI.md).

Permintaan asal Izzat: log masuk pengguna awam untuk sambung bacaan, saiz font, kecerahan, baki langganan, profil dan lain-lain; dan ciri paling besar: sistem menjana kod, mencetaknya pada pencetak label haba, kod dilekatkan pada kad, diedar kepada pembeli, pembeli log masuk Jalin dan menebus kod untuk langganan 1 bulan, 6 bulan atau 1 tahun.

Dokumen ini ialah langkah "dokumenkan dahulu" yang dikehendaki AGENTS.md (peraturan 1 dan 14) sebelum mengubah keputusan produk, auth atau skema.

## Cara membaca status

Setiap perkara ditanda dengan salah satu:

| Tanda | Maksud |
|---|---|
| **DICADANGKAN** | Syor daripada kajian ini. Belum diputuskan oleh Izzat. |
| **BELUM DIUJI** | Anggapan atau angka yang mesti dibuktikan melalui ujian sebenar. |
| **DISAHKAN DALAM KOD** | Diperiksa terus dalam repositori. |
| **PERLU DISAHKAN PROFESIONAL** | Undang-undang, cukai, perakaunan, privasi: kajian ini bukan nasihat profesional. |

Belum ada satu pun keputusan berstatus DIPUTUSKAN. Itu kerja Izzat (bahagian 9).

## 1. Keputusan terpenting: ini mengubah janji produk

| Dokumen | Hari ini | Kesan |
|---|---|---|
| `PRODUCT.md` (Access) | "Semua kandungan percuma ketika pelancaran." | Berubah jika langganan wujud. |
| `MVP_MASTER_PLAN.md` | Paid subscription dan paywall bukan MVP. | Mesti ditanda fasa selepas MVP. |
| `PRODUCT.md` (Accounts) | Akaun asas: simpan, sejarah, sambung bacaan. Tiada profil sosial. | "Profil" dihadkan kepada profil peribadi. |
| `AGENTS.md` | Jalin terbuka kepada semua pembaca. | Dinding bayar sepenuhnya bercanggah. Dielak dengan model akses awal (bahagian 2). |

## 2. Apa sebenarnya yang dijual: Jalin Plus ialah eksperimen akses awal (DICADANGKAN)

- **Bukan** penguncian karya sedia ada. Karya yang sudah percuma kekal percuma.
- **Jalin Plus** = keahlian yang membolehkan baca episod/bab baharu terpilih **lebih awal** (cadangan: satu episod setiap minggu, dibuka percuma 7 hari kemudian, maksimum 14 hari). Semua episod akses awal akhirnya dibuka percuma kepada semua pembaca.
- **Percuma sentiasa:** tetapan bacaan, simpan karya, sambung bacaan, glosari asas, kredit dan sumber.
- **Kontrak kepercayaan pembaca (4 peraturan):** tiada karya percuma ditarik ke belakang dinding; setiap episod akses awal ada tarikh buka percuma yang diumumkan dan tidak boleh dilewatkan; akaun percuma kekal ada ciri asas; manfaat berbayar dilabel jelas sebelum beli.
- **Skor strategi (ChatGPT):** A "premium dikunci" 6/10; B "Jalin Plus" 8/10; C "akses penuh berbayar" 3/10.
- **Syarat sebelum menjual (BELUM DIUJI):** sekurang-kurangnya 8 episod siap dan lulus semakan editorial (4 sebagai penampan); empat minggu terbit mengikut jadual; sekurang-kurangnya 30 pembaca kembali membaca siri dan sebahagian berminat akses awal. Angka ini ambang percubaan, bukan statistik sah.
- **Pilihan yang sama sahnya:** selepas Fasa 0, Izzat boleh memutuskan untuk **tidak** membina Jalin Plus. Akaun percuma dan pengalaman bacaan yang lebih baik tetap bernilai. Alternatif jujur: kad sokongan sukarela yang telus, tanpa janji akses eksklusif.
- **Risiko terbesar bukan teknologi, tetapi janji editorial.** Langganan 12 bulan menjual keyakinan terhadap terbitan masa depan. Jangan jual tempoh panjang jika jadual tidak boleh dijamin.

### Mesej kad (draf, DICADANGKAN)

> Jalin Plus, Keahlian 1 Bulan. Baca episod terpilih tujuh hari lebih awal dan sokong penerbitan Jalin. Keahlian ini bukan pembelian atau pemilikan karya. Semua episod akses awal akan dibuka percuma kepada semua pembaca selepas tempoh tersebut.

Ayat terlarang: "Akses eksklusif selamanya", "Semua karya premium", "Baca tanpa had" sebagai keistimewaan berbayar, "Menyokong penulis secara langsung" tanpa mekanisme sebenar, janji episod harian yang tidak mampu dipenuhi. AI tidak dijadikan tarikan pemasaran.

## 3. Keadaan sebenar kod hari ini (DISAHKAN DALAM KOD)

- **Tiada akaun pembaca.** Satu-satunya auth ialah log masuk admin (`src/lib/admin/auth.ts`: kuki `jalin-admin-session`, ADMIN_SECRET, jadual `admin_users`). Jangan guna semula untuk pembaca.
- **Pangkalan data:** Neon Postgres melalui Kysely, migrasi bernombor hingga 025. Tetapan ringan disimpan dalam `prompt_templates`.
- **Halaman awam dirender mengikut permintaan** (`force-dynamic`). Ini bukan kawalan keselamatan: teks berkunci mesti dihalang di pelayan sebelum dihantar.
- **Carian mengindeks teks cerita penuh dan boleh memaparkan petikan** (`src/lib/reader/search.ts`). Ini risiko kebocoran sebenar untuk apa-apa kandungan berkunci.
- **Tiada ID blok/perenggan yang stabil** dalam kandungan (hanya ID pada tajuk h2 dan nota kaki). Sambung bacaan tepat dalam bab belum boleh dipercayai.
- **Tiada penghantar emel.** `Permissions-Policy` semasa melarang `usb=()`.
- **Pembangunan tempatan menulis ke pangkalan data produksi** (localhost menggunakan DATABASE_URL produksi). Ini ditinggikan oleh sesi 19 sebagai risiko terbesar projek (bahagian 4).
- **Tiada kawalan saiz font, kecerahan atau tema pembaca.** Hanya garis kemajuan nipis (`ReadingProgress.tsx`).

## 4. Fasa 0 mandatori: lindungi Jalin produksi dahulu (DICADANGKAN)

Penilaian sesi 19: risiko terbesar ialah akses produksi yang terlalu luas, bukan tekaan kod. Sebelum sebarang ciri baharu:

1. **Asingkan DB pembangunan daripada produksi** (kredensial berasingan yang tidak boleh menulis ke produksi). Semua skrip dan ujian yang mengubah data **mesti gagal secara automatik** jika sambungan menghala ke produksi. Semak identiti pangkalan data pada permulaan skrip, bukan nama DATABASE_URL sahaja.
2. **Audit admin sebenar:** ADMIN_SECRET, sesi admin (24 jam), MFA, penguncian selepas percubaan gagal, notifikasi log masuk baharu. Catat bukti, bukan sekadar "PASS".
3. **Peraturan mengikat agen AI:** tiada tulis DB produksi lalai; tiada baca atau paparkan HMAC, ADMIN_SECRET atau env produksi; tiada jana, aktif atau tebus kod komersial tanpa kelulusan Izzat; tiada migrasi produksi langsung daripada localhost.
4. **Repo awam:** anggap penyerang tahu semua kod (prinsip Kerckhoffs). Jangan masukkan kunci HMAC, ADMIN_SECRET, URL DB berkredensial, token penyedia, kod sebenar, seed penjanaan, `.env` atau artefak cetak. Imbasan rahsia dalam CI; pembolehubah Vercel bertanda Sensitive.
5. **Sahkan pelan Vercel:** dokumentasi Vercel (ikut ChatGPT, PERLU DISAHKAN) menyatakan pelan Hobby untuk kegunaan peribadi bukan komersial. Sahkan pelan dan kelayakan sebelum menjual kad. Hobby juga had 100 deploy sehari dan cron sekali sehari.

## 5. Spesifikasi teknikal (DICADANGKAN; semua BELUM DIUJI melainkan dinyatakan)

### 5.1 Tetapan bacaan (lapisan A, tanpa akaun, boleh dibina dahulu)

- Saiz fon isi 16/18/20/22/24 px (lalai 18); jarak baris 1.5/1.75/2.0; lebar teks 60/68/74ch; tema cerah/sepia/gelap; fon serif/sans; "redup" 0-20% langkah 5% (boleh ditangguh jika ujian kontras belum siap). Guna rem. Ubah teks isi sahaja, bukan seluruh UI.
- Nota kaki margin turun ke bawah perenggan bila ruang tak cukup. Glosari boleh dibuka dengan sentuhan dan papan kekunci. Imej, crop dan warna ilustrasi tidak berubah.
- Mod gelap: **jangan songsangkan atau gelapkan ilustrasi** secara automatik; guna warna semantik untuk permukaan; ilustrasi kekal warna asal dengan latar neutral; teks dalam imej disemak berasingan.
- Tema tanpa kilat salah: kuki ialah sumber untuk render pelayan, localStorage sandaran; kuki tema hanya nilai yang dibenarkan.
- WCAG 2.2 AA (kontras 4.5:1, zum 200%, sasaran sentuh ~44 px), hormati prefers-color-scheme dan prefers-reduced-motion. Label "Redupkan halaman" (web tidak boleh mengawal kecerahan peranti).

### 5.2 Akaun pembaca (lapisan B)

- **Log masuk:** kod 6 digit sekali guna melalui emel (OTP). Tolak kata laluan V1. Google fasa berikut. Tangguh pautan sihir dan telefon/WhatsApp. **Batasan:** pembeli tanpa emel aktif tidak boleh menebus V1 (Izzat terima atau biayai kaedah lain).
- **OTP:** CSPRNG; sah 5 minit; maks 5 cubaan setiap cabaran; hantar semula jeda 60 saat; maks 5 hantaran/jam/emel; had IP dan kuota global; disimpan sebagai HMAC-SHA256 berkunci terikat ID cabaran; sekali guna dan atomik; respons sama untuk emel berdaftar dan tidak (termasuk status HTTP dan masa); tiada OTP dalam log atau dipulangkan ke pelayar.
- **Penyedia emel:** pilih dan sahkan domain penghantar (SPF, DKIM, DMARC), uji Gmail/Yahoo/Outlook **sebelum** bina login. Soalan untuk penyedia: had, kos, bounce, lokasi data.
- **Sesi:** kuki `__Host-jalin-reader` (HttpOnly, Secure, SameSite=Lax, tanpa Domain), hash token di DB, 7 hari ("ingat saya" 30 hari), log keluar semua peranti, Origin/CSRF. **Jangan guna semula `jalin-admin-session`.**
- **Pemulihan:** pemilikan kad bukan bukti ambil alih akaun. Tukar emel perlu sesi sah + sahkan alamat baru + beritahu alamat lama. Emel hilang = bekukan perubahan sensitif; hanya admin berkebenaran khas boleh memindahkan hak, dengan audit.
- **Sambung bacaan:** simpan work_id, section_id, block_id, offset_ratio, revision_id, updated_at; **bukan peratus tatal** (itu hanya untuk garis kemajuan). Simpan per peranti; tawar "Sambung dari tempat terakhir" dan "Mula dari awal"; jangan tatal automatik. Debounce 5-10 saat, visibilitychange/pagehide, salinan setempat dahulu. **Prasyarat:** ID blok stabil dalam pipeline kandungan (belum ada). Jika ditangguh, V1 hanya sambung ikut bab dan tidak mendakwa kedudukan tepat.
- **Penanda dan sejarah:** Simpan karya, Baru dibaca (10-20 terakhir), Sambung bacaan. Tiada nota awam, perkongsian aktiviti atau analitik tabiat. Sejarah boleh dipadam berasingan.

### 5.3 Privasi (PERLU DISAHKAN PROFESIONAL sebelum pendaftaran awam dibuka)

- Pengurangan data: emel, nama paparan (tidak wajib), kemajuan bacaan, karya disimpan, tetapan, log keselamatan (7-30 hari), rekod tebus. Tiada tarikh lahir, telefon atau identiti ibu bapa.
- Kemajuan bacaan dan karya disimpan mendedahkan minat peribadi: hanya pemilik boleh lihat; akses kecemasan diaudit; editor dan admin biasa tidak nampak.
- Bawah 18: V1 tiada pengumpulan umur; privasi ketat untuk semua (tiada profil awam, mesej, iklan tersasar, analitik tingkah laku terperinci). Soalan peguam: syarat sah daftar dan tebus oleh pembaca bawah 18, persetujuan ibu bapa.
- Hak pengguna: lihat data, betul nama/emel, eksport JSON, padam akaun (aliran: sahkan semula, tunjuk kesan pada langganan, sesi dibatal, data dipadam atau dinyahkenal; rekod transaksi diasing). Jangan dakwa "anonim" jika masih boleh dipautkan.
- Halaman Notis Privasi dan Terma (BM dan Inggeris); satu kotak wajib baca dan setuju semasa daftar; persetujuan pemasaran berasingan dan tidak ditanda awal; kuki sesi/keutamaan sahaja (perlu disahkan sama ada sepanduk diperlukan).
- ChatGPT merujuk Akta 709 (PDPA 2010), pindaan 2024, garis panduan JPDP dan tempoh 72 jam untuk pemberitahuan kebocoran: **semua perlu disahkan profesional, belum disemak sendiri.**
- Pelan insiden: dalam 24 jam pertama lantik penyelaras, sekat akses, simpan bukti, tentukan skop, hubungi penasihat; jangan tunggu bukti lengkap sebelum menilai kewajipan notifikasi.

### 5.4 Model data (jadual baharu sahaja; tiada ubah `works` atau auth admin)

| Jadual | Catatan penting |
|---|---|
| `reader_accounts` | public_id UUID; email_normalized unik untuk akaun aktif (normalisasi konservatif: jangan buang titik atau +tag); status deletion_requested/deleted |
| `reader_sessions`, `reader_auth_challenges` | token_hash; cabaran: email_lookup_mac, otp_mac, key_id, purpose, attempt_count 0-5; satu cabaran aktif setiap emel+purpose |
| `reader_prefs`, `reading_progress`, `saved_works` | satu baris setiap karya, bukan log setiap halaman |
| `products` + versi produk | duration_months dan access_scope; versi immutable |
| `code_batches` | status pengeluaran sendiri; jana melalui fungsi transaksi yang mengunci batch dan mengesahkan jumlah |
| `physical_cards` | satu kad = satu kod (V1), code_id UNIQUE NOT NULL; nombor siri awam |
| `redeem_codes` | code_mac + key_id, UNIQUE(key_id, code_mac); state hanya generated/issued/revoked ("ditebus" = wujud baris `redemptions`) |
| `redemptions`, `redemption_attempts` | tebus berjaya (code_id UNIQUE) berasingan daripada semua cubaan |
| `entitlements` (lejar) + `entitlement_periods` (unjuran) | lejar peristiwa tidak berubah (GRANT, ADMIN_GRANT, REVOKE, ADJUST_POSITIVE/NEGATIVE, REFUND_RECORDED, TRANSFER_OUT/IN, COMPENSATION_GRANT); tiada UPDATE/DELETE; unjuran boleh dibina semula penuh |
| `card_inventory_events` | printed, packed, dispatched, sold, lost, damaged, returned, activated, dengan channel dan idempotency_key |
| `email_outbox` | emel selepas commit; sekurang-kurangnya sekali |
| `admin_actions` | actor, permission, action, target, request_id, sebab, sebelum/selepas, hasil; tidak boleh dipadam |

Invarian yang dikuatkuasakan pangkalan data: satu kod ditebus sekali; satu tebusan = satu grant (grant merujuk `redemption_id` UNIQUE, disahkan atomik dalam fungsi DB); lejar tidak boleh diubah; ends_at > starts_at; versi produk tidak berubah retroaktif; permintaan berulang tidak memberi hak berganda.

Migrasi: tambah jadual sahaja; deploy kod di belakang feature flag; **jangan guna try/catch yang membenarkan tebus berjaya jika jadual belum wujud**, tutup ciri dengan mesej penyelenggaraan; migrasi produksi dijalankan sekali melalui pipeline terkawal, bukan oleh setiap instans.

### 5.5 Peraturan langganan (lejar)

- **Tarikh:** kalendar Gregorian, Asia/Kuala_Lumpur, simpan UTC. Tempoh `[starts_at, ends_at)`, tamat eksklusif. Jika hari sasaran tiada, guna hari terakhir bulan. Kes (disemak betul): 31 Jan 2027 10:00 +1 bulan = 28 Feb 2027 10:00; 29 Feb 2024 +12 bulan = 28 Feb 2025; 30 Ogos 2026 +6 bulan = 28 Feb 2027; 30 Ogos 2027 +6 bulan = 29 Feb 2028; penambahan berperingkat 31 Jan +1 +1 = 28 Mac. Papar "Akses sehingga 28 Februari 2027, 10:00 pagi (MYT)".
- **Penindanan:** `start = max(now, tamat semasa)` untuk skop sama; had 24 bulan baki; kod ditolak kerana had kekal boleh ditebus; tiada tempoh ihsan V1.
- **Pembatalan satu grant tidak menggerakkan grant seterusnya.** Jurang dibetulkan admin dengan peristiwa baharu, bukan pengiraan semula tersembunyi.
- Kebenaran: sokongan hanya siasat; langganan beri/laras dalam had; batal dan pindah kebenaran lebih tinggi dengan audit.
- `rebuildEntitlements` mesti deterministik: jalan 100 kali sama; unjuran produksi == bina semula. Penguncian per akaun (`SELECT ... FOR UPDATE`), urutan kunci konsisten.
- Tiada percubaan percuma automatik V1; promosi manual melalui ADMIN_GRANT.
- Episod terlepas jadual: umum pada hari sama; pampasan pelanjutan 7 hari setiap minggu terlepas (maks 30 hari) melalui COMPENSATION_GRANT, konsisten untuk kohort terjejas.

### 5.6 Kod tebus

- **Format:** 12 aksara rawak Crockford base32 (abjad `0123456789ABCDEFGHJKMNPQRSTVWXYZ`, CSPRNG) + 1 aksara semak = 13 aksara, paparan `XXXX-XXXX-XXXX-C`. Entropi 60 bit. Risiko tekaan = N x percubaan / 2^60: dengan 1,000 percubaan dan 1,000 kod aktif kira-kira 8.7 x 10^-13 (80 bit: 8.3 x 10^-19); dengan 100,000 kod aktif 8.7 x 10^-11 (80 bit: 8.3 x 10^-17) (angka disemak). Untuk kad yang lebih banyak, 16 aksara rawak (80 bit) memberi margin lebih. **Bekukan panjang kod sebelum cetak komersial.**
- **Aksara semak:** pengesan kesilapan taip, bukan kawalan keselamatan. ChatGPT mengesyorkan Damm tetapi **tidak dapat mengesahkan** ia wujud untuk tertib 32. Keputusan algoritma dibuat melalui ujian lengkap (semua kesilapan satu aksara dan semua pertukaran bersebelahan dikesan), bukan dengan meneka.
- Produk **tidak** dalam bahagian rawak; jenis dipaparkan pada kad dan metadata batch.
- **Simpan MAC sahaja** (HMAC-SHA256, input `jalin-redeem-v1:<kod>`, kunci >= 256 bit dalam rahsia persekitaran, `key_id` untuk putaran). Kod bersih tidak disimpan di mana-mana.
- **Jana dan cetak dalam satu aliran:** kod bersih dihantar sekali melalui HTTPS ke pelayar admin, PDF dijana dalam pelayar, `Cache-Control: no-store`, tiada kod dalam URL, log atau storan pelayar. Batch: PENDING_PRINT > PRINT_CONFIRMED atau VOIDED. Respons terputus atau tab ditutup = batal batch dan jana ganti. Cetak semula = batal dan jana baharu (V1).
- **Kunci HMAC:** simpan dalam pengurus kata laluan ber-MFA dengan salinan luar talian, bukan dalam repo atau bersama sandaran DB. Kunci hilang = kod lama tidak boleh disahkan (ganti batch). Kunci bocor = henti tebus, nilai, batal kod berisiko, ganti kad.
- **Input:** terima huruf kecil, ruang, sengkang; O->0, I/L->1. Semua percubaan (termasuk checksum salah) dikira dalam had kadar: awal 5/akaun/15 minit, 20/IP/jam, had global (tala melalui ujian; IP berkongsi di sekolah/pejabat).
- **QR hanya ke `https://jalin.adjung.com/tebus`, tanpa kod.** Imbas tidak menggunakan kod. Pembeli log masuk, taip kod, tekan Tebus.

### 5.7 Aliran tebus (satu transaksi, tiada semakan awal)

- **Tiada endpoint "semak kod" berasingan** (orakel kesahan kod). Aliran: log masuk > lihat emel bertopeng > masukkan kod > "Tebus Kod" > satu transaksi atomik. Produk yang tercetak pada kad ialah apa yang pembeli lihat sebelum tebus. Orakel tidak hilang sepenuhnya (setiap cubaan ada hasil), jadi had kadar wajib kekal.
- Urutan `POST /api/tebus`: sesi pembaca, Origin/CSRF, bentuk dan saiz input, had kadar, normalisasi dan checksum, MAC untuk semua key_id sah; kemudian transaksi: semak kunci idempotensi, kunci baris akaun, kunci baris kod, semak issued dan belum revoked/redeemed, had timbunan, kira tempoh, INSERT redemption (code_id UNIQUE), INSERT GRANT (redemption_id UNIQUE), INSERT outbox, kemas kini unjuran, simpan hasil idempotensi, COMMIT. Emel, had kadar dan pemantauan di luar transaksi.
- Sambungan terputus selepas commit: permintaan berulang dengan kunci idempotensi sama memulangkan kejayaan asal.
- **Mesej awam:** satu mesej umum untuk tidak sah, tiada, sudah digunakan, belum aktif, dibatalkan: "Kod tidak dapat ditebus. Semak kod pada kad atau hubungi sokongan Jalin." Berjaya: "Kod berjaya ditebus. Keahlian anda aktif sehingga [tarikh dan waktu MYT]."
- **Suis Hentikan Penebusan** disimpan dalam DB dan disemak di pelayan (bukan pembolehubah env), tanpa deploy; tidak menjejaskan ahli sedia ada.
- Amaran kepada Izzat (digabung ikut insiden): >= 20 percubaan gagal dalam 10 minit; >= 3 cubaan kod belum aktif berkaitan satu batch dalam 30 minit; >= 5 ralat pelayan dalam 10 minit; OTP melonjak; sebarang ketidakpadanan lejar.

### 5.8 Kad fizikal, inventori dan pengaktifan

- **Dua identiti:** nombor siri awam (contoh format `JLN-27-000123`, bukan muktamad) untuk inventori; kod rahsia untuk tebus (di bawah pelekat calar atau dalam sampul).
- Status berasingan: **sold** (inventori), **issued** (kod boleh ditebus), **redeemed** (rekod tebus). Jangan disatukan.
- **Pengaktifan ikut saluran:** jualan sendiri = aktif satu siri semasa jualan; acara = kelompok kecil sebelum sesi; pengedar = aktif ikut laporan jualan harian (CSV atau borang; WhatsApp bukan satu-satunya rekod), atau stok pradiaktif kecil (~20 kad) ditanda risiko lebih tinggi; pos dalam talian = aktif semasa pesanan disahkan hantar. **Jangan aktifkan semua kad sebaik diserah kepada pengedar.**
- Kad hilang/rosak/dipulangkan/dicuri: peristiwa inventori masing-masing; kad ganti hanya selepas semak bukti (siri dan resit boleh disalin); jika kod lama belum ditebus, batal dan jana baharu; jika sudah ditebus, tiada hak kedua tanpa siasatan dan audit.
- Rekonsiliasi: tunjuk jumlah mengikut peringkat pergerakan dan mengikut status semasa **berasingan** (bukan kategori eksklusif). Kekerapan: tiap batch 50 kad; mingguan 500; harian 5,000 ketika pengedaran aktif.
- Kandungan kad: nama produk, kod dan siri berasingan, QR ke /tebus, arahan 3 langkah, sokongan, terma ringkas dan pautan penuh, tarikh akhir tebus jika dasar ada. Harga tidak wajib dicetak (maklumat harga jelas semasa jualan; PERLU DISAHKAN). Nama pengedar tidak dicetak.

### 5.9 Pencetakan

- **Syor V1: PDF saiz tepat dijana dalam pelayar** (pdf-lib atau serupa; milimeter, fon terbenam, QR vektor), dicetak pada Actual Size 100%. CSS `window.print()` kurang boleh diramal. Cetak mentah (ZPL/TSPL/ESC-POS melalui WebUSB) hanya jika model pencetak disahkan dan pengeluaran melebihi ~500 label sesi; jika digunakan, longgarkan `usb=()` terhad pada laluan admin sahaja.
- **Bahan label:** direct thermal sensitif terhadap haba, cahaya dan geseran (rujukan Zebra oleh ChatGPT: PERLU DISAHKAN). Jangan lekat pelekat calar biasa terus pada kertas haba. Untuk percubaan 50 kad: kod bercetak laser dalam sampul legap, atau label A4 laser.
- **Pemisahan fizikal:** QR ke /tebus dan nombor siri pada permukaan kad yang kekal; kod rahsia di bahagian terlindung atau dalam sampul.
- Tipografi: monospace >= 11-12 pt (sasaran ujian), dua baris jika perlu. QR ~25-30 mm termasuk kawasan senyap, hitam atas putih, ECC M/Q (rujukan DENSO WAVE: PERLU DISAHKAN).
- **Ujian fizikal wajib (Izzat sendiri):** cetak 20 label dengan kod palsu; semak ukuran dan marj; imbas QR dengan tiga telefon (termasuk lama, cahaya malap); taip semua kod; simpan seminggu dalam beg dan uji geseran; uji cahaya, lembap, haba sederhana berasingan; uji lapisan calar; ulang selepas 30 hari. Lulus: 20/20 jelas, semua QR boleh diimbas, tiada kerosakan. Ujian seminggu atau 30 hari tidak membuktikan ketahanan 12 bulan.
- **Jangan beli pencetak haba atau cetak kod aktif sebelum ujian bahan dan model selesai.**
- Cetakan pihak ketiga: anggap fail kod sebagai rahsia bernilai (kawalan akses, larangan salinan, pemusnahan).

### 5.10 Admin (4 ruang kerja + kecemasan)

Admin > Langganan > **Ringkasan | Kad & Batch | Pembaca | Operasi & Audit**, ditambah halaman Kecemasan (owner sahaja). Tiada skrin pengedar berasingan V1 (pengedar = medan saluran + import CSV). Tindakan pukal: pratonton (layak, sudah aktif, dibatalkan, tak jumpa), taip pengesahan, tiada kejayaan separa tanpa laporan.

Kebenaran baharu pada `permissions.ts`: `subscription.view`, `voucher.issue`, `voucher.activate`, `entitlement.grant`, `entitlement.revoke`, `subscription.emergency`; semak di setiap endpoint pelayan (menu tersembunyi bukan kawalan). **Staf editorial tiada kuasa langganan dan tidak nampak emel atau kemajuan bacaan.** Tiada sesiapa boleh lihat kod bersih selepas pengeluaran. Pengganti kelulusan dua orang untuk pengasas tunggal: pengesahan semula, taip frasa pengesahan, sebab wajib, notifikasi kepada owner.

Wajib sebelum kad pertama dijual: carian siri, jana/cetak/sahkan batch, batal/aktifkan, carian akaun terhad, beri/batal hak, audit, semakan baki, suis kecemasan, prosedur sokongan. Ditangguh: carta, push, portal pengedar, app imbas khas, laporan kewangan automatik, eksport peribadi pukal.

Prosedur sokongan (setiap satu ada senarai semak dan templat jawapan BM dalam log sesi 12): tak terima OTP; kod ditolak (guna nombor siri, jangan minta kod penuh); kod ditebus akaun salah; kad rosak; pulangan; pengedar lapor jualan.

### 5.11 Akses awal dan dinding bayar

- Kunci di **pelayan sebelum dihantar** kepada pelayar; satu fungsi `canReadSection()` untuk semua laluan.
- Medan bab/episod: `published_at`, `members_only_until` (> published_at), `access_policy` (PUBLIC atau EARLY_ACCESS), `free_release_original_at` (dibekukan untuk audit). Tarikh buka percuma hanya boleh diawalkan, tidak dilewatkan selepas diumumkan. Sinopsis, dek, judul, kredit dan maklumat siri sentiasa awam.
- **Senarai semak kebocoran:** HTML awal; RSC/Flight payload (jangan hantar Markdown mentah dalam props); JSON-LD (tiada articleBody); OG/meta; sitemap; **carian dan /api/cari/cadangan (indeks dan petikan mesti ditapis)**; /api/koleksi-cerita; imej bab eksklusif; /pratonton; cetak dan salin; RSS masa depan; cache CDN (respons peribadi private, no-store).
- SEO (rujukan Google oleh ChatGPT: PERLU DISAHKAN): halaman metadata akses awal diindeks; JSON-LD `isAccessibleForFree: false` sepanjang akses awal; Googlebot menerima versi bukan ahli yang sama (tiada cloaking); tiada janji kedudukan.
- Jangan guna kuki bertandatangan sebagai sumber kuasa utama entitlement V1. Bab percuma tidak perlukan pertanyaan entitlement.
- **Ujian kenari CI:** rentetan unik dalam bab ujian terkunci diperiksa dalam HTML, RSC, JSON-LD, sitemap, carian, API, cache dan pratonton; CI gagal jika bocor.
- UX bukan ahli: "Episod ini boleh dibaca oleh ahli Jalin Plus sekarang dan akan tersedia percuma mulai [tarikh], [waktu] (MYT)", dengan butang Tebus dan Log masuk. Tiada pemasa desakan atau ancaman kehilangan akses. Tiada janji DRM.

### 5.12 Pengalaman pembaca (skrin)

Skrin: `/tebus`, `/log-masuk`, `/sahkan-emel`, `/tebus/berjaya`, `/akaun`. Header: pautan kecil "Log masuk" bertukar "Akaun" (menu mobile sedia ada); **tiada modal pendaftaran** ketika membaca karya percuma. Akaun Saya: 1 Langganan Saya, 2 Sambung Bacaan, 3 Karya Disimpan, 4 Tetapan Bacaan, 5 Lagi > Privasi dan Data, 6 Lagi > Keselamatan. Tiada statistik tabiat atau profil sosial. Teks BM lengkap untuk semua keadaan ada dalam log sesi 15 (nada tenang; larangan "Jangan terlepas", pemasa, amaran berlebihan).

Kebolehcapaian: sasaran sentuh 44 px, label kelihatan, aria-live, bukan warna sahaja, tema gelap, zum 200%. Enam senario ujian dengan 5 orang bukan teknikal; sasaran 4/5 tanpa bantuan, median < 90 saat (sasaran reka bentuk, BELUM DIUJI).

### 5.13 Operasi, kebolehpercayaan dan kos

- Cron **bukan** prasyarat log masuk, tebus atau tamat langganan (semua berdasarkan transaksi dan waktu pelayan). Cron hanya untuk penyelenggaraan dan semakan integriti. OTP dihantar segera; emel selepas tebus melalui outbox.
- Neon: pooled connection yang menyokong transaksi Kysely; indeks wajib; sasaran p95 awal (BELUM DIUJI): 500 pembaca/hari < 800 ms, 5,000 < 1,200 ms; ujian k6.
- **Bahaya restore DB:** memulihkan DB ke masa lalu boleh menghilangkan rekod tebus sedangkan kad fizikal masih ada: kod boleh ditebus dua kali. Sebelum membuka semula tebus selepas restore, bandingkan rekod transaksi, audit dan salinan bebas; **kekal tertutup jika integriti tak terbukti.** Eksport MAC berkala luar DB masih ada jurang masa: perlu rekonsiliasi dan dasar fail-closed. Sahkan PITR dan pelan Neon sebenar.
- Semakan integriti harian automatik: unjuran == bina semula; redemption tanpa grant; batch ada jumlah tepat; kod dibatal tak ditebus selepas batal; cron terakhir selesai; outbox tertunda.
- Persekitaran: staging dengan Neon branch berasingan, HMAC berlainan, emel sandbox; feature flag setiap modul; jangan salin emel pembaca sebenar.
- Kos bulanan simulasi (formula, bukan sebut harga): ~RM3-780/bulan termasuk emel, Neon, Vercel, domain, cetakan, sokongan; tidak termasuk penghasilan karya atau pembangunan.

## 6. Model ancaman ringkas

12 ancaman teratas (sesi 19): 1 agen atau pembangun tersilap menulis DB produksi (kritikal); 2 akaun admin diambil alih (kritikal); 3 rahsia bocor melalui log, repo atau alat AI (kritikal); 4 kod cetakan bocor atau dicuri; 5 teks akses awal bocor melalui carian atau RSC; 6 tebusan berganda selepas restore; 7 bot merentas akaun/IP; 8 akaun pembaca diambil alih melalui emel; 9 CSRF; 10 kebergantungan npm dikompromi; 11 pengedar atau staf salah guna pengaktifan; 12 kegagalan OTP atau emel. Pembetulan 1-3 sebelum pembangunan berisiko, 4-10 sebelum jualan, 11-12 sebelum pengedaran berkembang.

Jika DB atau env bocor: DB sahaja = emel dan MAC terdedah (putar kredensial, semak log); DB + kunci HMAC = penyerang boleh menguji calon kod luar talian (putar kunci, henti tebus, ganti batch); env + akses jalan kod = anggap kompromi serius (putar semua).

Ujian keselamatan: OWASP ASVS Tahap 1 sebagai rujukan (bukan pensijilan), npm audit, imbasan rahsia CI, Semgrep, OWASP ZAP pada staging, Playwright (pembaca tidak boleh memanggil API admin; CSRF salah ditolak), 20 tebus serentak, serangan berbilang akaun/IP, kenari, simulasi kehilangan respons dan restore. Jika ada bajet, bayar penilai luar untuk auth/admin, tebus serentak dan kawalan akses.

## 7. Perniagaan dan pematuhan (PERLU DISAHKAN PROFESIONAL)

Soalan untuk akauntan dan peguam (keutamaan P0): bilakah hasil diiktiraf (jual, tebus atau sepanjang tempoh); adakah langganan tertakluk pada SST, ambang pendaftaran; keperluan e-Invois, resit dan rekod pengedar; hak pembeli apabila kod gagal atau manfaat berubah; bolehkah kad belum ditebus ada tarikh luput. P1: rekod liabiliti kad belum ditebus; pengedar sebagai ejen berkomisen atau membeli semula; bawah umur dan kad hadiah; kesesuaian entiti Adjung, pendaftaran perniagaan dan akaun bank. Bawa: identiti penjual, contoh kad, harga, terma, carta aliran tebus, kontrak pengedar, tempoh, contoh rekod jual-tebus-pulang.

Dasar terma (tajuk keputusan, bukan klausa): produk = keahlian akses awal bukan pemilikan karya; tempoh bermula selepas tebus; tiada pembaharuan automatik V1; kod belum ditebus (tempoh sah dan penggantian); pulangan (bezakan belum tebus, sudah tebus, perkhidmatan gagal; **ChatGPT menolak polisi mutlak "tiada pulangan selepas tebus"**, PERLU DISAHKAN); penggantungan; perubahan manfaat; kad hadiah (penerima buat akaun sendiri); umur.

Model unit hipotesis (aritmetik disemak; BELUM DIUJI): anggap kos kad RM2, komisen pengedar 20%, pembangunan RM4,000 sebagai andaian. Harga ujian RM10/35/60 untuk 1/6/12 bulan memberi margin sumbangan RM5, RM24.50, RM44 setiap kad; kad untuk menampung RM4,000 ialah 800, 164, 91. Rumus: M = P - C_kad - C_komisen - C_operasi - C_pos; N = ceil(4000 / M). Ini margin tunai, **bukan** keuntungan: tidak termasuk kos editorial setahun, stok tidak terjual, pulangan dan masa Izzat. Laporkan dua angka berasingan.

Kad fizikal berbanding bayaran dalam talian: kad dahulu hanya jika ada saluran fizikal yang boleh diuji. Jika pembeli kebanyakan dalam talian dan kos pos/sokongan tinggi, bayaran dalam talian (penyedia berhos, jangan bina pemprosesan kad sendiri; skop PCI perlu disahkan) mungkin lebih ekonomik.

## 8. Fasa pembinaan dan kriteria "siap"

Setiap fasa memerlukan **demonstrasi sebenar, keputusan ujian tersimpan dan pengesahan Izzat.** Status "selesai" daripada agen AI sahaja tidak mencukupi.

| Fasa | Usaha relatif | Kriteria penerimaan (boleh dilihat Izzat) |
|---|---|---|
| **0 Keputusan dan perlindungan produksi** | Sederhana | 10 keputusan direkod; DB pembangunan diasing dan skrip mutasi menolak DB produksi; admin diaudit dengan bukti; pelan Vercel/Neon disahkan; penyedia emel dipilih; label laser dan sampul diuji |
| 1 Tetapan bacaan setempat | Kecil-sederhana | 5 saiz, 3 jarak, 3 lebar, 3 tema kekal selepas tutup dan buka; tidak merosakkan ilustrasi atau nota kaki; lulus zum 200%; demo tanpa log masuk |
| 2 Akaun dan sambung bacaan (2A identiti, 2B kemajuan) | **Sangat besar** | Daftar/log masuk OTP; log keluar; simpan karya; sambung bab (dan kedudukan jika ID blok siap); eksport dan padam data; tetapan diselaras; demo dua telefon |
| 3 Lejar dan admin asas | Besar | Cari pembaca; beri 1 bulan manual; tarikh tamat tepat; tambah 6 bulan; batal grant tertentu; audit; bina semula unjuran tanpa perubahan; demo kes 31 Januari |
| 4 Enjin kod (kod UJIAN sahaja) | **Sangat besar** | Kod dijana; tebus sekali; salah ditolak; dua klik tak gandakan; suis kecemasan; kunci lama selepas putaran; **restore DB tak gandakan grant**; 20 tebus serentak |
| 5 Kad dan inventori (kad ujian, tiada nilai komersial) | Besar | PDF tepat; sahkan batch; cari siri; aktifkan; batal rosak; rekonsiliasi 50 kad ujian; rekod kehilangan; demo 50 kad fizikal tanpa jualan |
| 6 Akses awal dan keselamatan | **Sangat besar** | Ahli baca episod awal; bukan ahli nampak dek sahaja; tarikh buka dipaparkan; selepas tarikh semua boleh baca; carian tak bocor; JSON-LD dan RSC bersih; sesi tamat halang akses baharu |
| **7 Pelancaran terkawal dan penilaian** | Sederhana | 5 pengguna dalaman lulus; 4 minggu jadual dipatuhi; 50 kad 1 bulan dijual sendiri; rekod jual dan tebus sepadan; keputusan teruskan, laras atau hentikan |

**Jualan sebenar hanya bermula di Fasa 7**, bukan Fasa 5 (pembeli tidak patut membayar untuk manfaat yang belum berfungsi).

Laluan kritikal ke jualan pertama: 0 > 2 > 3 > 4 > 5 > 6 > 7. Fasa 1 boleh selari dengan audit Fasa 0. Fasa 4 tidak boleh mendahului Fasa 3. Fasa 5 dan 6 boleh selari selepas kontrak data muktamad. ID blok boleh ditangguh jika V1 hanya sambung ikut bab. Bahagian paling mungkin tersasar: Fasa 2, 4 dan 6.

Strategi ujian: unit TypeScript (tarikh, checksum, normalisasi, dasar akses, peralihan keadaan); integrasi pada Postgres **sebenar** (Neon branch ujian, data sintetik; kunci baris, 20 transaksi serentak, rollback, indeks unik); Playwright untuk aliran pembaca dan admin; kenari CI; k6; ujian restore. Pipeline mesti menolak DATABASE_URL produksi untuk ujian yang mengubah data.

Gate: G0 audit dan keputusan lengkap; G2 akaun selamat dan data boleh dieksport/dipadam; G3 lejar boleh dibina semula tepat; G4 tiada tebus berganda termasuk selepas restore; G5 50 kad ujian sepadan dengan inventori; G6 semua ujian kenari lulus dan stok editorial tersedia; GO LIVE: lima pengguna dalaman lulus, penerimaan Izzat, pelan komersial dan pematuhan disahkan. Rollback melalui feature flag; jangan rollback skema secara merosakkan selepas akaun atau grant sebenar wujud (migrasi serasi ke belakang, pembetulan ke hadapan); kod fizikal yang sudah diedar tidak boleh ditarik balik.

## 9. Keputusan yang hanya Izzat boleh buat

**Sebelum Fasa 1**
1. Asingkan DB pembangunan daripada produksi? (syor: wajib)
2. Kekalkan semua karya sedia ada percuma? (syor: ya)
3. Teruskan Jalin Plus sebagai eksperimen, bukan produk tetap, dan terima pilihan untuk tidak membinanya selepas Fasa 0? (syor: ya)

**Sebelum Fasa 2**
4. OTP emel sebagai kaedah masuk utama; pembeli tanpa emel tidak boleh menebus V1? (syor: ya)
5. Sambung bacaan tepat perenggan wajib V1? (syor: tidak, ikut bab dahulu)
6. Tempoh "ingat saya", siapa admin pemulihan akaun, bajet emel.

**Sebelum Fasa 4**
7. Kod 60 atau 80 bit? (syor: 80 bit jika format kad belum dimuktamadkan; jangan ubah selepas cetak)
8. Kod tidak boleh diperiksa sebelum ditebus? (syor: tiada semakan awal)
9. Penebusan dihentikan jika integriti DB diragui? (syor: ya)

**Sebelum jualan**
10. Percubaan pertama: 50 kad satu bulan, dijual sendiri, tanpa pengedar dan tanpa komisen, hanya selepas 8 episod siap dan 4 minggu jadual dipatuhi? (syor: ya)
11. Harga percubaan, entiti penjual dan resit, dasar pulangan, kad luput dan gangguan perkhidmatan (selepas nasihat profesional).
12. Polisi kad hilang dan rosak, siapa boleh mengaktifkan, membatalkan dan mengesahkan stok, dan had laporan lewat pengedar.
13. Dasar ilustrasi eksklusif dan sama ada halaman akses awal diindeks.

## 10. Andaian yang masih boleh membatalkan pelan, dan cara menguji paling murah

| Andaian belum terbukti | Ujian paling murah |
|---|---|
| Pembaca mahu membayar untuk akses 7 hari lebih awal | Tinjau pembaca siri yang benar-benar aktif; tanya kesanggupan membayar |
| Izzat mampu menerbitkan setiap minggu | Jalankan 4 minggu jadual sebenar tanpa menjual |
| Pembaca kembali mengikuti siri | Ukur bacaan berulang secara minimum dan berasaskan persetujuan |
| OTP tidak menyusahkan pembeli | Uji lima orang menggunakan telefon sendiri |
| Kad fizikal ada margin munasabah | Rekod kos sebenar 20-50 kad contoh |
| Kad laser dalam sampul cukup tahan | Ujian bahan, simpanan dan kebolehbacaan fizikal |
| Sistem boleh pulih tanpa grant berganda | Simulasi restore pada DB ujian dengan rekod luaran |
| Izzat sanggup mengurus sokongan, stok dan penerbitan | Catat minit kerja sebenar setiap minggu selama sebulan |

Andaian 1 dan 2 paling menentukan: jika pembaca tidak menghargai akses awal, keselamatan teknikal yang sempurna tidak menjadikan Jalin Plus berdaya maju.

## 11. Dua minggu pertama yang paling bernilai (sprint pengurangan risiko, bukan sprint langganan)

| Hari | Kerja | Hasil |
|---|---|---|
| 1-2 | Asingkan DB; jadikan skrip mutasi gagal jika sambungan ke produksi | Jalin produksi dilindungi |
| 3-4 | Audit ADMIN_SECRET, sesi admin, env, fail konfigurasi dan akses agen; catat bukti | Status keselamatan admin diketahui |
| 5-7 | Pilih siri utama; jadualkan empat episod; kira episod yang benar-benar lulus semakan | Jadual editorial nyata |
| 8-10 | Tunjuk konsep Plus kepada sekurang-kurangnya lima pembaca Jalin; tanya kesanggupan membayar | Maklum balas awal |
| 11-14 | Cetak 10 kad palsu (laser + sampul); uji imbas dan baca; rekod kos; laporan keputusan satu halaman | Kos kad dan keputusan go/no-go |

Semua ini berguna walaupun Jalin Plus akhirnya dibatalkan.

## 12. Pelan keluar yang jujur

Hentikan jualan kad baharu jika: dua episod mingguan berturut-turut gagal diterbitkan; penampan editorial jatuh di bawah dua episod siap; masalah tebus sah berulang tanpa penyelesaian; tiada bukti penggunaan manfaat selepas percubaan 50 kad. Jika jualan dihentikan: manfaat pelanggan sedia ada dihormati sehingga tamat; jika manfaat tak dapat disediakan, tawarkan pelanjutan atau penyelesaian kewangan yang munasabah (hak pengguna perlu disahkan profesional); kad belum ditebus ditangani mengikut dasar yang diluluskan; karya percuma tidak terjejas. Jangan menilai kegagalan kandungan hanya daripada kadar jualan (mungkin harga, lokasi atau penerangan produk).

## 13. Muka surat keputusan go/no-go (templat, diisi oleh Izzat)

| Gerbang | Status | Bukti ujian (pautan) | Risiko terbuka |
|---|---|---|---|
| G0 audit dan keputusan | | | |
| G2 akaun selamat | | | |
| G3 lejar boleh dibina semula | | | |
| G4 tiada tebus berganda (termasuk restore) | | | |
| G5 50 kad ujian sepadan | | | |
| G6 kenari lulus dan stok editorial | | | |
| GO LIVE | | | |

Diluluskan oleh: ______ (nama), tarikh: ______. Laporan agen AI tidak dianggap kelulusan Izzat.

## 14. Apa yang ChatGPT tersilap atau tidak pasti (untuk kejujuran)

- ChatGPT menganggap Jalin menyasar remaja pada sesi 1; dibetulkan: Jalin terbuka kepada semua pembaca.
- ChatGPT mencadangkan checksum "Crockford mod 37" yang memerlukan simbol di luar abjad kod, dan kemudian Damm tertib 32 yang beliau akui tidak dapat disahkan. Keputusan diserahkan kepada ujian lengkap.
- ChatGPT mencadangkan semakan awal kod sebelum tebus; dibantah dan ditarik balik pada sesi 19.
- Rujukan luar (PDPA/JPDP, Vercel, Neon, Zebra, DENSO WAVE, Google, MDN) datang daripada ChatGPT dan **belum disemak sendiri**.
