# Kajian penyedia bayaran untuk jualan kod langganan Jalin

Disediakan 25 Oktober 2026 (pelan langganan, langkah C1). Semua angka diambil daripada halaman rasmi penyedia pada tarikh itu, kecuali yang ditanda **(tidak disahkan)**. Yuran penyedia boleh berubah; sahkan semula sebelum mendaftar. Kajian ini tidak membuka akaun atau mendaftar apa-apa.

Kajian ini selaras dengan perbincangan Izzat dan ChatGPT pada 21 hingga 25 Okt 2026 (perbualan "Keperluan Naik Taraf Hostinger"): ChatGPT juga mencadangkan Billplz Basic untuk pelaksanaan pertama dan menyatakan ringkasan sistem SUS (lihat bahagian "Selaras dengan perbincangan ChatGPT").

## Apa yang Jalin perlukan

- Jualan sekali bayar (bukan langganan berulang): pembaca pilih pakej 1, 6 atau 12 bulan, bayar, dan kod dijana serta dihantar ke e-mel.
- Pembayaran tempatan: **FPX** (perbankan dalam talian) dan sebaik-baiknya DuitNow QR dan kad. Pembaca ialah pembaca Melayu di Malaysia, jadi kad antarabangsa bukan keutamaan.
- **Panggilan balik pelayan (webhook) yang boleh disahkan** supaya kod hanya dijana apabila bayaran benar-benar berjaya, dan **rujukan tempahan** boleh dilampirkan pada setiap bayaran.
- **Mod ujian (sandbox)** untuk ujian sebelum duit sebenar.
- Akaun yang boleh dibuka oleh perniagaan **SSM milikan tunggal** (Adjung Press Platform; nombor SSM tertera pada kad yang Izzat reka).
- Bayaran balik: sekurang-kurangnya boleh dibuat secara manual daripada papan pemuka.

## Perbandingan (bayaran dalam MYR, belum termasuk SST)

| Penyedia | FPX B2C | Kad tempatan | DuitNow QR | Yuran tetap | Pindahan wang (FPX) |
|---|---|---|---|---|---|
| **CHIP Collect** | RM1.00 | kredit 2.0%, debit 1.0% | 1.0% | tiada yuran persediaan, bulanan atau tahunan | hari berikutnya (kad: setiap 2 hari bekerja) |
| **Billplz** (pelan Basic) | RM1.25 | 1.8% | 1.5% (dompet) | pelan Basic percuma; pelan Standard RM999 setahun (FPX RM0.75) | hari bekerja berikutnya (kad: T+2) |
| **ToyyibPay** (pelan Standard) | RM1.00 | 1.50% (hubungi jualan; yuran onboarding RM100 dan RM100 setahun) | 1.00% atau RM1.00 | tiada untuk FPX | 1 hingga 4 hari bekerja (kad: 4 hari) |
| **senangPay** | yang lebih tinggi antara RM1 dan 1.5% | yang lebih tinggi antara RM0.65 dan 2.5% | tidak disenaraikan | pakej Starter RM149 setahun, Advance RM299 setahun (harga promosi semasa) | tidak dinyatakan |
| **Stripe** | 3% + RM1.00 | 3% + RM1.00 | tidak disenaraikan | tiada | berguling, mingguan atau bulanan (tempoh khusus Malaysia tidak dinyatakan) |
| **Curlec** (Razorpay) | yang lebih tinggi antara RM1 dan 1.5% **(tidak disahkan, sumber pihak ketiga)** | 2.4% **(tidak disahkan)** | tidak disahkan | persediaan RM99 **(bercanggah antara sumber)** | T+2 **(tidak disahkan)** |

Contoh kos FPX bagi bayaran RM30: CHIP RM1.00 (3.3%), Billplz Basic RM1.25 (4.2%), ToyyibPay RM1.00, senangPay RM1.00, Stripe RM1.90 (6.3%). Untuk bayaran kecil, yuran **tetap** setiap transaksi paling penting, jadi Stripe paling mahal. SST 8% dikatakan dikenakan atas yuran Billplz oleh satu sumber pihak ketiga **(tidak disahkan)**; halaman CHIP hanya menyebut SST untuk Atome.

## Kesesuaian dengan Jalin

| Keperluan | Billplz | CHIP Collect | ToyyibPay / senangPay / Curlec | Stripe |
|---|---|---|---|---|
| Panggilan balik pelayan yang boleh disahkan | **Ya, disahkan:** `callback_url` wajib, tandatangan `x_signature` (HMAC-SHA256), cuba semula sehingga 5 kali jika tiada HTTP 200 dalam 20 saat | Dokumen tidak dibaca sepenuhnya; **tidak disahkan** | tidak disemak | Terkenal baik (pengetahuan umum), tidak disahkan di sini |
| Rujukan tempahan | **Ya:** `reference_1` dan `reference_2` (120 aksara) | tidak disahkan | tidak disemak | ya (metadata), tidak disahkan di sini |
| Mod ujian | **Ya, disahkan:** sandbox berasingan, akaun dan kunci berasingan | **Ya** (persekitaran staging wujud untuk CHIP Send); mod ujian Collect tidak disahkan | tidak disemak | ya (umum) |
| API bayaran balik | **Tidak ditemui** dalam dokumen yang dibaca (hanya status `refunded`); mungkin manual | tidak disahkan | tidak disemak | ya (umum) |
| Pengesahan: kunci API dan HTTPS | Basic Auth (kunci rahsia), HTTPS wajib | Bearer token kunci rahsia | tidak disemak | ya |

Nota pemasangan: dokumen Billplz menyatakan urutan panggilan balik dan pengalihan **tidak tetap**, jadi sistem mesti menangani kedua-duanya secara bebas dan menghalang kod daripada dijana dua kali (kod dijana pada panggilan balik sahaja, dan idempoten mengikut ID bil).

## Syarat akaun (apa yang diketahui)

- **Stripe Malaysia:** perjanjian rasmi membenarkan "perniagaan (termasuk pemilik tunggal)" dan memerlukan nombor pengenalan perniagaan atau cukai. Sumber sekunder bercanggah sama ada SSM wajib.
- **Billplz, CHIP, ToyyibPay, senangPay:** halaman harga tidak menyenaraikan syarat dokumen. ChatGPT (dalam perbualan Izzat) menyenaraikan bagi Billplz: dokumen pengenalan pemilik, nombor SSM atau pendaftaran perniagaan, **akaun bank atas nama entiti perniagaan**, maklumat hubungan, laman web, maklumat percukaian, dan pengesahan bank sehingga 24 jam bekerja (tidak disahkan oleh saya daripada halaman Billplz). senangPay menyatakan perlukan sijil SSM. HitPay (rujukan sahaja) membenarkan pemilik tunggal menerima ke akaun peribadi atas nama pemilik. **Dua sumber ini bercanggah** tentang akaun bank (nama entiti berbanding peribadi), jadi tanya Billplz dan CHIP terus.
- **Izzat ada SSM milikan tunggal**, jadi syarat asas dipenuhi. Belum dapat disahkan: dokumen tepat yang diminta setiap penyedia, jenis akaun bank yang diterima, dan masa kelulusan. Perkara ini hanya boleh disahkan melalui halaman pendaftaran masing-masing, yang tidak boleh dilakukan bagi pihak Izzat.

## Selaras dengan perbincangan ChatGPT (21 hingga 25 Okt 2026)

Perkara yang sama:
- Billplz Basic dicadangkan untuk pelaksanaan pertama kerana API dan panggilan balik bertandatangan HMAC-SHA256 jelas didokumenkan. Billplz Standard atau ToyyibPay (RM1.00 FPX) sebagai alternatif lebih murah.
- Satu akaun gateway boleh untuk SUS dan Jalin (entiti perniagaan sama); gunakan koleksi atau rujukan berasingan supaya kutipan boleh diaudit.
- Gateway hanya menerima dan mengesahkan bayaran; Jalin mengurus kod, tempoh akses dan penebusan.
- Aliran digital: bayar, pengesahan (callback), kod unik dijana, e-mel dihantar, pembaca log masuk, tebus. Satu bayaran tidak boleh menghasilkan dua kod. E-mel yang gagal mesti boleh dicuba semula tanpa kehilangan pembelian atau mengeluarkan kod kedua.
- Trial Jalin 14 hari; langganan 1, 6 atau 12 bulan; tiada caj berulang; akses tamat tetapi akaun kekal dan boleh tebus kod baharu; tempoh baharu bersambung selepas akses semasa.

Perkara baharu daripada perbincangan itu, yang mempengaruhi pembinaan:
- **Kod digital perlu disimpan terenkripsi sehingga berjaya dihantar.** Enjin kod Jalin hanya menyimpan cincang (HMAC) dan kod sebenar hanya wujud sekali semasa kelompok dibuat. Untuk kod yang dijana semasa bayaran, kod mesti dihantar ke e-mel, jadi salinan terenkripsi (kunci berasingan, tidak pernah dalam log) perlu disimpan sehingga e-mel dihantar, kemudian dipadam.
- **Dua saluran, satu sistem tebus.** Kad fizikal dan kod digital menggunakan penebusan yang sama, tetapi rekod asal (saluran pengeluaran: kad fizikal, bayaran dalam talian, hadiah) mesti dapat dibezakan.
- **Tarikh akhir tebus berbeza daripada tempoh akses.** Contoh: tebus sebelum 31 Dis 2027, tempoh akses 12 bulan; jika ditebus pada 30 Dis 2027, pembaca masih mendapat 12 bulan penuh. Pada kad fizikal, tarikh itu dicetak pada label pelekat (bukan kad pukal). Cadangan ChatGPT yang BELUM diputuskan: kad hadiah sekolah 12 bulan untuk menebus (dari tarikh diserahkan), kad jualan 24 bulan dari tarikh pembelian.
- **Kod satu produk tidak boleh digunakan pada produk lain** (kod SUS ditolak di Jalin dan sebaliknya).
- **Harga pada kad:** utamakan tempoh manfaat (contoh "12 Bulan Akses") berbanding harga, kerana kad yang diberi percuma kepada pelajar bukan wang tunai RM50. Kad contoh SUS pernah menggunakan nilai RM50 untuk 12 bulan.
- **Untuk kod digital, nombor siri tidak perlu ditaip secara manual** jika pautan tebus yang selamat boleh membekalkan rujukannya. Ini selaras dengan keputusan Izzat bahawa nombor siri kad fizikal dan kad maya boleh diasingkan.
- **Keputusan yang masih belum dimuktamadkan** (senarai ChatGPT): harga dan tempoh setiap pelan; tarikh akhir tebus rasmi; gateway akhir; saiz label dan pelekat kikis; kaedah dan waktu pengaktifan kelompok fizikal; dasar bayaran balik, kad hilang dan kod rosak.

## Cadangan

1. **Senarai pendek: Billplz dan CHIP Collect.**
   - **Billplz:** satu-satunya yang API-nya saya sahkan sesuai (tandatangan, rujukan, sandbox, cuba semula). Yuran FPX RM1.25 pada pelan Basic percuma. Dicadangkan juga oleh ChatGPT. **Pilihan saya untuk dibina dahulu.**
   - **CHIP Collect:** yuran FPX lebih rendah (RM1.00), tiada yuran tetap, pindahan hari berikutnya, DuitNow QR 1.0%. Dokumen webhook dan bayaran balik perlu disahkan sebelum dipilih.
2. **Elakkan Stripe** untuk jualan kecil ini: 3% + RM1 menjadikan kos hampir dua kali ganda FPX tempatan.
3. **ToyyibPay dan senangPay** sebagai simpanan jika Billplz dan CHIP menolak; API tidak saya semak.
4. **Sebelum memilih, Izzat perlu:** (a) lihat senarai dokumen pendaftaran Billplz dan CHIP, (b) tanya sama ada pemilik tunggal boleh menerima ke akaun bank yang ada dan sama ada akaun mesti atas nama perniagaan, (c) tanya sama ada yuran dikenakan SST dan bila akaun diluluskan, (d) untuk CHIP, tanya sama ada bayaran balik dan mod ujian disokong untuk akaun baharu.
5. **Cukai untuk disemak dengan akauntan, bukan keputusan Claude:** adakah jualan langganan digital perlu dikenakan SST, dan keperluan e-Invois bagi pemilik tunggal. Ini menentukan sama ada harga yang dipaparkan perlu termasuk cukai.

## Sumber

- Billplz: [harga](https://main.billplz.com/pricing), [dokumen API](https://support.billplz.com/api)
- CHIP: [harga](https://chip-in.asia/pricing), [pengenalan API](https://docs.chip-in.asia/chip-collect/overview/introduction), [indeks dokumen](https://docs.chip-in.asia/llms.txt)
- ToyyibPay: [pelan harga](https://www.toyyibpay.com/toyyibpay/pricing-plans)
- senangPay: [yuran dan ciri](https://senangpay.com/fee-costing-features/)
- Stripe: [harga Malaysia](https://stripe.com/en-my/pricing), [perjanjian perkhidmatan Malaysia](https://stripe.com/en-my/legal/ssa/my)
- Curlec: [Airwallex: Curlec review](https://www.airwallex.com/my/blog/curlec-review) dan [HitPay](https://hitpayapp.com/curlec-alternative) (pihak ketiga, pesaing; tidak disahkan)
- Syarat dokumen pihak ketiga: [HitPay: pengesahan perniagaan Malaysia](https://docs.hitpayapp.com/onboarding/requirements-my)
- Perbincangan Izzat dan ChatGPT, 21 hingga 25 Okt 2026 (perbualan "Keperluan Naik Taraf Hostinger", projek Automasi)
