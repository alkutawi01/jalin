# Arahan untuk Codex: pengukuhan keselamatan data pembaca Jalin (10 Okt 2026)

Konteks: audit keselamatan (read-only) ke atas modul pembaca dan langganan Jalin sudah dibuat. Perkara kecil sudah dibaiki dalam commit terkini (aktiviti tanpa kod kongsi, rekod peranti dipadam bersama akaun, eksport data tanpa sebab pentadbir, sitemap tertutup bila gagal, laluan admin ganjil ditolak, TLS pangkalan data disahkan, carian pembaca direkod, tekaan kod tanpa cabaran tidak mengunci alamat). Yang tinggal di bawah memerlukan kerja lebih besar atau akses produksi.

Peraturan kerja (AGENTS.md dalam repo): kemas kini ujian bersama kod; jangan hidupkan READER_ACCOUNTS_ENABLED atau dinding bayar di produksi; jangan cetak atau tampal rahsia; migrasi produksi hanya selepas Izzat bersetuju, satu migrasi bagi satu masa; commit hanya fail yang diubah; branch main auto-deploy ke Vercel. Jawab dalam Bahasa Melayu. Buat setiap item sebagai commit berasingan dengan ujian.

## A. Sandaran harian: awam dan mengandungi kod kongsi bertulis biasa (MEDIUM, audit S-02, P0-5)

Fail: src/lib/reader-auth/maintenance.ts (put dengan access "public", addRandomSuffix true, simpan 30 fail), src/lib/reader-auth/codes-export.ts (medan code bagi shared_codes dan shared_redemptions dalam teks biasa), src/app/api/admin/langganan/eksport/route.ts. Komen dalam fail ini tersilap menyatakan "no plain code".

Buat:
1. Sulitkan NDJSON eksport dengan AES-256-GCM sebelum put. Kunci: env baharu BACKUP_ENC_KEY (32 bait heks; jangan guna semula READER_MAC_KEY atau CODE_MAC_KEY). Format: versi, nonce 12 bait, tag. Jika kunci tiada, eksport MESTI gagal tertutup (jangan simpan teks biasa) dan keadaan direkod.
2. parseCodesExport dan reconcileWithExport perlu menyahsulit fail baharu; kekalkan keupayaan membaca format lama (teks biasa) hanya untuk pemulihan manual.
3. Baiki tiga komen yang salah.
4. Tambah amaran dalam Admin > Langganan > Ringkasan: merah jika eksport terakhir lebih 36 jam atau mempunyai ralat; sudah ada rekod last_export dalam reader_switches.
5. Selepas eksport berenkripsi pertama berjaya di produksi, PADAM fail eksport lama (awam) daripada Vercel Blob (awalan yang dipakai oleh maintenance.ts) dan buang rujukan lama. Laporkan bilangan fail dipadam.
6. Ujian: sulit lalu nyahsulit (round trip), fail dirosakkan ditolak (tag salah), kunci tiada menggagalkan eksport.

## B. Putaran kunci kad (P0-4)

Fail: src/lib/reader-auth/redeem.ts (redeemCard mencari dengan key_id semasa), src/lib/reader-auth/http.ts (loadCodeKey membaca satu kunci). Tambah sokongan kunci lama: CODE_MAC_KEY_PREVIOUS (senarai id:kunci dipisah koma). Penebusan mencuba kunci semasa kemudian kunci terdahulu, mengikut key_id yang direkod pada baris kod. Jangan sekali-kali cetak kunci. Ujian: kod yang dijana dengan kunci lama masih boleh ditebus selepas kunci semasa ditukar; kod yang salah tetap ditolak; kiraan had gagal tidak berubah. Dokumentasikan langkah putaran dalam docs/ (tanpa nilai kunci).

## C. Had e-mel dan kunci keluar (P0-3, S-04, S-03, S-10)

Fail: src/lib/reader-auth/service.ts (LIMITS: requestsPerDayAll 90, requestsPerIpPerHour 20, failedChecks...), src/lib/reader-auth/http.ts (clientIp).
1. Jadikan had harian global boleh ditetapkan melalui env READER_MAIL_DAILY_CAP (lalai 90), dan asingkan bajet: alamat yang sudah mempunyai akaun (cari melalui email_normalized, tanpa mendedahkan sama ada ia wujud dalam jawapan) boleh meminta kod sehingga had berasingan yang lebih tinggi, supaya penyerang tidak dapat menghabiskan kuota untuk pembaca sedia ada.
2. Kunci had IP pada awalan /64 bagi IPv6.
3. Tambah had harian tekaan kod bagi setiap alamat (contohnya 30 sehari) selain 10 sejam.
4. Paparkan amaran dalam Ringkasan admin pada 70% kuota harian.
5. Jangan ubah mesej yang sama untuk semua kes (tiada enumerasi pengguna). Ujian untuk setiap perubahan.
6. Nota: sengaja TIDAK mengubah indeks unik cabaran terbuka (reader_auth_challenges_one_open); jika mahu membenarkan beberapa kod terbuka, bentangkan migrasi dahulu kepada Izzat.

## D. Kunci tandatangan sesi pemilik (MEDIUM, S-06)

Fail: src/lib/admin/auth.ts (loginAdmin membandingkan kata laluan dengan ADMIN_SECRET; signSession dan validateSession juga memakai ADMIN_SECRET), src/middleware.ts. Pekerja berstaf boleh membaca kuki sendiri lalu cuba meneka ADMIN_SECRET secara luar talian.
1. Tambah env ADMIN_SESSION_KEY (rawak, 32+ aksara) khusus untuk menandatangani sesi; jika tiada, kekal tingkah laku semasa (jangan memutuskan log masuk sedia ada) tetapi paparkan amaran dalam Ringkasan admin.
2. Hadkan percubaan log masuk pemilik seperti akaun berstaf (kiraan mengikut IP dan global, kunci sementara).
3. Ujian: token ditandatangani kunci lama ditolak selepas kunci ditukar; log masuk pemilik terkunci selepas percubaan gagal berulang.

## E. Lain-lain pengukuhan (LOW)

1. S-09: sesi pembaca: tolak peranti dengan last_seen_at melebihi 90 hari atau created_at melebihi 365 hari dalam getSession (service.ts); beri log masuk semula yang jelas. Pertimbangkan e-mel "peranti baharu" hanya jika bajet e-mel membenarkan.
2. S-13: dalam guarded() (src/lib/admin/langganan-api.ts) panggil getCurrentAdmin() dan pastikan peranan pemilik, supaya pengendali tidak bergantung pada middleware sahaja; halaman Aktiviti dan laluan baca sensitif hendaklah menyemak semula akaun staf dalam pangkalan data (penyah-aktifan berkuat serta-merta).
3. S-05: ubah permissionFor (src/lib/admin/permissions.ts) supaya laluan di bawah /api/admin yang tiada peraturan eksplisit adalah untuk pemilik sahaja (kini peraturan tangkap-semua content.read terpakai kepada setiap GET). Senaraikan awalan baca yang sah dengan jelas. Jalankan __tests__/permissions.test.ts.
4. S-19: generateMetadata bagi bab novela terkunci mendedahkan tajuk bab; kekalkan hanya tajuk karya apabila pelawat tidak mempunyai akses.

## F. Operasi produksi (perlukan akses; JANGAN lakukan jika tiada kebenaran Izzat)

1. Bersihkan baris aktiviti lama yang mengandungi kod kongsi bertulis biasa:
   UPDATE admin_activity SET summary = regexp_replace(summary, 'JLN-[0-9A-HJKMNP-TV-Z]{7}', '[kod]', 'g') WHERE action LIKE 'subscription.shared.%';
   Jalankan pada produksi hanya selepas menunjukkan kepada Izzat bilangan baris yang terjejas (SELECT count(*) dahulu). Anggap kod kongsi yang sudah dicipta sebagai terdedah kepada peranan ketua penyunting; tanya Izzat sama ada mahu ia dibatalkan dan diganti.
2. SPF, DKIM dan DMARC pada mail.adjung.com: semak rekod DNS sedia ada dan laporkan (jangan ubah DNS tanpa kelulusan).
3. Kunci API Resend yang pernah terdedah: Izzat mesti menjana kunci baharu dalam papan pemuka Resend. Selepas Izzat memberi kunci baharu kepada anda melalui saluran selamat, kemas kini RESEND_API_KEY di Vercel (Production), redeploy, hantar satu kod ujian ke alamat Izzat, kemudian Izzat membatalkan kunci lama. Jangan paparkan kunci.
4. Selepas deploy commit yang mengubah TLS pangkalan data (rejectUnauthorized kini true): sahkan laman produksi masih berfungsi (contohnya GET /kategori/cerpen dan /sitemap.xml menjawab 200). Jika sambungan pangkalan data gagal, tetapkan sementara env DATABASE_SSL_INSECURE=true dan laporkan; jangan biarkan kekal.
5. Sandaran Neon: pastikan Point-in-Time Restore dan tempoh simpanan dihidupkan untuk produksi; laporkan tetapan sebenar.

Laporan akhir: senarai item A hingga F dengan status (siap, separa, tidak dibuat), commit, hasil ujian, dan sebarang keputusan yang menunggu Izzat.
