# Kesediaan undang-undang sebelum akaun dibuka (12 Oktober 2026)

Senarai ini berasaskan kajian awal dan semakan ChatGPT (sumber: JPDP, KPDN, MCMC). Ia bukan nasihat guaman. Tiada peguam digunakan atas keputusan Izzat. Keputusan menghidupkan akaun (`READER_ACCOUNTS_ENABLED`) dan dinding bayar kekal pada Izzat (AGENTS.md peraturan 26).

## Keputusan yang sudah dibuat

- Hanya individu berumur 18 tahun ke atas boleh membuka akaun. Kanak-kanak membaca melalui peranti dan akaun ibu bapa atau penjaga.
- Adjung Press didaftarkan di SSM sebagai milikan tunggal pada 19 Oktober 2026 (Adjung Press Platform, no. 202603277981, sah hingga 18 Oktober 2027; perbaharui sebelum tarikh itu). Nombor telefon tidak dipaparkan; hanya e-mel editorial.
- Kad langganan dijual melalui Shopee; tiada pembayaran dalam tapak Jalin.
- Tiada cukai jualan atau perkhidmatan didaftarkan buat masa ini kerana perniagaan kecil (lihat catatan LHDN di bawah).

## Sudah dibina dalam produk

- Kotak pengesahan umur dan persetujuan pada borang log masuk (tidak ditanda lalai), direkod pada akaun: versi terma (`src/lib/reader-auth/terms-version.ts`), masa persetujuan, masa pengesahan umur (migrasi 034).
- Akaun baharu tidak dibuka tanpa kotak itu (kod tidak digunakan habis).
- Dasar privasi (BM dan English): bahagian Kanak-kanak ditulis semula, data pengesahan umur disenaraikan, pemadaman dengan baki langganan, identiti pengawal data (apabila diisi).
- Terma: umur minimum, penggunaan oleh kanak-kanak, perkongsian akaun dalam keluarga, penamatan atas sebab munasabah, pemadaman dengan baki, pengecualian liabiliti tidak menjejaskan hak pengguna.
- Halaman Akaun: padam akaun menunjukkan tarikh tamat akses, memberi pilihan "Kekalkan akaun sehingga tamat" dan "Padam sekarang juga".
- Admin Langganan: amaran jika maklumat pengawal data belum lengkap.
- Prosedur pelanggaran data: `docs/PROSEDUR_PELANGGARAN_DATA.md`.

## Perlu dilakukan oleh Izzat sebelum akaun dihidupkan

| # | Perkara | Kenapa |
|---|---|---|
| 1 | ~~Daftar Adjung Press di SSM~~ SELESAI 19 Oktober 2026 | Identiti pengawal data diisi dalam `legal-identity.ts` |
| 2 | ~~Isi `src/lib/legal-identity.ts`: nama pemilik, nombor SSM, alamat~~ SELESAI (telefon sengaja tidak dipaparkan) | Notis privasi (PDPA seksyen 7) perlu identiti dan cara hubung; admin memberi amaran selagi kosong |
| 3 | Jalankan migrasi 034 (034_reader_consent) pada pangkalan data produksi (`npm run db:schema:migrate` dengan kebenaran Izzat) | Lajur rekod persetujuan; tanpanya log masuk gagal merekod |
| 4 | Hantar pertanyaan bertulis kepada JPDP: adakah penerbitan sastera digital dengan jualan kad akses perlu mendaftar sebagai pengawal data di bawah seksyen 14 dan 15? | ChatGPT keyakinan sederhana; jangan mengisytiharkan dikecualikan tanpa pengesahan |
| 5 | Kedai Shopee: nama penjual, e-mel, telefon, alamat, harga penuh, syarat dan polisi pulangan dalam Bahasa Melayu | Peraturan Perlindungan Pengguna (Urus Niaga Perdagangan Elektronik) 2024 |
| 6 | Semak tanggungjawab cukai dengan LHDN dan JKDM (cukai pendapatan, rekod jualan, ambang cukai perkhidmatan) | Ketiadaan pendaftaran cukai tidak bermaksud pendapatan boleh diabaikan |
| 7 | Sahkan lokasi pemprosesan dan perjanjian pemprosesan data Vercel, Neon dan Resend (log, sandaran, subpemproses) | PDPA seksyen 129: pemindahan rentas sempadan |
| 8 | Pastikan alamat e-mel editorial@adjung.com dipantau (telefon tidak diperlukan) | Hak akses, pembetulan dan prosedur pelanggaran |

## Dinilai, tidak menghalang pelancaran (keyakinan sederhana)

- Pegawai Perlindungan Data: wajib hanya jika melebihi 20,000 data subjek, atau 10,000 data sensitif, atau pemantauan sistematik. Semak semula apabila pembaca berkembang.
- Lesen CMA dan Akta Keselamatan Dalam Talian 2025: kemungkinan tidak terpakai pada laman penerbitan teks; sahkan jika Jalin menambah fungsi komunikasi atau komuniti.
- Pendaftaran pengguna data: lihat item 4.

## Yang sengaja tidak dibina

- Pengesahan umur melalui MyKad atau tarikh lahir (tidak perlu dan menambah data).
- Pemadaman berjadual, bayaran balik automatik berdasarkan baki, atau pegawai undang-undang tetap, sebelum ada keperluan.
