# Kajian: akaun pembaca, tetapan bacaan, langganan dan kod tebus

Tarikh: 8 Okt 2026. Status: **kajian dan cadangan sahaja. Tiada kod ditulis, tiada skema diubah.**
Permintaan asal (Izzat): log masuk pengguna awam untuk tanda sambung bacaan, pelarasan saiz font, kecerahan, baki tempoh langganan, profil dan lain-lain; dan ciri paling besar: sistem menjana kod, mencetaknya dengan pencetak label haba, kod dilekatkan pada kad, diedar kepada pembeli, pembeli log masuk Jalin dan menebus kod itu untuk langganan 1 bulan, 6 bulan atau 1 tahun.

AGENTS.md peraturan 1 dan 14 menghendaki keputusan produk yang dikunci tidak diubah tanpa arahan manusia, dan perubahan besar pada schema, auth atau deployment didokumenkan dahulu. Dokumen ini ialah langkah "dokumenkan dahulu" itu.

## 1. Perkara pertama: ini mengubah keputusan produk yang sedia ada

| Dokumen | Apa yang tertulis hari ini | Kesan permintaan ini |
|---|---|---|
| `docs/PRODUCT.md` (Access) | "Semua kandungan percuma ketika pelancaran." Model kandungan hendaklah membolehkan akses subscriber/promosi ditambah kemudian. | Langganan berbayar menjadi kenyataan. Pintu sudah disediakan di atas kertas, belum di kod. |
| `docs/MVP_MASTER_PLAN.md` | "paid subscription UI" dan "subscriptions/paywall" disenarai sebagai **bukan** MVP. | Perlu ditandakan sebagai fasa selepas MVP, dengan keputusan Izzat. |
| `docs/PRODUCT.md` (Accounts) | Akaun asas: simpan karya, sejarah bacaan, sambung bacaan. Tiada komen, profil sosial, follower, badge. | "Profil" mesti dihadkan kepada profil peribadi (nama paparan, tetapan, langganan), bukan profil sosial. |
| `AGENTS.md` pembuka | Teks awam tidak menyempitkan audiens. Jalin terbuka kepada semua pembaca. | Dinding bayar menyempitkan akses kepada sebahagian karya. Keputusan: apa yang dikunci? (soalan 2, bahagian 9) |

Keputusan Izzat diperlukan sebelum sebarang pembinaan. Cadangan saya: kemas kini PRODUCT.md dan MVP_MASTER_PLAN.md setelah Izzat memutuskan soalan di bahagian 9.

## 2. Keadaan sebenar kod hari ini (disemak, bukan andaian)

- **Tiada akaun pembaca.** Satu-satunya auth ialah log masuk admin (`src/lib/admin/auth.ts`): kuki sesi `jalin-admin-session`, pemilik (ADMIN_SECRET) dan akaun staf dalam jadual `admin_users` (migrasi 025). Ia sengaja dibuat untuk pemilik dan staf, bukan untuk orang awam. Jangan guna semula untuk pembaca.
- **Pangkalan data:** Neon Postgres melalui Kysely, migrasi bernombor hingga 025. Jadual penting: works, series, credits, visuals, glossary_terms, work_revisions, admin_users. Tetapan ringan disimpan dalam `prompt_templates` (skop dan versi), bukan jadual tetapan sebenar.
- **Halaman awam dirender mengikut permintaan** (`force-dynamic` pada laman utama, senarai kategori, karya, bersiri). Ini baik untuk dinding bayar kerana tiada cache awam yang membocorkan teks berkunci, tetapi laman utama juga tidak di-cache oleh CDN. Beban pada Neon bertambah apabila pembaca ramai.
- **Antara muka bacaan:** hanya garis kemajuan nipis di atas skrin (`ReadingProgress.tsx`). Tiada kawalan saiz font, kecerahan atau tema pembaca. Tema ialah warna editorial tetap (`site-theme.ts`) yang dipilih admin, bukan pilihan pembaca. Tiada penyimpanan keutamaan pembaca (tiada localStorage pembaca).
- **Emel:** tiada penghantar emel (tiada Resend, Nodemailer, SendGrid dsb. dalam dependency). Log masuk tanpa kata laluan dan pemulihan akaun memerlukan satu.
- **Pengepala keselamatan:** `Permissions-Policy` melarang `usb=()`. Ini bermakna cetakan terus ke pencetak label melalui WebUSB tidak boleh tanpa mengubah pengepala itu. Cadangan di bahagian 6 tidak memerlukannya.
- **Hos:** Vercel (wilayah sin1), had pelancaran 100 deploy sehari pada pelan percuma pernah dicapai pada projek lain, jadi kerja besar mesti dibatch.
- **Rujukan dalaman berguna:** projek **Labelism** (repo `Labelism`, `public/label.html`) sudah menjana label QR dengan pustaka `qrcodejs` dan CSS cetak. Ia boleh dijadikan model untuk susun atur label, bukan untuk dipakai semula terus (ia projek berasingan, English-only, dan Cloudflare).

## 3. Tiga lapisan ciri, dari mudah ke susah

| Lapisan | Ciri | Perlu log masuk? | Kesukaran |
|---|---|---|---|
| A | Saiz font, kecerahan, tema (cerah/gelap/sepia), lebar teks | Tidak. Simpan dalam penyemak imbas | Rendah |
| B | Akaun pembaca: sambung bacaan merentas peranti, simpan karya, sejarah, profil asas, tetapan disegerakkan | Ya | Sederhana |
| C | Langganan: baki tempoh, penebusan kod, dinding bayar, jana dan cetak kod | Ya | Tinggi |

Cadangan: lapisan A dibina dahulu dan boleh diterbitkan tanpa menunggu keputusan perniagaan. Ia nilai segera kepada semua pembaca.

## 4. Lapisan A: tetapan bacaan (tanpa akaun)

- Saiz teks (5 langkah), jarak baris, kecerahan (lapisan peredup pada teks bacaan sahaja, bukan kecerahan skrin sebenar yang tidak boleh diubah oleh web), tema bacaan (cerah, sepia, gelap), lebar lajur.
- Simpan dalam `localStorage`, dengan nilai lalai sama seperti hari ini supaya pembaca baharu tidak nampak perubahan. Selepas log masuk (lapisan B), segerakkan ke akaun.
- AGENTS.md: lajur bacaan mesti mengekalkan lebar dan margin stabil pada laptop dan monitor besar. Pelarasan lebar teks mesti dihadkan dalam julat selamat.
- Mod gelap menyentuh ilustrasi (House Style, kelegapan, teks berimej). Perlu semakan visual setiap kategori sebelum diterbitkan.
- Kecerahan: jujurkan label dalam UI ("Redupkan halaman"), kerana laman web tidak mengawal kecerahan peranti.

## 5. Lapisan B: akaun pembaca

### 5.1 Cara log masuk (keputusan perlu)

| Pilihan | Kelebihan | Kelemahan |
|---|---|---|
| Pautan atau kod emel (tanpa kata laluan) | Tiada kata laluan untuk dicuri atau dilupa; sesuai pembaca biasa | Perlu penghantar emel dan kebolehhantaran emel yang baik |
| Log masuk Google | Pantas; ramai pengguna Malaysia ada | Bergantung pihak ketiga; perlu persetujuan OAuth |
| Emel dan kata laluan | Biasa difahami | Kita simpan hash kata laluan, perlu pemulihan, lebih banyak risiko |

Cadangan: **kod sekali guna melalui emel** sebagai asas, Google sebagai tambahan kemudian. Elakkan kata laluan sendiri.

### 5.2 Model data dicadangkan (lakaran, bukan migrasi)

```
reader_accounts   id, email (unik, huruf kecil), display_name, created_at, last_seen_at, deleted_at
reader_sessions   id, account_id, token_hash, expires_at, user_agent_short, created_at
reader_prefs      account_id, font_step, theme, dim, width, updated_at
reading_progress  account_id, work_id, section_slug, scroll_ratio, updated_at  (satu baris setiap karya)
saved_works       account_id, work_id, created_at
```

- Kuki sesi berasingan daripada kuki admin (nama dan skop berbeza), `HttpOnly`, `Secure`, `SameSite=Lax`.
- Simpan hanya hash token sesi.
- Had kadar untuk permintaan kod emel (per emel dan per IP).
- Sambung bacaan: simpan selepas berhenti menatal (debounce), bukan setiap saat, untuk elak beban pada Neon.

### 5.3 Privasi

- Halaman `/privasi` sudah ada. Mesti dikemas kini apabila akaun wujud: data apa dikumpul (emel, sejarah bacaan), tujuan, tempoh simpan, cara padam akaun.
- Akta Perlindungan Data Peribadi 2010 (PDPA) Malaysia terpakai kepada data peribadi dalam urusan komersial. Saya bukan peguam. Draf privasi dan terma langganan patut disemak peguam atau diluluskan Izzat sebelum dibuka kepada orang awam.
- Cadangan privasi lalai: jangan paparkan sejarah bacaan kepada sesiapa, tiada profil awam, butang "Padam akaun dan semua data saya".

### 5.4 Profil

Hanya: nama paparan (pilihan), emel, tetapan bacaan, langganan, sejarah, karya disimpan, padam akaun. Tiada avatar awam, follower atau komen (selaras PRODUCT.md).

## 6. Lapisan C: langganan dan kod tebus

### 6.1 Konsep

1. Admin memilih produk (1 bulan, 6 bulan, 12 bulan) dan kuantiti, lalu menjana **kelompok kod**.
2. Sistem mencetak kod pada label haba. Label dilekatkan pada kad.
3. Kad diedar atau dijual **di luar sistem** (kedai, acara, dalam talian). Jalin tidak mengendalikan bayaran, jadi **tiada pintu gerbang pembayaran perlu dibina.**
4. Pembeli log masuk, memasukkan atau mengimbas kod, dan akaunnya mendapat tempoh langganan.

### 6.2 Jadual dan status

```
code_batches   id, product_term (1m/6m/12m), quantity, created_by, created_at, note
redeem_codes   id, batch_id, code_hash (unik), status, created_at, activated_at,
               redeemed_by, redeemed_at, voided_at, void_reason
entitlements   id, account_id, source (code/promosi/manual), starts_at, ends_at,
               code_id (boleh null), created_at       -- lejar, sambungan sahaja ditambah
redemption_log id, code_id, account_id, ip_hash, outcome, created_at   -- semua cubaan, termasuk gagal
```

Status kod: `dijana` → `dicetak` → `diaktifkan` → `ditebus`, atau `dibatalkan` pada bila-bila masa sebelum ditebus.

**Mengapa status "diaktifkan"?** Kad yang dicuri atau digambar di kedai sebelum dijual tidak boleh ditebus sebelum Izzat mengaktifkan kelompok (atau kad individu) yang dijual. Ini perlindungan murah terhadap kecurian kad dan kod yang bocor.

### 6.3 Kod itu sendiri

- Panjang dan entropi: 12 aksara dalam abjad Crockford base32 (tanpa 0/O/1/I/L) ialah kira-kira 60 bit entropi, ditambah aksara semak. Cukup untuk menahan tekaan dengan had kadar. Paparkan berkelompok: `K7QF-2M9X-HD4R`.
- **Simpan hash sahaja** (HMAC-SHA256 dengan rahsia pelayan), bukan kod bersih. Pangkalan data yang bocor tidak mendedahkan kod yang masih sah.
- Akibatnya: kod bersih hanya wujud pada masa menjana. **Cetak mesti berlaku dalam aliran yang sama** (paparan cetak dibuka serta-merta; kod tidak disimpan di mana-mana). Cetak semula kad yang rosak = batalkan kod lama dan jana yang baharu.
- Kod QR mengandungi pautan seperti `https://jalin.adjung.com/tebus#K7QF-2M9X-HD4R`. Bahagian selepas `#` **tidak dihantar ke pelayan** dan tidak masuk log akses. Halaman tebus membacanya dengan JavaScript. Pembeli yang tidak log masuk dibawa log masuk dahulu, lalu kod diteruskan.
- Penebusan mesti **atomik** dalam satu pernyataan pangkalan data (kemas kini status hanya jika masih `diaktifkan`, dan tulis `entitlement` dalam transaksi yang sama). Dua orang yang menebus serentak: seorang sahaja berjaya.
- Had kadar: beberapa cubaan gagal setiap akaun dan setiap IP dalam satu jam, kemudian tunggu. Mesej ralat tidak membezakan "tidak wujud" dan "sudah ditebus" untuk orang yang meneka.

### 6.4 Peraturan tempoh

- Penebusan dikira daripada **lebih lewat antara sekarang dan tarikh tamat semasa** (menyambung, bukan menindih).
- Beberapa kod boleh ditebus berturutan dan ditimbun.
- Baki dikira daripada lejar `entitlements` (tarikh tamat paling lewat), bukan satu medan yang disunting. Setiap perubahan boleh diaudit.
- Zon masa: simpan UTC, papar waktu Malaysia (UTC+8). Tarikh tamat dipaparkan sebagai tarikh penuh, bukan "30 hari".
- 1 bulan = tarikh yang sama bulan depan (bukan 30 hari tepat). Sahkan dengan Izzat.
- Pembatalan selepas penebusan (rungutan, tersilap): admin boleh menambah entitlement negatif atau menamatkan awal dengan sebab direkod. Jangan padam baris.

### 6.5 Cetakan label haba

Maklumat yang tidak diketahui: **model pencetak, lebar label, dan sama ada ia pencetak Windows biasa**. Soalan ini menentukan cara, tetapi ada laluan yang berfungsi untuk hampir semua pencetak:

| Cara | Terangkan | Pro | Kontra |
|---|---|---|---|
| **1. Cetak penyemak imbas dengan CSS `@page`** | Halaman "Cetak kod" yang saiznya sama dengan label (contohnya 50×30 mm), satu label satu halaman, QR dan kod berkelompok | Berfungsi dengan pemacu Windows mana-mana pencetak label; tiada perisian tambahan; Labelism sudah buktikan corak ini | Pengguna mesti pilih saiz kertas dan marj sifar sekali; ada risiko penyimpangan saiz mengikut pemacu |
| **2. Jana PDF saiz tepat** | Pelayan atau penyemak imbas menjana PDF pada saiz label, dicetak terus | Susun atur konsisten, boleh diuji tanpa pencetak | Satu langkah tambahan untuk membuka dan mencetak PDF |
| 3. Cetak mentah (ZPL, TSPL, ESC/POS) melalui WebUSB atau ejen tempatan | Terus ke pencetak | Paling laju untuk ratusan label | Pengepala `usb=()` perlu dilonggarkan; kebanyakan pencetak murah tidak sokong; risiko keselamatan lebih besar |

Cadangan: bermula dengan **cara 1 dan 2** (halaman cetak sepadan label, eksport PDF sebagai sandaran). Cara 3 hanya jika jumlah cetakan sebenar melebihi apa yang boleh dikendalikan dengan cara 1, selepas ujian sebenar.

Susun atur label yang dicadangkan: kod QR di kiri, kod berkelompok di bawah dalam fon monospace jelas, tempoh (contoh "6 BULAN") dan nombor siri kelompok kecil. Tiada nama atau perkataan yang membuat orang menyangka ia baucar tunai.

**Ujian fizikal wajib** sebelum pengeluaran: imbas dengan sekurang-kurangnya 3 telefon (Android dan iPhone) pada label sebenar yang dilekatkan pada kad, dalam cahaya malap. Pencetak haba kadang-kadang menghasilkan QR yang terlalu rapat untuk kamera lama. (Nota: ujian fizikal itu mesti dibuat oleh Izzat sendiri, saya tidak boleh mendakwa ia sudah dibuat.)

### 6.6 Keselamatan fizikal kad

Label haba yang dilekatkan terbuka bermakna sesiapa yang melihat atau menggambar kad boleh mencuri kod. Pilihan, daripada paling murah:

1. Lapisan tampal calar (scratch-off) atau pelekat tamper-evident di atas kod.
2. Kod dicetak dalam sampul kecil atau di sebalik kad.
3. Status "diaktifkan" (bahagian 6.2) supaya kad tidak boleh ditebus sebelum dijual.

Cadangan: pilihan 3 sentiasa, ditambah 1 atau 2 untuk kad yang dijual di kedai awam.

### 6.7 Dinding bayar dan akses kandungan

- Halaman karya dirender mengikut permintaan, jadi pemeriksaan akses boleh dibuat di pelayan setiap permintaan tanpa mengubah seni bina.
- **Perlu diputuskan: apa yang dikunci.** Pilihan: semua karya terbitan baharu selepas tarikh tertentu; kategori tertentu (contoh novela dan bersiri); bab pertama percuma, bab selanjutnya berkunci; cerpen sentiasa percuma.
- Teks berkunci tidak boleh hadir dalam HTML awam, JSON-LD, RSS atau hasil carian. Perlu semak `seo-jsonld.ts`, `sitemap.ts`, `cari` dan `koleksi-cerita` supaya tiada petikan penuh bocor.
- SEO: halaman berkunci patut paparkan tajuk, dek dan sebahagian awal (petikan), dengan tanda data berstruktur untuk kandungan berbayar supaya Google tidak anggap sebagai penyamaran (cloaking). Perlu pertimbangan teliti.
- AGENTS.md menyatakan Jalin terbuka kepada semua pembaca. Jika sebahagian dikunci, teks awam (Tentang) mesti jujur tentang apa yang percuma dan apa yang berlanggan.

## 7. Risiko

| Risiko | Kesan | Mitigasi |
|---|---|---|
| Kod dicuri atau digambar sebelum dijual | Kerugian langsung | Status diaktifkan, pelekat tampal calar, hash sahaja disimpan |
| Tekaan kod beramai-ramai | Langganan percuma | Entropi 60 bit, had kadar, log cubaan, pemadaman akaun penyalahguna |
| Dua tebusan serentak | Langganan dua kali | Kemas kini atomik dan kekangan unik |
| Pencetak menghasilkan QR tidak boleh diimbas | Kad tidak berguna | Ujian fizikal wajib; kod boleh ditaip sebagai sandaran |
| Pembeli kehilangan akses (lupa emel akaun) | Aduan sokongan | Admin boleh cari akaun melalui emel dan sambung entitlement dengan sebab direkod |
| Kebocoran data peribadi (emel, sejarah) | Reputasi dan undang-undang | Hash sesi, tiada simpan kod bersih, privasi lalai, padam akaun, semakan peguam |
| Beban Neon dan Vercel meningkat (akaun, sambung bacaan, semakan akses setiap permintaan) | Kos dan kelembapan | Debounce sambung bacaan, indeks pada jadual baharu, pantau had pelan semasa |
| Perniagaan: SST, e-invois, polisi pulangan dan tamat tempoh kad belum guna | Pematuhan | Rujuk akauntan dan peguam. Saya tidak memberi nasihat undang-undang atau cukai |
| Perubahan produk besar tanpa kelulusan | Bercanggah AGENTS.md | Dokumen ini; kemas kini PRODUCT.md selepas keputusan |

## 8. Fasa pembinaan dicadangkan

Anggaran kasar usaha bergantung pada kelajuan semakan. Saya tidak berjanji tarikh.

| Fasa | Kandungan | Bergantung kepada | Nilai |
|---|---|---|---|
| 0 | Keputusan Izzat atas soalan di bahagian 9; kemas kini PRODUCT.md dan MVP_MASTER_PLAN.md | Izzat | Mengelak kerja sia-sia |
| 1 | Tetapan bacaan (saiz font, jarak, tema, redup) dalam penyemak imbas | Tiada | Nilai segera untuk semua pembaca |
| 2 | Akaun pembaca: log masuk kod emel, sesi, sambung bacaan, karya disimpan, padam akaun, privasi dikemas kini | Fasa 0; penghantar emel | Asas untuk semua yang lain |
| 3 | Lejar entitlement, halaman profil dan baki langganan, alat admin untuk beri tempoh secara manual (promosi) | Fasa 2 | Langganan dapat diuji tanpa kod fizikal |
| 4 | Jana kelompok kod, status, halaman cetak label, PDF label, ujian fizikal | Fasa 3; model pencetak | Pengeluaran kad |
| 5 | Halaman tebus (log masuk, imbas QR, taip kod), had kadar, log cubaan | Fasa 4 | Pembeli boleh menebus |
| 6 | Dinding bayar mengikut peraturan yang diputuskan, semakan kebocoran teks, SEO | Fasa 3 dan keputusan Izzat | Langganan benar-benar bernilai |
| 7 | Laporan admin (kod dijana, dicetak, diaktifkan, ditebus), pembatalan, sokongan | Fasa 5 | Operasi harian |

Susunan fasa 4 dan 5 boleh ditukar, tetapi **fasa 6 tidak sepatutnya diterbitkan sebelum fasa 3 dan 5 stabil** supaya tiada pembaca terkunci tanpa jalan masuk.

## 9. Soalan yang hanya Izzat boleh jawab

1. Cara log masuk pembaca: kod emel sahaja, atau tambah Google?
2. Apa yang dikunci untuk pelanggan? (semua karya baharu? novela dan bersiri sahaja? bab pertama percuma?)
3. Adakah pembaca tanpa akaun masih boleh membaca semua yang percuma seperti hari ini? (cadangan: ya)
4. Harga dan di mana kad dijual (kedai fizikal, acara, dalam talian)? Ini menentukan keperluan perlindungan kad.
5. Model dan lebar pencetak label haba, dan komputer yang akan digunakan? (menentukan saiz label dan cara cetak)
6. Adakah kad boleh tamat tempoh jika tidak ditebus? (kesan undang-undang pengguna: rujuk peguam)
7. Berapa peranti boleh log masuk serentak satu akaun? (cadangan: tiada had sebenar pada peringkat awal, kecuali penyalahgunaan)
8. Pelan pulangan: boleh batalkan kod yang sudah ditebus, atau tidak?
9. Siapa yang menyokong pelanggan (lupa akaun, kad rosak)? Satu alamat emel sokongan perlu wujud.
10. Domain dan emel penghantar: `jalin.adjung.com` atau alamat emel berjenama? (kesan kebolehhantaran emel)

## 10. Cadangan langkah seterusnya

1. Izzat jawab soalan 1 hingga 5 sekurang-kurangnya (cukup untuk memulakan fasa 0 hingga 3).
2. Bina fasa 1 (tetapan bacaan) sebagai kemenangan awal tanpa risiko.
3. Sambil itu, Izzat menguji label sebenar dengan satu QR contoh pada pencetak dan kad, supaya saiz label dan kebolehbacaan diketahui sebelum fasa 4.
