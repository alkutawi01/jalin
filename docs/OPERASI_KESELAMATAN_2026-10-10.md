# Operasi keselamatan produksi — 10 Oktober 2026

Rekod ini tidak mengandungi nilai kunci, token, kata laluan atau URL sambungan pangkalan data.

## Semakan item F

- Neon: projek `jalin`, cabang `production` disahkan sebelum pertanyaan. `SELECT count(*)` bagi `admin_activity` dengan `action LIKE 'subscription.shared.%'` menghasilkan **0 baris**; **0** daripadanya sepadan dengan pola kod kongsi. Semakan tambahan terhadap semua `summary` tidak menemui pola kod tersebut. `UPDATE` tidak dijalankan kerana tiada baris sasaran. Kod kongsi sedia ada tidak dibatalkan.
- DNS (baca-sahaja): SPF wujud pada `send.mail.adjung.com` (`include:amazonses.com`, `~all`); DKIM TXT wujud pada `resend._domainkey.mail.adjung.com`; tiada DMARC khusus `_dmarc.mail.adjung.com`. Dasar induk `_dmarc.adjung.com` ialah `p=none`. Tiada rekod DNS diubah; sebarang perubahan menunggu kelulusan Izzat.
- Resend: kunci baharu belum disediakan oleh Izzat melalui saluran selamat. Tiada kunci digunakan atau ditukar; penghantaran kod ujian dan pembatalan kunci lama belum dilakukan.
- TLS/deploy: selepas commit keselamatan `603454e` dan putaran `ADMIN_SESSION_KEY`, deployment Production berstatus READY. GET `/`, `/kategori/cerpen`, `/sitemap.xml` dan `/admin/login` masing-masing HTTP 200. GET `/log-masuk` dan `/mula` kekal 404 kerana `READER_ACCOUNTS_ENABLED` tidak ditetapkan. `DATABASE_SSL_INSECURE` tidak digunakan.
- Neon Point-in-Time Restore: `history_retention_seconds` projek ialah **86,400 saat (24 jam)**. Sandaran cabang `sandaran-sebelum-032-20261010` masih wujud. Tiada restore dijalankan.

## Semakan operasi item A dan D

- `BACKUP_ENC_KEY` dan `ADMIN_SESSION_KEY` telah ditetapkan sebagai Vercel Production Sensitive. Putaran kunci sesi menamatkan sesi admin lama; log masuk pemilik dengan kata laluan sebenar masih perlu disahkan oleh Izzat.
- Cron penyelenggaraan tanpa Authorization menjawab 401. Panggilan berizin menjawab HTTP 200, `ok=true`, `stored=blob`, `lines=2`, `swept.events=0`, `swept.challenges=0`. Rekod `last_export` menunjukkan fail baharu di awalan `eksport-terlindung-`; muat turun fail itu menjawab 200 dan mempunyai penanda format terenkripsi.
- Inventori Vercel Blob mengandungi **1 fail eksport lama `.ndjson`** dan **1 fail eksport baharu `.enc`** dalam `jalin-kod/`. Pemadaman fail lama menunggu pengesahan tindakan Izzat.
- Kunci sandaran dijana terus untuk Vercel Sensitive tanpa salinan dalam pengurus kata laluan. Pemulihan daripada sandaran terenkripsi belum diuji dan penjagaan salinan kunci mesti diselesaikan sebelum ia boleh dianggap boleh dipulihkan dengan yakin.
