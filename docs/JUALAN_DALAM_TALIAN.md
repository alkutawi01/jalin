# Jualan kod langganan dalam talian (dibina 25 Okt 2026)

Pembaca memilih tempoh (1, 6 atau 12 bulan), membayar melalui Billplz, dan kod langganan dihantar ke e-mel. **Semuanya tertutup** sehingga disetkan (lihat "Menghidupkan"). Belum diuji dengan akaun Billplz sebenar: tandatangan dan panggilan API ditulis daripada dokumentasi Billplz dan diuji dengan kunci palsu.

## Aliran

1. `/beli`: pembaca pilih tempoh dan masukkan e-mel. Harga datang daripada pelayan (`PLAN_PRICES_MYR`), bukan pelayar.
2. `POST /api/langganan/beli`: mencipta pesanan (`purchase_orders`, status PENDING), mencipta bil Billplz dan memulangkan alamat bayaran. Had: 10 permintaan sejam bagi setiap pelawat dan 5 pesanan sejam bagi setiap e-mel.
3. Pembaca membayar di Billplz. Billplz memanggil **`POST /api/langganan/panggilan-balik`** (pelayan ke pelayan). Hanya panggilan dengan tandatangan `x_signature` yang sah dikira; halaman yang pembaca dialihkan ke (`/beli/selesai`) tidak membuktikan apa-apa.
4. Pada panggilan balik: pesanan ditukar PENDING kepada PAID dalam satu transaksi pada baris yang dikunci, dan **tepat satu** kod maya dibuat (siri `JLN-..-M..`, sah setahun, `redeem_codes.redeem_by`). Kod kekal **tersulit** (AES-256-GCM, kunci diterbitkan daripada kunci kod, terikat pada nombor pesanan) sehingga e-mel dihantar, kemudian dipadam. Jumlah bayaran mesti sekurang-kurangnya harga; jika kurang, tiada kod dibuat dan pesanan ditanda untuk disemak dengan tangan.
5. E-mel dihantar. Jika gagal, pesanan kekal menunggu dan dicuba lagi (halaman `/beli/selesai`, butang "Hantar semula e-mel" di `/admin/langganan/pesanan`, atau kerja berjadual `GET /api/cron/pesanan`). Dua percubaan serentak tidak boleh kedua-duanya menghantar (selang 30 saat).
6. Pembaca log masuk dan menebus di `/tebus` dengan nombor siri dan kod daripada e-mel.

## Menghidupkan (Izzat)

Tetapkan pada Hostinger (semuanya kata laluan atau rahsia, jangan masuk repositori):

| Pemboleh ubah | Maksud |
|---|---|
| `PURCHASES_ENABLED=yes` | suis jualan (juga memerlukan `READER_ACCOUNTS_ENABLED=yes`) |
| `PLAN_PRICES_MYR=1=..,6=..,12=..` | harga dalam ringgit, contoh `1=15,6=79,12=149` (belum diputuskan, jadi tiada nilai lalai) |
| `BILLPLZ_API_KEY`, `BILLPLZ_COLLECTION_ID`, `BILLPLZ_X_SIGNATURE_KEY` | daripada akaun Billplz |
| `BILLPLZ_ENV=production` | tanpanya sistem menggunakan sandbox Billplz |
| `CRON_SECRET` | untuk `GET /api/cron/pesanan` (Authorization: Bearer ...) |
| `NEXT_PUBLIC_APP_URL` | alamat laman (alamat panggilan balik dan pautan e-mel dibina daripadanya) |
| `MAIL_PROVIDER=resend`, `RESEND_API_KEY`, `MAIL_FROM` | sudah digunakan untuk kod log masuk |

Urutan yang disyorkan:
1. Buka akaun Billplz **sandbox**, buat satu koleksi, ambil tiga nilai Billplz. Tetapkan `BILLPLZ_ENV` kosong (sandbox).
2. Jalankan migrasi 036 dan 037 pada pangkalan data produksi (lihat bawah), tetapkan pemboleh ubah di atas (kecuali `BILLPLZ_ENV=production`), hidupkan, dan lakukan satu pembelian sandbox dari `/beli`. Semak: pesanan menjadi Dibayar di `/admin/langganan/pesanan`, e-mel sampai, kod boleh ditebus.
3. Hanya selepas itu tukar kepada `BILLPLZ_ENV=production` dengan kunci sebenar, dan buat satu pembelian kecil sebenar.
4. Jadualkan `GET /api/cron/pesanan` setiap 5 minit pada Hostinger (cron).

## Migrasi

- **036** `code_batches.channel` dan `redeem_codes.redeem_by` (tambahan sahaja).
- **037** `purchase_orders` (jadual baharu).
- **Syarat sebelum menjalankan pada produksi:** cabang `web-push` mempunyai migrasi **035** yang belum digabungkan. Kysely tidak membenarkan migrasi lebih lama dijalankan selepas yang lebih baharu, dan ujian `migration-inventory` gagal selagi 035 tiada. Gabungkan `web-push` dahulu, atau terima bahawa 035 mesti dijalankan sebelum 036 dan 037.
- Migrasi belum dijalankan pada produksi (hanya pada cabang `pembangunan`).

## Belum dibuat atau belum diputuskan

- Akaun Billplz dan ujian sandbox sebenar (hanya Izzat boleh membukanya).
- Harga (plan A2) dan dasar bayaran balik (bayaran balik dibuat dengan tangan di Billplz; sistem belum membatalkan kod secara automatik).
- Teks e-mel kod, `/beli`, `/beli/selesai`, ralat tebus dan Soalan Lazim baharu **sudah disemak ChatGPT (26 Okt 2026)**; lihat `docs/SOALAN_LAZIM.md`. Terma dan Dasar privasi belum menyebut pembayaran (C5 dalam pelan).
- E-mel penggantian: jika pembeli kehilangan e-mel selepas dihantar, kod tersulit sudah dipadam. Penyelesaian: Izzat membatalkan kod itu dan mengeluarkan kod baharu (belum ada butang untuk kod maya).
- Pautan ke `/beli` belum diletakkan di mana-mana (halaman ada, tetapi tiada menu menuju ke sana).
- Penyedia lain (CHIP Collect) boleh ditambah kemudian dengan modul serupa `billplz.ts`.

## CHIP (gerbang lalai sejak 28 Oktober 2026)

Billplz tidak dapat mengesahkan pendaftaran Izzat, jadi **CHIP Collect ialah gerbang lalai**. Billplz masih ada dalam kod (`PAYMENT_PROVIDER=billplz`). Dibina daripada dokumen API CHIP (docs.chip-in.asia); **belum dicuba dengan CHIP sebenar** (diuji dengan pelayan palsu setempat dan 67 ujian unit).

| Pemboleh ubah | Maksud |
|---|---|
| `PAYMENT_PROVIDER` | `chip` (lalai jika tiada) atau `billplz` |
| `CHIP_SECRET_KEY` | kunci rahsia CHIP (kunci **ujian** menghasilkan pembelian ujian; kunci **sebenar**, wang sebenar) |
| `CHIP_BRAND_ID` | ID Brand (UUID) dalam portal CHIP, Developers > Brands |
| `ALLOW_TEST_PAYMENTS=yes` | hanya semasa menguji: membenarkan pembayaran ujian mengeluarkan kod. **Tanpanya**, pembayaran dengan kunci ujian tidak membuat kod (ditanda "Pembayaran ujian" pada pesanan). Buang selepas ujian. |
| `PURCHASES_ENABLED`, `PLAN_PRICES_MYR`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`, `MAIL_*` | seperti di atas |

Aliran CHIP: `POST /api/langganan/beli` mencipta pesanan dan `POST https://gate.chip-in.asia/api/v1/purchases/` (jumlah dalam sen, `success_callback` = `/api/langganan/panggilan-balik-chip`, `success_redirect` dan `failure_redirect` = `/beli/selesai?ref=...`). Apabila dibayar, CHIP menghantar JSON `Purchase` kepada panggilan balik (ia mengulang sehingga 8 kali; boleh berulang selepas 200).

**Cara bayaran dipercayai:** badan panggilan balik **tidak dipercayai**. Ia hanya menamakan nombor pembelian; keadaan sebenar (`status` dan jumlah bayar) dibaca semula daripada CHIP melalui `GET /purchases/{id}/` dengan kunci rahsia kita. Panggilan balik palsu hanya boleh membuat kita bertanya kepada CHIP. Hanya pembelian yang kita cipta sendiri (ada dalam `purchase_orders`) ditanya. Jika CHIP tidak dapat dihubungi, jawapan ialah 503 supaya CHIP mencuba lagi. Tandatangan `X-Signature` CHIP tidak digunakan untuk keselamatan (butiran formatnya tidak dapat dicuba tanpa akaun).

Untuk pembangunan: `CHIP_BASE_URL=http://localhost:PORT/api/v1` mengarahkan panggilan ke pelayan palsu setempat, dan hanya diterima apabila `NODE_ENV` bukan `production`.

**Ujian dengan CHIP sebenar (selamat, tanpa menyentuh produksi):** guna kunci ujian, pangkalan data cabang `pembangunan`, dan terowong awam (contohnya `cloudflared tunnel --url http://localhost:3100`) supaya CHIP dapat memanggil `success_callback`; tetapkan `NEXT_PUBLIC_APP_URL` kepada alamat terowong, `ALLOW_TEST_PAYMENTS=yes`, dan guna kad ujian CHIP (`4444 3333 2222 1111`, CVC `123`, tamat tempoh akan datang). Semak: pesanan menjadi Dibayar di `/admin/langganan/pesanan`, e-mel (konsol) mengandungi nombor siri dan kod, dan kod boleh ditebus di `/tebus`. Apa-apa ketidakpadanan (contohnya medan `payment.amount` atau `reference` dalam jawapan CHIP berbeza daripada dokumen) dibetulkan dalam `src/lib/subscription/chip.ts` (`parseChipPurchase`).
