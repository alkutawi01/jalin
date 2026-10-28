# Serah tugas: sistem langganan Jalin (28 Oktober 2026)

Untuk Codex dan sesiapa yang menyambung kerja ini selepas sesi Claude tamat. Baca `AGENTS.md` dahulu, kemudian dokumen ini, kemudian `docs/PELAN_LANGGANAN_LANGKAH.md` (senarai semak penuh) dan `docs/JUALAN_DALAM_TALIAN.md` (aliran jualan dan pemboleh ubah). Pemilik projek ialah Izzat (Wan Muhammad Izzat); bahasa kerja Bahasa Melayu, panggil beliau "awak".

## 1. Keadaan semasa (apa yang siap)

Semuanya berada di produksi (Hostinger) tetapi **tertutup** (tiada orang awam boleh membeli). Komit terkini pada `main`: `07616dd9`; pada cabang `hostinger`: `ff228c4f`.

| Bahagian | Keadaan |
|---|---|
| Akaun pembaca, percubaan 14 hari, dinding bayar (suis), penebusan kod kad dan kod kongsi, admin `/admin/langganan` | siap, tertutup (`READER_ACCOUNTS_ENABLED` belum `yes` di produksi) |
| Nombor siri `JLN-12B0126-F01` (fizikal) dan `-M01` (maya), terikat pada kod dalam HMAC | siap |
| Tarikh tebus sebelum (`redeem_codes.redeem_by`): fizikal ditetapkan setiap kelompok, maya setahun selepas dijana | siap |
| Label pelekat PDF: nombor siri, kod, tarikh tebus sebelum | siap (saiz label belum muktamad, nilai awal 50 x 30 mm) |
| Kad maya `/tebus`, Soalan Lazim `/soalanlazim`, halaman Beli `/beli`, halaman selesai `/beli/selesai` | siap, teks disemak ChatGPT (26 Okt 2026) |
| Jualan dalam talian: pesanan (`purchase_orders`), satu bayaran satu kod, kod tersulit sehingga e-mel dihantar, hantar semula, admin `/admin/langganan/pesanan`, kerja berjadual `/api/cron/pesanan` | siap, diuji dengan pelayan palsu |
| Gerbang bayaran **CHIP Collect** (lalai), Billplz masih ada (`PAYMENT_PROVIDER=billplz`) | siap, **diuji dengan CHIP sebenar dalam mod ujian oleh Codex (28 Okt): lulus** |
| Nama dan SSM Antakesuma Holdings Sdn. Bhd. pada kaki laman, Terma, Dasar privasi, Tentang | siap, disemak ChatGPT (28 Okt) |

**Migrasi pangkalan data:** 036 (`channel` dan `redeem_by`) dan 037 (`purchase_orders`) telah dijalankan **hanya pada cabang Neon `pembangunan`**, bukan produksi.

## 2. Keputusan Izzat yang sudah dikunci (jangan ubah tanpa bertanya)

- Kod e-mel (maya) dilancarkan dahulu; kad fizikal menyusul. Kad fizikal direka Izzat sendiri dalam Canva atau Illustrator (jangan reka atau ubah teks kad).
- Pakej 1, 6 dan 12 bulan. Harga: Terma penggunaan sudah menyatakan RM15, RM30 dan RM50; sahkan dengan Izzat sebelum menetapkan `PLAN_PRICES_MYR` (tiada harga lalai dalam kod).
- Nombor siri: huruf **F** (fizikal) atau **M** (maya) sebelum nombor kad; **maksud setiap bahagian nombor siri ialah rahsia**. Jangan terangkan pada halaman awam, Soalan Lazim, e-mel kepada pihak ketiga, atau dalam sembang dengan alat luar. (Dokumen `docs/NOMBOR_SIRI_KAD.md` memuatkannya untuk dalaman.)
- Tarikh tebus sebelum: hari terakhir kod boleh ditebus (penuh, waktu Malaysia); bukan tarikh tamat langganan.
- Kad hilang atau rosak: diganti jika kod belum ditebus. Bayaran balik: **belum diputuskan**; jangan menjanjikannya dalam apa-apa teks.
- **Struktur penjual:** Antakesuma Holdings Sdn. Bhd. (SSM 200501023605 (705737-H), Izzat pengarah urusan) menjadi merchant dan penjual langganan serta menerima dan menguruskan bayaran; Adjung Press Platform (SSM 202603277981 (PG0594995-P), pemilik tunggal, belum ada akaun bank perniagaan) kekal penerbit dan pengawal data. Billplz tidak menerima akaun peribadi dan pendaftaran Izzat tersekat; CHIP dipilih.
- SUS (Sains untuk Semua) di luar skop kerja Jalin: serahkan kod dan dokumentasi sahaja, jangan reka bentuk untuk SUS. Sesi "SUS Utama" mengurus SUS (PR 521 menambah halaman Hubungi, Terma, Privasi; belum digabung).

## 3. Tugasan seterusnya, mengikut urutan

Tandakan dalam `docs/PELAN_LANGGANAN_LANGKAH.md` selepas siap.

1. **[SIAP 28 Okt 2026, Codex: lulus] Uji CHIP sebenar.** Hasil: bayaran ujian berjaya (`/beli/selesai` "Kod telah dihantar", pesanan Dibayar, satu kod, e-mel betul, tebus berjaya); bayaran gagal tidak membuat kod; lima panggilan balik berulang tidak membuat kod kedua; medan jawapan CHIP (`status` paid, `is_test`, `purchase.total`, `payment.amount`, `reference`) sepadan dengan chip.ts. Satu pembetulan: CHIP menolak bahasa `ms` (HTTP 400), jadi `createChipPurchase` menggunakan `en` (komit `0b6b874c`). Tugasan asal: Ikut arahan dalam `docs/JUALAN_DALAM_TALIAN.md` bahagian CHIP: kunci UJIAN, pangkalan data `pembangunan`, terowong awam untuk `success_callback`, kad ujian `4444 3333 2222 1111`. Semak setiap langkah (pesanan Dibayar, satu kod sahaja, e-mel, tebus berjaya, bayaran gagal tidak membuat kod, callback berulang tidak membuat kod kedua). Jika medan jawapan CHIP berbeza daripada dokumen, betulkan dalam `src/lib/subscription/chip.ts` (`parseChipPurchase`, `createChipPurchase`) dengan ujian. Syarat: Izzat sudah ada akaun CHIP (permohonan dihantar 28 Okt; status belum diketahui).
2. **Gabungkan cabang `web-push`** (kerja lain, worktree `C:\Users\manus\Claude\jalin-push`, migrasi **035_web_push**). Tanpanya, ujian `__tests__/migration-inventory.test.ts` gagal ("missing: 35") dan Kysely tidak membenarkan migrasi 036 dan 037 dijalankan pada produksi selepas 035 tiada. Keputusan menggabungkan di tangan Izzat.
3. **Migrasi produksi (hanya dengan kebenaran Izzat):** jalankan `npx tsx scripts/db-schema-migrate.ts` terhadap pangkalan data produksi selepas 035 digabungkan. Sandarkan dahulu. Pangkalan data produksi masih 0 kod, jadi risiko rendah, tetapi tetap perlu kebenaran.
4. **Dasar privasi: tambah CHIP sebagai pemproses bayaran** (butiran bayaran diuruskan CHIP; Jalin tidak menyimpan butiran kad). Draf, hantar kepada ChatGPT untuk semakan, dan Izzat serahkan kepada peguam. ChatGPT sudah menandakan: peranan Antakesuma terhadap data pembelian (pengawal atau pemproses) perlu disahkan, dan mungkin perlu perjanjian antara dua syarikat.
5. **Pemboleh ubah Hostinger (Izzat sendiri, kunci tidak boleh dikongsi):** `PAYMENT_PROVIDER=chip`, `CHIP_SECRET_KEY`, `CHIP_BRAND_ID`, `PLAN_PRICES_MYR`, `PURCHASES_ENABLED=yes`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`, dan `READER_ACCOUNTS_ENABLED=yes` (menghidupkan `/tebus`, `/akaun`, `/soalanlazim`). Mula dengan kunci ujian dan `ALLOW_TEST_PAYMENTS=yes` untuk satu pembelian ujian di produksi, **batalkan kod ujian itu di admin selepasnya**, kemudian tukar kepada kunci sebenar dan buang `ALLOW_TEST_PAYMENTS`. Jadualkan `GET /api/cron/pesanan` (Authorization: Bearer CRON_SECRET) setiap 5 minit pada Hostinger.
6. **Pautan ke `/beli`** dalam menu, halaman Akaun atau halaman lain (Izzat tentukan tempat; belum ada pautan di mana-mana).
7. **Butang penggantian kod maya** di admin (kod tersulit dipadam selepas e-mel dihantar; jika pembeli kehilangan e-mel, admin membatalkan kod dan mengeluarkan kod baharu; belum ada butang).
8. **Kemas kini Soalan Lazim** jika Izzat memutuskan dasar bayaran balik; hantar ChatGPT dengan fakta sumber.
9. **Tugas di pihak Izzat (bukan kod):** akaun bank syarikat Antakesuma; akauntan (perjanjian antara dua syarikat, SST atau e-Invois, skop SSIC); **tambah aktiviti penerbitan atau langganan kandungan digital pada SSM Antakesuma** (profil 2024 hanya menyenaraikan baju, barangan, kutipan bil, telekomunikasi, pembersihan dan keselamatan; ini boleh menjejaskan penilaian CHIP); sahkan nama penjual pada kad fizikal (kad kini membawa SSM Adjung Press Platform) dan nama label "Tebus sebelum" sebelum cetak; ujian cetak label pada pencetak sebenar dan tetapkan saiz label dan pelekat kikis (`DEFAULT_LABEL` dalam `src/lib/subscription/label.ts`).

## 4. Peta fail

- Logik kod: `src/lib/subscription/redeem-code.ts` (siri, MAC, tarikh tebus), `src/lib/reader-auth/redeem.ts` (kelompok, kod maya, penebusan, penggantian), `src/lib/reader-auth/orders.ts` (pesanan, bayaran, penghantaran), `src/lib/reader-auth/codes-export.ts` (sandaran malam).
- Gerbang: `src/lib/subscription/chip.ts`, `billplz.ts`, `prices.ts` (suis dan harga), `order-crypto.ts` (kod tersulit), `order-email.ts` (e-mel kod), `label.ts` (PDF label).
- Laluan: `src/app/api/langganan/beli`, `.../panggilan-balik-chip`, `.../panggilan-balik` (Billplz), `src/app/api/cron/pesanan`, `src/app/api/akaun/tebus`, halaman `src/app/beli`, `src/app/soalanlazim`, admin `src/app/admin/langganan/*`.
- Identiti undang-undang: `src/lib/company-notice.ts`, `src/lib/legal-identity.ts`, `src/components/reader/PrivacyNotice.tsx`, `src/app/terma/page.tsx`.
- Migrasi: `src/lib/db/migrations/030_redeem_codes.ts` (asal), `036_card_channel_and_redeem_by.ts`, `037_purchase_orders.ts`.
- Dokumen: `PELAN_LANGGANAN_LANGKAH.md`, `JUALAN_DALAM_TALIAN.md`, `KAJIAN_PENYEDIA_BAYARAN.md`, `NOMBOR_SIRI_KAD.md`, `SOALAN_LAZIM.md`.

## 5. Cara kerja

**Ujian.** `npx tsc --noEmit`; `node scripts/run-auto-tests.cjs` (40 fail, semua lulus); `node scripts/run-tests.cjs` (semua; satu gagal diketahui: `migration-inventory` sehingga `web-push` digabungkan); skrip pangkalan data (hanya cabang `pembangunan`, dilindungi `src/lib/db/env.ts`): `npx tsx scripts/redeem-check.ts` (63), `scripts/codes-admin-check.ts` (41), `scripts/orders-check.ts` (36), `scripts/restore-drill.ts` (31), `__tests__/card-key-rotation.integration.ts`. Ujian unit baharu diletak dalam `__tests__/auto/` (ditemui secara automatik).

**Pangkalan data.** Kerja tempatan hanya pada cabang Neon `pembangunan`. Jangan jalankan skrip atau migrasi terhadap produksi tanpa kebenaran Izzat. Untuk menjalankan migrasi pada `pembangunan`, cabang itu sudah mengandungi 035_web_push: salin sementara fail itu daripada cabang `web-push` (`git show web-push:src/lib/db/migrations/035_web_push.ts`), jalankan, kemudian padam salinan (jangan komit).

**Menerbitkan.** Hostinger membina daripada cabang `hostinger` (bukan `main`). Selepas komit pada `main`, push `main`, kemudian `cherry-pick` komit itu ke cabang `hostinger` dan push. Binaan mengambil kira-kira 6 minit; semak status dan hash komit pada hPanel (Websites > jalin.adjung.com). Migrasi tidak berjalan semasa binaan. Terminal Izzat ialah PowerShell 5.1: tiada `&&`, satu arahan satu blok.

**Semakan bahasa ChatGPT (wajib untuk semua teks pengguna baharu).** Guna folder projek "Jalin" di ChatGPT (`https://chatgpt.com/g/g-p-6aa7d8eaff5c81918ed35b086fc59cd2/project`), awali mesej dengan "[Daripada Claude, pembantu AI Izzat. Bukan Izzat.]" (tukar kepada nama agen yang menghantar), sertakan **fakta sumber daripada kod** dan teks, minta: laporan dengan skor, senarai pembetulan, dakwaan yang tidak disokong, versi akhir dalam satu blok kod. Tunggu jawapan penuh sebelum meneruskan. Jangan menjanjikan bayaran balik, penggantian kad atau masa balasan dalam teks mana-mana.

**Gaya.** Bahasa Melayu baku yang jelas; tanda sempang panjang (U+2014) secara sederhana; ikut `AGENTS.md`. Satu permintaan UI dibatch menjadi satu komit.

## 6. Jangan

- Jangan menyalin kunci API, kata laluan, ID Brand atau kod penebusan sebenar ke dalam repo, log atau sembang.
- Jangan terangkan maksud nombor siri secara awam.
- Jangan hidupkan jualan atau jalankan migrasi pada produksi, atau terbitkan ke SUS, tanpa kebenaran Izzat.
- Jangan reka dasar bayaran balik, harga atau teks kad.
- Fail `scripts/_repro-fill.ts` yang belum dikesan (untracked) bukan sebahagian kerja ini; jangan komit.
- Cabang lain dalam worktree berasingan (`web-push`, `slug-history`) ialah kerja berasingan; jangan campurkan.

## 7. Soalan terbuka untuk Izzat

1. Status permohonan CHIP dan sama ada pengesahan selfie dan MyKad lulus.
2. Harga akhir (RM15, RM30, RM50 seperti Terma?).
3. Bila menggabungkan `web-push`.
4. Dasar bayaran balik.
5. Nama label "Tebus sebelum" (ChatGPT mencadangkan "Tebus selewat-lewatnya" atau "Tarikh akhir penebusan"), dan nama penjual pada kad fizikal.
6. Tempat pautan ke `/beli`.
7. Alamat yang dipaparkan untuk Antakesuma: kini alamat berdaftar (Kota Bharu); alamat perniagaan ialah Puchong.
