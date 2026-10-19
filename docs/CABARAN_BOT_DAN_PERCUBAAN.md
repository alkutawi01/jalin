# Cabaran bot pada log masuk dan kunci percubaan (19 Oktober 2026)

Keputusan Izzat 19 Oktober 2026, sebelum suis akaun dihidupkan. Menjawab P0-3 dan P1-1 dalam `AUDIT_LANGGANAN_2026-10-10.md`.
Perubahan auth didokumenkan di sini dahulu (AGENTS.md peraturan 14). Tiada skema pangkalan data berubah.

## 1. Kunci percubaan pada alamat yang dinormalkan (P1-1)

**Masalah.** Percubaan 14 hari diberi sekali bagi setiap alamat, tetapi alamat disimpan seperti ditaip, jadi `ali+1@gmail.com`,
`a.li@gmail.com` dan `ali@googlemail.com` ialah tiga alamat dengan tiga percubaan.

**Keputusan.** Kunci kelayakan percubaan (`reader_trial_claims.email_mac`) dikira daripada **identiti percubaan**, bukan alamat akaun:

- huruf kecil;
- `+tag` dibuang daripada bahagian tempatan, bagi semua domain;
- bagi `gmail.com` dan `googlemail.com` sahaja: titik dalam bahagian tempatan dibuang dan domain disamakan kepada `gmail.com`.

Akaun, log masuk dan e-mel kekal memakai alamat yang ditaip (dua orang boleh memiliki `a.b@` dan `ab@` di domain lain). Hanya kelayakan
percubaan yang disatukan. Tuntutan lama yang dibuat dengan alamat penuh masih dihormati (diperiksa bersama tuntutan baharu).

**Had yang diterima.** Orang yang bersungguh-sungguh masih boleh mendaftar dengan peti e-mel yang benar-benar berlainan. Ini hanya
menutup helah alias yang mudah. Percubaan tidak menelan wang selagi dinding bayar tidak menjual apa-apa.

## 2. Cabaran bot Cloudflare Turnstile (P0-3)

**Masalah.** Setiap permintaan kod log masuk menghantar e-mel, dan bajet e-mel harian terhad (`requestsPerDayAll`, `readerMailDailyCap`).
Skrip boleh menghabiskan bajet itu dan menutup pendaftaran untuk semua orang.

**Keputusan.** Cabaran disoal **hanya apabila perlu**, bukan sekatan terus:

- diperlukan apabila alamat rangkaian itu sudah membuat 2 permintaan kod dalam sejam, ATAU 40% bajet e-mel harian sudah terpakai;
- keputusan itu bergantung pada kiraan rangkaian dan global sahaja, **tidak pernah pada sama ada alamat e-mel itu mempunyai akaun**, supaya tiada
  maklumat bocor tentang siapa yang berdaftar;
- tanpa kunci Turnstile (`TURNSTILE_SITE_KEY` dan `TURNSTILE_SECRET_KEY` kedua-duanya), ciri ini mati dan tingkah laku kekal seperti sebelum ini;
- pelayan: permintaan tanpa token apabila cabaran diperlukan dijawab `{ ok: false, challenge: true, siteKey }` dan tiada e-mel dihantar, tiada
  peristiwa direkod. Token disahkan dengan Cloudflare (`siteverify`). Token ditolak: cabaran diminta semula. Cloudflare tidak dapat dihubungi
  (masa tamat atau ralat rangkaian): permintaan diteruskan (gagal-buka) dan diberi amaran dalam log, supaya gangguan Cloudflare tidak menutup log masuk;
- pelayar: skrip Cloudflare dimuat **hanya** apabila pelayan meminta cabaran, jadi kebanyakan pelawat tidak menghubungi Cloudflare;
- Dasar privasi (BM dan English) menyenaraikan Cloudflare sebagai pemproses yang dipanggil hanya apabila cabaran perlu.

**Kunci ujian Cloudflare** (daripada dokumen Cloudflare): kunci tapak `1x00000000000000000000AA` (sentiasa lulus), `2x00000000000000000000AB`
(sentiasa gagal), `3x00000000000000000000FF` (paksa cabaran interaktif); kunci rahsia `1x0000000000000000000000000000000AA` (sentiasa sah),
`2x0000000000000000000000000000000AA` (sentiasa gagal). Hanya untuk ujian tempatan.

## 3. Tindakan Izzat sebelum suis dibuka

1. Cipta tapak Turnstile di dashboard Cloudflare (percuma), mod **Managed**, domain `jalin.adjung.com`.
2. Tetapkan pada Vercel Production: `TURNSTILE_SITE_KEY` dan `TURNSTILE_SECRET_KEY` (rahsia ditanda Sensitive). Jangan letak dalam repo.
3. Naikkan pelan Resend dan `READER_MAIL_DAILY_CAP` selaras (lihat `LIMITS.requestsPerDayAll`).
