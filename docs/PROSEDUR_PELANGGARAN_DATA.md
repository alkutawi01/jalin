# Prosedur pelanggaran data peribadi: Jalin (V1, 12 Oktober 2026)

Draf prosedur dalaman untuk Adjung Press (milikan tunggal). Disediakan dengan bantuan ChatGPT berdasarkan Akta Perlindungan Data Peribadi 2010 (Akta 709, pindaan 2024) dan Garis Panduan Pemberitahuan Pelanggaran Data Peribadi JPDP 2025. Ini bukan nasihat guaman. Sebelum bergantung kepadanya, semak terus garis panduan rasmi di pdp.gov.my (pengiraan 72 jam, kaedah pemberitahuan individu, syarat pengecualian).

Pemilik tindakan: pemilik Adjung Press atau wakil yang dilantik.
Skop: akaun Jalin, pangkalan data Neon, hos Vercel, e-mel Resend, sistem kod tebus, sesi log masuk dan sandaran.

## Ringkasan tempoh

| Perkara | Tempoh |
|---|---|
| Pemberitahuan kepada Pesuruhjaya (JPDP) apabila ambang dipenuhi | secepat yang praktik, dan tidak lewat daripada 72 jam |
| Maklumat lanjut, jika awal tidak lengkap | tidak lewat daripada 30 hari selepas pemberitahuan awal |
| Pemberitahuan kepada individu apabila bahaya ketara | tanpa kelewatan tidak wajar; sasaran dalam tujuh hari selepas pemberitahuan kepada Pesuruhjaya |
| Pemberitahuan kepada Pesuruhjaya sahaja | pelanggaran melebihi 1,000 subjek data tanpa bahaya ketara lain |

Bukan setiap insiden wajib dilaporkan; ia bergantung pada ambang (bahaya ketara atau skala). Catat keputusan dan sebabnya.

## Langkah

1. **Kesan dan rekod, segera.** Catat tarikh dan masa insiden mula diketahui, siapa yang melaporkan, sistem terlibat dan jenis kejadian. Contoh: pangkalan data terdedah, akses pentadbir tanpa kebenaran, e-mel tersalah hantar, token sesi bocor, kunci HMAC terdedah.
2. **Sekat dan lindungi, segera.** Batalkan sesi, token atau kunci yang terjejas (tukar `READER_MAC_KEY`, `CODE_MAC_KEY`, `ADMIN_SESSION_KEY`, kunci Resend mengikut kes). Hadkan akses kepada sistem terlibat. Hubungi Vercel, Neon atau Resend jika berkaitan. Pelihara log dan bukti. Jangan memadam bukti atau mengumumkan insiden selesai sebelum disahkan.
3. **Siasat dan tentukan risiko.** Data yang terlibat, bilangan individu, kemungkinan data diakses atau dieksport, tempoh pendedahan. Tentukan sama ada pelanggaran menyebabkan atau berkemungkinan menyebabkan bahaya ketara (penipuan identiti, kerugian kewangan, salah guna menyalahi undang-undang, data sensitif) atau sama ada skala memenuhi ambang JPDP.
4. **Laporkan kepada Pesuruhjaya** jika ambang dipenuhi, melalui saluran dan borang rasmi JPDP (Sistem Pemberitahuan Pelanggaran Data). Bekalkan maklumat awal yang ada; jangan tunggu siasatan selesai. Catat sebab kelewatan jika ada.
5. **Maklumkan individu terjejas** jika wajib: apa yang berlaku, data yang terlibat, risiko, tindakan Jalin dan langkah perlindungan yang boleh dilakukan pembaca.
6. **Pulihkan dan tutup.** Uji pembaikan, sahkan akses tanpa kebenaran sudah terhenti, tentukan penggantian kunci atau kawalan tambahan. Simpan laporan insiden, bukti keputusan pelaporan, salinan notifikasi dan langkah pencegahan.

## Templat A: pemberitahuan awal kepada Pesuruhjaya

Gunakan borang atau saluran rasmi JPDP; templat ini ialah kandungan sokongan.

> Kepada Pesuruhjaya Perlindungan Data Peribadi,
>
> Kami mengemukakan pemberitahuan awal mengenai suatu pelanggaran data peribadi yang melibatkan perkhidmatan Jalin.
>
> Maklumat pengawal data: Adjung Press Platform, [nombor SSM], [alamat dan maklumat hubungan].
> Tarikh dan masa kejadian: [jika diketahui]
> Tarikh dan masa dikesan atau disahkan: [tarikh dan masa]
> Sistem terlibat: [sistem]
> Ringkasan kejadian: [fakta yang telah disahkan]
> Kategori data terlibat: [kategori data]
> Anggaran individu terjejas: [bilangan atau belum diketahui]
> Risiko kepada individu: [penilaian awal]
> Langkah yang telah diambil: [langkah sekatan dan pemulihan]
> Langkah susulan: [siasatan, pemberitahuan dan tindakan pembetulan]
> Pegawai hubungan: [nama, jawatan, e-mel, telefon]
>
> Maklumat yang belum dapat disahkan akan dikemas kini apabila penyiasatan menghasilkan penemuan lanjut.
>
> Adjung Press

## Templat B: notis kepada pembaca terjejas

> Notis keselamatan data akaun Jalin
>
> Salam sejahtera,
>
> Kami ingin memaklumkan bahawa Jalin telah mengesan pelanggaran keselamatan yang mungkin melibatkan sebahagian maklumat akaun pembaca.
>
> Apa yang berlaku: [penerangan ringkas berdasarkan fakta yang disahkan].
> Maklumat yang mungkin terlibat: [kategori data yang terjejas].
> Tindakan Jalin: [langkah keselamatan yang telah dilaksanakan].
> Tindakan yang kami sarankan: [langkah khusus yang relevan, contohnya menyemak keselamatan akaun e-mel atau log masuk semula].
>
> Jalin menggunakan kod log masuk melalui e-mel dan tidak menyimpan kata laluan akaun Jalin. Walau bagaimanapun, maklumat lain mungkin terjejas seperti yang diterangkan di atas.
>
> Untuk pertanyaan atau bantuan, sila hubungi [alamat e-mel dan kaedah hubungan].
>
> Kami akan memberikan maklumat lanjut jika terdapat perkembangan penting.
>
> Adjung Press

Nota: jangan sertakan maklumat yang belum disahkan sebagai fakta. Sediakan alamat e-mel keselamatan yang benar-benar dipantau dan kaedah alternatif jika sistem e-mel utama terjejas.
