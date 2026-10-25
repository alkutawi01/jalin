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
- Kata-kata e-mel kod, halaman `/beli` dan `/beli/selesai` belum disemak bahasa oleh ChatGPT (lihat C5 dalam pelan).
- Soalan Lazim belum menyebut tarikh tebus sebelum, dan pembelian dalam talian (perlu dikemas kini dan disemak ChatGPT).
- E-mel penggantian: jika pembeli kehilangan e-mel selepas dihantar, kod tersulit sudah dipadam. Penyelesaian: Izzat membatalkan kod itu dan mengeluarkan kod baharu (belum ada butang untuk kod maya).
- Pautan ke `/beli` belum diletakkan di mana-mana (halaman ada, tetapi tiada menu menuju ke sana).
- Penyedia lain (CHIP Collect) boleh ditambah kemudian dengan modul serupa `billplz.ts`.
