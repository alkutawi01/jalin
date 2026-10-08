# Piawaian UI Admin Jalin

Piawaian ini mengikat semua kerja pada `/admin` (sesi Claude, Codex atau manusia). Matlamat Izzat (8 Okt 2026): **kemas, minimalis, mudah difahami, tahap profesional.** Ujian `__tests__/admin-ui-standard.test.ts` menjaga angka asas di bahagian 5 supaya UI tidak merosot semula.

## 1. Prinsip (daripada kajian)

Rujukan: Shopify Polaris (susun atur Tetapan), GitHub Primer (borang), GitLab Pajamas (keadaan kosong, satu butang utama), UK Intelligence Community Design System dan Cieden (hierarki butang), dan perbincangan Duo, Discourse, GitLab serta FOLIO tentang menyimpan Tetapan.

1. **Satu tindakan utama bagi setiap kawasan.** Jika dua butang sama-sama utama, tiada yang utama.
2. **Setiap perubahan disahkan di tempat mata pengguna berada.** Butang Simpan yang sentiasa kelihatan, mati apabila tiada perubahan; status di sebelahnya; toast; kegagalan menyatakan apa yang gagal. Jangan simpan senyap apabila kotak hilang fokus. Satu halaman, satu cara menyimpan.
3. **Kumpulkan mengikut apa yang diubah, bukan baris butang.** Menu sisi berkumpulan dengan tajuk; bahagian aktif ditandakan dan `aria-current`; setiap bahagian ada alamat sendiri.
4. **Jangan tawarkan apa yang peranan ini tak boleh buat.** Butang yang akan berakhir dengan 403 tidak dipaparkan.
5. **Minimalis.** Satu tajuk halaman, satu ayat penerangan paling banyak, kad hanya apabila ia mengumpulkan sesuatu. Teks bantuan di bawah medan, bukan paragraf di atas halaman.
6. **Label sentiasa kelihatan.** Pemegang tempat (placeholder) bukan label. Ralat menggantikan teks bantuan dan dipautkan ke medan (`aria-describedby`).
7. **Warna bukan satu-satunya isyarat.** Status guna teks dan penanda, bukan warna sahaja.
8. **Tindakan merosakkan** hanya untuk yang tak boleh diundur, diasingkan daripada kawalan harian, dengan dialog yang menyebut kesannya.
9. **Keadaan kosong:** satu ayat dan satu tindakan; selebihnya dikosongkan.
10. **Status sistem ialah papan pemuka, bukan tetapan.**

## 2. Token (satu sumber kebenaran: `:root` dalam `admin.css`)

- **Saiz huruf (8 langkah sahaja):** 11, 12, 13, 14, 16, 20, 26, 30 px. Teks isi 14; label dan butang 13–14; bantuan 12–13; tajuk bahagian 16–20; tajuk halaman 26.
- **Jejari:** `--a-radius-sm` 6px (gambar kecil, kod), `--a-radius` 8px (butang, input, kad kecil), `--a-radius-lg` 12px (kad besar), 50% (bulatan) dan pil 999px (penanda). Tiada nilai px lain.
- **Jarak:** gandaan 4px (4, 8, 12, 16, 24, 32).
- **Warna:** hanya token `--a-*`. Tiada hex baharu di luar `:root`. Status: `--a-ok`, `--a-warn`, `--a-danger` dengan latar `-bg`-nya.

## 3. Komponen

- **Butang:** satu keluarga `admin-btn` (`-primary`, `-outline`, `-danger`, `-quiet`, `-sm`). `a-btn` ialah sistem lama dan dibuang. Satu `-primary` setiap kawasan; selebihnya `-outline` atau `-quiet`; `-danger` hanya untuk yang tak boleh diundur dan dijauhkan daripada tindakan biasa.
- **Borang:** label di atas, bantuan di bawah, ralat menggantikan bantuan, medan penuh lebar dalam lajur 640px. Butang Simpan di hujung borang dan `role="status"` di sebelahnya.
- **Jadual:** untuk 3 lajur atau lebih pada desktop; pada telefon bertukar kepada senarai kad (tiada skrol sisi, tindakan sentiasa kelihatan).
- **Navigasi:** menu sisi utama ikut peranan; sub-menu Tetapan berkumpulan di sebelah kiri (230px), di atas panel pada skrin sempit.
- **Maklum balas:** `toast()` untuk hasil tindakan, `role="alert"` untuk ralat yang menyekat, `role="status"` untuk kemajuan. Ayat seragam: "X disimpan." / "X tidak dapat disimpan: sebab."
- **Dialog pengesahan:** menyebut kesannya dalam satu ayat; butang pengesahan menamakan tindakan ("Ya, padam selama-lamanya"), bukan "OK".
- **Sasaran sentuh:** sekurang-kurangnya 40px tinggi (44px pada telefon) bagi butang dan pautan yang berdiri sendiri.

## 4. Senarai kerja (ikut kesan)

1. [selesai] Status sistem ke papan pemuka; Tetapan: Simpan jelas dan submenu berkumpulan; halaman karya ikut peranan.
2. [selesai] Satukan `a-btn` ke `admin-btn` (`-danger-solid` untuk dialog merosakkan; `-sm` untuk butang kecil).
3. [selesai] 14 saiz huruf dirapatkan kepada 8; 9 jejari kepada 3 langkah (dengan bulatan dan pil).
4. Gantikan 26 warna hex dengan token.
5. [selesai] Halaman Siri ikut peranan.
6. [selesai] Sesi tamat: pautan "Log masuk semula"; halaman terhad dialihkan dengan penjelasan.
7. Jadual yang tergulung ke tepi pada telefon ditukar kepada senarai kad (Pengguna dan Aktiviti sudah).
8. Kurangkan 118 gaya sebaris kepada kelas.
9. [selesai] Sasaran sentuh 44px pada peranti sentuh.

## 5. Angka asas (8 Okt 2026) yang dijaga ujian

Nilai ini hanya boleh turun, tidak naik. Apabila satu kerja menurunkannya, kemas kini ujian ke angka baharu.

| Ukuran | Asas |
| --- | --- |
| Saiz huruf berlainan dalam `admin.css` | 8 (dahulu 14) |
| Jejari berlainan | 5: tiga langkah, bulatan, pil (dahulu 9) |
| Penggunaan hex di luar `:root` | 48 |
| Kegunaan `a-btn` dalam TSX dan CSS | 0 (dahulu 11) |
| Objek `style={{` sebaris dalam TSX admin | 118 |
