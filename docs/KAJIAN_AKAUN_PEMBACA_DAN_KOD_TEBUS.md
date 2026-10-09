# Kajian dan pelan: akaun pembaca, tetapan bacaan, Jalin Plus dan kod tebus

**Versi 4, 9 Okt 2026: MODEL PERNIAGAAN DIBETULKAN (lihat bahagian 16; ia mengatasi bahagian 2, 7 dan 15 yang menganggap langganan ialah produk jualan).** Jalin bukan perniagaan langganan: ia ialah manfaat pemasaran dan pengekalan pelanggan untuk produk syarikat Izzat (setiap pembelian = akses Jalin 12 bulan). Tiada "Jalin Plus". Versi 3, 9 Okt 2026. Status keseluruhan: **model produk telah diputuskan oleh Izzat pada 9 Okt 2026 (bahagian 14) dan dokumen ini ditulis semula mengikutnya. Pelan teknikal masih cadangan; tiada kod ditulis, tiada skema diubah.** Versi 2 (8 Okt) menggunakan model "akses awal 7 hari" yang telah **digugurkan**.
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

**DIPUTUSKAN** (oleh Izzat, 9 Okt 2026): ditanda dalam bahagian 14. Selain itu, semua masih cadangan.

## 1. Keputusan terpenting: ini mengubah janji produk (DIPUTUSKAN oleh Izzat)

| Dokumen | Hari ini | Kesan |
|---|---|---|
| `PRODUCT.md` (Access) | "Semua kandungan percuma ketika pelancaran." | **Mesti dipinda**: kandungan untuk pembaca berdaftar sahaja; percubaan 14 hari; kemudian langganan. |
| `MVP_MASTER_PLAN.md` | Paid subscription dan paywall bukan MVP. | Mesti ditanda fasa selepas MVP. |
| `PRODUCT.md` (Accounts) | Akaun asas: simpan, sejarah, sambung bacaan. Tiada profil sosial. | "Profil" dihadkan kepada profil peribadi. |
| `AGENTS.md` | Jalin terbuka kepada semua pembaca (peraturan Produk) dan peraturan 1 (jangan ubah keputusan produk yang dilock tanpa arahan manusia). | Arahan Izzat 9 Okt 2026 membenarkan perubahan; **pindaan rasmi kedua-dua dokumen perlu dibuat sebelum Fasa 1** (belum dibuat). |

## 2. Apa yang dijual: akses pembaca berdaftar dengan percubaan 14 hari dan langganan (DIPUTUSKAN; bahagian ini dipinda oleh bahagian 16: langganan ialah manfaat yang disertakan dengan pembelian produk, bukan produk jualan utama)

**Model (Izzat, 9 Okt 2026):**
- Jalin ialah platform untuk **pembaca berdaftar**. Pelawat belum daftar nampak halaman pengenalan dan 3-6 karya teaser pilihan Izzat ("macam Netflix"); selebihnya perlu daftar.
- **Percubaan percuma 14 hari bermula apabila akaun didaftar.**
- Selepas trial tanpa langganan: pembaca nampak senarai karya dan sinopsis sahaja; tidak boleh membaca teks penuh.
- **Langganan:** 1 bulan RM15, 6 bulan RM30, 1 tahun (12 bulan) RM50. Dibeli melalui kad fizikal berkod (bahagian 5.6-5.9), ditebus selepas log masuk.
- Setiap akaun maksimum 2 peranti aktif (gaya Adobe, bahagian 5.2).

**Perkara percuma untuk pembaca berdaftar sentiasa (DICADANGKAN):** tetapan bacaan, simpan karya, glosari asas, kredit dan sumber, eksport dan padam data sendiri. Sambung bacaan ialah ciri akaun (tidak bermakna tanpa akses bacaan).

**Kontrak kepercayaan pembaca (DICADANGKAN):** trial 14 hari dipaparkan jelas semasa daftar; tarikh tamat trial dan baki langganan sentiasa kelihatan; manfaat berbayar dilabel jelas sebelum beli; tiada pembaharuan automatik; pembaca yang tamat trial masih boleh log masuk, melihat senarai karya dan menebus kod.

**Perkara yang perlu dilihat Izzat dengan jelas (nombor, bukan pendapat):**
- Harga setiap bulan: 1 bulan RM15; 6 bulan RM30 = RM5 sebulan; 12 bulan RM50 = kira-kira RM4.17 sebulan. Diskaun berbanding bulan tunggal ialah 67% dan 72%. Kebanyakan pembeli rasional akan memilih 6 atau 12 bulan; pendapatan sebenar bergantung pada campuran pembelian, bukan RM15.
- **Risiko jalan buntu:** daftar dan trial akan bermula sebaik pendaftaran dibuka, tetapi kad hanya boleh dijual selepas Fasa 7. Jika dinding bayar dihidupkan sebelum kad boleh dibeli, pembaca yang trialnya tamat tidak ada cara membayar. Syor: **dinding bayar dan pendaftaran wajib dihidupkan serentak dengan jualan kad pertama**, atau trial hanya bermula pada tarikh dinding bayar hidup.
- Langganan 12 bulan menjual keyakinan terhadap terbitan masa depan. Jangan jual tempoh panjang jika jadual tidak boleh dijamin; syarat 8 episod siap + 4 minggu jadual terpelihara sebelum jualan pertama (Izzat telah menerima).
- Kesan SEO: karya yang memerlukan daftar tidak boleh diindeks untuk teks penuh; hanya halaman pengenalan dan teaser dicari Google. Ini mengurangkan trafik organik dan perlu diterima secara sedar.
- AGENTS.md menyatakan Jalin tidak menyempitkan audiens kepada umur tertentu; dinding daftar tidak mengubah itu, tetapi bawah 18 dan PDPA perlu disahkan peguam (bahagian 5.3).

**Syarat sebelum menjual (BELUM DIUJI):** sekurang-kurangnya 8 episod siap dan lulus semakan editorial; empat minggu terbit mengikut jadual; tinjau 5 pembaca tentang kesanggupan membayar RM15/30/50.

**Pilihan jujur:** selepas Fasa 0 Izzat boleh memutuskan untuk tidak meneruskan (eksperimen, DIPUTUSKAN boleh dibatalkan).

### Mesej kad (draf, DICADANGKAN)

> Jalin, Langganan 1 Bulan. Tebus kod ini di jalin.adjung.com/tebus selepas log masuk untuk membaca semua karya Jalin selama 1 bulan. Ini bukan pembelian atau pemilikan karya. Tempoh bermula apabila kod ditebus.

Ayat terlarang: "Akses selamanya", "Baca tanpa had" jika ada had peranti, "Menyokong penulis secara langsung" tanpa mekanisme sebenar, janji kekerapan episod yang tidak mampu dipenuhi. AI tidak dijadikan tarikan pemasaran.

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

- **Log masuk (DIPUTUSKAN: OTP emel sahaja):** kod 6 digit sekali guna melalui emel (OTP). Tolak kata laluan V1. Google fasa berikut. Tangguh pautan sihir dan telefon/WhatsApp. **Batasan:** pembeli tanpa emel aktif tidak boleh menebus V1 (Izzat terima atau biayai kaedah lain).
- **OTP:** CSPRNG; sah 5 minit; maks 5 cubaan setiap cabaran; hantar semula jeda 60 saat; maks 5 hantaran/jam/emel; had IP dan kuota global; disimpan sebagai HMAC-SHA256 berkunci terikat ID cabaran; sekali guna dan atomik; respons sama untuk emel berdaftar dan tidak (termasuk status HTTP dan masa); tiada OTP dalam log atau dipulangkan ke pelayar.
- **Penyedia emel:** pilih dan sahkan domain penghantar (SPF, DKIM, DMARC), uji Gmail/Yahoo/Outlook **sebelum** bina login. Soalan untuk penyedia: had, kos, bounce, lokasi data.
- **Sesi (DIPUTUSKAN: gaya Adobe, maksimum 2 peranti aktif):** kuki `__Host-jalin-reader` (HttpOnly, Secure, SameSite=Lax, tanpa Domain), hash token di DB, peranti kekal log masuk sehingga pembaca log keluar (tiada tamat tempoh tetap), Origin/CSRF. Jadual `reader_devices` (peranti, nama paparan, terakhir aktif). Log masuk peranti ketiga: pembaca mesti memilih satu daripada dua peranti lama untuk dilog keluarkan dahulu; peranti dilog keluar hilang sesi serta-merta. Sediakan "log keluar semua peranti". Had peranti bukan DRM: ia hanya mengehadkan perkongsian akaun secara kasual. **Jangan guna semula `jalin-admin-session`.**
- **Pemulihan (DIPUTUSKAN: Izzat sendiri melalui emel sokongan semasa percubaan):** pemilikan kad bukan bukti ambil alih akaun. Tukar emel perlu sesi sah + sahkan alamat baru + beritahu alamat lama. Emel hilang = bekukan perubahan sensitif; hanya admin berkebenaran khas boleh memindahkan hak, dengan audit.
- **Sambung bacaan (DIPUTUSKAN: ikut bab/entri sahaja untuk V1; kedudukan tepat perenggan ditangguh):** reka bentuk penuh di bawah hanya untuk fasa kemudian. Simpan work_id, section_id, block_id, offset_ratio, revision_id, updated_at; **bukan peratus tatal** (itu hanya untuk garis kemajuan). Simpan per peranti; tawar "Sambung dari tempat terakhir" dan "Mula dari awal"; jangan tatal automatik. Debounce 5-10 saat, visibilitychange/pagehide, salinan setempat dahulu. **Prasyarat:** ID blok stabil dalam pipeline kandungan (belum ada). Jika ditangguh, V1 hanya sambung ikut bab dan tidak mendakwa kedudukan tepat.
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
- **Penindanan:** `start = max(now, tamat semasa)` untuk skop sama (trial dikira sebagai tempoh sama untuk tujuan ini); had 24 bulan baki; kod ditolak kerana had kekal boleh ditebus; tiada tempoh ihsan V1.
- **Pembatalan satu grant tidak menggerakkan grant seterusnya.** Jurang dibetulkan admin dengan peristiwa baharu, bukan pengiraan semula tersembunyi.
- Kebenaran: sokongan hanya siasat; langganan beri/laras dalam had; batal dan pindah kebenaran lebih tinggi dengan audit.
- `rebuildEntitlements` mesti deterministik: jalan 100 kali sama; unjuran produksi == bina semula. Penguncian per akaun (`SELECT ... FOR UPDATE`), urutan kunci konsisten.
- **Percubaan percuma 14 hari (DIPUTUSKAN):** jenis peristiwa lejar `TRIAL_GRANT` dicipta sekali semasa akaun didaftar (satu akaun satu trial; padam akaun dan daftar semula dengan emel sama tidak mendapat trial kedua, simpan cap emel dalam jadual trial berasingan). Tempoh 14 hari kalendar penuh dari pendaftaran. Tebus kod semasa trial: **DICADANGKAN** kod bermula serta-merta dan trial tidak ditambah (lebih mudah dijelaskan); jika Izzat mahu trial dihabiskan dahulu, ubah peraturan penindanan. Pembaca sentiasa nampak "Trial tamat pada ..." dan "Langganan tamat pada ...".
- Episod terlepas jadual: umum pada hari sama; pampasan pelanjutan 7 hari setiap minggu terlepas (maks 30 hari) melalui COMPENSATION_GRANT, konsisten untuk kohort terjejas.

### 5.6 Kod tebus

- **Format:** 12 aksara rawak Crockford base32 (abjad `0123456789ABCDEFGHJKMNPQRSTVWXYZ`, CSPRNG) + 1 aksara semak = 13 aksara, paparan `XXXX-XXXX-XXXX-C`. Entropi 60 bit. Risiko tekaan = N x percubaan / 2^60: dengan 1,000 percubaan dan 1,000 kod aktif kira-kira 8.7 x 10^-13 (80 bit: 8.3 x 10^-19); dengan 100,000 kod aktif 8.7 x 10^-11 (80 bit: 8.3 x 10^-17) (angka disemak). Untuk kad yang lebih banyak, 16 aksara rawak (80 bit) memberi margin lebih. **DIPUTUSKAN: 12 aksara (60 bit).** Bekukan panjang kod sebelum cetak komersial; had kadar ketat wajib kerana margin entropi lebih kecil daripada 80 bit.
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

### 5.11 Dinding bayar untuk pembaca berdaftar

- Kunci di **pelayan sebelum dihantar** kepada pelayar; satu fungsi `canReadWork()` untuk semua laluan. Peraturan: pelawat belum daftar hanya nampak halaman pengenalan dan karya bertanda teaser; pembaca berdaftar dalam trial atau langganan aktif boleh baca; pembaca berdaftar tanpa akses nampak senarai dan sinopsis sahaja.
- Medan baharu pada karya: `access_policy` (PUBLIC_TEASER atau MEMBERS) dan `teaser_order`; Izzat memilih 3-6 teaser dalam admin.
- **Senarai semak kebocoran:** HTML awal; RSC/Flight payload (jangan hantar Markdown mentah dalam props); JSON-LD (tiada articleBody); OG/meta; sitemap; **carian dan /api/cari/cadangan (indeks dan petikan mesti ditapis)**; /api/koleksi-cerita; imej karya berkunci; /pratonton; cetak dan salin; RSS masa depan; cache CDN (respons peribadi private, no-store).
- SEO (rujukan Google oleh ChatGPT: PERLU DISAHKAN): halaman teaser boleh diindeks; teks karya berkunci tidak diindeks; jika perlu, data berstruktur `isAccessibleForFree: false` dan elak cloaking. Tiada janji kedudukan carian.
- Jangan guna kuki bertandatangan sebagai sumber kuasa utama entitlement V1.
- **Ujian kenari CI:** rentetan unik dalam karya berkunci diperiksa dalam HTML, RSC, JSON-LD, sitemap, carian, API, cache dan pratonton; CI gagal jika bocor.
- UX: pembaca tamat trial melihat "Trial anda tamat pada [tarikh]. Tebus kod langganan untuk terus membaca." dengan butang Tebus dan arahan di mana kad dibeli. Tiada pemasa desakan atau ancaman kehilangan akses. Tiada janji DRM.
- **Urutan pelancaran (penting):** pendaftaran wajib dan dinding bayar tidak boleh dihidupkan sebelum pembaca boleh membeli kad (Fasa 7), kerana trial 14 hari akan tamat tanpa jalan membayar.

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

Model unit (harga DIPUTUSKAN: RM15 / RM30 / RM50 untuk 1 / 6 / 12 bulan; aritmetik disemak; kos lain BELUM DIUJI): andaian kos kad RM2, tiada pengedar dan tiada komisen (Izzat jual sendiri), kos operasi dan pos diabaikan, pembangunan RM4,000 sebagai andaian. Margin sumbangan RM13, RM28 dan RM48 setiap kad; bilangan kad untuk menampung RM4,000 ialah 308, 143 dan 84. Dengan komisen pengedar 20% (jika kelak): margin RM10, RM22 dan RM38; kad untuk RM4,000: 400, 182 dan 106. Rumus: M = P - C_kad - C_komisen - C_operasi - C_pos; N = ceil(4000 / M). Ini margin tunai, **bukan** keuntungan: tidak termasuk kos editorial setahun, stok tidak terjual, pulangan dan masa Izzat. Laporkan dua angka berasingan. Jika semua pembeli pilih RM50, pendapatan setiap pembaca setahun ialah RM50, bukan RM180.

Kad fizikal berbanding bayaran dalam talian: kad dahulu hanya jika ada saluran fizikal yang boleh diuji. Jika pembeli kebanyakan dalam talian dan kos pos/sokongan tinggi, bayaran dalam talian (penyedia berhos, jangan bina pemprosesan kad sendiri; skop PCI perlu disahkan) mungkin lebih ekonomik.

## 8. Fasa pembinaan dan kriteria "siap"

Setiap fasa memerlukan **demonstrasi sebenar, keputusan ujian tersimpan dan pengesahan Izzat.** Status "selesai" daripada agen AI sahaja tidak mencukupi.

| Fasa | Usaha relatif | Kriteria penerimaan (boleh dilihat Izzat) |
|---|---|---|
| **0 Keputusan dan perlindungan produksi** | Sederhana | 10 keputusan direkod; DB pembangunan diasing dan skrip mutasi menolak DB produksi; admin diaudit dengan bukti; pelan Vercel/Neon disahkan; penyedia emel dipilih; label laser dan sampul diuji |
| 1 Tetapan bacaan setempat | Kecil-sederhana | 5 saiz, 3 jarak, 3 lebar, 3 tema kekal selepas tutup dan buka; tidak merosakkan ilustrasi atau nota kaki; lulus zum 200%; demo tanpa log masuk |
| 2 Akaun dan sambung bacaan (2A identiti, 2B kemajuan) | **Sangat besar** | Daftar/log masuk OTP; had 2 peranti dan log keluar peranti lama; trial 14 hari dicipta sekali; simpan karya; sambung ikut bab; eksport dan padam data; tetapan diselaras; demo dua telefon dan peranti ketiga |
| 3 Lejar dan admin asas | Besar | Cari pembaca; beri 1 bulan manual; tarikh tamat tepat; tambah 6 bulan; batal grant tertentu; audit; bina semula unjuran tanpa perubahan; demo kes 31 Januari |
| 4 Enjin kod (kod UJIAN sahaja) | **Sangat besar** | Kod dijana; tebus sekali; salah ditolak; dua klik tak gandakan; suis kecemasan; kunci lama selepas putaran; **restore DB tak gandakan grant**; 20 tebus serentak |
| 5 Kad dan inventori (kad ujian, tiada nilai komersial) | Besar | PDF tepat; sahkan batch; cari siri; aktifkan; batal rosak; rekonsiliasi 50 kad ujian; rekod kehilangan; demo 50 kad fizikal tanpa jualan |
| 6 Dinding bayar dan keselamatan | **Sangat besar** | Pelawat nampak pengenalan dan teaser sahaja; trial 14 hari boleh baca; tamat trial nampak senarai/sinopsis sahaja; ahli aktif boleh baca; carian tak bocor; JSON-LD dan RSC bersih; sesi tamat halang akses baharu |
| **7 Pelancaran terkawal dan penilaian** | Sederhana | 5 pengguna dalaman lulus; 4 minggu jadual dipatuhi; 50 kad 1 bulan dijual sendiri; rekod jual dan tebus sepadan; keputusan teruskan, laras atau hentikan |

**Jualan sebenar hanya bermula di Fasa 7**, bukan Fasa 5 (pembeli tidak patut membayar untuk manfaat yang belum berfungsi). **Pendaftaran wajib dan dinding bayar dihidupkan serentak dengan Fasa 7**, bukan lebih awal.

Laluan kritikal ke jualan pertama: 0 > 2 > 3 > 4 > 5 > 6 > 7. Fasa 1 boleh selari dengan audit Fasa 0. Fasa 4 tidak boleh mendahului Fasa 3. Fasa 5 dan 6 boleh selari selepas kontrak data muktamad. ID blok boleh ditangguh jika V1 hanya sambung ikut bab. Bahagian paling mungkin tersasar: Fasa 2, 4 dan 6.

Strategi ujian: unit TypeScript (tarikh, checksum, normalisasi, dasar akses, peralihan keadaan); integrasi pada Postgres **sebenar** (Neon branch ujian, data sintetik; kunci baris, 20 transaksi serentak, rollback, indeks unik); Playwright untuk aliran pembaca dan admin; kenari CI; k6; ujian restore. Pipeline mesti menolak DATABASE_URL produksi untuk ujian yang mengubah data.

Gate: G0 audit dan keputusan lengkap; G2 akaun selamat dan data boleh dieksport/dipadam; G3 lejar boleh dibina semula tepat; G4 tiada tebus berganda termasuk selepas restore; G5 50 kad ujian sepadan dengan inventori; G6 semua ujian kenari lulus dan stok editorial tersedia; GO LIVE: lima pengguna dalaman lulus, penerimaan Izzat, pelan komersial dan pematuhan disahkan. Rollback melalui feature flag; jangan rollback skema secara merosakkan selepas akaun atau grant sebenar wujud (migrasi serasi ke belakang, pembetulan ke hadapan); kod fizikal yang sudah diedar tidak boleh ditarik balik.

## 9. Keputusan yang hanya Izzat boleh buat (senarai asal v2; jawapan Izzat dalam bahagian 14)

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

## 14. Keputusan Izzat (9 Okt 2026)

**Perubahan model penting (bertentangan dengan syor asal bahagian 1 dan keputusan 2):** karya sedia ada TIDAK lagi kekal percuma untuk semua. Jalin menjadi platform untuk pembaca berdaftar: percubaan percuma 14 hari bermula pada pendaftaran akaun, kemudian langganan (kod tebus 1/6/12 bulan). Model "akses awal 7 hari" dalam bahagian-bahagian terdahulu perlu ditulis semula mengikut model ini sebelum Fasa 1. PRODUCT.md (semua kandungan percuma semasa pelancaran) dan AGENTS.md peraturan 1 perlu dipinda secara rasmi atas arahan Izzat.

| # | Keputusan | Jawapan |
|---|---|---|
| 1 | Asingkan DB pembangunan daripada produksi | Ya, wajib |
| 2 | Karya sedia ada | Hanya untuk pembaca berdaftar; trial 14 hari bermula bila daftar; selepas trial tanpa langganan: senarai karya + sinopsis sahaja, tak boleh baca |
| 3 | Jalin Plus / langganan sebagai eksperimen boleh dibatalkan selepas Fasa 0 | Ya |
| 4 | Log masuk | OTP emel sahaja; pembeli tanpa emel tak boleh tebus di V1 |
| 5 | Sambung bacaan | Ikut bab/entri sahaja |
| 6 | Sesi | Maksimum 2 peranti aktif bagi satu akaun (tempoh "ingat saya" dan pemulihan akaun belum diputuskan) |
| 7 | Panjang kod | 12 aksara (60 bit). Tidak boleh diubah selepas cetak. Pemeriksa teknikal perlu mengesahkan keselamatan pada skala sasaran dan had cubaan |
| 8 | Semak kod sebelum tebus | Tiada semakan awal |
| 9 | Henti tebus jika integriti DB diragui | Ya |
| 10 | Jualan percubaan pertama | 50 kad 1 bulan, dijual sendiri, selepas 8 episod siap dan 4 minggu jadual dipatuhi |
| 12 | Kad hilang/rosak | Tiada ganti jika hilang; ganti jika rosak dengan bukti dan kod belum ditebus |
| 13 | Pelawat belum daftar | Halaman pengenalan + beberapa karya pilihan (teaser); selebihnya perlu daftar ("macam Netflix") |

**Belum diputuskan:** harga; entiti penjual dan resit; dasar pulangan, kad luput dan gangguan perkhidmatan (perlu nasihat profesional); tempoh "ingat saya"; admin pemulihan akaun; bajet emel; karya mana jadi teaser; kesan SEO (karya tertutup tidak boleh dicari Google).

### Tambahan keputusan (9 Okt 2026, pusingan kedua)

| Perkara | Jawapan |
|---|---|
| Tempoh "ingat saya" | Gaya Adobe: peranti kekal log masuk sehingga pembaca log keluar; tiada tamat tempoh tetap (pemeriksa keselamatan perlu menilai risiko telefon hilang dan menyediakan "log keluar semua peranti") |
| Peranti ketiga | Pembaca mesti memilih satu daripada dua peranti aktif untuk dilog keluarkan sebelum peranti ketiga boleh masuk |
| Pemulihan akaun (OTP tak sampai) | Izzat sendiri melalui emel sokongan (cukup untuk percubaan 50 kad; nilai semula jika pengguna bertambah) |
| Karya teaser | Izzat pilih 3-6 karya dalam admin; perlu bendera teaser per karya |

**Masih belum diputuskan:** entiti penjual dan resit; dasar pulangan, kad luput dan gangguan perkhidmatan (perlu nasihat profesional); bajet emel.

### Harga dan trial (9 Okt 2026, diputuskan Izzat)

| Perkara | Keputusan |
|---|---|
| Percubaan percuma | 14 hari, bermula apabila akaun didaftar |
| Langganan 1 bulan | RM15 |
| Langganan 6 bulan | RM30 |
| Langganan 1 tahun | RM50 |

Bahagian 1, 2, 5.2, 5.5, 5.6, 5.11, 7 dan jadual fasa dalam versi 3 telah ditulis semula mengikut keputusan di atas. **Masih belum diputuskan:** entiti penjual dan resit; dasar pulangan, kad luput dan gangguan perkhidmatan (perlu nasihat profesional); bajet emel.

## 15. Semakan ChatGPT terhadap versi 3 (9 Okt 2026) (premis SALAH: menganggap langganan ialah produk jualan; skor 7.0/10 ditarik balik, lihat bahagian 16)

Skor pelan turun daripada 8.5/10 (v2) kepada **7.0/10** (keyakinan 93%). Sebab: model berbayar selepas trial menaikkan risiko memperoleh dan mengekalkan pembaca, sedangkan kesanggupan membayar belum terbukti. Pelan v3 boleh dibawa kepada Izzat tetapi belum patut diluluskan sebagai spesifikasi pembangunan muktamad. Rujukan luar dan nasihat undang-undang oleh ChatGPT tidak disahkan.

Risiko baharu: (1) trial tamat sebelum kad boleh dibeli (kritikal; jangan mula trial awam sebelum ada saluran membeli); (2) trial berulang melalui emel baharu (had pendaftaran dan pemantauan, tanpa pengesahan identiti invasif); (3) had 2 peranti: bezakan peranti daripada sesi, pelayar buang kuki dikira peranti baharu; (4) sesi kekal tanpa tamat: perlu tamat tempoh keselamatan dan pembatalan sesi; (5) SEO dan kebocoran teks melalui carian/RSC/API; (6) harga: pelan 6 bulan hanya 2 kali harga sebulan, pelan 12 bulan RM20 lebih daripada 6 bulan, insentif terlalu kuat untuk tempoh panjang sebelum kebolehpercayaan terbukti; (7) kos kad RM2 = 13.3% hasil kad RM15; (8) karya dikunci sepenuhnya selepas trial boleh mengurangkan perkongsian; jangan pasarkan sebagai "bacaan percuma" tanpa menerangkan had 14 hari.

Perubahan fasa yang disyorkan: Fasa 0 mesti memutuskan cara pembaca membeli sebelum trial dibuka; Fasa 3 tambah status TRIAL/ACTIVE/EXPIRED; Fasa 6 (kawalan akses) siap sebelum pendaftaran awam; Fasa 7 buka pendaftaran dan jualan serentak dengan kod tersedia sejak hari pertama trial awam; uji dengan 5 akaun dalaman dahulu.

Cadangan harga (bukan nasihat kewangan): kekalkan RM15 untuk percubaan 50 kad; anggap RM30/RM50 belum dimuktamadkan sehingga ada data pembaharuan. Cadangan peraturan: tebus kad semasa trial menambah tempoh selepas trial supaya baki trial tidak hangus (bertentangan dengan cadangan awal bahagian 5.5, Izzat perlu putuskan). Trial bermula selepas pengesahan emel berjaya.

**Soalan yang masih menunggu Izzat:** nasib pembaca sedia ada dan karya yang pernah percuma (dikunci retrospektif?); karya teaser dibaca penuh atau sinopsis sahaja; tempoh maksimum sesi dan pembatalan peranti hilang; siapa boleh membeli kad selepas trial dan bagaimana pembeli di luar kawasan jualan Izzat memperoleh kad; nasib pelanggan jika Jalin Plus dihentikan; adakah karya domain awam, sinopsis, halaman penulis dan senarai karya turut dikunci; keutamaan: pertumbuhan pembaca atau pendapatan langganan.

## 16. Model perniagaan sebenar (Izzat, 9 Okt 2026) dan semakan semula ChatGPT

**Penjelasan Izzat:** Jalin bukan fokus menjual langganan. Ia strategi pemasaran bagi produk syarikat Izzat (baju, beg, cenderamata, dll). Setiap pembelian produk memberi satu langganan Jalin 12 bulan. Syarikat membekalkan baju secara pukal kepada sekolah, kolej dan universiti, jadi Jalin mendapat promosi percuma kepada pasaran pelajar; dan secara simbiosis, jika institusi berhenti membeli baju daripada syarikat, pelajar tidak mendapat akses Jalin tahun berikutnya. Kad juga dijual di Shopee untuk menjimatkan kos pengurusan. **Tiada Jalin Plus**: hanya satu Jalin (versi trial 14 hari dan Jalin sebenar). Harga RM15 / RM30 / RM50 ialah "tanda harga" yang mengesahkan Jalin ada nilai sebenar (bukan "free gift" yang sengaja dinilai tinggi). Pertumbuhan Jalin organik daripada pemasaran produk. Jualan kad bukan sumber pendapatan utama.

**Semakan ChatGPT (premis betul): skor 8.6/10, keyakinan 93%** (naik daripada 7.0 yang berasaskan premis salah). Ini penilaian kesesuaian strategi, bukan bukti bahawa Jalin akan meningkatkan jualan atau pengekalan. Syor: percubaan terkawal dahulu, bukan terus ribuan kad; asingkan DB; uji satu kelompok pembeli; pastikan 12 bulan boleh dipenuhi; ukur sama ada penerima menggunakan Jalin. Jalin tidak perlu untung sendiri, tetapi kosnya mesti berpatutan berbanding nilai pemasaran yang diberi kepada syarikat. (Rujukan luar dan nasihat undang-undang oleh ChatGPT tidak disahkan.)

### Perubahan reka bentuk akibat model ini (DICADANGKAN)

- **Satu kod unik bagi setiap penerima langganan**, bukan satu kod dikongsi seluruh sekolah. Jejak penuh: batch > pesanan > institusi > bungkusan > penebusan.
- **Pengaktifan** semasa kad diserahkan kepada saluran penghantaran atau serahan disahkan. **Tempoh 12 bulan bermula apabila ditebus, bukan apabila diaktifkan.** Memerlukan dasar tarikh akhir boleh tebus (cadangan sementara 24 bulan dari pengeluaran; hak pengguna PERLU DISAHKAN).
- **Kod dalam bungkusan:** sampul legap atau kad berlapisan; jangan paparkan kod rahsia pada label penghantaran atau QR luar.
- **Shopee:** mulakan dengan kedai rasmi; risiko kad palsu, kod terdedah sebelum diterima, pertikaian dan pemulangan; polisi Shopee tentang baucar digital/kad fizikal perlu disahkan sendiri (jangan anggap tepat). Tiada pemprosesan bayaran tersuai dalam Jalin.
- **Pelajar bawah 18:** notis privasi yang boleh difahami, akaun pelajar yang selamat; persetujuan sekolah tidak semestinya menggantikan persetujuan individu/penjaga (PERLU DISAHKAN PROFESIONAL).
- **Janji 12 bulan:** setiap kod ditebus ialah komitmen perkhidmatan 12 bulan walaupun sekolah berhenti membeli. Jika sekolah tidak memperbaharui tempahan, kod baharu tidak diberi tetapi akses sedia ada kekal sehingga tarikh tamat; jangan potong akses pelajar kerana keputusan pembelian institusi.
- **Pembaharuan:** pembelian produk seterusnya atau kad Shopee menambah tempoh berturutan; tiada pembaharuan automatik.
- **Harga rujukan pada kad:** boleh menjadi harga jualan sebenar di Shopee, tetapi jangan dakwa "hadiah percuma bernilai RM50" selagi kad tidak benar-benar dijual pada harga itu dan rekodnya boleh dipertahankan (representasi nilai, undang-undang pengguna: PERLU DISAHKAN). Pemasaran disyorkan: "Pembelian ini disertakan akses Jalin selama 12 bulan."
- **60 bit mencukupi** untuk puluhan ribu kod dengan had kadar global (dengan 50,000 kod aktif dan sejuta cubaan rawak, kebarangkalian kejayaan kira-kira 0.0000043%); risiko lebih besar ialah kebocoran semasa cetak, bungkus, hantar atau jual. Jangan guna nombor pesanan, nombor matrik atau siri kad sebagai input yang menjadikan kod boleh diramal.

### Apa yang dipermudahkan

| Komponen | Keputusan |
|---|---|
| Jenama "Jalin Plus" | Buang; hanya "Jalin" |
| Pencetak label haba | Tangguh; laser dan sampul dahulu (kos 12 aksara untuk puluhan ribu kad perlu dinilai: pencetakan pukal oleh pembekal kad mungkin lebih ekonomik, dengan kawalan rahsia fail) |
| Portal pengedar | Buang V1; guna pesanan syarikat dan import CSV |
| Admin langganan | Ringkaskan kepada Kad, Pembaca, Laporan, Keselamatan |
| Pembayaran Shopee tersuai | Tidak perlu |
| Had dua peranti | Kekal, diurus sebagai dua sesi aktif |
| Akaun dan lejar | Jangan ringkaskan keselamatan: transaksi, audit, pemulihan tetap wajib |

Tambah **laporan pemasaran ringkas**: institusi, kuantiti produk, kod diedarkan, kod ditebus, kadar pengaktifan pembaca. Kadar tebus tinggi tidak membuktikan pembelian semula sekolah; keberkesanan pemasaran dinilai berasingan.

### Keputusan yang masih perlu Izzat

1. Siapa menerima satu kod: setiap pelajar penerima (syor ChatGPT), setiap unit produk, atau setiap pesanan institusi? (menentukan kos dan bilangan kad)
2. Bila kod diaktifkan: semasa penghantaran (syor) atau selepas serahan disahkan?
3. Tarikh akhir boleh tebus: 24 bulan dari pengeluaran (sementara), 12 bulan, atau tiada.
4. Pembaharuan selepas 12 bulan: pembelian produk atau kad Shopee (syor), atau pembelian produk sahaja.
5. Siapa menanggung kos operasi Jalin setiap tahun (belanjawan pemasaran syarikat?).
6. Pendaftaran selamat pelajar bawah umur; teaser kekal boleh dibaca selepas trial atau tidak.
7. Jika Jalin dihentikan, apa janji kepada pelanggan yang masih aktif.

### 16.1 Keputusan reka bentuk kad (Izzat, 9 Okt 2026) dan semakan ChatGPT

Keputusan Izzat: kod dicetak pada label pencetak haba, dilekatkan pada kad, dan pelekat gores dilekatkan di atas label kod (tiada sampul legap). Kod 12 atau 16 aksara (boleh 16). Setiap kad ada **nombor batch** (cth 1000 kad dalam satu cetakan berkongsi batch yang sama) tercetak pada kad; tebus memerlukan kod + nombor batch. Jika sekolah berhenti membeli, pelajar melanggan sendiri melalui kad Shopee.

Semakan ChatGPT (skor reka bentuk **7.0/10**, boleh **8.5/10** jika bahan lulus ujian; rujukan bahan luar tidak disahkan):
- **Nombor batch menambah keselamatan sedikit sahaja** jika dicetak terbuka (1,000 batch ≈ 10 bit teori, tetapi penyerang yang melihat sebarang kad tahu batch). Ia alat kawalan inventori dan pembatalan, bukan faktor keselamatan kedua yang kuat. Jangan tambah entropi batch kepada anggaran entropi kod.
- **Cara guna terbaik:** kod 16 aksara (80 bit); batch dicetak di luar pelekat gores; pelayan mengira HMAC(kunci, "JALIN-V1" || batch_id || kod_kanonik) dengan pengekodan input tidak kabur; sah hanya pada pasangan batch + kod; sokong pembatalan batch, penjejakan pesanan, pengesanan mencurigakan ikut batch; had kadar per akaun/IP dan global (per batch sebagai tambahan). UX: dua medan menambah kesilapan menaip; pilihan kemudian ialah QR pada kad yang mengisi batch sahaja (bukan keperluan V1).
- **Risiko bahan:** label direct thermal (tanpa pita) boleh pudar atau berubah warna dan bertindak balas dengan pelekat; pelekat gores boleh menanggalkan cetakan semasa digores atau melekat pada label. ChatGPT lebih cenderung kepada **thermal transfer (pita resin atau wax-resin) pada label sintetik** untuk stok 6-12 bulan, tetapi gabungan sebenar mesti diuji. Jangan lulus ribuan kad tanpa ujian keserasian.
- **Ujian minimum sebelum cetak ribuan kad:** 30 kod ujian tidak aktif pada pencetak dan label sebenar; lekat pelekat gores sebenar dan biarkan mengeras; 10 kad digores oleh pengguna berbeza (semua kod kekal jelas); 10 kad disimpan 30 hari; ujian haba sederhana, lembap, geseran; semak sama ada kod boleh dilihat atau pelekat dibuka dan dipasang semula tanpa kesan; banding direct thermal dengan thermal transfer; 30/30 boleh dibaca. Ujian 30 hari tidak membuktikan 12 bulan.
- **Lain-lain:** mulakan dengan batch kecil, bukan 1,000 (satu kecacatan menjejaskan semua); batch dibatalkan menyekat kod belum ditebus, tetapi akses yang sudah sah tidak dibatalkan automatik; sahkan padanan siri/batch/kod semasa pengeluaran tanpa menyimpan kod bersih; uji kad dalam bungkusan panas dan kenderaan; setiap pertukaran label, pita atau pelekat perlu ujian semula; maklumkan dasar kad hilang sebelum agihan; uji saiz fon dan kadar salah taip pada telefon untuk 16 aksara; sediakan pencetakan semula dengan kod baharu jika satu pencetak gagal.

### 16.2 Bahan label yang Izzat tunjuk (9 Okt 2026) dan padanan saiz

Tiga calon dalam gambar jualan: label haba 50 x 20 mm (teras 4 cm), label haba 40 x 30 mm (800 helai/gelung, tepi biru, disenaraikan sebagai "thermal label printers"), dan pelekat gores perak 38 x 16 mm. **Kedua-dua label bertanda "thermal" dalam gambar nampaknya jenis direct thermal (tanpa pita); jenis sebenar belum disahkan.** Jika direct thermal, risiko pudar dan kerosakan bawah pelekat gores dalam 16.1 terpakai sepenuhnya.

Padanan (aritmetik, bukan ujian): pelekat gores 38 x 16 mm di atas label 50 x 20 mm meninggalkan hanya 6 mm kiri-kanan dan 2 mm atas-bawah, tiada ruang untuk nombor batch di luar pelekat. Label 40 x 30 mm meninggalkan 14 mm di bawah/atas pelekat untuk nombor batch dan siri, tetapi lebar pelekat hampir sama dengan label (1 mm setiap sisi), jadi ketepatan penempelan kritikal. Cadangan susun atur: kod 16 aksara dalam dua baris 8 aksara (cth XXXX-XXXX) dalam zon selamat sekurang-kurangnya 3 mm dari tepi pelekat (kira-kira 32 x 10 mm); nombor batch dan siri awam di luar pelekat. Kebolehbacaan pada 203 dpi dan keserasian pelekat gores mesti diuji sebelum cetak ribuan kad.

## 17. Kerja yang sudah dibuat tanpa menunggu perkakasan (9 Okt 2026)

Kod sahaja, belum disambung ke halaman, pangkalan data atau skema (tiada migrasi): `src/lib/subscription/redeem-code.ts`, `src/lib/subscription/periods.ts`, ujian `__tests__/subscription-primitives.test.ts` (36 semakan lulus; ditambah ke rantaian `npm test`; `tsc --noEmit` bersih).

- **Aksara semak dipilih melalui ujian, bukan andaian:** skema jenis Damm di atas GF(32) (polinomial x^5+x^2+1, pekali 2). Ujian lengkap atas 32,768 badan dan 3,000 kod rawak 16 aksara: tiada satu pun kesilapan satu aksara atau pertukaran dua aksara bersebelahan yang terlepas. Ini menggantikan keraguan di bahagian 5.6 tentang Damm tertib 32.
- **Kod:** 16 aksara Crockford rawak (80 bit, tanpa bias) + 1 aksara semak; paparan `XXXX-XXXX-XXXX-XXXX-C`; input menerima huruf kecil, ruang dan sengkang, O dibaca 0, I/L dibaca 1.
- **MAC terikat batch:** HMAC-SHA256 pada `JALIN-V1:<panjang>:<batch>:<kod>`; kunci kurang 256 bit ditolak; batch yang sama dengan kod sama memberi MAC sama, batch lain memberi MAC lain.
- **Tarikh:** tambah bulan pada jam Malaysia (UTC+8) dengan hari terakhir bulan; semua kes dalam bahagian 5.5 lulus; trial 14 hari; tebus bermula sekarang atau bila akses semasa tamat (tebus semasa trial ikut cadangan bahagian 5.5: bermula serta-merta; jika Izzat pilih "tambah selepas trial", hanya hujah `currentEndsAt` yang perlu dihantar).

Perkara yang bukan kerja kod dan perlu Izzat: mencipta cabang Neon untuk DB pembangunan (Fasa 0, perlu akaun Neon), memilih model printer dan membuat ujian bahan, dan keputusan di bahagian 16.

## 18. Kod kongsi (Izzat, 9 Okt 2026)

Selain kod kad sekali guna, Izzat mahu **kod kongsi**: satu kod yang boleh ditebus ramai orang, untuk dikongsi di Telegram, dengan had penebusan. Ini bukan kod kad (bahagian 5.6); ia tidak rahsia, jadi yang melindunginya ialah had, tarikh luput, satu penebusan setiap akaun dan suis jeda.

**Keputusan Izzat:**
- Tempoh akses ditetapkan Izzat bagi setiap kod dalam admin. Pilihan yang disediakan: 7 hari, 14 hari, 1 bulan, 6 bulan, 12 bulan.
- Izzat menetapkan bilangan penebusan setiap kod; apabila penuh, kod berhenti berfungsi. Tarikh luput pilihan (belum dijawab secara terang; disediakan sebagai medan pilihan).
- Mana-mana akaun berdaftar boleh menebus (pembaca lama, tamat trial, atau sedang melanggan); masa ditambah selepas akses semasa.
- Bentuk kod: sistem menjana kod rawak pendek, contoh `JLN-7KQ2M9C` (tiga huruf JLN, enam aksara rawak Crockford, satu aksara semak). Awak tidak taip perkataan sendiri.

**Reka bentuk (DICADANGKAN; belum disambung ke DB):**
- Jadual `shared_codes` (id, code unik, grant_unit, grant_amount, max_redemptions, redeemed_count, expires_at nullable, status active/paused/revoked, saluran/catatan seperti "Telegram", dicipta oleh, tarikh) dan `shared_redemptions` (code_id, account_id, grant_id, UNIQUE(code_id, account_id)).
- Kod disimpan sebagai teks biasa (tidak rahsia, Izzat perlu melihatnya dalam admin). Penebusan satu transaksi: kunci baris kod, semak peraturan, \`UPDATE shared_codes SET redeemed_count = redeemed_count + 1 WHERE id = ? AND status = 'active' AND redeemed_count < max_redemptions AND (expires_at IS NULL OR now() < expires_at)\` dan mesti terkesan tepat satu baris; INSERT shared_redemptions (UNIQUE menghalang tebus berganda oleh akaun sama); INSERT peristiwa lejar jenis \`SHARED_CODE_GRANT\`; COMMIT. Dua orang serentak pada tempat terakhir: hanya satu berjaya.
- Halaman /tebus yang sama menerima kedua-dua jenis kod: format \`JLN-XXXXXXC\` ialah kod kongsi; 17 aksara tanpa awalan ialah kod kad (kod kad tidak pernah mengandungi huruf L, jadi tidak tercampur). Mesej kegagalan tetap satu mesej umum.
- Had kadar dan penguncian percubaan sama seperti kod kad. Kerana kod kongsi diumum di Telegram, serangan bukan meneka tetapi **mendaftar banyak emel untuk menghabiskan had**; had OTP dan pemantauan emel pendaftaran (bahagian 5.2) menjadi pertahanan, dan Izzat boleh jeda atau batalkan kod serta-merta.
- Admin: cipta kod (tempoh, had, tarikh luput), lihat baki tempat, senarai penebus, jeda/sambung, batal. Pembatalan tidak menarik balik akses yang sudah diberi (sama seperti batch kad) melainkan Izzat membatalkan grant tertentu dengan audit.
- Laporan pemasaran (bahagian 16) mengira kod kongsi berasingan daripada kod kad supaya jumlah kad dan jumlah promosi tidak bercampur.

**Sudah dibina (kod sahaja, tiada DB):** `src/lib/subscription/shared-code.ts` (jana, normalisasi input, peraturan keputusan penebusan, tempoh grant) dan `__tests__/shared-code.test.ts` (22 semakan lulus).

**Soalan terbuka:** tarikh luput lalai untuk kod kongsi; adakah penebus kod kongsi boleh juga menebus kod kad (cadangan: ya, ditambah berturutan).

## 19. DB pembangunan (Fasa 0, 9 Okt 2026)

Cabang Neon `pembangunan` dicipta daripada `production` (data dan skema, tiada auto-delete) pada 9 Okt 2026. `.env.local` di komputer ini kini menggunakan cabang itu, bukan produksi; URL produksi tidak disimpan dalam `.env.local` lagi (boleh diambil semula daripada Neon atau Vercel). `src/lib/db/env.ts` menolak sebarang hos selain cabang pembangunan atau mesin tempatan apabila dijalankan di luar Vercel dan GitHub Actions (override: `ALLOW_NON_DEV_DATABASE=yes`); hos disimpan sebagai cincangan SHA-256 sahaja. Ujian: `__tests__/db-dev-guard.test.ts` (13 semakan). `npm run db:verify` lulus pada cabang pembangunan.

**Kesan kerja harian:** suntingan kandungan daripada localhost (cth PATCH bahan cerpen) kini hanya mengubah cabang pembangunan, bukan laman live. Untuk menerbitkan, gunakan admin pada jalin.adjung.com sendiri. Cabang pembangunan ialah salinan pada 9 Okt 2026 dan tidak menyegerak sendiri; cipta cabang baharu atau "reset daripada production" di Neon apabila perlu data terkini.

## 20. Fasa 2, langkah 1: skema akaun pembaca (9 Okt 2026)

Migrasi `027_reader_accounts` (jadual baharu sahaja; tiada jadual atau lajur sedia ada disentuh; idempoten) **dijalankan pada cabang pembangunan sahaja. Produksi belum.** Tiada halaman atau API menggunakannya lagi.

| Jadual | Tujuan |
|---|---|
| `reader_accounts` | UUID, emel + emel ternormal, nama paparan pilihan, status (active / deletion_requested / deleted), tarikh emel disahkan, trial mula/tamat, tarikh log masuk akhir. Satu akaun hidup bagi satu alamat; alamat akaun dipadam dibebaskan. Tiada lajur kata laluan (OTP sahaja). |
| `reader_trial_claims` | Satu trial bagi satu emel selama-lamanya. Hanya cincangan berkunci (MAC) alamat disimpan, supaya padam akaun tidak meninggalkan alamat dan tidak memberi trial kedua. |
| `reader_auth_challenges` | Kod log masuk emel. Hanya MAC alamat (carian) dan MAC kod disimpan; maksimum 5 percubaan; tamat tempoh; satu cabaran terbuka bagi setiap alamat. |
| `reader_devices` | Satu baris setiap peranti (cincangan token, label, aktif akhir, tarikh dan sebab dibatalkan). Had 2 peranti aktif dikuatkuasakan dalam transaksi log masuk dengan kunci pada baris akaun. Tiada tamat tempoh tetap. |
| `reader_prefs` | Saiz font (16-24), jarak baris, lebar, tema (cerah/sepia/gelap), fon, redup (0-20% langkah 5). Hanya akaun berdaftar boleh ubah (keputusan Izzat). |
| `saved_works`, `reading_progress` | Karya disimpan; bab terakhir dibaca (bukan perenggan). |

Memadam akaun memadam peranti, tetapan, karya disimpan dan kemajuan (CASCADE). Pengesahan skema: `npm run db:reader-check` (22 semakan pada DB sebenar dalam satu transaksi yang dibatalkan; tiada apa disimpan) lulus; `db:verify` dan ujian inventori migrasi lulus.

**Belum dibuat dan diperlukan seterusnya:** pilih penyedia emel dan sahkan domain penghantar (SPF, DKIM, DMARC); kunci HMAC bagi MAC emel dan kod (disimpan di Vercel dan pengurus kata laluan, bukan dalam repo); API hantar kod dan sahkan kod; kuki `__Host-jalin-reader`; had kadar; halaman log masuk, akaun dan tetapan bacaan; migrasi 027 pada produksi hanya sebelum kod yang menggunakannya diterbitkan (kod mesti degrade secara selamat jika jadual tiada).

## 21. Fasa 2, langkah 2: log masuk OTP, sesi dan had peranti (9 Okt 2026)

Dibina dan diuji pada cabang pembangunan; **tiada halaman untuk pembaca lagi dan tiada apa dihidupkan pada laman live**. Semua titik akhir mati (404) melainkan `READER_ACCOUNTS_ENABLED=yes` ditetapkan. Biarkan ia tidak ditetapkan pada Vercel sehingga migrasi 027 dan 028 dijalankan pada produksi.

**Penyedia emel: Resend.** Domain `mail.adjung.com` sudah disahkan dalam akaun Resend Izzat (digunakan juga oleh Adjung Brief); satu kunci API baharu bernama "Jalin" dicipta, **hantar sahaja dan terhad kepada domain itu** (bukan akses penuh). Pelan percuma: 3,000 emel sebulan, 100 sehari (angka daripada ulasan pihak ketiga; sahkan di resend.com/pricing). Kunci disimpan dalam `.env.local` sahaja. `MAIL_PROVIDER=console` (lalai tempatan) hanya menulis kod dalam log pelayan dan **ditolak pada laman live**.

**Kod:** `src/lib/reader-auth/primitives.ts` (alamat, cincangan berkunci, kod enam digit, token sesi, penghantar), `service.ts` (permintaan kod, pengesahan, sesi, peranti), `http.ts` (suis, kuki, semakan asal sama, alamat pelawat). Titik akhir: `POST /api/akaun/kod`, `POST /api/akaun/sahkan`, `GET /api/akaun/saya`, `POST /api/akaun/keluar`, `POST /api/akaun/keluar-semua`. Migrasi baharu: `028_reader_auth_events` (kiraan had kadar).

**Peraturan yang dikuatkuasakan:** kod enam digit, sah 5 minit, sekali guna, maksimum 5 percubaan salah; kod baharu membatalkan yang lama; jawapan "hantar kod" sama sama ada alamat berakaun atau tidak (alamat tidak sah sahaja dimaklumkan); alamat dan kod hanya disimpan sebagai cincangan berkunci (HMAC-SHA256; kunci 256 bit dalam persekitaran); akaun dicipta pada kod betul pertama dengan trial 14 hari **sekali sahaja** untuk setiap emel walaupun akaun dipadam kemudian; maksimum 2 peranti, peranti ketiga mesti memilih satu daripada dua untuk dikeluarkan (kod sama boleh dihantar semula dengan pilihan, tidak dibazirkan); sesi tiada tamat tempoh tetap, kuki `__Host-jalin-reader` (HttpOnly, Secure, SameSite=Lax) dan hanya cincangan SHA-256 token disimpan; permintaan yang mengubah sesuatu mesti datang daripada laman sendiri (semakan Origin).

**Had kadar (boleh ditala dalam `LIMITS`):** 1 permintaan seminit dan 5 sejam bagi satu emel; 20 sejam bagi satu pelawat; **90 emel sehari untuk semua** (supaya tidak melepasi had percuma 100; naikkan bersama pelan Resend); 10 kod salah sejam bagi satu emel dan 30 bagi satu pelawat. Had hari ini ialah risiko perniagaan: jika ramai pelajar daftar serentak (sekolah), had 90 sehari akan menyekat sebahagian; naik ke pelan berbayar sebelum pengedaran pukal.

**Pengesahan:** `__tests__/reader-auth-primitives.test.ts` (43 semakan), `npm run db:reader-auth-check` (30 semakan pada DB sebenar dalam satu transaksi yang dibatalkan, dengan penghantar palsu dan jam digerakkan tangan: tamat 5 minit, 5 percubaan, sekali guna, trial sekali, peranti ketiga, keluar semua, had kadar, mel gagal), `tsc` bersih, dan satu aliran hidup melalui pelayan pembangunan (daftar, kuki, `/saya`, keluar). Data ujian dibuang daripada cabang pembangunan.

**Belum:** halaman log masuk/akaun/tetapan bacaan (UI), kunci HMAC dan Resend untuk produksi di Vercel (kunci produksi mesti berbeza daripada kunci pembangunan; Izzat perlu meluluskan sebelum saya menyentuh pemboleh ubah Vercel), migrasi 027/028 pada produksi, ujian penghantaran emel sebenar ke peti masuk (perlu kebenaran Izzat kerana ia menghantar emel), pembersihan baris `reader_auth_events` lama, dan sambungan akaun ke sistem langganan (Fasa 3).

## 22. Fasa 2, langkah 3: halaman log masuk dan akaun (9 Okt 2026)

Dibina pada pelayan pembangunan, mengikut lakaran yang Izzat luluskan (tajuk dan ayat pengenalan di tengah; medan dan baris tetapan di kiri). **Semuanya mati (404) melainkan `READER_ACCOUNTS_ENABLED=yes`**, jadi laman live tidak berubah dan pautan "Akaun" di pengepala tidak muncul di sana.

- **`/log-masuk`:** satu borang untuk log masuk dan daftar. Langkah 1 emel; langkah 2 kod enam digit (kira detik "Hantar semula kod", "Tukar emel", petunjuk semak folder spam); langkah 3 hanya jika sudah ada 2 peranti: pilih satu untuk dikeluarkan (kod yang sama digunakan semula). Kod betul membawa ke `/akaun`.
- **`/akaun`:** jalur percubaan (tarikh tamat), emel, nama pilihan (tambah/ubah), tetapan bacaan dengan contoh teks langsung (saiz huruf 16-24, tema cerah/sepia/gelap, serif/sans, jarak baris, lebar teks, redup 0-20%), senarai peranti (keluarkan peranti lain), log keluar dan keluar dari semua peranti. Tanpa log masuk ia mengubah hala ke `/log-masuk`; halaman akaun tidak diindeks.
- **Titik akhir baharu:** `POST /api/akaun/peranti/keluarkan`, `GET/PUT /api/akaun/tetapan`, `PATCH /api/akaun/profil`. Tetapan hanya menerima nilai yang ditawarkan; selain itu diabaikan dan pangkalan data menolaknya juga (CHECK).
- **Diuji dengan pelayar sebenar pada DB pembangunan:** daftar dengan kod daripada log, masuk ke `/akaun`, tukar tema/saiz/redup (disimpan dan dibaca semula daripada API), paparan telefon 375 px tanpa tatal mendatar, log keluar kembali ke `/log-masuk`. Data ujian dibuang.

**Belum:** tetapan bacaan belum dipakai pada halaman cerita (hanya contoh pada `/akaun`; teks di situ berkata "tidak lama lagi"); halaman Dasar privasi dan Terma masih menyatakan Jalin tidak meminta akaun (benar selagi akaun mati, mesti dikemas kini sebelum akaun dihidupkan); pautan Akaun di menu telefon; karya disimpan dan sambung bacaan; kunci produksi, migrasi 027/028 pada produksi dan kelulusan Izzat untuk menyentuh Vercel.

## 23. Simulasi hujung ke hujung (9 Okt 2026)

Skrip `scripts/reader-e2e.ts` memandu pelayan yang sedang berjalan melalui HTTP sebenar dengan beberapa "peranti" (setiap satu ada balang kuki sendiri) terhadap cabang pembangunan, dan membuang semua akaun ujian (`@e2e.invalid`) selepas selesai. Cara jalan: mulakan `npx next dev -p 3100 > dev.log`, kemudian `READER_E2E_BASE=http://localhost:3100 READER_E2E_LOG=dev.log npx tsx scripts/reader-e2e.ts`. **94 semakan lulus, 0 gagal.**

Yang dicakup: bahagian lain laman masih menjawab (utama, kategori, cerita, tentang, privasi, terma, carian, sitemap, robots, log masuk admin; sitemap tidak menyenaraikan halaman akaun; tiada kuki pembaca pada halaman cerita); pelawat dihalakan ke `/log-masuk`; semua permintaan POST/PATCH/PUT daripada laman lain atau tanpa Origin ditolak (403); badan permintaan rosak, tatasusunan, kosong, terlalu besar, `null`, nombor, alamat berjarak dan cubaan suntikan pengepala semuanya 400 bersih, tiada 500; pendaftaran dengan kod; kuki HttpOnly, SameSite=Lax, Path=/ tanpa Domain; kod tidak boleh dipakai dua kali; kuki palsu bukan sesi; jawapan "hantar kod" sama untuk alamat berakaun, tidak berakaun dan yang dikekang; enam permintaan pantas hanya menghantar satu emel; kod lepas 5 minit ditolak; lima kod salah mematikan kod; **lapan permintaan serentak dengan kod yang sama: tepat satu berjaya (satu akaun, satu peranti)**; peranti kedua, peranti ketiga dengan pilihan, menamakan peranti akaun lain ditolak, kod yang sama masih boleh digunakan selepas pilihan ditolak, peranti diganti terkeluar serta-merta; tetapan sah disimpan dan tetapan palsu diabaikan, dikongsi merentas peranti, pelawat tidak boleh baca atau ubah; nama dibersihkan dan dipaparkan sebagai teks (`<img onerror>` tidak menjadi markup); peranti sendiri tidak boleh dikeluarkan dengan cara ini, peranti akaun lain tidak boleh dikeluarkan; log keluar satu peranti, log keluar semua; trial tidak diberi kali kedua selepas akaun dipadam; pengawal DB menolak hos bukan pembangunan.

Disemak berasingan: (a) pelayan dengan `READER_ACCOUNTS_ENABLED=no`: laman utama dan kategori 200, `/log-masuk`, `/akaun`, `/api/akaun/*` 404, tiada pautan Akaun, POST kod 404; (b) `next build` produksi lulus (exit 0) dan `next start` dengan `NODE_ENV=production`: kuki ialah `__Host-jalin-reader; Path=/; Secure; HttpOnly; SameSite=lax` tanpa Domain, kuki bernama biasa tidak diterima, `/api/admin/works` tanpa kuki 401 dan `/admin` 307 (pintasan dev admin hanya dalam mod pembangunan, seperti dahulu); (c) emel sebenar melalui Resend dihantar dan sampai (status Delivered) ke emel peribadi Izzat dan kodnya berjaya mendaftar akaun ujian pada cabang pembangunan.

Catatan yang ditemui: jam Neon mendahului jam komputer ini kira-kira 2 saat; sistem menulis semua masa daripada jam aplikasi (bukan jam DB) supaya tidak keliru, jadi tiada kesan. Satu ujian lama dalam `pretest` (`homepage-editor-picks-hero`, membaca `src/app/page.tsx`) gagal dan **tiada kaitan** dengan perubahan ini (fail itu tidak disentuh); `npm test` penuh juga tidak boleh jalan di Windows kerana skrip itu melebihi had panjang arahan (8,953 aksara sebelum kerja ini). Ujian baharu ditambah ke skrip itu seperti ujian lain; ia berjalan baik di Linux/CI.
